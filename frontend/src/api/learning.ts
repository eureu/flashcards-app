import { apiFetch } from "./auth";

export type Direction = "en_ru" | "ru_en";
export type Rating = 1 | 2 | 3 | 4;

export interface LearningSummary {
  due_count: number;
  new_count: number;
  can_start: boolean;
}

export interface LearningItem {
  card_id: string;
  direction: Direction;
  question: string;
  answer: string;
  content_version: number;
  state_version: number;
}

export interface ReviewOutcome {
  event_id: string;
  state_version: number;
  due_at: string;
}

function groupQuery(groupId?: string): string {
  return groupId ? `?group_id=${encodeURIComponent(groupId)}` : "";
}

export function getLearningSummary(groupId?: string): Promise<LearningSummary> {
  return apiFetch(`/api/learning/summary${groupQuery(groupId)}`);
}

export function getNextItem(
  groupId?: string,
  lastCardId?: string,
): Promise<LearningItem | null> {
  const params = new URLSearchParams();
  if (groupId) params.set("group_id", groupId);
  if (lastCardId) params.set("last_card_id", lastCardId);
  const suffix = params.size ? `?${params}` : "";
  return apiFetch(`/api/learning/next${suffix}`);
}

export function submitReview(
  command: {
    card_id: string;
    direction: Direction;
    rating: Rating;
    group_id: string | null;
    expected_content_version: number;
    expected_state_version: number;
  },
  operationKey: string,
): Promise<ReviewOutcome> {
  return apiFetch("/api/learning/reviews", {
    method: "POST",
    headers: { "Idempotency-Key": operationKey },
    body: JSON.stringify(command),
  });
}
