interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  colorScheme?: "light" | "dark";
  themeParams?: TelegramThemeParams;
  safeAreaInset?: { top?: number; right?: number; bottom?: number; left?: number };
  contentSafeAreaInset?: { top?: number; right?: number; bottom?: number; left?: number };
  onEvent?(event: string, callback: () => void): void;
  offEvent?(event: string, callback: () => void): void;
  BackButton?: {
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
}

export interface TelegramThemeParams {
  bg_color?: string;
  secondary_bg_color?: string;
  text_color?: string;
  hint_color?: string;
  button_color?: string;
  button_text_color?: string;
}

export interface TelegramTheme {
  colorScheme?: "light" | "dark";
  themeParams?: TelegramThemeParams;
  safeAreaInset?: { top?: number; right?: number; bottom?: number; left?: number };
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

const FALLBACK = {
  light: { background: "#F6F7F9", surface: "#FFFFFF", text: "#18222D", muted: "#53616F", accent: "#2A6EC7", accentText: "#FFFFFF", again: "#B42318", hard: "#8A4B00", good: "#1D4ED8", easy: "#166534" },
  dark: { background: "#17212B", surface: "#202B36", text: "#F3F6FA", muted: "#ADB9C5", accent: "#6AB2F2", accentText: "#17212B", again: "#FF9C95", hard: "#F4C275", good: "#9DC5FF", easy: "#8FE1B2" },
};

function rgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number | null {
  const channels = rgb(hex);
  if (!channels) return null;
  const values = channels.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function sufficient(text: string, background: string): boolean {
  const a = luminance(text);
  const b = luminance(background);
  if (a === null || b === null) return false;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5;
}

export function applyTelegramTheme(theme: TelegramTheme): void {
  const scheme = theme.colorScheme === "dark" ? "dark" : "light";
  const fallback = FALLBACK[scheme];
  const params = theme.themeParams ?? {};
  let background = params.bg_color ?? fallback.background;
  let surface = params.secondary_bg_color ?? fallback.surface;
  const proposedText = params.text_color ?? fallback.text;
  let text = proposedText;
  if (!sufficient(text, background) || !sufficient(text, surface)) {
    background = fallback.background;
    surface = fallback.surface;
    text = fallback.text;
  }
  let accent = params.button_color ?? fallback.accent;
  let accentText = params.button_text_color ?? fallback.accentText;
  if (!sufficient(accentText, accent)) {
    accent = fallback.accent;
    accentText = fallback.accentText;
  }
  const root = document.documentElement.style;
  root.setProperty("--color-background", background);
  root.setProperty("--color-surface", surface);
  root.setProperty("--color-text", text);
  root.setProperty("--color-muted", params.hint_color && sufficient(params.hint_color, background) && sufficient(params.hint_color, surface) ? params.hint_color : fallback.muted);
  root.setProperty("--color-accent", accent);
  root.setProperty("--color-accent-text", accentText);
  root.setProperty("--color-again", fallback.again);
  root.setProperty("--color-hard", fallback.hard);
  root.setProperty("--color-good", fallback.good);
  root.setProperty("--color-easy", fallback.easy);
  root.setProperty("--safe-top", `${theme.safeAreaInset?.top ?? 0}px`);
  root.setProperty("--safe-right", `${theme.safeAreaInset?.right ?? 0}px`);
  root.setProperty("--safe-bottom", `${theme.safeAreaInset?.bottom ?? 0}px`);
  root.setProperty("--safe-left", `${theme.safeAreaInset?.left ?? 0}px`);
}

export function subscribeTelegramLayout(onChange: () => void): () => void {
  const webApp = getTelegramWebApp();
  webApp?.onEvent?.("viewportChanged", onChange);
  webApp?.onEvent?.("themeChanged", onChange);
  return () => {
    webApp?.offEvent?.("viewportChanged", onChange);
    webApp?.offEvent?.("themeChanged", onChange);
  };
}

export function setTelegramBackAction(action: (() => void) | null): () => void {
  const back = getTelegramWebApp()?.BackButton;
  if (!back || !action) return () => undefined;
  back.onClick(action);
  back.show();
  return () => {
    back.offClick(action);
    back.hide();
  };
}
