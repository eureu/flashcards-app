import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listCards: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
}));

vi.mock("../../api/cards", () => api);

import { WordListPage } from "./WordListPage";

const sharedCard = {
  id: "10000000-0000-0000-0000-000000000001",
  front: "Purpose",
  back: "цель",
  visibility: "group" as const,
  group_id: "20000000-0000-0000-0000-000000000001",
  version: 1,
  can_edit: true,
  can_delete: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.listCards.mockResolvedValue([sharedCard]);
});

it("does not offer the shared target to an ordinary member", async () => {
  render(<WordListPage groupId={sharedCard.group_id} canAddShared={false} />);
  await screen.findByText("Purpose");

  fireEvent.click(screen.getByRole("button", { name: "Добавить слово" }));

  expect(screen.queryByRole("option", { name: "Общие слова группы" })).toBeNull();
  expect(screen.getByRole("option", { name: "Мои слова" })).toBeInTheDocument();
});

it("allows the fixed publisher to create a shared card", async () => {
  api.createCard.mockResolvedValue(sharedCard);
  render(<WordListPage groupId={sharedCard.group_id} canAddShared={true} />);
  await screen.findByText("Purpose");
  fireEvent.click(screen.getByRole("button", { name: "Добавить слово" }));
  fireEvent.change(screen.getByLabelText("Куда добавить"), { target: { value: "group" } });
  fireEvent.change(screen.getByLabelText("Слово или фраза"), { target: { value: "Carry" } });
  fireEvent.change(screen.getByLabelText("Перевод"), { target: { value: "нести" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

  await waitFor(() =>
    expect(api.createCard).toHaveBeenCalledWith({
      target: { visibility: "group", group_id: sharedCard.group_id },
      front: "Carry",
      back: "нести",
    }),
  );
});

it("renders hostile-looking card content as plain text", async () => {
  api.listCards.mockResolvedValue([
    { ...sharedCard, front: "<img src=x onerror=alert(1)>", back: "текст" },
  ]);

  const { container } = render(
    <WordListPage groupId={sharedCard.group_id} canAddShared={false} />,
  );

  expect(await screen.findByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
});

it("keeps edited text visible after a version conflict", async () => {
  api.updateCard.mockRejectedValue({ status: 409 });
  render(<WordListPage groupId={sharedCard.group_id} canAddShared={false} />);
  await screen.findByText("Purpose");
  fireEvent.click(screen.getByRole("button", { name: "Изменить Purpose" }));
  fireEvent.change(screen.getByLabelText("Перевод"), { target: { value: "назначение" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Карточка уже изменена");
  expect(screen.getByLabelText("Перевод")).toHaveValue("назначение");
});
