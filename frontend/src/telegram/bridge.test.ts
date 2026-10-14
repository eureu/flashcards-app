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
