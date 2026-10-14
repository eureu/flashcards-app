import type { Actor, DomainErrorPayload } from "./types";

let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isDomainError(value: unknown): value is DomainErrorPayload {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = (value as DomainErrorPayload).error;
  return Boolean(error && typeof error.code === "string" && typeof error.message === "string");
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(path, { ...init, headers });
  const body: unknown = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (isDomainError(body)) {
      throw new ApiError(body.error.code, body.error.message, response.status, body.error.details);
    }
    throw new ApiError("HTTP_ERROR", "Сервер вернул неожиданный ответ", response.status);
  }
  return body as T;
}

export async function bootstrapAuth(initData: string): Promise<Actor> {
  const response = await apiFetch<{
    access_token: string;
    token_type: "bearer";
    expires_in: number;
    user: Actor;
  }>("/api/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ init_data: initData }),
  });
  accessToken = response.access_token;
  return response.user;
}

export function clearSession(): void {
  accessToken = null;
}
