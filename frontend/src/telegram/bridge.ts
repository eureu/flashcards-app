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
  light: {
    background: "#F9FAF6", surface: "#FFFFFF", text: "#223B31", muted: "#68736B",
    border: "#E0E6DD", subtle: "#EEF1EA", accent: "#214E40", accentText: "#FFFFFF",
    highlight: "#D7F39E", highlightText: "#253C1C", selected: "#E5EEDF",
    again: "#A13A36", againSurface: "#FBEBE7", hard: "#855316", hardSurface: "#FBF0D9",
    good: "#285C96", goodSurface: "#E9F1FB", easy: "#256447", easySurface: "#E7F2E7",
  },
  dark: {
    background: "#17241F", surface: "#203229", text: "#EEF3E8", muted: "#AFBEAD",
    border: "#37483B", subtle: "#26372C", accent: "#CCE9AA", accentText: "#213B2D",
    highlight: "#D7F39E", highlightText: "#253C1C", selected: "#31452C",
    again: "#FFB7AA", againSurface: "#452D29", hard: "#EFCD94", hardSurface: "#413824",
    good: "#B0D1FA", goodSurface: "#283B50", easy: "#B9E3AC", easySurface: "#2D422F",
  },
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
  const proposedMuted = params.hint_color ?? fallback.muted;
  const muted = sufficient(proposedMuted, background) && sufficient(proposedMuted, surface)
    ? proposedMuted
    : text;
  const root = document.documentElement.style;
  document.documentElement.dataset.theme = scheme;
  root.setProperty("color-scheme", scheme);
  root.setProperty("--color-background", background);
  root.setProperty("--color-surface", surface);
  root.setProperty("--color-text", text);
  root.setProperty("--color-muted", muted);
  root.setProperty("--color-border", fallback.border);
  root.setProperty("--color-subtle", fallback.subtle);
  root.setProperty("--color-accent", accent);
  root.setProperty("--color-accent-text", accentText);
  root.setProperty("--color-highlight", fallback.highlight);
  root.setProperty("--color-highlight-text", fallback.highlightText);
  root.setProperty("--color-selected", fallback.selected);
  root.setProperty("--color-again", fallback.again);
  root.setProperty("--color-again-surface", fallback.againSurface);
  root.setProperty("--color-hard", fallback.hard);
  root.setProperty("--color-hard-surface", fallback.hardSurface);
  root.setProperty("--color-good", fallback.good);
  root.setProperty("--color-good-surface", fallback.goodSurface);
  root.setProperty("--color-easy", fallback.easy);
  root.setProperty("--color-easy-surface", fallback.easySurface);
  root.setProperty("--safe-top", `${theme.safeAreaInset?.top ?? 0}px`);
  root.setProperty("--safe-right", `${theme.safeAreaInset?.right ?? 0}px`);
  root.setProperty("--safe-bottom", `${theme.safeAreaInset?.bottom ?? 0}px`);
  root.setProperty("--safe-left", `${theme.safeAreaInset?.left ?? 0}px`);
}

export function subscribeTelegramLayout(onChange: () => void): () => void {
  const webApp = getTelegramWebApp();
  const events = ["viewportChanged", "themeChanged", "safeAreaChanged", "contentSafeAreaChanged"];
  events.forEach((event) => webApp?.onEvent?.(event, onChange));
  return () => {
    events.forEach((event) => webApp?.offEvent?.(event, onChange));
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
