import { createHmac } from "node:crypto";
import type { Page } from "@playwright/test";

export const BOT_TOKEN = "123456:test-bot-token";

export function signedInitData(
  telegramId: number,
  firstName: string,
  botToken = BOT_TOKEN,
): string {
  const fields = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: `e2e-${telegramId}`,
    user: JSON.stringify({ id: telegramId, first_name: firstName }),
  });
  const dataCheckString = [...fields.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  fields.set("hash", createHmac("sha256", secret).update(dataCheckString).digest("hex"));
  return fields.toString();
}

export async function installTelegram(
  page: Page,
  telegramId: number,
  firstName: string,
  colorScheme: "light" | "dark" = "light",
): Promise<void> {
  const initData = signedInitData(telegramId, firstName);
  await page.route("https://telegram.org/js/telegram-web-app.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await page.addInitScript(({ data, scheme }) => {
    const callbacks = new Map<string, Set<() => void>>();
    window.Telegram = {
      WebApp: {
        initData: data,
        colorScheme: scheme,
        themeParams: scheme === "dark"
          ? {
              bg_color: "#17241F",
              secondary_bg_color: "#203229",
              text_color: "#EEF3E8",
              hint_color: "#AFBEAD",
              button_color: "#CCE9AA",
              button_text_color: "#213B2D",
            }
          : {
              bg_color: "#F9FAF6",
              secondary_bg_color: "#FFFFFF",
              text_color: "#223B31",
              hint_color: "#5F6A62",
              button_color: "#214E40",
              button_text_color: "#FFFFFF",
            },
        ready() {},
        expand() {},
        onEvent(event: string, callback: () => void) {
          const entries = callbacks.get(event) ?? new Set();
          entries.add(callback);
          callbacks.set(event, entries);
        },
        offEvent(event: string, callback: () => void) {
          callbacks.get(event)?.delete(callback);
        },
        BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
      },
    };
  }, { data: initData, scheme: colorScheme });
}
