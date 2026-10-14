import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getNextItem: vi.fn(),
  submitReview: vi.fn(),
}));
vi.mock("../../api/learning", () => api);

import { ReviewPage } from "./ReviewPage";

const item = {
  card_id: "card-1",
  direction: "en_ru" as const,
  question: "Purpose",
  answer: "цель",
  content_version: 1,
  state_version: 0,
};

beforeEach(() => {
  api.getNextItem.mockReset().mockResolvedValue(item);
  api.submitReview.mockReset();
});

it("keeps ratings outside the card and answer hidden until reveal", async () => {
  render(<ReviewPage onExit={vi.fn()} />);
  const card = await screen.findByTestId("flash-card");
  expect(within(card).queryByText("цель")).toBeNull();
  expect(within(card).queryByRole("button", { name: "Легко" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Показать ответ" }));

  expect(screen.getByText("цель")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Легко" })).toBeInTheDocument();
});

it("double tap cannot rate the next item", async () => {
  let resolveReview!: () => void;
  api.submitReview.mockImplementation(
    () => new Promise((resolve) => { resolveReview = () => resolve({}); }),
  );
  render(<ReviewPage onExit={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Показать ответ" }));
  const easy = screen.getByRole("button", { name: "Легко" });

  fireEvent.click(easy);
  fireEvent.click(easy);

  expect(api.submitReview).toHaveBeenCalledOnce();
  resolveReview();
});

it("retry reuses the key and preserves the revealed answer", async () => {
  api.submitReview
    .mockRejectedValueOnce(new TypeError("network"))
    .mockResolvedValueOnce({ event_id: "event-1", state_version: 1, due_at: "2026-10-15T12:00:00Z" });
  api.getNextItem.mockResolvedValueOnce(item).mockResolvedValueOnce(null);
  render(<ReviewPage onExit={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Показать ответ" }));
  fireEvent.click(screen.getByRole("button", { name: "Вспомнил" }));

  expect(await screen.findByText("цель")).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: "Повторить отправку" }));

  await waitFor(() => expect(api.submitReview).toHaveBeenCalledTimes(2));
  expect(api.submitReview.mock.calls[0][1]).toBe(api.submitReview.mock.calls[1][1]);
});
