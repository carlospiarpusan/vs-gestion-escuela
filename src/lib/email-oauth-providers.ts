import { createHash, randomBytes } from "node:crypto";

export type MailOAuthProvider = "gmail_google" | "outlook_microsoft";
type MailProviderFailure =
  | "rate_limit"
  | "quota"
  | "reconnect"
  | "configuration"
  | "policy"
  | "unavailable"
  | "rejected";
export class MailProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: MailProviderFailure,
    readonly retryAfterMs: number | null
  ) {
    super(message);
    this.name = "MailProviderError";
  }
  get retryable() {
    return this.kind === "rate_limit" || this.kind === "unavailable";
  }
}
export class MailMessageTooLargeError extends Error {
  constructor() {
    super("El correo supera el límite de 30 MB.");
    this.name = "MailMessageTooLargeError";
  }
}
export function isMailOAuthProvider(value: unknown): value is MailOAuthProvider {
  return value === "gmail_google" || value === "outlook_microsoft";
}
const configs = {
  gmail_google: {
    env: "GOOGLE",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
  },
  outlook_microsoft: {
    env: "MICROSOFT",
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope:
      "offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read",
  },
} as const;
export function mailOAuthAvailable(provider: MailOAuthProvider) {
  const prefix = `EMAIL_INVOICE_${configs[provider].env}`;
  return Boolean(
    process.env[`${prefix}_CLIENT_ID`] &&
    process.env[`${prefix}_CLIENT_SECRET`] &&
    process.env.EMAIL_INVOICE_ENCRYPTION_KEY
  );
}
function credentials(provider: MailOAuthProvider) {
  if (!mailOAuthAvailable(provider))
    throw new Error(
      `Falta configurar la aplicación de ${provider === "gmail_google" ? "Google" : "Microsoft"} para conectar correos.`
    );
  const prefix = `EMAIL_INVOICE_${configs[provider].env}`;
  return {
    client_id: process.env[`${prefix}_CLIENT_ID`]!,
    client_secret: process.env[`${prefix}_CLIENT_SECRET`]!,
  };
}
export function createMailAuthorization(provider: MailOAuthProvider, redirectUri: string) {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const url = new URL(configs[provider].authorize);
  url.search = new URLSearchParams({
    client_id: credentials(provider).client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: configs[provider].scope,
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    ...(provider === "gmail_google"
      ? { access_type: "offline", prompt: "consent select_account" }
      : { response_mode: "query", prompt: "select_account" }),
  }).toString();
  return { url: url.toString(), state, verifier };
}
async function providerError(response: Response) {
  // Inspect structured codes only: provider messages can contain private data.
  const body = await response.json().catch(() => null);
  const error = body?.error;
  const codes: unknown[] = [typeof error === "string" ? error : error?.code];
  for (const key of ["errors", "details"]) {
    if (Array.isArray(error?.[key])) for (const detail of error[key]) codes.push(detail?.reason);
  }
  const has = (...values: string[]) => values.some((value) => codes.includes(value));
  const header = response.headers.get("retry-after");
  const retryAfterMs = header
    ? /^\d+$/.test(header)
      ? Number(header) * 1000
      : Date.parse(header) - Date.now()
    : null;
  const retryAfter =
    retryAfterMs != null && Number.isFinite(retryAfterMs) ? Math.max(0, retryAfterMs) : null;
  let kind: MailProviderFailure = "rejected";
  let message = `El proveedor de correo rechazó la solicitud (${response.status}). Revisa los permisos y la configuración del proveedor; no es necesariamente un permiso vencido.`;
  if (has("dailyLimitExceeded", "DAILY_LIMIT_EXCEEDED", "quotaExceeded", "QUOTA_EXCEEDED")) {
    kind = "quota";
    message =
      "Se agotó la cuota de lectura del proveedor de correo. Espera a que se restablezca o revisa las cuotas del proyecto. No necesitas desconectar la cuenta.";
  } else if (
    response.status === 429 ||
    has(
      "rateLimitExceeded",
      "userRateLimitExceeded",
      "RATE_LIMIT_EXCEEDED",
      "ErrorTooManyRequests",
      "TooManyRequests"
    )
  ) {
    kind = "rate_limit";
    message =
      "El proveedor de correo limitó temporalmente la lectura. Espera unos minutos y vuelve a buscar; se conservará el avance del lote. No necesitas desconectar la cuenta.";
  } else if (
    has("accessNotConfigured", "SERVICE_DISABLED", "invalid_client", "unauthorized_client")
  ) {
    kind = "configuration";
    message =
      "La API de correo o la aplicación OAuth no está habilitada correctamente. Revisa la configuración del proyecto de Google o Microsoft; reconectar la cuenta no resuelve este problema.";
  } else if (has("domainPolicy", "admin_policy_enforced")) {
    kind = "policy";
    message =
      "El administrador del correo bloqueó el acceso de ConduSoft. Solicita que permita la aplicación y la lectura del buzón.";
  } else if (
    response.status === 401 ||
    has(
      "invalid_grant",
      "insufficientPermissions",
      "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
      "ErrorAccessDenied",
      "Authorization_RequestDenied"
    )
  ) {
    kind = "reconnect";
    message = `El permiso de lectura del correo venció, fue revocado o es insuficiente (${response.status}). Vuelve a conectar la cuenta y autoriza la lectura; si persiste, consulta al administrador del correo.`;
  } else if (response.status >= 500) {
    kind = "unavailable";
    message =
      "El proveedor de correo no está disponible temporalmente. Vuelve a intentarlo más tarde; no necesitas desconectar la cuenta.";
  }
  return new MailProviderError(message, response.status, kind, retryAfter);
}
async function checkedFetch(url: string | URL, init: RequestInit = {}) {
  // Retry read requests only; never replay authorization codes or rotating tokens.
  const attempts = (init.method || "GET").toUpperCase() === "GET" ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) return response;
    const error = await providerError(response);
    const delay = Math.max(1000 * 2 ** attempt, error.retryAfterMs ?? 0);
    if (!error.retryable || attempt === attempts - 1 || delay > 5000) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("No se pudo consultar el proveedor de correo.");
}
export async function exchangeMailToken(
  provider: MailOAuthProvider,
  input: { code: string; verifier: string; redirectUri: string } | { refreshToken: string }
) {
  const response = await checkedFetch(configs[provider].token, {
    method: "POST",
    body: new URLSearchParams({
      ...credentials(provider),
      ...("code" in input
        ? {
            grant_type: "authorization_code",
            code: input.code,
            code_verifier: input.verifier,
            redirect_uri: input.redirectUri,
          }
        : { grant_type: "refresh_token", refresh_token: input.refreshToken }),
    }),
  });
  const token = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
  };
  if (!token.access_token) throw new Error("No se recibió permiso de acceso al correo.");
  const requiredScope =
    provider === "gmail_google" ? "https://www.googleapis.com/auth/gmail.readonly" : "Mail.Read";
  if (
    token.scope &&
    !token.scope
      .split(" ")
      .some(
        (scope) =>
          scope === requiredScope || scope === `https://graph.microsoft.com/${requiredScope}`
      )
  )
    throw new Error("Debes permitir la lectura del correo para importar las facturas.");
  return { accessToken: token.access_token, refreshToken: token.refresh_token };
}
function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}
export async function mailAccountAddress(provider: MailOAuthProvider, token: string) {
  const url =
    provider === "gmail_google"
      ? "https://gmail.googleapis.com/gmail/v1/users/me/profile"
      : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
  const data = await (await checkedFetch(url, { headers: headers(token) })).json();
  const email: unknown = data.emailAddress || data.mail || data.userPrincipalName;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("No se pudo identificar el correo de la cuenta conectada.");
  return email.toLowerCase();
}

export type MailSearch = {
  since: Date;
  onlyUnread: boolean;
  from: string | null;
  subject: string | null;
  maxMessages: number;
  pageToken?: string | null;
};
export async function listInvoiceMessages(
  provider: MailOAuthProvider,
  token: string,
  search: MailSearch
) {
  const limit = Math.min(Math.max(search.maxMessages, 1), 2000);
  const ids: string[] = [];
  let next: string | null;
  if (provider === "gmail_google") {
    // Quote user filters so they cannot alter Gmail's query operators.
    const quote = (value: string) => `"${value.replace(/["\\]/g, " ")}"`;
    const q = [
      "in:inbox",
      "has:attachment",
      `after:${Math.floor(search.since.getTime() / 1000)}`,
      search.onlyUnread ? "is:unread" : "",
      search.from ? `from:${quote(search.from)}` : "",
      search.subject ? `subject:${quote(search.subject)}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    next = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({ q, maxResults: String(Math.min(limit, 100)), ...(search.pageToken ? { pageToken: search.pageToken } : {}) })}`;
    do {
      const data = await (await checkedFetch(next, { headers: headers(token) })).json();
      ids.push(...(data.messages || []).map((message: { id: string }) => message.id));
      next = data.nextPageToken
        ? `https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({ q, maxResults: String(Math.min(limit - ids.length, 100)), pageToken: data.nextPageToken })}`
        : null;
    } while (next && ids.length < limit);
  } else {
    const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;
    const filter = [
      `receivedDateTime ge ${search.since.toISOString()}`,
      "hasAttachments eq true",
      search.onlyUnread ? "isRead eq false" : "",
      search.from ? `from/emailAddress/address eq ${literal(search.from)}` : "",
      search.subject ? `contains(subject,${literal(search.subject)})` : "",
    ]
      .filter(Boolean)
      .join(" and ");
    next =
      search.pageToken ||
      `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${new URLSearchParams({ $filter: filter, $select: "id", $top: String(Math.min(limit, 100)) })}`;
    do {
      // Never forward the access token to a pagination URL on another host.
      if (new URL(next).origin !== "https://graph.microsoft.com")
        throw new Error("Respuesta de paginación de correo inválida.");
      const data = await (await checkedFetch(next, { headers: headers(token) })).json();
      ids.push(...(data.value || []).map((message: { id: string }) => message.id));
      next = data["@odata.nextLink"] || null;
    } while (next && ids.length < limit);
  }
  // Keep the entire last page: a Microsoft nextLink can retain its original page
  // size. The caller persists unprocessed ids rather than losing the overflow.
  const nextPageToken = next
    ? provider === "gmail_google"
      ? new URL(next).searchParams.get("pageToken")
      : next
    : null;
  return { ids, truncated: Boolean(next), nextPageToken };
}
export async function readInvoiceMessage(provider: MailOAuthProvider, token: string, id: string) {
  const encodedId = encodeURIComponent(id);
  const url =
    provider === "gmail_google"
      ? `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodedId}?format=raw`
      : `https://graph.microsoft.com/v1.0/me/messages/${encodedId}/$value`;
  const response = await checkedFetch(url, { headers: headers(token) });
  const maxMimeBytes = 30 * 1024 * 1024;
  // Gmail wraps MIME in base64url JSON, which is about one third larger.
  const maxResponseBytes =
    provider === "gmail_google" ? Math.ceil((maxMimeBytes * 4) / 3) + 1024 * 1024 : maxMimeBytes;
  if (Number(response.headers.get("content-length")) > maxResponseBytes) {
    await response.body?.cancel();
    throw new MailMessageTooLargeError();
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("El correo no trajo contenido.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > maxResponseBytes) {
      await reader.cancel();
      throw new MailMessageTooLargeError();
    }
    chunks.push(part.value);
  }
  const raw = Buffer.concat(chunks);
  if (provider !== "gmail_google") return raw;
  const data = JSON.parse(raw.toString("utf8"));
  if (typeof data.raw !== "string") throw new Error("El correo no trajo contenido MIME.");
  const mime = Buffer.from(data.raw, "base64url");
  if (mime.length > maxMimeBytes) throw new MailMessageTooLargeError();
  return mime;
}
