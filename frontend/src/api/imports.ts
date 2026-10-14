import { apiFetch } from "./auth";
import type { CardTarget } from "./cards";

export interface ImportRow {
  row_id: number;
  original: string;
  front: string | null;
  back: string | null;
  selected: boolean;
  keep_duplicate: boolean;
  error: string | null;
  duplicate: boolean;
}

export interface ImportPreview {
  rows: ImportRow[];
  selected_count: number;
  error_count: number;
  confirmation_token: string | null;
}

export function previewImport(payload: {
  target: CardTarget;
  text?: string;
  rows?: ImportRow[];
}): Promise<ImportPreview> {
  return apiFetch<ImportPreview>("/api/imports/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function commitImport(
  payload: { target: CardTarget; rows: ImportRow[]; confirmation_token: string },
  operationKey: string,
): Promise<{ created_ids: string[]; created_count: number }> {
  return apiFetch("/api/imports/commit", {
    method: "POST",
    headers: { "Idempotency-Key": operationKey },
    body: JSON.stringify(payload),
  });
}
