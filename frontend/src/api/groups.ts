import { apiFetch } from "./auth";

export interface GroupMember {
  user_id: string;
  display_name: string;
}

export interface GroupView {
  id: string;
  name: string;
  owner_id: string;
  is_owner: boolean;
  can_add_shared: boolean;
  members: GroupMember[];
}

export function listGroups(): Promise<GroupView[]> {
  return apiFetch<GroupView[]>("/api/groups");
}

export function createGroup(name: string): Promise<GroupView> {
  return apiFetch<GroupView>("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function joinGroup(token: string): Promise<GroupView> {
  return apiFetch<GroupView>(`/api/invitations/${encodeURIComponent(token)}/join`, {
    method: "POST",
  });
}

export function previewInvitation(token: string): Promise<{ group_name: string }> {
  return apiFetch(`/api/invitations/${encodeURIComponent(token)}`);
}

export function createInvitation(groupId: string): Promise<{ token: string; url: string | null }> {
  return apiFetch<{ token: string; url: string | null }>(`/api/groups/${groupId}/invitation`, {
    method: "POST",
  });
}

export function leaveGroup(groupId: string): Promise<null> {
  return apiFetch<null>(`/api/groups/${groupId}/membership`, { method: "DELETE" });
}
