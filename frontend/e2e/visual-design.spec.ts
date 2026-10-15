import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { installTelegram } from "./telegram";

const GROUP_ID = "10000000-0000-4000-8000-000000000001";
const CARD_ID = "20000000-0000-4000-8000-000000000001";

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}

async function capture(page: Page, testInfo: TestInfo, state: string, enabled: boolean) {
  await expectNoHorizontalOverflow(page);
  if (enabled) await page.screenshot({ path: testInfo.outputPath(`${state}.png`), fullPage: true, animations: "disabled" });
}

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

for (const [width, scheme] of [[320, "light"], [390, "light"], [480, "light"], [320, "dark"], [390, "dark"], [480, "dark"]] as const) {
  test(`Forest UI: семь состояний, ${width}px, ${scheme}`, async ({ page, baseURL }, testInfo) => {
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => requestFailures.push(`${request.url()}: ${request.failure()?.errorText}`));
    await page.setViewportSize({ width, height: 844 });
    await installTelegram(page, 1568151709, "Вениамин", scheme);
    await page.addInitScript((groupId) => localStorage.setItem("active-group-id", groupId), GROUP_ID);
    let completed = false;

    await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      if (url.pathname === "/api/auth/telegram") return route.fulfill({ json: {
        access_token: "visual-token", token_type: "bearer", expires_in: 3600,
        user: { user_id: "user-1", telegram_id: 1568151709, display_name: "Вениамин" }, start_param: null,
      }});
      if (url.pathname === "/api/groups" && method === "GET") return route.fulfill({ json: [{
        id: GROUP_ID, name: "Друзья", owner_id: "user-2", is_owner: false, can_add_shared: true,
        members: [
          { user_id: "user-2", display_name: "Анна" },
          { user_id: "user-1", display_name: "Вениамин" },
          { user_id: "user-3", display_name: "Миша" },
        ],
      }] });
      if (url.pathname === "/api/learning/summary") return route.fulfill({ json: { due_count: 7, new_count: 4, can_start: true } });
      if (url.pathname === "/api/cards" && method === "GET") return route.fulfill({ json: [
        { id: CARD_ID, front: "Purpose", back: "цель", visibility: "group", group_id: GROUP_ID, version: 1, can_edit: true, can_delete: false },
        { id: "30000000-0000-4000-8000-000000000001", front: "High priest", back: "первосвященник", visibility: "personal", group_id: null, version: 1, can_edit: true, can_delete: true },
      ] });
      if (url.pathname === "/api/learning/next") return route.fulfill({ json: completed ? null : {
        card_id: CARD_ID, direction: "en_ru",
        question: "A deliberately long phrase that must wrap on a narrow mobile screen without hiding the controls",
        answer: "Намеренно длинная фраза, которая переносится и не скрывает элементы управления",
        content_version: 1, state_version: 0,
      } });
      if (url.pathname === "/api/learning/reviews") {
        completed = true;
        return route.fulfill({ json: { event_id: "event-1", state_version: 1, due_at: "2026-10-16T10:00:00Z" } });
      }
      if (url.pathname === "/api/imports/preview") return route.fulfill({ json: {
        rows: [
          { row_id: 1, original: "Purpose - цель", front: "Purpose", back: "цель", selected: true, keep_duplicate: false, error: null, duplicate: false },
          { row_id: 2, original: "Purpose - цель", front: "Purpose", back: "цель", selected: false, keep_duplicate: false, error: null, duplicate: true },
          { row_id: 3, original: "без разделителя", front: null, back: null, selected: false, keep_duplicate: false, error: "Не найден разделитель", duplicate: false },
        ], selected_count: 1, error_count: 1, confirmation_token: null,
      } });
      return route.fulfill({ status: 204 });
    });

    const screenshots = width === 390 && scheme === "light";
    await page.goto(baseURL!);
    expect(pageErrors).toEqual([]);
    expect(requestFailures).toEqual([]);
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect(page.getByRole("heading", { name: "С возвращением." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Начать повторение" })).toBeVisible();
    await capture(page, testInfo, "01-home", screenshots);

    const expectedBackground = scheme === "dark" ? "rgb(23, 36, 31)" : "rgb(249, 250, 246)";
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-background").trim())).toBe(scheme === "dark" ? "#17241F" : "#F9FAF6");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe(expectedBackground);

    await page.getByRole("button", { name: "Начать повторение" }).click();
    await expect(page.locator(".flash-card")).toBeVisible();
    await page.getByRole("button", { name: "Показать перевод" }).click();
    await expect(page.getByRole("button", { name: "Легко" })).toBeVisible();
    await capture(page, testInfo, "02-review", screenshots);

    await page.getByRole("button", { name: "Вспомнил", exact: true }).click();
    await expect(page.getByRole("heading", { name: "На сейчас всё." })).toBeVisible();
    await capture(page, testInfo, "07-complete", screenshots);

    await page.getByRole("button", { name: "К словам" }).click();
    await expect(page.getByRole("heading", { name: "Слова" })).toBeVisible();
    await expect(page.getByText("Purpose", { exact: true })).toBeVisible();
    await capture(page, testInfo, "03-dictionary", screenshots);

    if (width === 390 && scheme === "dark") {
      await page.getByLabel("Поиск по словам и переводам").fill("Purpose");
      await expectTouchTarget(page.getByRole("button", { name: "Очистить поиск" }));
      await page.getByRole("button", { name: "Очистить поиск" }).click();
      for (const name of ["Все", "Общие", "Личные"]) await expectTouchTarget(page.getByRole("button", { name, exact: true }));
      await expectTouchTarget(page.getByRole("button", { name: "Изменить Purpose" }));
      await expectTouchTarget(page.getByRole("button", { name: "Удалить High priest" }));
      await page.getByRole("button", { name: "Удалить High priest" }).click();
      const dangerContrast = await page.locator(".button--danger").evaluate((element) => {
        const channels = (value: string) => value.match(/\d+/g)!.slice(0, 3).map(Number);
        const luminance = (value: string) => channels(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
        const style = getComputedStyle(element);
        const foreground = luminance(style.color);
        const background = luminance(style.backgroundColor);
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      });
      expect(dangerContrast).toBeGreaterThanOrEqual(4.5);
      await page.getByRole("button", { name: "Отмена" }).click();
    }

    await page.getByRole("button", { name: "Добавить слова" }).click();
    await page.getByRole("button", { name: "Вставить список" }).click();
    await expect(page.getByRole("heading", { name: "Добавить списком" })).toBeVisible();
    if (width === 390 && scheme === "dark") {
      await expectTouchTarget(page.getByRole("button", { name: "Закрыть импорт" }));
      await expectTouchTarget(page.getByRole("button", { name: "Только мне" }));
      await expectTouchTarget(page.getByRole("button", { name: "В группу" }));
    }
    await capture(page, testInfo, "04-import", screenshots);

    await page.getByLabel("Список слов").fill("Purpose - цель\nPurpose - цель\nбез разделителя");
    await page.getByRole("button", { name: "Проверить список" }).click();
    await expect(page.getByText("Готово")).toBeVisible();
    await expect(page.getByText("Повтор")).toBeVisible();
    await expect(page.getByText("Ошибка")).toBeVisible();
    await capture(page, testInfo, "05-preview", screenshots);

    await page.getByRole("button", { name: "Группы" }).click();
    await expect(page.getByRole("heading", { name: "Друзья" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить общие слова" })).toBeVisible();
    if (width === 390 && scheme === "dark") await expectTouchTarget(page.getByRole("button", { name: "Выйти из группы" }));
    await capture(page, testInfo, "06-group", screenshots);
  });
}
