import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createGroup,
  createInvitation,
  GroupView,
  joinGroup,
  leaveGroup,
  listGroups,
} from "../../api/groups";

const ACTIVE_GROUP_KEY = "active-group-id";

export function GroupPage() {
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [newName, setNewName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const nextGroups = await listGroups();
    const saved = localStorage.getItem(ACTIVE_GROUP_KEY);
    if (saved && !nextGroups.some((group) => group.id === saved)) {
      localStorage.removeItem(ACTIVE_GROUP_KEY);
    }
    setGroups(nextGroups);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setError("Не удалось загрузить группы");
      setLoading(false);
    });
  }, [refresh]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError(null);
    try {
      await createGroup(name);
      setNewName("");
      await refresh();
    } catch {
      setError("Не удалось создать группу");
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const token = inviteToken.trim();
    if (!token) return;
    setError(null);
    try {
      await joinGroup(token);
      setInviteToken("");
      await refresh();
    } catch {
      setError("Приглашение недействительно");
    }
  }

  async function handleInvitation(groupId: string) {
    setError(null);
    try {
      setCreatedToken(await createInvitation(groupId));
    } catch {
      setError("Не удалось создать приглашение");
    }
  }

  async function handleLeave(groupId: string) {
    setError(null);
    try {
      await leaveGroup(groupId);
      if (localStorage.getItem(ACTIVE_GROUP_KEY) === groupId) {
        localStorage.removeItem(ACTIVE_GROUP_KEY);
      }
      await refresh();
    } catch {
      setError("Не удалось выйти из группы");
    }
  }

  if (loading) return <p>Загрузка групп…</p>;

  return (
    <section aria-labelledby="groups-title">
      <h1 id="groups-title">Группы</h1>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleCreate}>
        <label>
          Название новой группы
          <input
            value={newName}
            maxLength={120}
            onChange={(event) => setNewName(event.target.value)}
          />
        </label>
        <button type="submit">Создать группу</button>
      </form>

      <form onSubmit={handleJoin}>
        <label>
          Код приглашения
          <input value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} />
        </label>
        <button type="submit">Вступить</button>
      </form>

      {createdToken && <p>Код приглашения: {createdToken}</p>}

      {groups.length === 0 ? <p>Пока нет групп</p> : null}
      {groups.map((group) => (
        <article key={group.id}>
          <h2>{group.name}</h2>
          <ul aria-label={`Участники группы ${group.name}`}>
            {group.members.map((member) => (
              <li key={member.user_id}>{member.display_name}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => localStorage.setItem(ACTIVE_GROUP_KEY, group.id)}
          >
            Выбрать для занятий
          </button>
          {group.can_add_shared && <button type="button">Добавить общие слова</button>}
          {group.is_owner ? (
            <button type="button" onClick={() => void handleInvitation(group.id)}>
              Создать приглашение
            </button>
          ) : (
            <button type="button" onClick={() => void handleLeave(group.id)}>
              Выйти из группы
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
