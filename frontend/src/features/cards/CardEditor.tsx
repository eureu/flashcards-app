import { FormEvent, useState } from "react";
import {
  CardView,
  createCard,
  getCard,
  updateCard,
} from "../../api/cards";

interface CardEditorProps {
  card?: CardView;
  groupId?: string;
  canAddShared: boolean;
  readOnly?: boolean;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}

export function CardEditor({
  card,
  groupId,
  canAddShared,
  readOnly = false,
  onSaved,
  onCancel,
}: CardEditorProps) {
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [visibility, setVisibility] = useState<"personal" | "group">("personal");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(card?.version ?? 0);
  const [serverCopy, setServerCopy] = useState<CardView | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    setError(null);
    setSaving(true);
    try {
      if (card) {
        await updateCard(card.id, {
          front: front.trim(),
          back: back.trim(),
          expected_version: version,
        });
      } else {
        const target =
          visibility === "group" && groupId
            ? { visibility: "group" as const, group_id: groupId }
            : { visibility: "personal" as const };
        await createCard({ target, front: front.trim(), back: back.trim() });
      }
      await onSaved();
    } catch (caught) {
      if (
        typeof caught === "object" &&
        caught !== null &&
        "status" in caught &&
        caught.status === 409
      ) {
        setError("Карточка уже изменена. Загрузите актуальную версию перед повтором.");
      } else {
        setError("Не удалось сохранить карточку");
      }
    } finally {
      setSaving(false);
    }
  }

  async function reloadVersion() {
    if (!card) return;
    setSaving(true);
    try {
      const latest = await getCard(card.id);
      setVersion(latest.version);
      setServerCopy(latest);
      setError("Версия обновлена. Ваш черновик сохранён — сравните его с текущим текстом и сохраните снова.");
    } catch {
      setError("Не удалось загрузить актуальную версию карточки");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card-editor" onSubmit={submit}>
      <header><p className="eyebrow">Карточка</p><h2>{readOnly ? "Просмотр пары" : card ? "Изменить пару" : "Новая пара"}</h2></header>
      {!card && (
        <label>
          Куда добавить
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "personal" | "group")}
          >
            <option value="personal">Мои слова</option>
            {canAddShared && groupId && <option value="group">Общие слова группы</option>}
          </select>
        </label>
      )}
      <label>
        Слово или фраза
        <textarea
          value={front}
          maxLength={2000}
          required
          readOnly={readOnly}
          onChange={(event) => setFront(event.target.value)}
        />
      </label>
      <label>
        Перевод
        <textarea
          value={back}
          maxLength={2000}
          required
          readOnly={readOnly}
          onChange={(event) => setBack(event.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {serverCopy && (
        <p className="notice">Сейчас в словаре: {serverCopy.front} — {serverCopy.back}</p>
      )}
      {card && error?.startsWith("Карточка уже изменена") && (
        <button type="button" disabled={saving} onClick={() => void reloadVersion()}>
          Загрузить актуальную версию
        </button>
      )}
      {!readOnly && (
        <button className="button" type="submit" disabled={saving || !front.trim() || !back.trim()}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      )}
      <button className="secondary-button" type="button" onClick={onCancel}>{readOnly ? "Закрыть" : "Отмена"}</button>
    </form>
  );
}
