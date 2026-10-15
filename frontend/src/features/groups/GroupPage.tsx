import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createGroup, createInvitation, type GroupView, joinGroup, leaveGroup, listGroups, previewInvitation,
} from "../../api/groups";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Icon } from "../../components/Icon";

const ACTIVE_GROUP_KEY = "active-group-id";

interface GroupPageProps {
  activeGroupId?: string;
  initialInviteToken?: string | null;
  onSelect?: (group: GroupView | null) => void;
  onAddShared?: () => void;
}

function memberLabel(count: number): string {
  const last = count % 10;
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} участников`;
  if (last === 1) return `${count} участник`;
  if (last >= 2 && last <= 4) return `${count} участника`;
  return `${count} участников`;
}

export function GroupPage({ activeGroupId, initialInviteToken, onSelect, onAddShared }: GroupPageProps) {
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [newName, setNewName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [createdInvitation, setCreatedInvitation] = useState<{ token: string; url: string | null } | null>(null);
  const [invitedGroupName, setInvitedGroupName] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<GroupView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const nextGroups = await listGroups();
    const saved = localStorage.getItem(ACTIVE_GROUP_KEY);
    if (saved && !nextGroups.some((group) => group.id === saved)) localStorage.removeItem(ACTIVE_GROUP_KEY);
    setGroups(nextGroups);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => { setError("Не удалось загрузить группы"); setLoading(false); });
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
    try { await createGroup(name); setNewName(""); await refresh(); }
    catch { setError("Не удалось создать группу"); }
  }

  async function joinByToken(token: string) {
    if (!token) return;
    setError(null);
    try { await joinGroup(token); setInvitedGroupName(null); setInviteToken(""); await refresh(); }
    catch { setError("Приглашение недействительно"); }
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    void joinByToken(inviteToken.trim());
  }

  async function handleInvitation(groupId: string) {
    setError(null);
    try { setCreatedInvitation(await createInvitation(groupId)); }
    catch { setError("Не удалось создать приглашение"); }
  }

  async function confirmLeave() {
    if (!leaving) return;
    setError(null);
    try {
      await leaveGroup(leaving.id);
      if (localStorage.getItem(ACTIVE_GROUP_KEY) === leaving.id) {
        localStorage.removeItem(ACTIVE_GROUP_KEY);
        onSelect?.(null);
      }
      setLeaving(null);
      await refresh();
    } catch { setError("Не удалось выйти из группы"); }
  }

  function selectGroup(group: GroupView | null) {
    if (group) localStorage.setItem(ACTIVE_GROUP_KEY, group.id);
    else localStorage.removeItem(ACTIVE_GROUP_KEY);
    onSelect?.(group);
  }

  if (loading) return <p className="page-loading">Загрузка групп…</p>;

  return (
    <section className="groups-page" aria-labelledby="groups-title">
      <header className="page-heading"><div><p className="eyebrow">Совместное обучение</p><h1 id="groups-title">Группы</h1></div></header>
      {error && <p className="notice notice--error" role="alert">{error}</p>}

      {invitedGroupName && (
        <aside className="invite-banner" aria-label="Приглашение в группу">
          <span className="invite-banner__icon"><Icon name="groups" size={21} /></span>
          <div><strong>Вас приглашают в группу «{invitedGroupName}».</strong><small>Общие слова станут доступны после вступления.</small></div>
          <button className="button" type="button" onClick={() => void joinByToken(inviteToken.trim())}>Вступить по приглашению</button>
        </aside>
      )}

      <button aria-label="Учить только личные слова" className={`personal-set ${activeGroupId ? "" : "personal-set--active"}`} aria-current={activeGroupId ? undefined : "true"} type="button" onClick={() => selectGroup(null)}>
        <span className="personal-set__icon"><Icon name="lock" size={19} /></span>
        <span><strong>Личные слова</strong><small>Учить только свой набор</small></span>
        {!activeGroupId && <span className="selected-mark">✓</span>}
      </button>

      <div className="group-list">
        {groups.length === 0 && <p className="muted">Пока нет групп</p>}
        {groups.map((group) => (
          <article className={`group-card ${activeGroupId === group.id ? "group-card--active" : ""}`} key={group.id}>
            <header>
              <div><h2>{group.name}</h2><p>{memberLabel(group.members.length)}</p></div>
              {activeGroupId === group.id && <span className="active-badge">Выбрана</span>}
            </header>
            <ul className="member-list" aria-label={`Участники группы ${group.name}`}>
              {group.members.map((member) => (
                <li key={member.user_id}>
                  <span className="member-avatar">{member.display_name.trim().charAt(0).toLocaleUpperCase("ru-RU")}</span>
                  <strong>{member.display_name}</strong>
                  {member.user_id === group.owner_id && <span className="owner-badge">Создатель</span>}
                </li>
              ))}
            </ul>
            <div className="group-actions">
              <button className="secondary-button" type="button" aria-current={activeGroupId === group.id ? "true" : undefined} onClick={() => selectGroup(group)}>Выбрать для занятий</button>
              {group.can_add_shared && <button className="button" type="button" onClick={() => { selectGroup(group); onAddShared?.(); }}>Добавить общие слова</button>}
              {group.is_owner
                ? <button className="text-button" type="button" onClick={() => void handleInvitation(group.id)}>Создать приглашение</button>
                : <button className="text-button text-button--danger" type="button" onClick={() => setLeaving(group)}>Выйти из группы</button>}
            </div>
          </article>
        ))}
      </div>

      {createdInvitation && (
        <div className="invite-result" role="status">
          <p>Код приглашения: {createdInvitation.token}</p>
          {createdInvitation.url && <a href={createdInvitation.url}>Открыть ссылку приглашения</a>}
        </div>
      )}

      <section className="group-setup" aria-labelledby="group-setup-title">
        <div><p className="eyebrow">Ещё один набор</p><h2 id="group-setup-title">Добавить группу</h2></div>
        <form onSubmit={handleCreate}>
          <label>Название новой группы<input value={newName} maxLength={120} onChange={(event) => setNewName(event.target.value)} /></label>
          <button className="button" type="submit">Создать группу</button>
        </form>
        <div className="setup-divider"><span>или</span></div>
        <form onSubmit={handleJoin}>
          <label>Код приглашения<input value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} /></label>
          <button className="secondary-button" type="submit">Вступить</button>
        </form>
      </section>

      {leaving && (
        <ConfirmDialog confirmLabel="Выйти" onCancel={() => setLeaving(null)} onConfirm={() => void confirmLeave()}>
          <h2>Выйти из группы?</h2>
          <p>Общие слова «{leaving.name}» исчезнут из вашего набора. Личные слова и ваш прогресс сохранятся.</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
