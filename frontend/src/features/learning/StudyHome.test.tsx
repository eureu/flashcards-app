import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const learning = vi.hoisted(() => ({ getLearningSummary: vi.fn() }));
const cards = vi.hoisted(() => ({ listCards: vi.fn() }));
vi.mock("../../api/learning", () => learning);
vi.mock("../../api/cards", () => cards);

import { StudyHome } from "./StudyHome";

const shared = {
  id: "shared", front: "Purpose", back: "цель", visibility: "group" as const,
  group_id: "group-1", version: 1, can_edit: false, can_delete: false,
};
const personal = {
  ...shared, id: "personal", front: "Carry", back: "нести",
  visibility: "personal" as const, group_id: null,
};

beforeEach(() => {
  learning.getLearningSummary.mockReset().mockResolvedValue({ due_count: 4, new_count: 2, can_start: true });
  cards.listCards.mockReset().mockResolvedValue([shared, personal]);
});

it("shows the selected set, task counts and separate shared and personal sources", async () => {
  const onChooseGroup = vi.fn();
  render(
    <StudyHome
      displayName="Вениамин"
      groupId="group-1"
      groupName="Друзья"
      onAddWords={vi.fn()}
      onChooseGroup={onChooseGroup}
      onStart={vi.fn()}
    />,
  );

  expect(screen.getByRole("heading", { name: "С возвращением." })).toBeInTheDocument();
  expect(screen.getByLabelText("Пользователь Вениамин")).toHaveTextContent("В");
  fireEvent.click(screen.getByRole("button", { name: /Друзья/ }));
  expect(onChooseGroup).toHaveBeenCalledOnce();

  const hero = await screen.findByTestId("study-hero");
  expect(within(hero).getByText("4")).toBeInTheDocument();
  expect(within(hero).getByText("к повторению")).toBeInTheDocument();
  expect(within(hero).getByText("2 новых задания")).toBeInTheDocument();
  expect(screen.getByText("Общие слова").closest("li")).toHaveTextContent("1");
  expect(screen.getByText("Личные слова").closest("li")).toHaveTextContent("1");
});

it("offers meaningful next steps when the set has no cards", async () => {
  cards.listCards.mockResolvedValue([]);
  learning.getLearningSummary.mockResolvedValue({ due_count: 0, new_count: 0, can_start: false });
  const onAddWords = vi.fn();
  render(
    <StudyHome
      displayName="Анна"
      onAddWords={onAddWords}
      onChooseGroup={vi.fn()}
      onStart={vi.fn()}
    />,
  );

  expect(await screen.findByText("Добавьте слова, чтобы начать")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Добавить слова" }));
  expect(onAddWords).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "Начать повторение" })).toBeNull();
});

it("retries both server-backed summaries after a loading error", async () => {
  learning.getLearningSummary
    .mockRejectedValueOnce(new TypeError("network"))
    .mockResolvedValueOnce({ due_count: 1, new_count: 0, can_start: true });
  render(
    <StudyHome
      displayName="Анна"
      onAddWords={vi.fn()}
      onChooseGroup={vi.fn()}
      onStart={vi.fn()}
    />,
  );

  expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить задания");
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }));

  await waitFor(() => expect(learning.getLearningSummary).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole("button", { name: "Начать повторение" })).toBeInTheDocument();
});
