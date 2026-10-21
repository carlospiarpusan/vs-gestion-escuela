// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createMailAuthorization,
  exchangeMailToken,
  listInvoiceMessages,
  mailAccountAddress,
  mailOAuthAvailable,
  readInvoiceMessage,
  MailMessageTooLargeError,
  MailProviderError,
} from "./email-oauth-providers";
const network = vi.fn();
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
beforeEach(() => {
  vi.stubEnv("EMAIL_INVOICE_ENCRYPTION_KEY", "test-key");
  for (const name of ["GOOGLE", "MICROSOFT"]) {
    vi.stubEnv(`EMAIL_INVOICE_${name}_CLIENT_ID`, "client");
    vi.stubEnv(`EMAIL_INVOICE_${name}_CLIENT_SECRET`, "secret");
  }
  network.mockReset();
  vi.stubGlobal("fetch", network);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it.each(["gmail_google", "outlook_microsoft"] as const)(
  "requests read-only authorization with state and PKCE (%s)",
  (provider) => {
    const flow = createMailAuthorization(provider, "https://condusoft.co/callback");
    const url = new URL(flow.url);
    expect(url.searchParams.get("state")).toBe(flow.state);
    expect(url.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(flow.verifier).digest("base64url")
    );
    expect(url.searchParams.get("scope")).not.toMatch(/write|send|modify/i);
    if (provider === "gmail_google") {
      expect(url.searchParams.get("prompt")?.split(" ")).toContain("select_account");
      expect(url.searchParams.has("login_hint")).toBe(false);
      expect(url.searchParams.has("hd")).toBe(false);
      expect(url.searchParams.has("authuser")).toBe(false);
    }
    expect(flow.url).not.toContain("secret");
    expect(createMailAuthorization(provider, "https://condusoft.co/callback").state).not.toBe(
      flow.state
    );
  }
);
it("reports unavailable providers and does not launch a fake connection", () => {
  vi.stubEnv("EMAIL_INVOICE_GOOGLE_CLIENT_SECRET", "");
  expect(mailOAuthAvailable("gmail_google")).toBe(false);
  expect(() => createMailAuthorization("gmail_google", "https://condusoft.co/callback")).toThrow(
    /Falta configurar/
  );
});
it("exchanges the code server-side and binds it to its PKCE verifier", async () => {
  network.mockResolvedValue(
    json({
      access_token: "access",
      refresh_token: "refresh",
      scope: "https://www.googleapis.com/auth/gmail.readonly",
    })
  );
  expect(
    await exchangeMailToken("gmail_google", {
      code: "code",
      verifier: "verifier",
      redirectUri: "https://condusoft.co/callback",
    })
  ).toEqual({ accessToken: "access", refreshToken: "refresh" });
  const body = network.mock.calls[0][1].body as URLSearchParams;
  expect(body.get("client_secret")).toBe("secret");
  expect(body.get("code_verifier")).toBe("verifier");
  expect(body.get("redirect_uri")).toBe("https://condusoft.co/callback");
});
it("renews Microsoft tokens and returns rotated refresh tokens", async () => {
  network.mockResolvedValue(
    json({ access_token: "new-access", refresh_token: "rotated", scope: "Mail.Read User.Read" })
  );
  expect((await exchangeMailToken("outlook_microsoft", { refreshToken: "old" })).refreshToken).toBe(
    "rotated"
  );
  expect(network.mock.calls[0][1].body.get("grant_type")).toBe("refresh_token");
});
it("rejects partial consent", async () => {
  network.mockResolvedValue(json({ access_token: "access", scope: "User.Read" }));
  await expect(exchangeMailToken("outlook_microsoft", { refreshToken: "old" })).rejects.toThrow(
    /permitir la lectura/
  );
});
it.each([
  ["gmail_google", { emailAddress: "Test@Gmail.com" }, "test@gmail.com"],
  ["outlook_microsoft", { mail: null, userPrincipalName: "Test@Hotmail.com" }, "test@hotmail.com"],
] as const)("uses the mailbox identity returned by %s", async (provider, body, address) => {
  network.mockResolvedValue(json(body));
  expect(await mailAccountAddress(provider, "token")).toBe(address);
});
const search = {
  since: new Date("2026-10-01T00:00:00Z"),
  onlyUnread: false,
  from: null,
  subject: null,
  maxMessages: 2,
};
it("paginates Gmail results and indicates truncation", async () => {
  network
    .mockResolvedValueOnce(json({ messages: [{ id: "a" }], nextPageToken: "next" }))
    .mockResolvedValueOnce(json({ messages: [{ id: "b" }], nextPageToken: "more" }));
  expect(await listInvoiceMessages("gmail_google", "token", search)).toEqual({
    ids: ["a", "b"],
    truncated: true,
    nextPageToken: "more",
  });
  expect(new URL(network.mock.calls[1][0]).searchParams.get("pageToken")).toBe("next");
  expect(new URL(network.mock.calls[0][0]).searchParams.get("q")).not.toContain("is:unread");
});
it("sends Microsoft mailbox filters and encodes user input", async () => {
  network.mockResolvedValue(json({ value: [{ id: "one" }] }));
  await listInvoiceMessages("outlook_microsoft", "token", {
    ...search,
    onlyUnread: true,
    from: "o'neil@example.com",
    subject: "Factura",
  });
  const filter = new URL(network.mock.calls[0][0]).searchParams.get("$filter");
  expect(filter).toContain("isRead eq false");
  expect(filter).toContain("o''neil@example.com");
});
it("never sends a Graph token to a foreign pagination host", async () => {
  network.mockResolvedValue(
    json({ value: [{ id: "one" }], "@odata.nextLink": "https://attacker.example/messages" })
  );
  await expect(listInvoiceMessages("outlook_microsoft", "token", search)).rejects.toThrow(
    /paginación/
  );
  expect(network).toHaveBeenCalledTimes(1);
});
it.each(["gmail_google", "outlook_microsoft"] as const)(
  "downloads MIME without modifying messages (%s)",
  async (provider) => {
    const mime = "From: sender@example.com\r\nSubject: Factura\r\n\r\nHello";
    network.mockResolvedValue(
      provider === "gmail_google"
        ? json({ raw: Buffer.from(mime).toString("base64url") })
        : new Response(mime)
    );
    expect((await readInvoiceMessage(provider, "token", "message/id")).toString()).toBe(mime);
    expect(network.mock.calls[0][0]).toContain("message%2Fid");
    expect(network.mock.calls[0][1].method).toBeUndefined();
  }
);
it("rejects oversized MIME", async () => {
  network.mockResolvedValue(new Response("large", { headers: { "content-length": "40000000" } }));
  await expect(readInvoiceMessage("outlook_microsoft", "token", "id")).rejects.toThrow(/30 MB/);
});
it("accepts Gmail MIME below 30 MB even when its base64url response exceeds 30 MB", async () => {
  const mime = Buffer.alloc(23 * 1024 * 1024, "a");
  network.mockResolvedValue(json({ raw: mime.toString("base64url") }));
  expect((await readInvoiceMessage("gmail_google", "token", "id")).equals(mime)).toBe(true);
});
it("rejects decoded Gmail MIME over 30 MB with a distinguishable size error", async () => {
  network.mockResolvedValue(
    json({ raw: Buffer.alloc(30 * 1024 * 1024 + 1).toString("base64url") })
  );
  await expect(readInvoiceMessage("gmail_google", "token", "id")).rejects.toBeInstanceOf(
    MailMessageTooLargeError
  );
});
it("cancels a streamed oversized message without buffering it completely", async () => {
  const cancel = vi.fn();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(30 * 1024 * 1024 + 1));
    },
    cancel,
  });
  network.mockResolvedValue(new Response(body));
  await expect(readInvoiceMessage("outlook_microsoft", "token", "id")).rejects.toBeInstanceOf(
    MailMessageTooLargeError
  );
  expect(cancel).toHaveBeenCalledTimes(1);
});
it("does not expose provider response bodies or tokens in errors", async () => {
  network.mockResolvedValue(json({ secret: "sensitive" }, 401));
  await expect(exchangeMailToken("gmail_google", { refreshToken: "private" })).rejects.toThrow(
    /401/
  );
  await expect(exchangeMailToken("gmail_google", { refreshToken: "private" })).rejects.not.toThrow(
    /private|sensitive/
  );
});
it("retries a Gmail 403 rate limit without reconnecting or losing the request", async () => {
  vi.useFakeTimers();
  network
    .mockResolvedValueOnce(json({ error: { errors: [{ reason: "userRateLimitExceeded" }] } }, 403))
    .mockResolvedValueOnce(json({ messages: [{ id: "recovered" }] }));
  const pending = listInvoiceMessages("gmail_google", "private-token", search);
  await vi.advanceTimersByTimeAsync(1000);
  expect((await pending).ids).toEqual(["recovered"]);
  expect(network).toHaveBeenCalledTimes(2);
  expect(network.mock.calls[0][0]).toBe(network.mock.calls[1][0]);
});
it.each([
  [{ errors: [{ reason: "insufficientPermissions" }] }, "reconnect"],
  [{ details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] }, "reconnect"],
  [{ details: [{ reason: "SERVICE_DISABLED" }] }, "configuration"],
  [{ errors: [{ reason: "accessNotConfigured" }] }, "configuration"],
  [{ errors: [{ reason: "domainPolicy" }] }, "policy"],
  [{ errors: [{ reason: "dailyLimitExceeded" }] }, "quota"],
  [{ code: "ErrorAccessDenied" }, "reconnect"],
  [{ code: "unknown-private-code", message: "private account data" }, "rejected"],
])("distinguishes permanent 403 failures without retrying (%j)", async (error, kind) => {
  network.mockResolvedValue(json({ error }, 403));
  const failure = await listInvoiceMessages("gmail_google", "token", search).catch(
    (value) => value
  );
  expect(failure).toBeInstanceOf(MailProviderError);
  expect(failure.kind).toBe(kind);
  expect(failure.status).toBe(403);
  expect(failure.retryable).toBe(false);
  expect(failure.message).not.toMatch(/unknown-private-code|private account data/);
  expect(network).toHaveBeenCalledTimes(1);
});
it("does not claim an unstructured 403 means an expired permission", async () => {
  network.mockResolvedValue(new Response("private non-JSON response", { status: 403 }));
  await expect(listInvoiceMessages("gmail_google", "token", search)).rejects.toThrow(
    /no es necesariamente un permiso vencido/
  );
  expect(network).toHaveBeenCalledTimes(1);
});
it("respects a short Retry-After before retrying a read", async () => {
  vi.useFakeTimers();
  network
    .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "retry-after": "2" } }))
    .mockResolvedValueOnce(json({ messages: [] }));
  const pending = listInvoiceMessages("gmail_google", "token", search);
  await vi.advanceTimersByTimeAsync(1999);
  expect(network).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await pending;
  expect(network).toHaveBeenCalledTimes(2);
});
it("does not retry early when the provider requests a long wait", async () => {
  network.mockResolvedValue(new Response("{}", { status: 429, headers: { "retry-after": "60" } }));
  const error = await listInvoiceMessages("gmail_google", "token", search).catch((value) => value);
  expect(error.kind).toBe("rate_limit");
  expect(error.retryAfterMs).toBe(60000);
  expect(network).toHaveBeenCalledTimes(1);
});
it.each([403, 503])("bounds transient read retries (%s)", async (status) => {
  vi.useFakeTimers();
  network.mockImplementation(async () =>
    json({ error: { errors: [{ reason: "rateLimitExceeded" }] } }, status)
  );
  const pending = listInvoiceMessages("gmail_google", "token", search).catch((value) => value);
  await vi.advanceTimersByTimeAsync(3000);
  expect(await pending).toBeInstanceOf(MailProviderError);
  expect(network).toHaveBeenCalledTimes(3);
});
it("never retries a token exchange, even for transient provider failures", async () => {
  network.mockResolvedValue(json({}, 503));
  await expect(exchangeMailToken("outlook_microsoft", { refreshToken: "private" })).rejects.toThrow(
    /temporalmente/
  );
  expect(network).toHaveBeenCalledTimes(1);
});
it("identifies revoked refresh tokens without exposing Google's response", async () => {
  network.mockResolvedValue(
    json({ error: "invalid_grant", error_description: "private data" }, 400)
  );
  const error = await exchangeMailToken("gmail_google", { refreshToken: "private" }).catch(
    (value) => value
  );
  expect(error.kind).toBe("reconnect");
  expect(error.message).not.toContain("private");
});
