import { useEffect, useState } from "react";
import { bootstrapAuth } from "./api/auth";
import type { Actor } from "./api/types";
import { getTelegramWebApp, requireTelegramInitData } from "./telegram/bridge";
import { GroupPage } from "./features/groups/GroupPage";

export function App() {
  const [actor, setActor] = useState<Actor | null>(null);
  const [message, setMessage] = useState("Загрузка…");

  useEffect(() => {
    const telegram = getTelegramWebApp();
    if (!telegram) {
      setMessage("Открой приложение в Telegram");
      return;
    }
    telegram.ready();
    telegram.expand();
    bootstrapAuth(requireTelegramInitData())
      .then(setActor)
      .catch(() => setMessage("Не удалось войти. Открой приложение заново."));
  }, []);

  if (!actor) return <main>{message}</main>;
  return (
    <main>
      <p>Привет, {actor.display_name}</p>
      <GroupPage />
    </main>
  );
}
