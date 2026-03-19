import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { ImapFlow, type SearchObject } from "imapflow";
import { simpleParser } from "mailparser";
import { buildSupabaseAdminClient } from "@/lib/api-auth";
import { buildElectronicInvoiceNote, parseElectronicInvoiceBinary } from "@/lib/electronic-invoice";
import { normalizeExpenseCategory } from "@/lib/expense-category";
import type {
  CategoriaGasto,
  FacturaCorreoImportacion,
  FacturaCorreoIntegracion,
  MetodoPagoGasto,
} from "@/types/database";

type IntegrationRow = FacturaCorreoIntegracion & {
  imap_password_encrypted: string | null;
  oauth_refresh_token_encrypted: string | null;
};

type SaveIntegrationInput = {
  escuelaId: string;
  actorId: string;
  sedeId: string;
  correo: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword: string | null;
  mailbox: string;
  fromFilter: string | null;
  subjectFilter: string | null;
  importOnlyUnseen: boolean;
  autoSync: boolean;
  activa: boolean;
};

export type EmailInvoiceIntegrationView = Omit<FacturaCorreoIntegracion, "last_uid"> & {
  last_uid: string | null;
  has_password: boolean;
};

export type EmailInvoiceImportView = FacturaCorreoImportacion;

export type EmailInvoiceSyncSummary = {
  mode: "incremental" | "historical";
  imported: number;
  duplicated: number;
  errors: number;
  skipped: number;
  processedMessages: number;
  processedAttachments: number;
  matchedMessages: number;
  truncated: boolean;
  lookbackMonths: number | null;
  lastSyncedAt: string | null;
};

export type EmailInvoiceSyncOptions = {
  mode?: "incremental" | "historical";
  monthsBack?: number;
  maxMessages?: number;
};

const DEFAULT_MAILBOX = "INBOX";
const ATTACHMENT_NAME_FALLBACK = "factura-adjunta";
const MANUAL_IMAP_PROVIDER = "imap";

type ImapConnectionConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  mailbox: string;
};

function normalizeText(value: string | null | undefined) {
  const trimmed = (value || "").trim();
  return trimmed.length > 0 ? trimmed : "";
}

function optionalText(value: string | null | undefined) {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoDateTime(value: string | Date | null | undefined) {
  if (!value) return new Date().toISOString();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function deriveEncryptionKey(seed: string) {
  return createHash("sha256").update(seed).digest();
}

function getPrimaryEncryptionSeed() {
  const seed = process.env.EMAIL_INVOICE_ENCRYPTION_KEY?.trim();
  if (!seed) {
    throw new Error(
      "EMAIL_INVOICE_ENCRYPTION_KEY no esta configurada. Define una clave dedicada para proteger la conexion de correo."
    );
  }
  return seed;
}

function getDecryptionSeeds() {
  const primarySeed = process.env.EMAIL_INVOICE_ENCRYPTION_KEY?.trim();
  const legacySeed = process.env.EMAIL_INVOICE_LEGACY_ENCRYPTION_KEY?.trim();
  const seeds = [primarySeed, legacySeed].filter((value): value is string => Boolean(value));

  if (seeds.length === 0) {
    throw new Error(
      "No hay claves de descifrado configuradas para la conexion de correo. Define EMAIL_INVOICE_ENCRYPTION_KEY."
    );
  }

  return seeds;
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveEncryptionKey(getPrimaryEncryptionSeed()), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSecret(value: string) {
  const [ivB64, authTagB64, encryptedB64] = value.split(":");
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error("La credencial cifrada del correo no es valida.");
  }

  for (const seed of getDecryptionSeeds()) {
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        deriveEncryptionKey(seed),
        Buffer.from(ivB64, "base64")
      );
      decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedB64, "base64")),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch {
      // Try the next configured key before failing definitively.
    }
  }

  throw new Error(
    "No se pudo descifrar la credencial de correo con las claves configuradas. Si migraste desde una clave anterior, define EMAIL_INVOICE_LEGACY_ENCRYPTION_KEY."
  );
}

function sanitizeIntegration(row: IntegrationRow | null): EmailInvoiceIntegrationView | null {
  if (!row || row.provider !== MANUAL_IMAP_PROVIDER) return null;
  const rest = { ...row };
  delete (rest as Partial<IntegrationRow>).imap_password_encrypted;
  delete (rest as Partial<IntegrationRow>).oauth_refresh_token_encrypted;
  return {
    ...rest,
    last_uid: row.last_uid === null || row.last_uid === undefined ? null : String(row.last_uid),
    has_password: row.provider === MANUAL_IMAP_PROVIDER && Boolean(row.imap_password_encrypted),
  };
}

function normalizeMailbox(value: string | null | undefined) {
  return normalizeText(value) || DEFAULT_MAILBOX;
}

function inferImapHost(correo: string) {
  const domain = correo.split("@")[1]?.toLowerCase() || "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "imap.gmail.com";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.es"].includes(domain))
    return "outlook.office365.com";
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com")
    return "imap.mail.me.com";
  if (domain === "yahoo.com" || domain === "ymail.com") return "imap.mail.yahoo.com";
  return "";
}

export function buildSuggestedImapConfig(correo: string) {
  return {
    imapHost: inferImapHost(correo),
    imapPort: 993,
    imapSecure: true,
    imapUser: correo,
    mailbox: DEFAULT_MAILBOX,
  };
}

function extractImapErrorDetail(error: unknown) {
  const candidate = error as Error & {
    code?: string;
    response?: unknown;
    responseText?: string;
    responseStatus?: string;
    serverResponseCode?: string;
    authenticationFailed?: boolean;
  };

  const detail = [
    candidate.responseText,
    typeof candidate.response === "string" ? candidate.response : "",
    candidate.message,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" | ");

  return {
    code: typeof candidate.code === "string" ? candidate.code.toUpperCase() : "",
    responseStatus:
      typeof candidate.responseStatus === "string" ? candidate.responseStatus.toUpperCase() : "",
    serverResponseCode:
      typeof candidate.serverResponseCode === "string"
        ? candidate.serverResponseCode.toUpperCase()
        : "",
    authenticationFailed: Boolean(candidate.authenticationFailed),
    detail,
  };
}

function isAuthenticationError(error: unknown) {
  const meta = extractImapErrorDetail(error);
  const normalized = meta.detail.toLowerCase();

  return (
    meta.authenticationFailed ||
    ["AUTHENTICATIONFAILED", "AUTHORIZATIONFAILED", "LOGINFAILED"].includes(
      meta.serverResponseCode
    ) ||
    normalized.includes("invalid credentials") ||
    normalized.includes("authentication failed") ||
    normalized.includes("login failed") ||
    normalized.includes("username and password not accepted") ||
    normalized.includes("application-specific password") ||
    normalized.includes("app password")
  );
}

function shouldRetryWithLogin(error: unknown) {
  const meta = extractImapErrorDetail(error);
  const normalized = meta.detail.toLowerCase();

  return (
    isAuthenticationError(error) ||
    normalized.includes("unsupported authentication mechanism") ||
    normalized.includes("auth=plain") ||
    normalized.includes("authenticate")
  );
}

function formatImapConnectionError(error: unknown, config: ImapConnectionConfig) {
  const meta = extractImapErrorDetail(error);
  const normalized = meta.detail.toLowerCase();

  if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH"].includes(meta.code)) {
    return `No se pudo conectar al servidor IMAP ${config.host}:${config.port}. Verifica host, puerto y que el proveedor permita conexiones IMAP.`;
  }

  if (
    normalized.includes("certificate") ||
    normalized.includes("self-signed") ||
    normalized.includes("unable to verify") ||
    normalized.includes("hostname/ip") ||
    normalized.includes("tls")
  ) {
    return `No se pudo establecer una conexion segura con ${config.host}. Revisa el host IMAP, el puerto TLS y el certificado del proveedor.`;
  }

  if (
    normalized.includes("mailbox") ||
    normalized.includes("nonexistent") ||
    normalized.includes("does not exist") ||
    normalized.includes("unknown mailbox") ||
    normalized.includes("can't open mailbox")
  ) {
    return `La bandeja IMAP "${config.mailbox}" no existe o no esta disponible para esta cuenta. Verifica el nombre exacto de la bandeja.`;
  }

  if (isAuthenticationError(error)) {
    return "No se pudo autenticar en el correo IMAP. Verifica el usuario IMAP y la app password. Si usas Gmail, Outlook, Yahoo o iCloud, debes usar una contrasena de aplicacion y tener IMAP habilitado.";
  }

  if (meta.detail && meta.detail !== "Command failed") {
    return `No se pudo validar la conexion IMAP: ${meta.detail}`;
  }

  return "El servidor IMAP rechazo la conexion. Verifica host, puerto, bandeja, usuario y app password.";
}

function createImapClient(config: ImapConnectionConfig, loginMethod?: "LOGIN") {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
      ...(loginMethod ? { loginMethod } : {}),
    },
    logger: false,
  });
}

async function openValidatedImapMailbox(config: ImapConnectionConfig) {
  const methods: Array<"LOGIN" | undefined> = [undefined, "LOGIN"];
  let lastError: unknown = null;

  for (const loginMethod of methods) {
    const client = createImapClient(config, loginMethod);

    try {
      await client.connect();
      const lock = await client.getMailboxLock(config.mailbox);
      return { client, lock };
    } catch (error) {
      lastError = error;
      await client.logout().catch(() => undefined);

      if (!loginMethod && shouldRetryWithLogin(error)) {
        continue;
      }

      throw new Error(formatImapConnectionError(error, config));
    }
  }

  throw new Error(formatImapConnectionError(lastError, config));
}

async function getIntegrationBySchool(escuelaId: string) {
  const supabaseAdmin = buildSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("facturas_correo_integraciones")
    .select("*")
    .eq("escuela_id", escuelaId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar la integracion de correo: ${error.message}`);
  }

  return (data as IntegrationRow | null) ?? null;
}

async function listRecentImports(escuelaId: string, limit = 12) {
  const supabaseAdmin = buildSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("facturas_correo_importaciones")
    .select(
      "id, integracion_id, escuela_id, sede_id, gasto_id, imap_uid, message_id, message_date, remitente, asunto, attachment_name, invoice_number, supplier_name, total, currency, status, detail, created_at"
    )
    .eq("escuela_id", escuelaId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`No se pudo consultar el historial de facturas por correo: ${error.message}`);
  }

  return ((data as FacturaCorreoImportacion[]) || []).map((row) => ({
    ...row,
    imap_uid: row.imap_uid === null || row.imap_uid === undefined ? null : Number(row.imap_uid),
    total: row.total === null || row.total === undefined ? null : Number(row.total),
  }));
}

export async function getEmailInvoiceIntegrationState(escuelaId: string) {
  const integration = await getIntegrationBySchool(escuelaId);
  const history = await listRecentImports(escuelaId);
  return {
    integration: sanitizeIntegration(integration),
    history,
  };
}

async function assertImapConnection(config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  mailbox: string;
}) {
  const { client, lock } = await openValidatedImapMailbox(config);
  try {
    lock.release();
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function saveEmailInvoiceIntegration(input: SaveIntegrationInput) {
  const supabaseAdmin = buildSupabaseAdminClient();
  const current = await getIntegrationBySchool(input.escuelaId);
  const passwordToStore =
    input.imapPassword ??
    (current?.provider === MANUAL_IMAP_PROVIDER && current.imap_password_encrypted
      ? decryptSecret(current.imap_password_encrypted)
      : null);

  if (!passwordToStore) {
    throw new Error("Debes ingresar la clave o app password del correo.");
  }

  await assertImapConnection({
    host: input.imapHost,
    port: input.imapPort,
    secure: input.imapSecure,
    user: input.imapUser,
    pass: passwordToStore,
    mailbox: normalizeMailbox(input.mailbox),
  });

  const payload = {
    escuela_id: input.escuelaId,
    sede_id: input.sedeId,
    created_by: current?.created_by || input.actorId,
    updated_by: input.actorId,
    provider: MANUAL_IMAP_PROVIDER,
    correo: input.correo.trim().toLowerCase(),
    imap_host: input.imapHost.trim(),
    imap_port: input.imapPort,
    imap_secure: input.imapSecure,
    imap_user: input.imapUser.trim(),
    imap_password_encrypted: input.imapPassword
      ? encryptSecret(input.imapPassword)
      : current?.imap_password_encrypted,
    oauth_refresh_token_encrypted: null,
    mailbox: normalizeMailbox(input.mailbox),
    from_filter: optionalText(input.fromFilter),
    subject_filter: optionalText(input.subjectFilter),
    import_only_unseen: input.importOnlyUnseen,
    auto_sync: input.autoSync,
    activa: input.activa,
    last_error: null,
  };

  const { data, error } = await supabaseAdmin
    .from("facturas_correo_integraciones")
    .upsert(payload, { onConflict: "escuela_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `No se pudo guardar la integracion de correo: ${error?.message || "sin detalle"}`
    );
  }

  return sanitizeIntegration(data as IntegrationRow);
}

export async function deleteEmailInvoiceIntegration(escuelaId: string) {
  const supabaseAdmin = buildSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from("facturas_correo_integraciones")
    .delete()
    .eq("escuela_id", escuelaId);

  if (error) {
    throw new Error(`No se pudo eliminar la integracion de correo: ${error.message}`);
  }
}

function subtractMonths(date: Date, monthsBack: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() - monthsBack);
  return copy;
}

function buildSearchObject(
  integration: IntegrationRow,
  options: Required<EmailInvoiceSyncOptions>
): SearchObject {
  const query: SearchObject =
    options.mode === "historical"
      ? {
          since: subtractMonths(new Date(), options.monthsBack),
        }
      : {
          uid: `${Number(integration.last_uid || 0) + 1}:*`,
        };

  if (options.mode !== "historical" && integration.import_only_unseen) {
    query.seen = false;
  }

  if (integration.from_filter) {
    query.from = integration.from_filter;
  }

  if (integration.subject_filter) {
    query.subject = integration.subject_filter;
  }

  return query;
}

async function hasImportRecord(
  integrationId: string,
  messageId: string | null,
  imapUid: number | null,
  attachmentName: string
) {
  const supabaseAdmin = buildSupabaseAdminClient();
  let query = supabaseAdmin
    .from("facturas_correo_importaciones")
    .select("id")
    .eq("integracion_id", integrationId)
    .eq("attachment_name", attachmentName)
    .limit(1);

  if (messageId) {
    query = query.eq("message_id", messageId);
  } else if (imapUid !== null) {
    query = query.eq("imap_uid", imapUid);
  } else {
    return false;
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(`No se pudo revisar duplicados de correo: ${error.message}`);
  }

  return Boolean(data);
}

async function createImportLog(input: {
  integrationId: string;
  escuelaId: string;
  sedeId: string;
  gastoId?: string | null;
  imapUid?: number | null;
  messageId?: string | null;
  messageDate?: string | null;
  remitente?: string | null;
  asunto?: string | null;
  attachmentName: string;
  invoiceNumber?: string | null;
  supplierName?: string | null;
  total?: number | null;
  currency?: string | null;
  status: "importada" | "duplicada" | "omitida" | "error";
  detail?: string | null;
}) {
  const supabaseAdmin = buildSupabaseAdminClient();
  const { error } = await supabaseAdmin.from("facturas_correo_importaciones").insert({
    integracion_id: input.integrationId,
    escuela_id: input.escuelaId,
    sede_id: input.sedeId,
    gasto_id: input.gastoId || null,
    imap_uid: input.imapUid ?? null,
    message_id: input.messageId ?? null,
    message_date: input.messageDate ?? null,
    remitente: input.remitente ?? null,
    asunto: input.asunto ?? null,
    attachment_name: input.attachmentName,
    invoice_number: input.invoiceNumber ?? null,
    supplier_name: input.supplierName ?? null,
    total: input.total ?? null,
    currency: input.currency ?? null,
    status: input.status,
    detail: input.detail ?? null,
  });

  if (error) {
    throw new Error(`No se pudo registrar la importacion de factura por correo: ${error.message}`);
  }
}

async function findDuplicateExpense(
  escuelaId: string,
  invoiceNumber: string,
  supplierName: string
) {
  const supabaseAdmin = buildSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("gastos")
    .select("id, proveedor, numero_factura")
    .eq("escuela_id", escuelaId)
    .eq("numero_factura", invoiceNumber)
    .limit(20);

  if (error) {
    throw new Error(`No se pudo validar factura duplicada: ${error.message}`);
  }

  const normalizedSupplier = supplierName.trim().toLowerCase();
  return (
    ((data as Array<{ id: string; proveedor?: string | null }> | null) || []).find(
      (row) => (row.proveedor || "").trim().toLowerCase() === normalizedSupplier
    ) || null
  );
}

async function insertExpenseFromPreview(input: {
  integration: IntegrationRow;
  invoiceNumber: string;
  issueDate: string;
  supplierName: string;
  categorySuggestion: CategoriaGasto;
  conceptSuggestion: string;
  payableAmount: number;
  paymentMethodSuggestion: MetodoPagoGasto;
  notes: string;
}) {
  const supabaseAdmin = buildSupabaseAdminClient();
  const categoria = normalizeExpenseCategory(
    input.categorySuggestion,
    input.conceptSuggestion,
    input.supplierName,
    input.notes
  );

  const { data, error } = await supabaseAdmin
    .from("gastos")
    .insert({
      escuela_id: input.integration.escuela_id,
      sede_id: input.integration.sede_id,
      user_id: input.integration.updated_by || input.integration.created_by,
      categoria,
      concepto: input.conceptSuggestion,
      monto: input.payableAmount,
      metodo_pago: input.paymentMethodSuggestion,
      proveedor: input.supplierName,
      numero_factura: input.invoiceNumber,
      fecha: input.issueDate,
      recurrente: false,
      notas: input.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `No se pudo registrar el gasto importado desde correo: ${error?.message || "sin detalle"}`
    );
  }

  return data.id as string;
}

function extractSenderAddress(
  parsedFrom: Awaited<ReturnType<typeof simpleParser>>["from"] | undefined
) {
  return parsedFrom?.value?.[0]?.address || null;
}

function attachmentFileName(name: string | false | undefined | null, fallbackUid: number) {
  return (
    normalizeText(typeof name === "string" ? name : "") ||
    `${ATTACHMENT_NAME_FALLBACK}-${fallbackUid}.xml`
  );
}

function classifyInvoiceAttachmentError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "No se pudo procesar el adjunto de factura.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("no corresponde a una factura electronica compatible") ||
    normalized.includes("el zip no contiene un xml de factura electronica")
  ) {
    return {
      status: "omitida" as const,
      detail: "El adjunto no corresponde a una factura electronica compatible y fue omitido.",
    };
  }

  return {
    status: "error" as const,
    detail: message,
  };
}

async function syncSingleIntegration(
  integration: IntegrationRow,
  rawOptions: EmailInvoiceSyncOptions = {}
): Promise<EmailInvoiceSyncSummary> {
  const options: Required<EmailInvoiceSyncOptions> = {
    mode: rawOptions.mode || "incremental",
    monthsBack: Math.min(Math.max(rawOptions.monthsBack || 24, 1), 120),
    maxMessages: Math.min(Math.max(rawOptions.maxMessages || 400, 1), 2000),
  };
  const summary: EmailInvoiceSyncSummary = {
    mode: options.mode,
    imported: 0,
    duplicated: 0,
    errors: 0,
    skipped: 0,
    processedMessages: 0,
    processedAttachments: 0,
    matchedMessages: 0,
    truncated: false,
    lookbackMonths: options.mode === "historical" ? options.monthsBack : null,
    lastSyncedAt: null,
  };

  let maxUid = Number(integration.last_uid || 0);
  const supabaseAdmin = buildSupabaseAdminClient();
  let client: ImapFlow | null = null;
  let releaseLock: (() => void) | null = null;

  try {
    if (integration.provider !== MANUAL_IMAP_PROVIDER) {
      throw new Error(
        "La integracion actual ya no es compatible. Vuelve a conectar el correo usando IMAP manual."
      );
    }

    if (!integration.imap_password_encrypted) {
      throw new Error(
        "La integracion IMAP no tiene una app password valida. Vuelve a conectar el correo."
      );
    }

    const connection = await openValidatedImapMailbox({
      host: integration.imap_host,
      port: integration.imap_port,
      secure: integration.imap_secure,
      user: integration.imap_user,
      pass: decryptSecret(integration.imap_password_encrypted),
      mailbox: integration.mailbox || DEFAULT_MAILBOX,
    });
    client = connection.client;
    releaseLock = () => connection.lock.release();

    try {
      const uids = await client.search(buildSearchObject(integration, options), { uid: true });
      if (!uids || uids.length === 0) {
        const nowIso = new Date().toISOString();
        await supabaseAdmin
          .from("facturas_correo_integraciones")
          .update({ last_synced_at: nowIso, last_error: null })
          .eq("id", integration.id);
        summary.lastSyncedAt = nowIso;
        return summary;
      }

      const orderedUids = [...uids].sort((left, right) => left - right);
      const selectedUids =
        options.mode === "historical" ? orderedUids.slice(0, options.maxMessages) : orderedUids;
      summary.matchedMessages = orderedUids.length;
      summary.truncated = selectedUids.length < orderedUids.length;

      const messages = await client.fetchAll(
        selectedUids,
        {
          uid: true,
          envelope: true,
          source: true,
          internalDate: true,
        },
        { uid: true }
      );

      for (const message of messages) {
        const uid = Number(message.uid || 0);
        if (uid > maxUid) maxUid = uid;
        summary.processedMessages += 1;

        if (!message.source) {
          summary.errors += 1;
          await createImportLog({
            integrationId: integration.id,
            escuelaId: integration.escuela_id,
            sedeId: integration.sede_id,
            imapUid: uid,
            messageId: optionalText(message.envelope?.messageId),
            messageDate: toIsoDateTime(message.internalDate),
            remitente: optionalText(message.envelope?.from?.[0]?.address),
            asunto: optionalText(message.envelope?.subject),
            attachmentName: `${ATTACHMENT_NAME_FALLBACK}-${uid}.eml`,
            status: "error",
            detail: "El correo no trajo el contenido completo para leer adjuntos.",
          });
          continue;
        }

        const parsed = await simpleParser(message.source);
        const messageId =
          optionalText(parsed.messageId) || optionalText(message.envelope?.messageId);
        const remitente =
          extractSenderAddress(parsed.from) || optionalText(message.envelope?.from?.[0]?.address);
        const asunto = optionalText(parsed.subject) || optionalText(message.envelope?.subject);
        const messageDate = toIsoDateTime(parsed.date || message.internalDate);

        const attachments = parsed.attachments.filter((attachment) => {
          const lowerName = attachmentFileName(attachment.filename, uid).toLowerCase();
          return lowerName.endsWith(".xml") || lowerName.endsWith(".zip");
        });

        if (attachments.length === 0) {
          summary.skipped += 1;
          continue;
        }

        for (const attachment of attachments) {
          const attachmentName = attachmentFileName(attachment.filename, uid);
          summary.processedAttachments += 1;

          if (await hasImportRecord(integration.id, messageId, uid, attachmentName)) {
            summary.skipped += 1;
            continue;
          }

          try {
            const preview = await parseElectronicInvoiceBinary({
              fileName: attachmentName,
              content: attachment.content,
            });

            const duplicate = await findDuplicateExpense(
              integration.escuela_id,
              preview.invoiceNumber,
              preview.supplierName
            );

            if (duplicate) {
              summary.duplicated += 1;
              await createImportLog({
                integrationId: integration.id,
                escuelaId: integration.escuela_id,
                sedeId: integration.sede_id,
                gastoId: duplicate.id,
                imapUid: uid,
                messageId,
                messageDate,
                remitente,
                asunto,
                attachmentName,
                invoiceNumber: preview.invoiceNumber,
                supplierName: preview.supplierName,
                total: preview.payableAmount,
                currency: preview.currency,
                status: "duplicada",
                detail: `La factura ${preview.invoiceNumber} ya existia en gastos para ${preview.supplierName}.`,
              });
              continue;
            }

            const notes = [
              buildElectronicInvoiceNote(preview),
              `Correo origen: ${remitente || integration.correo}`,
              asunto ? `Asunto: ${asunto}` : "",
              messageId ? `Message-ID: ${messageId}` : "",
            ]
              .filter(Boolean)
              .join("\n");

            const gastoId = await insertExpenseFromPreview({
              integration,
              invoiceNumber: preview.invoiceNumber,
              issueDate: preview.issueDate,
              supplierName: preview.supplierName,
              categorySuggestion: preview.categorySuggestion,
              conceptSuggestion: preview.conceptSuggestion,
              payableAmount: preview.payableAmount,
              paymentMethodSuggestion: preview.paymentMethodSuggestion,
              notes,
            });

            summary.imported += 1;
            await createImportLog({
              integrationId: integration.id,
              escuelaId: integration.escuela_id,
              sedeId: integration.sede_id,
              gastoId,
              imapUid: uid,
              messageId,
              messageDate,
              remitente,
              asunto,
              attachmentName,
              invoiceNumber: preview.invoiceNumber,
              supplierName: preview.supplierName,
              total: preview.payableAmount,
              currency: preview.currency,
              status: "importada",
              detail: `Factura ${preview.invoiceNumber} importada automaticamente desde correo.`,
            });
          } catch (error) {
            const failure = classifyInvoiceAttachmentError(error);
            if (failure.status === "omitida") {
              summary.skipped += 1;
            } else {
              summary.errors += 1;
            }
            await createImportLog({
              integrationId: integration.id,
              escuelaId: integration.escuela_id,
              sedeId: integration.sede_id,
              imapUid: uid,
              messageId,
              messageDate,
              remitente,
              asunto,
              attachmentName,
              status: failure.status,
              detail: failure.detail,
            });
          }
        }
      }
    } finally {
      releaseLock?.();
    }

    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from("facturas_correo_integraciones")
      .update({
        last_uid: maxUid || integration.last_uid,
        last_synced_at: nowIso,
        last_error: null,
      })
      .eq("id", integration.id);

    summary.lastSyncedAt = nowIso;
    return summary;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo sincronizar el correo de facturas.";
    await supabaseAdmin
      .from("facturas_correo_integraciones")
      .update({
        last_error: message,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", integration.id);
    throw new Error(message);
  } finally {
    await client?.logout().catch(() => undefined);
  }
}

export async function syncEmailInvoiceIntegrationBySchool(
  escuelaId: string,
  options: EmailInvoiceSyncOptions = {}
) {
  const integration = await getIntegrationBySchool(escuelaId);
  if (!integration || !integration.activa) {
    throw new Error("No hay una conexion de correo activa para esta escuela.");
  }

  return syncSingleIntegration(integration, options);
}

export async function syncAllActiveEmailInvoiceIntegrations() {
  const supabaseAdmin = buildSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("facturas_correo_integraciones")
    .select("*")
    .eq("activa", true)
    .eq("auto_sync", true)
    .eq("provider", MANUAL_IMAP_PROVIDER);

  if (error) {
    throw new Error(
      `No se pudieron consultar las integraciones activas de correo: ${error.message}`
    );
  }

  const rows = (data as IntegrationRow[]) || [];
  const results: Array<{
    escuelaId: string;
    imported: number;
    duplicated: number;
    errors: number;
  }> = [];

  for (const row of rows) {
    try {
      const summary = await syncSingleIntegration(row);
      results.push({
        escuelaId: row.escuela_id,
        imported: summary.imported,
        duplicated: summary.duplicated,
        errors: summary.errors,
      });
    } catch {
      results.push({
        escuelaId: row.escuela_id,
        imported: 0,
        duplicated: 0,
        errors: 1,
      });
    }
  }

  return results;
}
