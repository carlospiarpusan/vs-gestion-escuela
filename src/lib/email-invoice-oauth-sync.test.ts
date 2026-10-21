// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  getEmailInvoiceIntegrationState,
  syncEmailInvoiceIntegrationBySchool,
  syncAllActiveEmailInvoiceIntegrations,
  assertEmailInvoiceSedeScope,
} from "./email-invoice-sync";
import type { FacturaCorreoProveedor } from "@/types/database";
import { MailMessageTooLargeError, MailProviderError } from "./email-oauth-providers";
const mock = vi.hoisted(() => ({
  integration: {} as Record<string, unknown>,
  expenses: [] as Record<string, unknown>[],
  logs: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  failExpense: false,
  busy: false,
  imapRelease: vi.fn(),
  imapLogout: vi.fn(),
  exchange: vi.fn(),
  list: vi.fn(),
  read: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/server-read-cache", () => ({ revalidateServerReadCache: mock.revalidate }));
vi.mock("imapflow", () => ({
  ImapFlow: class {
    async connect() {}
    async getMailboxLock() {
      return { release: mock.imapRelease };
    }
    async logout() {
      mock.imapLogout();
    }
    async search() {
      return [1];
    }
    async *fetch() {
      yield {
        uid: 1,
        envelope: { messageId: "<invoice@example.com>" },
        bodyStructure: {
          type: "application/xml",
          part: "1",
          disposition: "attachment",
          dispositionParameters: { filename: "factura.xml" },
        },
      };
    }
    async fetchOne() {
      return { source: mime() };
    }
  },
}));
vi.mock("@/lib/email-oauth-providers", async (original) => ({
  ...(await original<typeof import("@/lib/email-oauth-providers")>()),
  exchangeMailToken: mock.exchange,
  listInvoiceMessages: mock.list,
  readInvoiceMessage: mock.read,
}));
vi.mock("@/lib/api-auth", () => ({
  buildSupabaseAdminClient: () => ({
    from: (table: string) => {
      const filters = new Map<string, unknown>();
      let action = "select";
      let payload: Record<string, unknown> = {};
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters.set(key, value);
          return query;
        },
        in: (key: string, value: unknown) => {
          filters.set(key, value);
          return query;
        },
        or: () => query,
        order: () => query,
        limit: () => query,
        update: (row: Record<string, unknown>) => {
          action = "update";
          payload = row;
          return query;
        },
        insert: (row: Record<string, unknown>) => {
          action = "insert";
          payload = row;
          return query;
        },
        maybeSingle: async () => {
          if (action === "update" && table === "facturas_correo_integraciones") {
            if (mock.busy) return { data: null };
            mock.updates.push(payload);
            Object.assign(mock.integration, payload);
            return { data: { id: "integration" } };
          }
          if (action === "update" && table === "facturas_correo_importaciones") {
            const row = mock.logs.find(
              (item) => item.status === "error" && item.message_id === filters.get("message_id")
            );
            if (row) Object.assign(row, payload);
            return { data: row ? { id: "log" } : null };
          }
          return { data: table === "escuelas" ? { cif: "901171550-1" } : mock.integration };
        },
        single: async () => {
          if (mock.failExpense) return { error: { message: "database failure" } };
          const row = { ...payload, id: "expense" };
          mock.expenses.push(row);
          return { data: row };
        },
        then: (resolve: (value: unknown) => unknown) => {
          if (action === "update") {
            mock.updates.push(payload);
            Object.assign(mock.integration, payload);
            return Promise.resolve({ error: null }).then(resolve);
          }
          if (action === "insert") {
            mock.logs.push(payload);
            return Promise.resolve({ error: null }).then(resolve);
          }
          const data =
            table === "facturas_correo_integraciones"
              ? [mock.integration]
              : table === "gastos"
                ? mock.expenses.filter(
                    (row) => row.numero_factura === filters.get("numero_factura")
                  )
                : mock.logs.filter((row) =>
                    Array.from(filters).every(([key, value]) =>
                      Array.isArray(value) ? value.includes(row[key]) : row[key] === value
                    )
                  );
          return Promise.resolve({ data }).then(resolve);
        },
      };
      return query;
    },
  }),
}));
const xml = `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><ID>FAC-123</ID><IssueDate>2026-10-19</IssueDate><DueDate>2026-11-19</DueDate><DocumentCurrencyCode>COP</DocumentCurrencyCode><AccountingCustomerParty><Party><PartyTaxScheme><CompanyID>901171550</CompanyID></PartyTaxScheme></Party></AccountingCustomerParty><AccountingSupplierParty><Party><PartyLegalEntity><RegistrationName>Proveedor Demo</RegistrationName><CompanyID>900123456</CompanyID></PartyLegalEntity></Party></AccountingSupplierParty><LegalMonetaryTotal><PayableAmount currencyID="COP">119000</PayableAmount></LegalMonetaryTotal></Invoice>`;
const mime = (messageId = "invoice@example.com", content = xml) =>
  Buffer.from(
    `From: proveedor@example.com\r\nSubject: Factura FAC-123\r\nMessage-ID: <${messageId}>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="boundary"\r\n\r\n--boundary\r\nContent-Type: application/xml\r\nContent-Disposition: attachment; filename="factura.xml"\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(content).toString("base64")}\r\n--boundary--\r\n`
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_INVOICE_ENCRYPTION_KEY", "test-key");
  mock.expenses = [];
  mock.logs = [];
  mock.updates = [];
  mock.failExpense = false;
  mock.busy = false;
  mock.integration = {
    id: "integration",
    escuela_id: "school",
    sede_id: "branch",
    updated_by: "actor",
    provider: "gmail_google",
    correo: "mail@gmail.com",
    activa: true,
    auto_sync: true,
    import_only_unseen: false,
    oauth_refresh_token_encrypted: encryptSecret("refresh"),
  };
  mock.exchange.mockResolvedValue({ accessToken: "access", refreshToken: "rotated" });
  mock.list.mockResolvedValue({ ids: ["message"], truncated: false });
  mock.read.mockResolvedValue(mime());
});
afterEach(() => vi.unstubAllEnvs());
it.each(["gmail_google", "outlook_microsoft"] as FacturaCorreoProveedor[])(
  "imports the actual XML MIME into the original school and sede (%s)",
  async (provider) => {
    mock.integration.provider = provider;
    const summary = await syncEmailInvoiceIntegrationBySchool("school");
    expect(summary.imported).toBe(1);
    expect(summary.errors).toBe(0);
    expect(mock.expenses[0]).toMatchObject({
      escuela_id: "school",
      sede_id: "branch",
      user_id: "actor",
      numero_factura: "FAC-123",
      monto: 119000,
      estado_pago: "pendiente",
      fecha_vencimiento: "2026-11-19",
      proveedor: "Proveedor Demo",
    });
    expect(mock.logs[0]).toMatchObject({
      imap_uid: null,
      message_id: "<invoice@example.com>",
      status: "importada",
    });
    expect(
      decryptSecret(
        String(
          mock.updates.find((row) => row.oauth_refresh_token_encrypted)
            ?.oauth_refresh_token_encrypted
        )
      )
    ).toBe("rotated");
  }
);
it("does not insert expenses again when syncing the same email", async () => {
  await syncEmailInvoiceIntegrationBySchool("school");
  const repeated = await syncEmailInvoiceIntegrationBySchool("school");
  expect(mock.expenses).toHaveLength(1);
  expect(mock.logs).toHaveLength(1);
  expect(repeated.imported).toBe(0);
  expect(repeated.skipped).toBe(1);
});
it("recognizes the same invoice in another message as a duplicate expense", async () => {
  await syncEmailInvoiceIntegrationBySchool("school");
  mock.read.mockResolvedValue(mime("forward@example.com"));
  const repeated = await syncEmailInvoiceIntegrationBySchool("school");
  expect(mock.expenses).toHaveLength(1);
  expect(repeated.duplicated).toBe(1);
});
it("reports failed expense inserts without counting them as imported", async () => {
  mock.failExpense = true;
  const summary = await syncEmailInvoiceIntegrationBySchool("school");
  expect(summary.imported).toBe(0);
  expect(summary.errors).toBe(1);
  expect(mock.logs[0].status).toBe("error");
});
it.each(["gmail_google", "outlook_microsoft"] as const)(
  "skips oversized messages, imports subsequent invoices and remembers the omission (%s)",
  async (provider) => {
    mock.integration.provider = provider;
    mock.list.mockResolvedValue({ ids: ["large", "invoice"], nextPageToken: null });
    mock.read.mockImplementation(async (_provider, _token, id) => {
      if (id === "large") throw new MailMessageTooLargeError();
      return mime();
    });
    const result = await syncEmailInvoiceIntegrationBySchool("school");
    expect(result).toMatchObject({
      imported: 1,
      skipped: 1,
      errors: 0,
      processedMessages: 2,
      truncated: false,
    });
    expect(mock.logs[0]).toMatchObject({ message_id: `${provider}:large`, status: "omitida" });
    expect(mock.expenses).toHaveLength(1);
    expect(mock.integration.last_error).toBeNull();
    mock.read.mockClear();
    const repeated = await syncEmailInvoiceIntegrationBySchool("school");
    expect(mock.read.mock.calls.map((call) => call[2])).toEqual(["invoice"]);
    expect(mock.logs).toHaveLength(2);
    expect(repeated.errors).toBe(0);
    expect(mock.expenses).toHaveLength(1);
  }
);
it("does not expose encrypted passwords or refresh tokens in the connection API", async () => {
  mock.integration.imap_password_encrypted = "private";
  const state = await getEmailInvoiceIntegrationState("school");
  expect(state.integration?.provider).toBe("gmail_google");
  expect(state.integration).not.toHaveProperty("oauth_refresh_token_encrypted");
  expect(state.integration).not.toHaveProperty("imap_password_encrypted");
});
it("cron includes OAuth accounts", async () => {
  await syncAllActiveEmailInvoiceIntegrations();
  expect(mock.exchange).toHaveBeenCalledTimes(1);
  expect(mock.expenses).toHaveLength(1);
});
it("historical search includes read messages and communicates truncated results", async () => {
  mock.integration.import_only_unseen = true;
  mock.list.mockResolvedValue({ ids: [], truncated: true, nextPageToken: "next-page" });
  const summary = await syncEmailInvoiceIntegrationBySchool("school", {
    mode: "historical",
    monthsBack: 24,
    maxMessages: 100,
  });
  expect(mock.list).toHaveBeenCalledWith(
    "gmail_google",
    "access",
    expect.objectContaining({ onlyUnread: false, maxMessages: 100 })
  );
  expect(summary.truncated).toBe(true);
});

it("resumes a 24-month, 2000-message search after a provider limit without losing invoices", async () => {
  const failure = new MailProviderError(
    "Lectura limitada temporalmente.",
    403,
    "rate_limit",
    60000
  );
  const ids = Array.from({ length: 2000 }, (_, index) => `message-${index}`);
  mock.list.mockResolvedValue({ ids, truncated: false });
  mock.read.mockResolvedValueOnce(mime()).mockRejectedValueOnce(failure);
  const options = { mode: "historical" as const, monthsBack: 24, maxMessages: 2000 };

  await expect(syncEmailInvoiceIntegrationBySchool("school", options)).rejects.toBe(failure);
  expect(mock.expenses).toHaveLength(1);
  expect(mock.integration.oauth_sync_state).toMatchObject({
    historical: { monthsBack: 24, pendingIds: ids.slice(1) },
  });
  expect(mock.integration.sync_locked_until).toBeNull();
  expect(mock.revalidate).toHaveBeenCalledWith([
    "finance:expense:school:school",
    "finance:cash:school:school",
    "finance:reports:school:school",
  ]);

  const resumed = await syncEmailInvoiceIntegrationBySchool("school", {
    ...options,
    maxMessages: 1,
  });
  expect(mock.list).toHaveBeenCalledTimes(1);
  expect(mock.read.mock.calls.map((call) => call[2])).toEqual([ids[0], ids[1], ids[1]]);
  expect(mock.expenses).toHaveLength(1);
  expect(resumed.truncated).toBe(true);
  expect(mock.integration.oauth_sync_state).toMatchObject({
    historical: { pendingIds: ids.slice(2) },
  });
  expect(mock.integration.last_error).toBeNull();
});

it("does not invalidate expense caches when the provider fails before any import", async () => {
  mock.exchange.mockRejectedValue(new MailProviderError("Cuota agotada.", 403, "quota", null));
  await expect(syncEmailInvoiceIntegrationBySchool("school")).rejects.toBeInstanceOf(
    MailProviderError
  );
  expect(mock.revalidate).not.toHaveBeenCalled();
  expect(mock.expenses).toHaveLength(0);
  expect(mock.integration.sync_locked_until).toBeNull();
});

it("resumes the provider cursor instead of repeatedly importing the first page", async () => {
  mock.list
    .mockResolvedValueOnce({ ids: ["first"], nextPageToken: "page-two", truncated: true })
    .mockResolvedValueOnce({ ids: ["second"], nextPageToken: null, truncated: false });
  await syncEmailInvoiceIntegrationBySchool("school");
  await syncEmailInvoiceIntegrationBySchool("school");
  expect(mock.list.mock.calls[1][2].pageToken).toBe("page-two");
  expect(mock.list.mock.calls[1][2].since).toEqual(mock.list.mock.calls[0][2].since);
});
it("retains extra Microsoft page ids for the following batch", async () => {
  mock.list.mockResolvedValueOnce({ ids: ["first", "second"], nextPageToken: "page-three" });
  await syncEmailInvoiceIntegrationBySchool("school", { maxMessages: 1 });
  await syncEmailInvoiceIntegrationBySchool("school", { maxMessages: 1 });
  expect(mock.list).toHaveBeenCalledTimes(1);
  expect(mock.read.mock.calls.map((call) => call[2])).toEqual(["first", "second"]);
});
it("retries a transient expense failure instead of permanently skipping the invoice", async () => {
  mock.failExpense = true;
  await syncEmailInvoiceIntegrationBySchool("school");
  mock.failExpense = false;
  const result = await syncEmailInvoiceIntegrationBySchool("school");
  expect(result.imported).toBe(1);
  expect(mock.logs).toHaveLength(1);
  expect(mock.logs[0].status).toBe("importada");
});
it("rejects an overlapping synchronization before reading messages", async () => {
  mock.busy = true;
  await expect(syncEmailInvoiceIntegrationBySchool("school")).rejects.toThrow(
    /Ya se está revisando/
  );
  expect(mock.exchange).not.toHaveBeenCalled();
  expect(mock.read).not.toHaveBeenCalled();
});
it("prevents branch staff from operating another branch connection", async () => {
  await expect(assertEmailInvoiceSedeScope("school", "other-branch")).rejects.toThrow(/otra sede/);
  await expect(assertEmailInvoiceSedeScope("school", "branch")).resolves.toBeUndefined();
  expect((await getEmailInvoiceIntegrationState("school", "other-branch")).integration).toBeNull();
});

it("keeps the existing manual IMAP XML import and releases the mailbox", async () => {
  mock.integration.provider = "imap";
  mock.integration.imap_password_encrypted = encryptSecret("app-password");
  const summary = await syncEmailInvoiceIntegrationBySchool("school");
  expect(summary.imported).toBe(1);
  expect(mock.expenses[0].numero_factura).toBe("FAC-123");
  expect(mock.exchange).not.toHaveBeenCalled();
  expect(mock.imapRelease).toHaveBeenCalledTimes(1);
  expect(mock.imapLogout).toHaveBeenCalledTimes(1);
});

it.each([
  ["nota crédito", xml.replaceAll("Invoice", "CreditNote")],
  ["moneda extranjera", xml.replaceAll("COP", "USD")],
  ["otra empresa", xml.replace("901171550", "999999999")],
  ["receptor ausente", xml.replace(/<AccountingCustomerParty>.*?<\/AccountingCustomerParty>/, "")],
])("separa %s para revisión sin crear un gasto", async (_label, content) => {
  mock.read.mockResolvedValue(mime("review@example.com", content));
  const result = await syncEmailInvoiceIntegrationBySchool("school");
  expect(result.imported).toBe(0);
  expect(result.skipped).toBe(1);
  expect(mock.expenses).toHaveLength(0);
  expect(mock.logs[0]).toMatchObject({
    status: "omitida",
    detail: expect.stringContaining("Requiere revisión:"),
  });
});

it("deduplica por NIT aunque cambie el nombre del proveedor", async () => {
  await syncEmailInvoiceIntegrationBySchool("school");
  mock.read.mockResolvedValue(
    mime("renamed@example.com", xml.replace("Proveedor Demo", "Nueva razón social"))
  );
  const result = await syncEmailInvoiceIntegrationBySchool("school");
  expect(result.duplicated).toBe(1);
  expect(mock.expenses).toHaveLength(1);
});
it("reconoce la factura histórica por el NIT guardado en sus referencias", async () => {
  mock.expenses.push({
    id: "legacy",
    numero_factura: "FAC-123",
    proveedor: "Antigua razón social",
    notas: "NIT proveedor: 900123456",
  });
  const result = await syncEmailInvoiceIntegrationBySchool("school");
  expect(result.duplicated).toBe(1);
  expect(mock.expenses).toHaveLength(1);
});

it("guarda los correos restantes al alcanzar el tiempo y continúa desde allí", async () => {
  let time = Date.now();
  const clock = vi.spyOn(Date, "now").mockImplementation(() => time);
  try {
    mock.list.mockResolvedValue({ ids: ["first", "second"], truncated: false });
    mock.read.mockImplementation(async (_provider, _token, id) => {
      time += 2000;
      return mime(`${id}@example.com`);
    });
    const first = await syncEmailInvoiceIntegrationBySchool("school", { maxDurationMs: 1000 });
    expect(first.truncated).toBe(true);
    expect(mock.read).toHaveBeenCalledTimes(1);
    expect(mock.integration.oauth_sync_state).toMatchObject({
      incremental: { pendingIds: ["second"] },
    });
    const next = await syncEmailInvoiceIntegrationBySchool("school", { maxDurationMs: 1000 });
    expect(next.truncated).toBe(false);
    expect(mock.read.mock.calls.map((call) => call[2])).toEqual(["first", "second"]);
  } finally {
    clock.mockRestore();
  }
});
it("conserva el cursor IMAP para volver a intentar una factura que no se pudo guardar", async () => {
  mock.integration.provider = "imap";
  mock.integration.imap_password_encrypted = encryptSecret("app-password");
  mock.failExpense = true;
  await syncEmailInvoiceIntegrationBySchool("school");
  expect(mock.integration.last_uid).toBe(0);
  mock.failExpense = false;
  await syncEmailInvoiceIntegrationBySchool("school");
  expect(mock.integration.last_uid).toBe(1);
  expect(mock.expenses).toHaveLength(1);
});

it.each(["gmail_google", "outlook_microsoft"] as FacturaCorreoProveedor[])(
  "importa desde %s el adjunto que contiene una factura con prefijo",
  async (provider) => {
    mock.integration.provider = provider;
    const invoice = xml
      .replace("<Invoice xmlns=", "<ubl-invoice:Invoice xmlns:ubl-invoice=")
      .replace("</Invoice>", "</ubl-invoice:Invoice>");
    const wrapped = `<AttachedDocument xmlns="urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2"><Attachment><ExternalReference><Description><![CDATA[${invoice}]]></Description></ExternalReference></Attachment></AttachedDocument>`;
    mock.read.mockResolvedValue(mime("prefixed@example.com", wrapped));
    const summary = await syncEmailInvoiceIntegrationBySchool("school");
    expect(summary).toMatchObject({ imported: 1, errors: 0 });
    expect(mock.expenses[0]).toMatchObject({
      numero_factura: "FAC-123",
      monto: 119000,
      estado_pago: "pendiente",
      fecha_vencimiento: "2026-11-19",
    });
  }
);
