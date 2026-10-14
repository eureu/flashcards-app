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
              bg_color: "#17212b",
              secondary_bg_color: "#202b36",
              text_color: "#f3f6fa",
              hint_color: "#adb9c5",
              button_color: "#6ab2f2",
              button_text_color: "#17212b",
            }
          : {
              bg_color: "#f6f7f9",
              secondary_bg_color: "#ffffff",
              text_color: "#18222d",
              hint_color: "#53616f",
              button_color: "#2a6ec7",
              button_text_color: "#ffffff",
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
