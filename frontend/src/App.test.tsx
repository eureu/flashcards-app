import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ bootstrapAuth: vi.fn() }));
const groups = vi.hoisted(() => ({
  listGroups: vi.fn(), createGroup: vi.fn(), createInvitation: vi.fn(),
  joinGroup: vi.fn(), leaveGroup: vi.fn(), previewInvitation: vi.fn(),
}));
const learning = vi.hoisted(() => ({ getLearningSummary: vi.fn(), getNextItem: vi.fn(), submitReview: vi.fn() }));
const cards = vi.hoisted(() => ({ listCards: vi.fn(), createCard: vi.fn(), getCard: vi.fn(), updateCard: vi.fn(), deleteCard: vi.fn() }));
const bridge = vi.hoisted(() => ({
  applyTelegramTheme: vi.fn(),
  getTelegramWebApp: vi.fn(),
  requireTelegramInitData: vi.fn(() => "signed"),
  subscribeTelegramLayout: vi.fn(() => vi.fn()),
  setTelegramBackAction: vi.fn(() => vi.fn()),
}));

vi.mock("./api/auth", () => auth);
vi.mock("./api/groups", () => groups);
vi.mock("./api/learning", () => learning);
vi.mock("./api/cards", () => cards);
vi.mock("./telegram/bridge", () => bridge);

import { App } from "./App";

const group = {
  id: "group-1", name: "Друзья", owner_id: "user-1", is_owner: true,
  can_add_shared: true, members: [{ user_id: "user-1", display_name: "Вениамин" }],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("active-group-id", group.id);
  auth.bootstrapAuth.mockReset().mockResolvedValue({
    actor: { user_id: "user-1", telegram_id: 1568151709, display_name: "Вениамин" },
    startParam: null,
  });
  groups.listGroups.mockReset().mockResolvedValue([group]);
  learning.getLearningSummary.mockReset().mockResolvedValue({ due_count: 3, new_count: 1, can_start: true });
  cards.listCards.mockReset().mockResolvedValue([]);
  bridge.getTelegramWebApp.mockReturnValue({
    initData: "signed", ready: vi.fn(), expand: vi.fn(), colorScheme: "light", themeParams: {},
  });
});

it("connects home actions to the group and dictionary sections", async () => {
  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: /Друзья/ }));
  expect(await screen.findByRole("heading", { name: "Группы" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Группы" })).toHaveAttribute("aria-current", "page");

  fireEvent.click(screen.getByRole("button", { name: "Учиться" }));
  fireEvent.click(await screen.findByRole("button", { name: "Добавить слова" }));
  expect(await screen.findByRole("heading", { name: "Слова" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Слова", exact: true })).toHaveAttribute("aria-current", "page");
});
