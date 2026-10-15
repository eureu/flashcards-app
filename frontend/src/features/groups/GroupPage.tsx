import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createGroup,
  createInvitation,
  GroupView,
  joinGroup,
  leaveGroup,
  listGroups,
  previewInvitation,
} from "../../api/groups";

const ACTIVE_GROUP_KEY = "active-group-id";

interface GroupPageProps {
  activeGroupId?: string;
  initialInviteToken?: string | null;
  onSelect?: (group: GroupView | null) => void;
  onAddShared?: () => void;
}

export function GroupPage({ activeGroupId, initialInviteToken, onSelect, onAddShared }: GroupPageProps) {
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [newName, setNewName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [createdInvitation, setCreatedInvitation] = useState<{ token: string; url: string | null } | null>(null);
  const [invitedGroupName, setInvitedGroupName] = useState<string | null>(null);
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

  useEffect(() => {
    if (!initialInviteToken) return;
    setInviteToken(initialInviteToken);
    previewInvitation(initialInviteToken)
      .then((preview) => setInvitedGroupName(preview.group_name))
      .catch(() => setError("Приглашение недействительно"));
  }, [initialInviteToken]);

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

  async function joinByToken(token: string) {
    if (!token) return;
    setError(null);
    try {
      await joinGroup(token);
      setInvitedGroupName(null);
      setInviteToken("");
      await refresh();
    } catch {
      setError("Приглашение недействительно");
    }
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    void joinByToken(inviteToken.trim());
  }

  async function handleInvitation(groupId: string) {
    setError(null);
    try {
      setCreatedInvitation(await createInvitation(groupId));
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
        onSelect?.(null);
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
      {invitedGroupName && (
        <aside className="notice" aria-label="Приглашение в группу">
          <p>Вас приглашают в группу «{invitedGroupName}».</p>
          <button type="button" onClick={() => void joinByToken(inviteToken.trim())}>
            Вступить по приглашению
          </button>
        </aside>
      )}
      <button
        type="button"
        aria-current={activeGroupId ? undefined : "true"}
        onClick={() => {
          localStorage.removeItem(ACTIVE_GROUP_KEY);
          onSelect?.(null);
        }}
      >
        Учить только личные слова
      </button>

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

      {createdInvitation && (
        <div className="notice">
          <p>Код приглашения: {createdInvitation.token}</p>
          {createdInvitation.url && <a href={createdInvitation.url}>Открыть ссылку приглашения</a>}
        </div>
      )}

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
            aria-current={activeGroupId === group.id ? "true" : undefined}
            onClick={() => {
              localStorage.setItem(ACTIVE_GROUP_KEY, group.id);
              onSelect?.(group);
            }}
          >
            Выбрать для занятий
          </button>
          {group.can_add_shared && (
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(ACTIVE_GROUP_KEY, group.id);
                onSelect?.(group);
                onAddShared?.();
              }}
            >
              Добавить общие слова
            </button>
          )}
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
