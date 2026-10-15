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

test("два одновременных изменения карточки дают один конфликт версии", async ({ baseURL }) => {
  const userId = 2150000000 + (Date.now() % 1000000);
  const client = await request.newContext({ baseURL });
  const auth = await client.post("/api/auth/telegram", {
    data: { init_data: signedInitData(userId, "Конкурентное изменение") },
  });
  const token = (await auth.json()).access_token as string;
  const headers = { Authorization: `Bearer ${token}` };
  const created = await client.post("/api/cards", {
    headers,
    data: { target: { visibility: "personal" }, front: "Concurrent", back: "Исходный" },
  });
  const card = await created.json();

  const responses = await Promise.all([
    client.patch(`/api/cards/${card.id}`, {
      headers,
      data: { front: "Concurrent", back: "Первый", expected_version: card.version },
    }),
    client.patch(`/api/cards/${card.id}`, {
      headers,
      data: { front: "Concurrent", back: "Второй", expected_version: card.version },
    }),
  ]);

  expect(responses.map((response) => response.status()).sort()).toEqual([200, 409]);
  await client.dispose();
});

test("две одновременные оценки одного задания дают один конфликт состояния", async ({ baseURL }) => {
  const userId = 2160000000 + (Date.now() % 1000000);
  const client = await request.newContext({ baseURL });
  const auth = await client.post("/api/auth/telegram", {
    data: { init_data: signedInitData(userId, "Конкурентная оценка") },
  });
  const token = (await auth.json()).access_token as string;
  const headers = { Authorization: `Bearer ${token}` };
  const created = await client.post("/api/cards", {
    headers,
    data: { target: { visibility: "personal" }, front: "Race", back: "Гонка" },
  });
  const card = await created.json();
  const command = {
    card_id: card.id,
    direction: "en_ru",
    rating: 1,
    group_id: null,
    expected_content_version: card.version,
    expected_state_version: 0,
  };

  const responses = await Promise.all([
    client.post("/api/learning/reviews", {
      headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
      data: command,
    }),
    client.post("/api/learning/reviews", {
      headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
      data: command,
    }),
  ]);

  expect(responses.map((response) => response.status()).sort()).toEqual([200, 409]);
  await client.dispose();
});

test("Telegram start_param сразу открывает приглашение в группу", async ({ page, baseURL }) => {
  await installTelegram(page, 2180000001, "Приглашённый");
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/telegram") {
      return route.fulfill({
        json: {
          access_token: "invite",
          token_type: "bearer",
          expires_in: 3600,
          user: { user_id: "u", telegram_id: 2180000001, display_name: "Приглашённый" },
          start_param: "invite-token",
        },
      });
    }
    if (path === "/api/groups") return route.fulfill({ json: [] });
    if (path === "/api/invitations/invite-token") {
      return route.fulfill({ json: { group_name: "Friends" } });
    }
    return route.fulfill({ status: 404, json: { error: { code: "NOT_FOUND", message: "Нет", details: {} } } });
  });

  await page.goto(baseURL!);

  await expect(page.getByText("Вас приглашают в группу «Friends»." )).toBeVisible();
  await expect(page.getByRole("button", { name: "Группы" })).toHaveAttribute("aria-current", "page");
});

test("потерянный после commit ответ повторяется тем же ключом", async ({ page, baseURL }) => {
  const userId = 2170000000 + (Date.now() % 1000000);
  const client = await request.newContext({ baseURL });
  const auth = await client.post("/api/auth/telegram", {
    data: { init_data: signedInitData(userId, "Потерянный ответ") },
  });
  const token = (await auth.json()).access_token as string;
  await client.post("/api/cards", {
    headers: { Authorization: `Bearer ${token}` },
    data: { target: { visibility: "personal" }, front: "Committed", back: "Сохранено" },
  });

  await installTelegram(page, userId, "Потерянный ответ");
  const keys: string[] = [];
  let dropped = false;
  await page.route("**/api/learning/reviews", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    if (!dropped) {
      const committed = await route.fetch();
      expect(committed.ok()).toBeTruthy();
      dropped = true;
      return route.abort("failed");
    }
    return route.continue();
  });

  await page.goto(baseURL!);
  await page.getByRole("button", { name: "Начать" }).click();
  await page.getByRole("button", { name: "Показать перевод" }).click();
  await page.getByRole("button", { name: "Вспомнил", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Оценка не отправлена");
  await page.getByRole("button", { name: "Повторить отправку" }).click();

  await expect.poll(() => keys.length).toBe(2);
  expect(keys[0]).toBe(keys[1]);
  await expect(page.getByRole("alert")).toHaveCount(0);
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
