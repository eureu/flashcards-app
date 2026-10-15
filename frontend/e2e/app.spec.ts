import { expect, request, test } from "@playwright/test";
import { installTelegram, signedInitData } from "./telegram";

const PUBLISHER_ID = 1568151709;
const MEMBER_ID = 2000000001;

async function apiActor(baseURL: string, telegramId: number, firstName: string) {
  const client = await request.newContext({ baseURL });
  const auth = await client.post("/api/auth/telegram", {
    data: { init_data: signedInitData(telegramId, firstName) },
  });
  expect(auth.ok()).toBeTruthy();
  const token = (await auth.json()).access_token as string;
  return {
    client,
    headers: { Authorization: `Bearer ${token}` },
  };
}

test("общий словарь, личная карточка, права и независимый прогресс", async ({ browser, baseURL }, testInfo) => {
  const suffix = Date.now();
  const personalPhrase = `Personal phrase ${suffix}`;
  const publisherContext = await browser.newContext();
  const publisher = await publisherContext.newPage();
  await publisher.setViewportSize({ width: 390, height: 844 });
  await installTelegram(publisher, PUBLISHER_ID, "Издатель");
  await publisher.goto(baseURL!);
  await expect(publisher.getByLabel("Пользователь Издатель")).toBeVisible();
  await publisher.getByRole("button", { name: "Группы" }).click();
  await publisher.getByLabel("Название новой группы").fill(`Друзья ${suffix}`);
  await publisher.getByRole("button", { name: "Создать группу" }).click();
  const groupArticle = publisher.getByRole("article").filter({ hasText: `Друзья ${suffix}` });
  await groupArticle.getByRole("button", { name: "Создать приглашение" }).click();
  const inviteText = await publisher.getByText(/^Код приглашения:/).textContent();
  const invitation = inviteText!.replace("Код приглашения:", "").trim();
  await groupArticle.getByRole("button", { name: "Добавить общие слова" }).click();
  await publisher.getByRole("button", { name: "Вставить список" }).click();
  await publisher.getByRole("button", { name: "В группу" }).click();
  await publisher.getByLabel("Список слов").fill([
    "Purpose - цель",
    "Receive - получать/принимать",
    "Provision - обеспечение",
    "Provision - обеспечение",
    "строка без разделителя",
  ].join("\n"));
  await publisher.getByRole("button", { name: "Проверить список" }).click();
  await expect(publisher.getByText("Всё равно добавить дубликат")).toBeVisible();
  await expect(publisher.getByText("Не найден разделитель « - »")).toBeVisible();
  await publisher.screenshot({ path: testInfo.outputPath("import-preview-390.png"), fullPage: true });
  await publisher.getByLabel("Добавить строку 5").uncheck();
  await publisher.getByRole("button", { name: "Обновить предпросмотр" }).click();
  await publisher.getByRole("button", { name: "Добавить 3" }).click();
  await expect(publisher.getByRole("status")).toHaveText("Добавлено карточек: 3");

  const memberContext = await browser.newContext();
  const member = await memberContext.newPage();
  await installTelegram(member, MEMBER_ID, "Участник");
  await member.goto(baseURL!);
  await member.getByRole("button", { name: "Группы" }).click();
  await member.getByLabel("Код приглашения").fill(invitation);
  await member.getByRole("button", { name: "Вступить" }).click();
  const memberGroup = member.getByRole("article").filter({ hasText: `Друзья ${suffix}` });
  await expect(memberGroup.getByRole("button", { name: "Добавить общие слова" })).toHaveCount(0);
  await memberGroup.getByRole("button", { name: "Выбрать для занятий" }).click();
  await member.getByRole("button", { name: "Слова", exact: true }).click();
  await member.getByRole("button", { name: "Добавить слова" }).click();
  await member.getByRole("button", { name: "Добавить слово", exact: true }).click();
  await member.getByLabel("Слово или фраза").fill(personalPhrase);
  await member.getByLabel("Перевод", { exact: true }).fill("Личная фраза");
  await member.getByRole("button", { name: "Сохранить" }).click();
  await expect(member.getByRole("list").getByText(personalPhrase, { exact: true })).toBeVisible();

  const publisherApi = await apiActor(baseURL!, PUBLISHER_ID, "Издатель");
  const memberApi = await apiActor(baseURL!, MEMBER_ID, "Участник");
  const groups = await (await publisherApi.client.get("/api/groups", { headers: publisherApi.headers })).json();
  const groupId = groups.find((group: { name: string }) => group.name === `Друзья ${suffix}`).id as string;
  const sharedCards = await (await memberApi.client.get(`/api/cards?group_id=${groupId}&filter=shared`, { headers: memberApi.headers })).json();
  expect(sharedCards).toHaveLength(3);
  const publisherCards = await (await publisherApi.client.get(`/api/cards?group_id=${groupId}`, { headers: publisherApi.headers })).json();
  expect(publisherCards.some((card: { front: string }) => card.front === personalPhrase)).toBeFalsy();

  const forbidden = await memberApi.client.post("/api/cards", {
    headers: memberApi.headers,
    data: { target: { visibility: "group", group_id: groupId }, front: "No", back: "Нет" },
  });
  expect(forbidden.status()).toBe(403);

  const card = sharedCards[0];
  for (const direction of ["en_ru", "ru_en"] as const) {
    const command = {
      card_id: card.id,
      direction,
      rating: 3,
      group_id: groupId,
      expected_content_version: card.version,
      expected_state_version: 0,
    };
    const memberReview = await memberApi.client.post("/api/learning/reviews", {
      headers: { ...memberApi.headers, "Idempotency-Key": crypto.randomUUID() }, data: command,
    });
    expect(memberReview.ok()).toBeTruthy();
    const publisherReview = await publisherApi.client.post("/api/learning/reviews", {
      headers: { ...publisherApi.headers, "Idempotency-Key": crypto.randomUUID() }, data: command,
    });
    expect(publisherReview.ok()).toBeTruthy();
  }

  await publisherApi.client.dispose();
  await memberApi.client.dispose();
  await publisherContext.close();
  await memberContext.close();
});
