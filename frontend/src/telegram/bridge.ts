interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function requireTelegramInitData(): string {
  const initData = getTelegramWebApp()?.initData;
  if (!initData) throw new Error("TELEGRAM_CONTEXT_MISSING");
  return initData;
}
