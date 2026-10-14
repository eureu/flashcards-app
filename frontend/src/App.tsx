import { useEffect, useState } from "react";
import { bootstrapAuth } from "./api/auth";
import { listGroups, type GroupView } from "./api/groups";
import type { Actor } from "./api/types";
import { Tabs, type AppSection } from "./components/Tabs";
import { WordListPage } from "./features/cards/WordListPage";
import { GroupPage } from "./features/groups/GroupPage";
import { ReviewPage } from "./features/learning/ReviewPage";
import { StudyHome } from "./features/learning/StudyHome";
import {
  applyTelegramTheme,
  getTelegramWebApp,
  requireTelegramInitData,
  subscribeTelegramLayout,
} from "./telegram/bridge";

export function App() {
  const [actor, setActor] = useState<Actor | null>(null);
  const [message, setMessage] = useState("Загрузка…");
  const [section, setSection] = useState<AppSection>("study");
  const [reviewing, setReviewing] = useState(false);
  const [activeGroup, setActiveGroup] = useState<GroupView | null>(null);

  useEffect(() => {
    const telegram = getTelegramWebApp();
    if (!telegram) {
      setMessage("Открой приложение в Telegram");
      return;
    }
    const syncTheme = () => applyTelegramTheme({
      colorScheme: telegram.colorScheme,
      themeParams: telegram.themeParams,
    });
    syncTheme();
    const unsubscribe = subscribeTelegramLayout(syncTheme);
    telegram.ready();
    telegram.expand();
    bootstrapAuth(requireTelegramInitData())
      .then(async (nextActor) => {
        setActor(nextActor);
        const groups = await listGroups();
        const saved = localStorage.getItem("active-group-id");
        const selected = groups.find((group) => group.id === saved) ?? null;
        if (saved && !selected) localStorage.removeItem("active-group-id");
        setActiveGroup(selected);
      })
      .catch(() => setMessage("Не удалось войти. Открой приложение заново."));
    return unsubscribe;
  }, []);

  if (!actor) return <main className="app-shell">{message}</main>;
  if (reviewing) {
    return <ReviewPage groupId={activeGroup?.id} onExit={() => setReviewing(false)} />;
  }

  return (
    <main className="app-shell">
      <p className="muted">{actor.display_name}</p>
      {section === "study" && (
        <StudyHome
          groupId={activeGroup?.id}
          groupName={activeGroup?.name}
          onStart={() => setReviewing(true)}
        />
      )}
      {section === "words" && (
        <WordListPage
          groupId={activeGroup?.id}
          canAddShared={activeGroup?.can_add_shared ?? false}
        />
      )}
      {section === "groups" && <GroupPage onSelect={setActiveGroup} />}
      <Tabs active={section} onChange={setSection} />
    </main>
  );
}
