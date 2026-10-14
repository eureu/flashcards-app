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

export async function createInvitation(groupId: string): Promise<string> {
  const response = await apiFetch<{ token: string }>(`/api/groups/${groupId}/invitation`, {
    method: "POST",
  });
  return response.token;
}

export function leaveGroup(groupId: string): Promise<null> {
  return apiFetch<null>(`/api/groups/${groupId}/membership`, { method: "DELETE" });
}
