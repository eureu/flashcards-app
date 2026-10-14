import { expect, request, test } from "@playwright/test";
import { installTelegram, signedInitData } from "./telegram";

test("повтор оценки после потерянного ответа создаёт одно событие", async ({ baseURL }) => {
  const userId = 2100000000 + (Date.now() % 1000000);
  const client = await request.newContext({ baseURL });
  const auth = await client.post("/api/auth/telegram", {
    data: { init_data: signedInitData(userId, "Повтор") },
  });
  const token = (await auth.json()).access_token as string;
  const headers = { Authorization: `Bearer ${token}` };
  const cardResponse = await client.post("/api/cards", {
    headers,
    data: { target: { visibility: "personal" }, front: "Retry", back: "Повтор" },
  });
  const card = await cardResponse.json();
  const operationKey = crypto.randomUUID();
  const command = {
    card_id: card.id,
    direction: "en_ru",
    rating: 1,
    group_id: null,
    expected_content_version: 1,
    expected_state_version: 0,
  };
  const first = await client.post("/api/learning/reviews", {
    headers: { ...headers, "Idempotency-Key": operationKey }, data: command,
  });
  const second = await client.post("/api/learning/reviews", {
    headers: { ...headers, "Idempotency-Key": operationKey }, data: command,
  });
  expect(first.ok()).toBeTruthy();
  expect(second.ok()).toBeTruthy();
  expect((await second.json()).event_id).toBe((await first.json()).event_id);
  await client.dispose();
});

test("карточка, оценки и ошибка помещаются на узком экране", async ({ page, baseURL }, testInfo) => {
  const dark = testInfo.project.name.includes("dark");
  await page.setViewportSize({ width: 320, height: 720 });
  await installTelegram(page, 2200000001, "Визуальная проверка", dark ? "dark" : "light");
  let reviewFailed = false;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/telegram") {
      return route.fulfill({ json: { access_token: "visual", token_type: "bearer", expires_in: 3600, user: { user_id: "u", telegram_id: 2200000001, display_name: "Визуальная проверка" } } });
    }
    if (url.pathname === "/api/groups") return route.fulfill({ json: [] });
    if (url.pathname === "/api/learning/summary") return route.fulfill({ json: { due_count: 1, new_count: 0, can_start: true } });
    if (url.pathname === "/api/learning/next") return route.fulfill({ json: { card_id: "11111111-1111-4111-8111-111111111111", direction: "en_ru", question: "A deliberately long phrase that must wrap without horizontal overflow on a narrow mobile screen", answer: "Намеренно длинная фраза, которая должна переноситься без горизонтального переполнения", content_version: 1, state_version: 0 } });
    if (url.pathname === "/api/learning/reviews") {
      reviewFailed = true;
      return route.abort("failed");
    }
    return route.fulfill({ status: 404, json: { error: { code: "NOT_FOUND", message: "Нет", details: {} } } });
  });
  await page.goto(baseURL!);
  await page.getByRole("button", { name: "Начать" }).click();
  await expect(page.locator(".flash-card")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("card-closed-320.png"), fullPage: true });
  await page.getByRole("button", { name: "Показать перевод" }).click();
  await expect(page.getByRole("button", { name: "Не вспомнил" })).toBeVisible();
  const cardBox = await page.locator(".flash-card").boundingBox();
  const ratingsBox = await page.locator(".ratings").boundingBox();
  expect(ratingsBox!.y).toBeGreaterThanOrEqual(cardBox!.y + cardBox!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("card-revealed-320.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Не вспомнил" }).click();
  await expect.poll(() => reviewFailed).toBeTruthy();
  await expect(page.getByRole("alert")).toContainText("Оценка не отправлена");
  await page.screenshot({ path: testInfo.outputPath("review-error-320.png"), fullPage: true });

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Повторить отправку" })).toBeFocused();
  const contrast = await page.evaluate(() => {
    const rgb = (value: string) => value.match(/\d+/g)!.slice(0, 3).map(Number);
    const luminance = (value: string) => rgb(value).map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const style = getComputedStyle(document.documentElement);
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test.describe("темы и ширины", () => {
  for (const [name, width, scheme] of [["light-390", 390, "light"], ["dark-390", 390, "dark"], ["dark-320", 320, "dark"]] as const) {
    test(name, async ({ page, baseURL }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      const userId = name === "light-390" ? 2200000002 : name === "dark-390" ? 2200000003 : 2200000004;
      await installTelegram(page, userId, name, scheme);
      await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/auth/telegram") return route.fulfill({ json: { access_token: "theme", token_type: "bearer", expires_in: 3600, user: { user_id: "u", telegram_id: 1, display_name: name } } });
        if (path === "/api/groups") return route.fulfill({ json: [] });
        if (path === "/api/learning/summary") return route.fulfill({ json: { due_count: 0, new_count: 1, can_start: true } });
        if (path === "/api/learning/next") return route.fulfill({ json: { card_id: "11111111-1111-4111-8111-111111111111", direction: "ru_en", question: "свидетельство", answer: "Testimony", content_version: 1, state_version: 0 } });
        return route.fulfill({ status: 204 });
      });
      await page.goto(baseURL!);
      await page.getByRole("button", { name: "Начать" }).click();
      await page.locator(".flash-card").click();
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: "disabled" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    });
  }
});
