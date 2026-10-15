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
  previewInvitation: vi.fn(),
}));

vi.mock("../../api/groups", () => api);

import { GroupPage } from "./GroupPage";

beforeEach(() => {
  localStorage.clear();
  api.listGroups.mockReset();
  api.createGroup.mockReset();
  api.joinGroup.mockReset();
  api.createInvitation.mockReset();
  api.leaveGroup.mockReset();
  api.previewInvitation.mockReset();
  api.listGroups.mockResolvedValue([ownerGroup]);
});

it("does not offer shared publishing to an ordinary group owner", async () => {
  render(<GroupPage />);

  expect(await screen.findByRole("heading", { name: "Friends" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Добавить общие слова" })).toBeNull();
  expect(screen.getByRole("button", { name: "Создать приглашение" })).toBeInTheDocument();
  expect(screen.getByText("Создатель")).toBeInTheDocument();
  expect(screen.getByText("1 участник")).toBeInTheDocument();
  expect(screen.queryByText(/точность|серия|прогресс/i)).toBeNull();
});

it("creates a trimmed group and refreshes the server-backed list", async () => {
  api.createGroup.mockResolvedValue({ ...ownerGroup, name: "New group" });
  api.listGroups
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ ...ownerGroup, name: "New group" }]);
  render(<GroupPage />);

  fireEvent.change(await screen.findByLabelText("Название новой группы"), {
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

it("opens shared import for the selected publisher group", async () => {
  const publisherGroup = { ...ownerGroup, can_add_shared: true };
  const onSelect = vi.fn();
  const onAddShared = vi.fn();
  api.listGroups.mockResolvedValue([publisherGroup]);

  render(<GroupPage onSelect={onSelect} onAddShared={onAddShared} />);

  fireEvent.click(await screen.findByRole("button", { name: "Добавить общие слова" }));

  expect(localStorage.getItem("active-group-id")).toBe(publisherGroup.id);
  expect(onSelect).toHaveBeenCalledWith(publisherGroup);
  expect(onAddShared).toHaveBeenCalledOnce();
});

it("switches explicitly to personal cards", async () => {
  const onSelect = vi.fn();
  render(<GroupPage onSelect={onSelect} />);

  fireEvent.click(await screen.findByRole("button", { name: "Учить только личные слова" }));

  expect(localStorage.getItem("active-group-id")).toBeNull();
  expect(onSelect).toHaveBeenCalledWith(null);
});

it("clears the active group in the parent after leaving it", async () => {
  const memberGroup = { ...ownerGroup, is_owner: false };
  const onSelect = vi.fn();
  api.listGroups.mockResolvedValueOnce([memberGroup]).mockResolvedValueOnce([]);
  api.leaveGroup.mockResolvedValue(null);
  localStorage.setItem("active-group-id", memberGroup.id);

  render(<GroupPage activeGroupId={memberGroup.id} onSelect={onSelect} />);
  fireEvent.click(await screen.findByRole("button", { name: "Выйти из группы" }));
  fireEvent.click(screen.getByRole("button", { name: /^Выйти$/ }));

  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(null));
  expect(localStorage.getItem("active-group-id")).toBeNull();
});

it("previews and joins a group from Telegram start_param", async () => {
  api.previewInvitation.mockResolvedValue({ group_name: "Friends" });
  api.joinGroup.mockResolvedValue(ownerGroup);
  render(<GroupPage initialInviteToken="invite-token" />);

  expect(await screen.findByText("Вас приглашают в группу «Friends»." )).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Вступить по приглашению" }));

  await waitFor(() => expect(api.joinGroup).toHaveBeenCalledWith("invite-token"));
});
