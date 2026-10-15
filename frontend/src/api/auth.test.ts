import { afterEach, describe, expect, it, vi } from "vitest";

describe("Telegram authentication", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("authenticates and attaches the in-memory token to later requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "session-token",
        token_type: "bearer",
        expires_in: 43200,
        start_param: "invite-token",
        user: { user_id: "00000000-0000-0000-0000-000000000001", telegram_id: 1568151709, display_name: "Veniamin" }
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    vi.stubGlobal("fetch", fetchMock);

    const { apiFetch, bootstrapAuth } = await import("./auth");
    const auth = await bootstrapAuth("signed-init-data");
    await apiFetch<{ status: string }>("/api/health");

    expect(auth.actor.telegram_id).toBe(1568151709);
    expect(auth.startParam).toBe("invite-token");
    const headers = new Headers(fetchMock.mock.calls[1][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer session-token");
  });

  it("surfaces the server domain error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "UNAUTHORIZED", message: "Открой приложение заново", details: {} }
    }), { status: 401, headers: { "Content-Type": "application/json" } })));

    const { bootstrapAuth, ApiError } = await import("./auth");

    await expect(bootstrapAuth("expired")).rejects.toEqual(
      expect.objectContaining({ code: "UNAUTHORIZED", message: "Открой приложение заново" })
    );
    expect(ApiError).toBeDefined();
  });
});
