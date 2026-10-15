import { useState } from "react";
import type { CardTarget } from "../../api/cards";
import { commitImport, type ImportPreview, type ImportRow, previewImport } from "../../api/imports";
import { Icon } from "../../components/Icon";

interface ImportPageProps {
  groupId?: string;
  groupName?: string;
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

export function ImportPage({ groupId, groupName, canAddShared }: ImportPageProps) {
  const [visibility, setVisibility] = useState<"personal" | "group">("personal");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [operationKey, setOperationKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const target: CardTarget = visibility === "group" && groupId
    ? { visibility: "group", group_id: groupId }
    : { visibility: "personal" };

  function chooseVisibility(next: "personal" | "group") {
    setVisibility(next);
    setPreview(null);
    setOperationKey(null);
    setRetry(false);
  }

  async function requestPreview(rows?: ImportRow[]) {
    setMessage(null);
    setRetry(false);
    setOperationKey(null);
    try {
      setPreview(await previewImport(rows ? { target, rows } : { target, text }));
    } catch {
      setMessage("Не удалось проверить список");
    }
  }

  function changeRow(index: number, change: Partial<ImportRow>) {
    if (!preview) return;
    setPreview({
      ...preview,
      rows: preview.rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...change } : row),
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
      const result = await commitImport({ target, rows: preview.rows, confirmation_token: preview.confirmation_token }, key);
      setMessage(`Добавлено карточек: ${result.created_count}`);
    } catch (caught) {
      if (typeof caught === "object" && caught !== null && "status" in caught && caught.status === 409) {
        await requestPreview(preview.rows);
        setMessage("Список изменился. Проверьте обновлённый предпросмотр.");
      } else {
        setMessage("Не удалось добавить карточки. Проверьте соединение.");
        setRetry(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="import-page" aria-labelledby="import-title">
      <header className="import-heading">
        <p className="eyebrow">Добавление</p>
        <h1 id="import-title">Добавить списком</h1>
        <p>По одной паре в строке: слово — перевод.</p>
      </header>

      <div className="destination-block">
        <span className="field-label">Куда добавить</span>
        {canAddShared && groupId ? (
          <div className="destination-tabs" aria-label="Куда добавить">
            <button aria-pressed={visibility === "personal"} onClick={() => chooseVisibility("personal")} type="button">Только мне</button>
            <button aria-pressed={visibility === "group"} onClick={() => chooseVisibility("group")} type="button">В группу</button>
          </div>
        ) : (
          <div className="destination-static"><Icon name="lock" size={16} /><span><strong>Только мне</strong><small>Личный набор</small></span></div>
        )}
        {visibility === "group" && groupName && <p className="destination-name">Общий набор: {groupName}</p>}
      </div>

      <label className="import-source">
        <span className="field-label">Список слов</span>
        <textarea
          placeholder={'Purpose - цель\nReceive - получать/принимать'}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setPreview(null);
            setOperationKey(null);
          }}
          rows={9}
        />
      </label>
      <p className="import-help">Разделитель — дефис или тире с пробелами. Пустые строки пропускаются.</p>
      <button className="button import-primary" type="button" disabled={!text.trim()} onClick={() => void requestPreview()}>
        Проверить список
      </button>

      {preview && (
        <section className="preview" aria-labelledby="preview-title">
          <header className="preview-heading">
            <div><p className="eyebrow">Шаг 2</p><h2 id="preview-title">Проверка</h2></div>
            <span>{preview.selected_count} выбрано</span>
          </header>
          <div className="preview-list">
            {preview.rows.map((row, index) => {
              const state = row.error ? "error" : row.duplicate ? "duplicate" : "valid";
              const stateLabel = state === "error" ? "Ошибка" : state === "duplicate" ? "Повтор" : "Готово";
              return (
                <fieldset className={`preview-row preview-row--${state}`} key={row.row_id}>
                  <legend>{row.original}</legend>
                  <div className="preview-row__top">
                    <label>
                      <input type="checkbox" checked={row.selected} onChange={(event) => changeRow(index, { selected: event.target.checked })} />
                      Добавить строку {row.row_id}
                    </label>
                    <span className="row-status">{stateLabel}</span>
                  </div>
                  <div className="preview-row__fields">
                    <label>Слово {row.row_id}<input value={row.front ?? ""} onChange={(event) => changeRow(index, { front: event.target.value })} /></label>
                    <label>Перевод {row.row_id}<input value={row.back ?? ""} onChange={(event) => changeRow(index, { back: event.target.value })} /></label>
                  </div>
                  {row.duplicate && (
                    <label className="duplicate-toggle"><input type="checkbox" checked={row.keep_duplicate} onChange={(event) => changeRow(index, { keep_duplicate: event.target.checked })} />Всё равно добавить дубликат</label>
                  )}
                  {row.error && <p className="row-error">{row.error}</p>}
                </fieldset>
              );
            })}
          </div>
          {!preview.confirmation_token && <button className="secondary-button import-primary" type="button" onClick={() => void requestPreview(preview.rows)}>Обновить предпросмотр</button>}
          {preview.confirmation_token && <button className="button import-primary" type="button" disabled={saving} onClick={() => void commit()}>{saving ? "Добавляем…" : `Добавить ${preview.selected_count}`}</button>}
        </section>
      )}
      {message && <p className={`notice ${retry ? "notice--error" : ""}`} role={retry ? "alert" : "status"}>{message}</p>}
      {retry && <button className="secondary-button import-primary" type="button" disabled={saving} onClick={() => void commit()}>Повторить</button>}
    </section>
  );
}
