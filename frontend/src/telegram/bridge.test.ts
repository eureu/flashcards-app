import { afterEach, expect, it, vi } from "vitest";
import { applyTelegramTheme, subscribeTelegramLayout } from "./bridge";

afterEach(() => document.documentElement.removeAttribute("style"));

it("falls back when Telegram text contrast is insufficient", () => {
  applyTelegramTheme({
    colorScheme: "light",
    themeParams: { bg_color: "#ffffff", text_color: "#fefefe", button_color: "#2A6EC7" },
  });

  expect(document.documentElement.style.getPropertyValue("--color-text")).toBe("#18222D");
});

it("uses accessible semantic rating colors for Telegram dark theme", () => {
  applyTelegramTheme({ colorScheme: "dark" });

  expect(document.documentElement.style.getPropertyValue("--color-again")).toBe("#FF9C95");
  expect(document.documentElement.style.getPropertyValue("--color-hard")).toBe("#F4C275");
  expect(document.documentElement.style.getPropertyValue("--color-good")).toBe("#9DC5FF");
  expect(document.documentElement.style.getPropertyValue("--color-easy")).toBe("#8FE1B2");
});

it("falls back as complete text and button pairs and applies safe area", () => {
  applyTelegramTheme({
    colorScheme: "light",
    themeParams: {
      bg_color: "#ffffff",
      secondary_bg_color: "#ffffff",
      text_color: "#fefefe",
      button_color: "#ffffff",
      button_text_color: "#fefefe",
    },
    safeAreaInset: { top: 12, right: 4, bottom: 20, left: 4 },
  });

  const style = document.documentElement.style;
  expect(style.getPropertyValue("--color-background")).toBe("#F6F7F9");
  expect(style.getPropertyValue("--color-accent")).toBe("#2A6EC7");
  expect(style.getPropertyValue("--safe-top")).toBe("12px");
  expect(style.getPropertyValue("--safe-bottom")).toBe("20px");
});

it("unsubscribes layout listeners", () => {
  const onEvent = vi.fn();
  const offEvent = vi.fn();
  const callback = vi.fn();
  window.Telegram = { WebApp: { initData: "x", ready: vi.fn(), expand: vi.fn(), onEvent, offEvent } };

  const unsubscribe = subscribeTelegramLayout(callback);
  unsubscribe();

  expect(onEvent).toHaveBeenCalledWith("viewportChanged", callback);
  expect(offEvent).toHaveBeenCalledWith("viewportChanged", callback);
});
