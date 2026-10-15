import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CardView, deleteCard, listCards } from "../../api/cards";
import { ActionSheet } from "../../components/ActionSheet";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Icon } from "../../components/Icon";
import { CardEditor } from "./CardEditor";
import { ImportPage } from "../imports/ImportPage";

interface WordListPageProps {
  groupId?: string;
  groupName?: string;
  canAddShared: boolean;
  openAddWords?: boolean;
  onAddWordsOpened?: () => void;
}

type CardFilter = "all" | "shared" | "personal";

export function WordListPage({ groupId, groupName, canAddShared, openAddWords = false, onAddWordsOpened }: WordListPageProps) {
  const [cards, setCards] = useState<CardView[]>([]);
  const [filter, setFilter] = useState<CardFilter>("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CardView | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<CardView | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const next = await listCards({ groupId, filter, query });
    setCards(next);
  }, [filter, groupId, query]);

  useEffect(() => {
    refresh().catch(() => setError("Не удалось загрузить словарь"));
  }, [refresh]);

  useEffect(() => {
    if (!openAddWords) return;
    setAddOpen(true);
    onAddWordsOpened?.();
  }, [onAddWordsOpened, openAddWords]);

  function search(event: FormEvent) {
    event.preventDefault();
    setQuery(queryInput.trim());
  }

  function clearSearch() {
    setQueryInput("");
    setQuery("");
  }

  async function confirmRemove() {
    if (!deleting) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await deleteCard(deleting.id, deleting.version);
      setDeleting(null);
      await refresh();
    } catch {
      setDeleteError("Не удалось удалить карточку");
    } finally {
      setDeletePending(false);
    }
  }

  function askToRemove(card: CardView) {
    setDeleteError(null);
    setDeleting(card);
  }

  async function saved() {
    setEditing(null);
    await refresh();
  }

  function openSingle() {
    setImporting(false);
    setEditing("new");
    setAddOpen(false);
  }

  function openImport() {
    setEditing(null);
    setImporting(true);
    setAddOpen(false);
  }

  return (
    <section className="dictionary" aria-labelledby="dictionary-title">
      <header className="page-heading">
        <div><p className="eyebrow">Ваш набор</p><h1 id="dictionary-title">Слова</h1></div>
        <button ref={addButtonRef} aria-label="Добавить слова" className="add-button" onClick={() => setAddOpen(true)} type="button">
          <Icon name="plus" size={22} />
        </button>
      </header>

      {error && <p className="notice notice--error" role="alert">{error}</p>}

      <form className="search-box" onSubmit={search} role="search">
        <Icon name="search" size={18} />
        <label className="visually-hidden" htmlFor="dictionary-search">Поиск по словам и переводам</label>
        <input
          id="dictionary-search"
          placeholder="Найти слово или перевод"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
        />
        {queryInput && <button aria-label="Очистить поиск" onClick={clearSearch} type="button"><Icon name="close" size={16} /></button>}
        <button className="visually-hidden" type="submit">Найти</button>
      </form>

      {groupId && (
        <div className="filter-tabs" aria-label="Фильтр слов">
          {([['all', 'Все'], ['shared', 'Общие'], ['personal', 'Личные']] as Array<[CardFilter, string]>).map(([value, label]) => (
            <button aria-pressed={filter === value} key={value} onClick={() => setFilter(value)} type="button">{label}</button>
          ))}
        </div>
      )}

      {importing && (
        <div className="work-panel">
          <button className="panel-close" onClick={() => setImporting(false)} type="button">Закрыть импорт</button>
          <ImportPage groupId={groupId} groupName={groupName} canAddShared={canAddShared} />
        </div>
      )}

      {editing && (
        <div className="work-panel">
          <CardEditor
            card={editing === "new" ? undefined : editing}
            groupId={groupId}
            canAddShared={canAddShared}
            readOnly={editing !== "new" && !editing.can_edit}
            onSaved={saved}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {!importing && !editing && cards.length === 0 && (
        <div className="dictionary-empty">
          <p>{query ? "Ничего не найдено" : "Слов пока нет"}</p>
          <span>{query ? "Измените запрос или очистите поиск." : "Добавьте первую пару или вставьте готовый список."}</span>
        </div>
      )}

      {!importing && !editing && cards.length > 0 && (
        <ul className="word-list">
          {cards.map((card) => (
            <li className="word-row" key={card.id}>
              <button className="word-row__copy" type="button" aria-label={`Открыть карточку ${card.front}`} onClick={() => setEditing(card)}>
                <strong>{card.front}</strong>
                <span>{card.back}</span>
              </button>
              <div className="word-row__scope">
                <span className="scope-label"><Icon name={card.visibility === "group" ? "groups" : "lock"} size={13} />{card.visibility === "group" ? "Общая" : "Личная"}</span>
                <div className="word-row__actions">
                  {card.can_edit && (
                    <button type="button" aria-label={`Изменить ${card.front}`} onClick={() => setEditing(card)}><Icon name="edit" size={17} /></button>
                  )}
                  {card.can_delete && (
                    <button type="button" aria-label={`Удалить ${card.front}`} onClick={() => askToRemove(card)}><Icon name="trash" size={17} /></button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ActionSheet open={addOpen} onClose={() => setAddOpen(false)} returnFocusRef={addButtonRef} title="Добавить слова">
        <button onClick={openImport} type="button"><span className="sheet-action__icon"><Icon name="list" size={21} /></span><span><strong>Вставить список</strong><small>Несколько пар за один раз</small></span><Icon name="chevron" size={18} /></button>
        <button aria-label="Добавить слово" onClick={openSingle} type="button"><span className="sheet-action__icon"><Icon name="plus" size={21} /></span><span><strong>Добавить одну пару</strong><small>Слово и перевод вручную</small></span><Icon name="chevron" size={18} /></button>
      </ActionSheet>

      {deleting && (
        <ConfirmDialog title="Удалить карточку" error={deleteError} pending={deletePending} pendingLabel="Удаляем…" onCancel={() => setDeleting(null)} onConfirm={() => void confirmRemove()}>
          <h2>Удалить карточку?</h2>
          <p>Удалить {deleting.visibility === "group" ? "общую" : "личную"} карточку «{deleting.front} — {deleting.back}»?</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
