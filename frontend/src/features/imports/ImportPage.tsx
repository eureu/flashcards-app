import { useState } from "react";
import type { CardTarget } from "../../api/cards";
import {
  commitImport,
  ImportPreview,
  ImportRow,
  previewImport,
} from "../../api/imports";

interface ImportPageProps {
  groupId?: string;
  canAddShared: boolean;
}

function newOperationKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ImportPage({ groupId, canAddShared }: ImportPageProps) {
  const [visibility, setVisibility] = useState<"personal" | "group">("personal");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [operationKey, setOperationKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const target: CardTarget =
    visibility === "group" && groupId
      ? { visibility: "group", group_id: groupId }
      : { visibility: "personal" };

  async function requestPreview(rows?: ImportRow[]) {
    setMessage(null);
    setRetry(false);
    setOperationKey(null);
    try {
      const next = await previewImport(rows ? { target, rows } : { target, text });
      setPreview(next);
    } catch {
      setMessage("Не удалось проверить список");
    }
  }

  function changeRow(index: number, change: Partial<ImportRow>) {
    if (!preview) return;
    setPreview({
      ...preview,
      rows: preview.rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...change } : row,
      ),
      confirmation_token: null,
    });
    setOperationKey(null);
    setRetry(false);
  }

  async function commit() {
    if (!preview?.confirmation_token) return;
    const key = operationKey ?? newOperationKey();
    if (!operationKey) setOperationKey(key);
    setSaving(true);
    setRetry(false);
    setMessage(null);
    try {
      const result = await commitImport(
        {
          target,
          rows: preview.rows,
          confirmation_token: preview.confirmation_token,
        },
        key,
      );
      setMessage(`Добавлено карточек: ${result.created_count}`);
    } catch {
      setMessage("Не удалось добавить карточки. Проверьте соединение.");
      setRetry(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="import-title">
      <h1 id="import-title">Добавить списком</h1>
      <label>
        Куда добавить
        <select
          value={visibility}
          onChange={(event) => {
            setVisibility(event.target.value as "personal" | "group");
            setPreview(null);
            setOperationKey(null);
          }}
        >
          <option value="personal">Мои слова</option>
          {canAddShared && groupId && <option value="group">Общие слова группы</option>}
        </select>
      </label>
      <label>
        Список слов
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setPreview(null);
            setOperationKey(null);
          }}
          rows={10}
        />
      </label>
      <button type="button" disabled={!text.trim()} onClick={() => void requestPreview()}>
        Проверить список
      </button>

      {preview && (
        <div>
          {preview.rows.map((row, index) => (
            <fieldset key={row.row_id}>
              <legend>{row.original}</legend>
              <label>
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(event) => changeRow(index, { selected: event.target.checked })}
                />
                Добавить строку {row.row_id}
              </label>
              <label>
                Слово {row.row_id}
                <input
                  value={row.front ?? ""}
                  onChange={(event) => changeRow(index, { front: event.target.value })}
                />
              </label>
              <label>
                Перевод {row.row_id}
                <input
                  value={row.back ?? ""}
                  onChange={(event) => changeRow(index, { back: event.target.value })}
                />
              </label>
              {row.duplicate && (
                <label>
                  <input
                    type="checkbox"
                    checked={row.keep_duplicate}
                    onChange={(event) =>
                      changeRow(index, { keep_duplicate: event.target.checked })
                    }
                  />
                  Всё равно добавить дубликат
                </label>
              )}
              {row.error && <p>{row.error}</p>}
            </fieldset>
          ))}
          {!preview.confirmation_token && (
            <button type="button" onClick={() => void requestPreview(preview.rows)}>
              Обновить предпросмотр
            </button>
          )}
          {preview.confirmation_token && (
            <button type="button" disabled={saving} onClick={() => void commit()}>
              {saving ? "Добавляем…" : `Добавить ${preview.selected_count}`}
            </button>
          )}
        </div>
      )}
      {message && <p role={retry ? "alert" : "status"}>{message}</p>}
      {retry && (
        <button type="button" disabled={saving} onClick={() => void commit()}>
          Повторить
        </button>
      )}
    </section>
  );
}
