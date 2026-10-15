import { apiFetch } from "./auth";

export type CardTarget =
  | { visibility: "personal" }
  | { visibility: "group"; group_id: string };

export interface CardView {
  id: string;
  front: string;
  back: string;
  visibility: "personal" | "group";
  group_id: string | null;
  version: number;
  can_edit: boolean;
  can_delete: boolean;
}

export interface CardDraft {
  target: CardTarget;
  front: string;
  back: string;
}

export function listCards(options: {
  groupId?: string;
  filter?: "all" | "shared" | "personal";
  query?: string;
} = {}): Promise<CardView[]> {
  const params = new URLSearchParams();
  if (options.groupId) params.set("group_id", options.groupId);
  if (options.filter) params.set("filter", options.filter);
  if (options.query) params.set("q", options.query);
  const suffix = params.size ? `?${params.toString()}` : "";
  return apiFetch<CardView[]>(`/api/cards${suffix}`);
}

export function createCard(draft: CardDraft): Promise<CardView> {
  return apiFetch<CardView>("/api/cards", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function getCard(cardId: string): Promise<CardView> {
  return apiFetch<CardView>(`/api/cards/${cardId}`);
}

export function updateCard(
  cardId: string,
  change: { front: string; back: string; expected_version: number },
): Promise<CardView> {
  return apiFetch<CardView>(`/api/cards/${cardId}`, {
    method: "PATCH",
    body: JSON.stringify(change),
  });
}

export function deleteCard(cardId: string, expectedVersion: number): Promise<null> {
  return apiFetch<null>(`/api/cards/${cardId}`, {
    method: "DELETE",
    body: JSON.stringify({ expected_version: expectedVersion }),
  });
}
