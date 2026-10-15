import { afterEach, expect, it, vi } from "vitest";
import { applyTelegramTheme, subscribeTelegramLayout } from "./bridge";

afterEach(() => document.documentElement.removeAttribute("style"));

it("falls back when Telegram text contrast is insufficient", () => {
  applyTelegramTheme({
    colorScheme: "light",
    themeParams: { bg_color: "#ffffff", text_color: "#fefefe", button_color: "#214E40" },
  });

  expect(document.documentElement.style.getPropertyValue("--color-text")).toBe("#223B31");
  expect(document.documentElement.style.getPropertyValue("--color-border")).toBe("#E0E6DD");
  expect(document.documentElement.style.getPropertyValue("--color-highlight")).toBe("#D7F39E");
});

it("uses accessible semantic rating colors for Telegram dark theme", () => {
  applyTelegramTheme({ colorScheme: "dark" });

  const style = document.documentElement.style;
  expect(style.getPropertyValue("--color-again")).toBe("#FFB7AA");
  expect(style.getPropertyValue("--color-hard")).toBe("#EFCD94");
  expect(style.getPropertyValue("--color-good")).toBe("#B0D1FA");
  expect(style.getPropertyValue("--color-easy")).toBe("#B9E3AC");
  expect(style.getPropertyValue("--color-again-surface")).toBe("#452D29");
  expect(style.getPropertyValue("--color-selected")).toBe("#31452C");
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
  expect(style.getPropertyValue("--color-background")).toBe("#F9FAF6");
  expect(style.getPropertyValue("--color-accent")).toBe("#214E40");
  expect(style.getPropertyValue("--safe-top")).toBe("12px");
  expect(style.getPropertyValue("--safe-bottom")).toBe("20px");
});

it("keeps muted text readable while rating pairs stay brand-controlled", () => {
  applyTelegramTheme({
    colorScheme: "light",
    themeParams: {
      bg_color: "#777777",
      secondary_bg_color: "#777777",
      text_color: "#000000",
    },
  });

  const style = document.documentElement.style;
  expect(style.getPropertyValue("--color-muted")).toBe("#000000");
  expect(style.getPropertyValue("--color-again")).toBe("#A13A36");
  expect(style.getPropertyValue("--color-hard")).toBe("#855316");
  expect(style.getPropertyValue("--color-good")).toBe("#285C96");
  expect(style.getPropertyValue("--color-easy")).toBe("#256447");
});

it("unsubscribes layout listeners", () => {
  const onEvent = vi.fn();
  const offEvent = vi.fn();
  const callback = vi.fn();
  window.Telegram = { WebApp: { initData: "x", ready: vi.fn(), expand: vi.fn(), onEvent, offEvent } };

  const unsubscribe = subscribeTelegramLayout(callback);
  unsubscribe();

  expect(onEvent).toHaveBeenCalledWith("viewportChanged", callback);
  expect(onEvent).toHaveBeenCalledWith("safeAreaChanged", callback);
  expect(onEvent).toHaveBeenCalledWith("contentSafeAreaChanged", callback);
  expect(offEvent).toHaveBeenCalledWith("viewportChanged", callback);
  expect(offEvent).toHaveBeenCalledWith("safeAreaChanged", callback);
  expect(offEvent).toHaveBeenCalledWith("contentSafeAreaChanged", callback);
});
