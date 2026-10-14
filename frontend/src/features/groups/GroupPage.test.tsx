import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { GroupView } from "../../api/groups";

const ownerGroup: GroupView = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Friends",
  owner_id: "20000000-0000-0000-0000-000000000001",
  is_owner: true,
  can_add_shared: false,
  members: [{ user_id: "20000000-0000-0000-0000-000000000001", display_name: "Owner" }],
};

const api = vi.hoisted(() => ({
  listGroups: vi.fn(),
  createGroup: vi.fn(),
  joinGroup: vi.fn(),
  createInvitation: vi.fn(),
  leaveGroup: vi.fn(),
}));

vi.mock("../../api/groups", () => api);

import { GroupPage } from "./GroupPage";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  api.listGroups.mockResolvedValue([ownerGroup]);
});

it("does not offer shared publishing to an ordinary group owner", async () => {
  render(<GroupPage />);

  expect(await screen.findByRole("heading", { name: "Friends" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Добавить общие слова" })).toBeNull();
  expect(screen.getByRole("button", { name: "Создать приглашение" })).toBeInTheDocument();
});

it("creates a trimmed group and refreshes the server-backed list", async () => {
  api.createGroup.mockResolvedValue({ ...ownerGroup, name: "New group" });
  api.listGroups
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ ...ownerGroup, name: "New group" }]);
  render(<GroupPage />);

  fireEvent.change(screen.getByLabelText("Название новой группы"), {
    target: { value: "  New group  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Создать группу" }));

  await waitFor(() => expect(api.createGroup).toHaveBeenCalledWith("New group"));
  expect(await screen.findByRole("heading", { name: "New group" })).toBeInTheDocument();
});

it("drops a stale active-group preference", async () => {
  localStorage.setItem("active-group-id", "missing-group");
  api.listGroups.mockResolvedValue([ownerGroup]);

  render(<GroupPage />);

  await screen.findByRole("heading", { name: "Friends" });
  expect(localStorage.getItem("active-group-id")).toBeNull();
});
