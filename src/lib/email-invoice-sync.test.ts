import { createCipheriv, createHash, randomBytes } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { __emailInvoiceCrypto, __emailInvoiceSyncInternals } from "./email-invoice-sync";

const originalEmailKey = process.env.EMAIL_INVOICE_ENCRYPTION_KEY;
const originalLegacyKey = process.env.EMAIL_INVOICE_LEGACY_ENCRYPTION_KEY;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function restoreEnv() {
  if (originalEmailKey === undefined) {
    delete process.env.EMAIL_INVOICE_ENCRYPTION_KEY;
  } else {
    process.env.EMAIL_INVOICE_ENCRYPTION_KEY = originalEmailKey;
  }

  if (originalLegacyKey === undefined) {
    delete process.env.EMAIL_INVOICE_LEGACY_ENCRYPTION_KEY;
  } else {
    process.env.EMAIL_INVOICE_LEGACY_ENCRYPTION_KEY = originalLegacyKey;
  }

  if (originalServiceRoleKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  }
}

afterEach(() => {
  restoreEnv();
});

function encryptLegacySecret(value: string, seed: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(seed).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

describe("email invoice crypto compatibility", () => {
  it("encrypts new credentials with the dedicated key and embeds its fingerprint", () => {
    process.env.EMAIL_INVOICE_ENCRYPTION_KEY = "dedicated-email-key";
    delete process.env.EMAIL_INVOICE_LEGACY_ENCRYPTION_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-compat-key";

    const encrypted = __emailInvoiceCrypto.encryptSecret("app-password-123");
    const decrypted = __emailInvoiceCrypto.decryptSecretDetailed(encrypted);

    expect(encrypted.startsWith("v2:")).toBe(true);
    expect(decrypted.value).toBe("app-password-123");
    expect(decrypted.requiresReencryption).toBe(false);
    expect(decrypted.seed.fingerprint).toBe(
      __emailInvoiceCrypto.fingerprintEncryptionSeed("dedicated-email-key")
    );
  });

  it("decrypts legacy credentials encrypted with the service role fallback and marks them for re-encryption", () => {
    process.env.EMAIL_INVOICE_ENCRYPTION_KEY = "new-dedicated-email-key";
    delete process.env.EMAIL_INVOICE_LEGACY_ENCRYPTION_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-compat-key";

    const encrypted = encryptLegacySecret("legacy-password", "service-role-compat-key");
    const decrypted = __emailInvoiceCrypto.decryptSecretDetailed(encrypted);

    expect(decrypted.value).toBe("legacy-password");
    expect(decrypted.seed.source).toBe("compatibility");
    expect(decrypted.requiresReencryption).toBe(true);
  });

  it("rejects new encryption when the dedicated key is missing", () => {
    delete process.env.EMAIL_INVOICE_ENCRYPTION_KEY;
    delete process.env.EMAIL_INVOICE_LEGACY_ENCRYPTION_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-compat-key";

    expect(() => __emailInvoiceCrypto.encryptSecret("app-password-123")).toThrow(
      "EMAIL_INVOICE_ENCRYPTION_KEY no esta configurada"
    );
  });
});

describe("email invoice sync internals", () => {
  it("chunks UIDs in small stable batches", () => {
    expect(__emailInvoiceSyncInternals.chunkArray([1, 2, 3, 4, 5], 2)).toEqual([
      [1, 2],
      [3, 4],
      [5],
    ]);
  });

  it("detects only xml and zip attachments from body structure metadata", () => {
    const hints = __emailInvoiceSyncInternals.getInvoiceAttachmentHints({
      bodyStructure: {
        type: "multipart/mixed",
        childNodes: [
          {
            type: "text/plain",
            part: "1",
          },
          {
            type: "application/xml",
            part: "2",
            disposition: "attachment",
            dispositionParameters: {
              filename: "factura-001.xml",
            },
          },
          {
            type: "application/zip",
            part: "3",
            disposition: "attachment",
            dispositionParameters: {
              filename: "factura-001.zip",
            },
          },
          {
            type: "application/pdf",
            part: "4",
            disposition: "attachment",
            dispositionParameters: {
              filename: "soporte.pdf",
            },
          },
        ],
      },
    } as never);

    expect(hints).toEqual([
      {
        fileName: "factura-001.xml",
        mimeType: "application/xml",
        part: "2",
      },
      {
        fileName: "factura-001.zip",
        mimeType: "application/zip",
        part: "3",
      },
    ]);
  });
});
