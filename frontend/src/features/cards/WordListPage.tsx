import { FormEvent, useCallback, useEffect, useState } from "react";
import { CardView, deleteCard, listCards } from "../../api/cards";
import { CardEditor } from "./CardEditor";

interface WordListPageProps {
  groupId?: string;
  canAddShared: boolean;
}

export function WordListPage({ groupId, canAddShared }: WordListPageProps) {
  const [cards, setCards] = useState<CardView[]>([]);
  const [filter, setFilter] = useState<"all" | "shared" | "personal">("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CardView | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await listCards({ groupId, filter, query });
    setCards(next);
  }, [filter, groupId, query]);

  useEffect(() => {
    refresh().catch(() => setError("Не удалось загрузить словарь"));
  }, [refresh]);

  function search(event: FormEvent) {
    event.preventDefault();
    setQuery(queryInput.trim());
  }

  async function remove(card: CardView) {
    if (!window.confirm(`Удалить «${card.front}»?`)) return;
    try {
      await deleteCard(card.id, card.version);
      await refresh();
    } catch {
      setError("Не удалось удалить карточку");
    }
  }

  async function saved() {
    setEditing(null);
    await refresh();
  }

  return (
    <section aria-labelledby="dictionary-title">
      <h1 id="dictionary-title">Слова</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={search}>
        <label>
          Поиск
          <input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} />
        </label>
        <button type="submit">Найти</button>
      </form>
      {groupId && (
        <label>
          Фильтр
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as "all" | "shared" | "personal")
            }
          >
            <option value="all">Все слова</option>
            <option value="shared">Общие</option>
            <option value="personal">Мои</option>
          </select>
        </label>
      )}
      <button type="button" onClick={() => setEditing("new")}>Добавить слово</button>

      {editing && (
        <CardEditor
          card={editing === "new" ? undefined : editing}
          groupId={groupId}
          canAddShared={canAddShared}
          onSaved={saved}
          onCancel={() => setEditing(null)}
        />
      )}

      {cards.length === 0 ? <p>Слов пока нет</p> : null}
      <ul>
        {cards.map((card) => (
          <li key={card.id}>
            <span>{card.front}</span>
            <span> — {card.back}</span>
            {card.can_edit && (
              <button type="button" aria-label={`Изменить ${card.front}`} onClick={() => setEditing(card)}>
                Изменить
              </button>
            )}
            {card.can_delete && (
              <button type="button" aria-label={`Удалить ${card.front}`} onClick={() => void remove(card)}>
                Удалить
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
