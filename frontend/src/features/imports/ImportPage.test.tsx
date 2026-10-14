import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  previewImport: vi.fn(),
  commitImport: vi.fn(),
}));

vi.mock("../../api/imports", () => api);

import { ImportPage } from "./ImportPage";

const validPreview = {
  rows: [{
    row_id: 1,
    original: "Purpose - цель",
    front: "Purpose",
    back: "цель",
    selected: true,
    keep_duplicate: false,
    error: null,
    duplicate: false,
  }],
  selected_count: 1,
  error_count: 0,
  confirmation_token: "confirmed",
};

beforeEach(() => {
  api.previewImport.mockReset();
  api.commitImport.mockReset();
});

it("does not offer group import to a nonpublisher", () => {
  render(<ImportPage groupId="group-1" canAddShared={false} />);

  expect(screen.queryByRole("option", { name: "Общие слова группы" })).toBeNull();
});

it("keeps an invalid source row visible and blocks commit", async () => {
  api.previewImport.mockResolvedValue({
    ...validPreview,
    rows: [{ ...validPreview.rows[0], front: null, back: null, error: "Не найден разделитель" }],
    selected_count: 0,
    error_count: 1,
    confirmation_token: null,
  });
  render(<ImportPage canAddShared={false} />);
  fireEvent.change(screen.getByLabelText("Список слов"), {
    target: { value: "строка без разделителя" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Проверить список" }));

  expect(await screen.findByText("строка без разделителя")).toBeInTheDocument();
  expect(screen.getByText("Не найден разделитель")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Добавить/ })).toBeNull();
});

it("reuses the operation key after a network failure", async () => {
  api.previewImport.mockResolvedValue(validPreview);
  api.commitImport
    .mockRejectedValueOnce(new TypeError("network"))
    .mockResolvedValueOnce({ created_ids: ["card-1"], created_count: 1 });
  render(<ImportPage canAddShared={false} />);
  fireEvent.change(screen.getByLabelText("Список слов"), {
    target: { value: "Purpose - цель" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Проверить список" }));
  fireEvent.click(await screen.findByRole("button", { name: "Добавить 1" }));
  fireEvent.click(await screen.findByRole("button", { name: "Повторить" }));

  await waitFor(() => expect(api.commitImport).toHaveBeenCalledTimes(2));
  expect(api.commitImport.mock.calls[0][1]).toBe(api.commitImport.mock.calls[1][1]);
  expect(await screen.findByText("Добавлено карточек: 1")).toBeInTheDocument();
});
