import { createHash, timingSafeEqual } from "node:crypto";

type WompiEnvironment = "sandbox" | "production";

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

function getWompiApiBaseUrl(environment: WompiEnvironment) {
  return environment === "sandbox"
    ? "https://sandbox.wompi.co/v1"
    : "https://production.wompi.co/v1";
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
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
