import { FormEvent, useState } from "react";
import {
  CardView,
  createCard,
  updateCard,
} from "../../api/cards";

interface CardEditorProps {
  card?: CardView;
  groupId?: string;
  canAddShared: boolean;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}

export function CardEditor({
  card,
  groupId,
  canAddShared,
  onSaved,
  onCancel,
}: CardEditorProps) {
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [visibility, setVisibility] = useState<"personal" | "group">("personal");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (card) {
        await updateCard(card.id, {
          front: front.trim(),
          back: back.trim(),
          expected_version: card.version,
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

  return (
    <form onSubmit={submit}>
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
          onChange={(event) => setFront(event.target.value)}
        />
      </label>
      <label>
        Перевод
        <textarea
          value={back}
          maxLength={2000}
          required
          onChange={(event) => setBack(event.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={saving || !front.trim() || !back.trim()}>
        {saving ? "Сохраняем…" : "Сохранить"}
      </button>
      <button type="button" onClick={onCancel}>Отмена</button>
    </form>
  );
}
