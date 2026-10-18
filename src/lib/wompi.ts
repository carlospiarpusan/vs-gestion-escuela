import { createHash, timingSafeEqual } from "node:crypto";

export type WompiEnvironment = "sandbox" | "production";

export type WompiCheckoutPayload = {
  "public-key": string;
  currency: "COP";
  "amount-in-cents": string;
  reference: string;
  "signature:integrity": string;
  "redirect-url": string;
  "expiration-time"?: string;
  "customer-data:email"?: string;
  "customer-data:full-name"?: string;
  "customer-data:phone-number"?: string;
  "customer-data:phone-number-prefix"?: string;
  "customer-data:legal-id"?: string;
  "customer-data:legal-id-type"?: string;
  "collect-customer-legal-id"?: string;
};

export type WompiEventBody = {
  event?: string;
  data?: Record<string, unknown>;
  sent_at?: string;
  timestamp?: number | string;
  signature?: {
    checksum?: string;
    properties?: string[];
  };
};

export type WompiTransaction = {
  id: string;
  status: string;
  reference: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type?: string | null;
  customer_email?: string | null;
  redirect_url?: string | null;
  finalized_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

function normalizeEnvironment(rawValue: string | undefined): WompiEnvironment {
  return rawValue === "sandbox" ? "sandbox" : "production";
}

export function getWompiConfig() {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  const eventSecret = process.env.WOMPI_EVENT_SECRET;
  const environment = normalizeEnvironment(process.env.WOMPI_ENV);

  if (!publicKey) {
    throw new Error("Falta WOMPI_PUBLIC_KEY.");
  }

  if (!integritySecret) {
    throw new Error("Falta WOMPI_INTEGRITY_SECRET.");
  }

  if (!eventSecret) {
    throw new Error("Falta WOMPI_EVENT_SECRET.");
  }

  return {
    publicKey,
    privateKey,
    integritySecret,
    eventSecret,
    environment,
  };
}

export function getWompiCheckoutUrl() {
  return "https://checkout.wompi.co/p/";
}

export function getWompiApiBaseUrl(environment: WompiEnvironment) {
  return environment === "sandbox"
    ? "https://sandbox.wompi.co/v1"
    : "https://production.wompi.co/v1";
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildWompiIntegritySignature(input: {
  reference: string;
  amountInCents: number;
  currency: "COP";
  expirationTime?: string | null;
  integritySecret: string;
}) {
  const base = `${input.reference}${input.amountInCents}${input.currency}`;
  const fullText = input.expirationTime
    ? `${base}${input.expirationTime}${input.integritySecret}`
    : `${base}${input.integritySecret}`;

  return sha256Hex(fullText);
}

function getNestedValue(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

export function validateWompiEventChecksum(event: WompiEventBody, eventSecret: string) {
  const signature = event.signature;
  if (
    !signature?.checksum ||
    !Array.isArray(signature.properties) ||
    signature.properties.length === 0
  ) {
    return false;
  }

  const propertyValues = signature.properties
    .map((propertyPath) => getNestedValue(event.data, propertyPath))
    .map((value) => (value === null || value === undefined ? "" : String(value)))
    .join("");
  const timestamp = String(event.timestamp ?? "");
  const expected = sha256Hex(`${propertyValues}${timestamp}${eventSecret}`);

  const expectedBuf = Buffer.from(expected.toLowerCase(), "utf8");
  const actualBuf = Buffer.from(String(signature.checksum).toLowerCase(), "utf8");
  return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
}

export function buildWompiCheckoutPayload(input: {
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  integritySecret: string;
  publicKey: string;
  expirationTime?: string | null;
  customerEmail?: string | null;
  customerFullName?: string | null;
  customerPhone?: string | null;
  customerLegalId?: string | null;
}) {
  const integrity = buildWompiIntegritySignature({
    reference: input.reference,
    amountInCents: input.amountInCents,
    currency: "COP",
    expirationTime: input.expirationTime,
    integritySecret: input.integritySecret,
  });

  const payload: WompiCheckoutPayload = {
    "public-key": input.publicKey,
    currency: "COP",
    "amount-in-cents": String(input.amountInCents),
    reference: input.reference,
    "signature:integrity": integrity,
    "redirect-url": input.redirectUrl,
  };

  if (input.expirationTime) {
    payload["expiration-time"] = input.expirationTime;
  }

  if (input.customerEmail) {
    payload["customer-data:email"] = input.customerEmail;
  }

  if (input.customerFullName) {
    payload["customer-data:full-name"] = input.customerFullName;
  }

  if (input.customerPhone) {
    payload["customer-data:phone-number"] = input.customerPhone;
    payload["customer-data:phone-number-prefix"] = "+57";
  }

  if (input.customerLegalId) {
    payload["customer-data:legal-id"] = input.customerLegalId;
    payload["customer-data:legal-id-type"] = "CC";
    payload["collect-customer-legal-id"] = "true";
  }

  return payload;
}

export async function fetchWompiTransaction(transactionId: string) {
  const config = getWompiConfig();

  if (!config.privateKey) {
    throw new Error("Falta WOMPI_PRIVATE_KEY para consultar transacciones.");
  }

  const response = await fetch(
    `${getWompiApiBaseUrl(config.environment)}/transactions/${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.privateKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const payload = (await response.json().catch(() => null)) as {
    data?: WompiTransaction;
    error?: { reason?: string; messages?: string[] };
  } | null;

  if (!response.ok || !payload?.data) {
    const reason = payload?.error?.reason || payload?.error?.messages?.join(", ");
    throw new Error(reason || "No se pudo consultar la transacción en Wompi.");
  }

  return payload.data;
}
