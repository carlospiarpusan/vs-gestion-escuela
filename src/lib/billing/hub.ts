import crypto from "node:crypto";
import { getSiteUrl } from "@/lib/site-metadata";
import type { PlanEscuelaPago, SchoolPaidBillingInterval } from "@/types/database";

export type BillingHubOperation = "new_subscription" | "renewal" | "upgrade" | "downgrade_schedule";

export type PublicBillingTokenPayload = {
  empresa_id: string;
  target_plan_code: PlanEscuelaPago;
  billing_interval: SchoolPaidBillingInterval;
  operation_type: BillingHubOperation;
  exp: number;
  nonce: string;
};

export type HubCheckoutResponse = {
  ok: true;
  checkoutIntentId: string;
  reference: string;
  checkoutUrl: string | null;
  status: string;
  scheduled: boolean;
  message: string;
};

export type HubStatusResponse = {
  id: string;
  empresa_id: string;
  product_code: "condusoft";
  operacion: BillingHubOperation;
  estado: "pending" | "approved" | "declined" | "error" | "created" | "expired" | "cancelled";
  billing_interval: SchoolPaidBillingInterval;
  reference: string;
  amount_in_cents: number;
  currency: string;
  wompi_transaction_id?: string | null;
  wompi_transaction_status?: string | null;
  plan_code: string;
  plan_name: string;
  subscription?: {
    billing_expires_at?: string | null;
    billing_interval?: SchoolPaidBillingInterval | null;
  } | null;
};

export type PaymentConfirmationPayload = {
  reference: string;
  empresa_id: string;
  product_code: "condusoft";
  plan_code: string;
  plan_name: string;
  operation_type: BillingHubOperation;
  billing_interval: SchoolPaidBillingInterval;
  period_start: string;
  period_end: string;
  amount_paid: number;
  transaction_id: string | null;
  transaction_status: string | null;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name}.`);
  return value;
}

export function getHubUrl() {
  return required("CLOVENT_BILLING_HUB_URL");
}

export function getSharedSecret() {
  return required("CONDUSOFT_BILLING_SHARED_SECRET");
}

export function getPublicTokenSecret() {
  return required("CONDUSOFT_PUBLIC_BILLING_TOKEN_SECRET");
}

export function getCondusoftBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    return raw;
  }
  return getSiteUrl().toString().replace(/\/$/, "");
}

function b64urlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function b64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function hmacHex(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}

function safeEqualHex(left: string, right: string) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();

  const leftBuffer = Buffer.from(normalizedLeft, "hex");
  const rightBuffer = Buffer.from(normalizedRight, "hex");

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildInternalSignature(
  payloadText: string,
  timestamp: string,
  secret = getSharedSecret()
) {
  return hmacHex(`${timestamp}.${payloadText}`, secret);
}

export function buildInternalHeaders(payloadText: string) {
  const timestamp = String(Date.now());
  const signature = buildInternalSignature(payloadText, timestamp);
  return {
    "Content-Type": "application/json",
    "x-product-code": "condusoft",
    "x-billing-timestamp": timestamp,
    "x-billing-signature": signature,
  };
}

export function verifyInternalSignature(
  payloadText: string,
  timestamp: string,
  provided: string,
  secret = getSharedSecret()
) {
  const expected = buildInternalSignature(payloadText, timestamp, secret);
  return safeEqualHex(expected, provided);
}

export function signPublicBillingToken(payload: PublicBillingTokenPayload) {
  const payloadText = JSON.stringify(payload);
  const encoded = b64urlEncode(payloadText);
  const signature = hmacHex(encoded, getPublicTokenSecret());
  return `${encoded}.${signature}`;
}

export function verifyPublicBillingToken(token: string): PublicBillingTokenPayload {
  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature) {
    throw new Error("Token inválido.");
  }

  const expected = hmacHex(encoded, getPublicTokenSecret());
  if (!safeEqualHex(expected, providedSignature)) {
    throw new Error("Firma inválida.");
  }

  const payload = JSON.parse(b64urlDecode(encoded)) as Partial<PublicBillingTokenPayload>;
  if (
    !payload.empresa_id ||
    !payload.target_plan_code ||
    !payload.billing_interval ||
    !payload.operation_type ||
    !payload.exp ||
    !payload.nonce
  ) {
    throw new Error("Token incompleto.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error("Token vencido.");
  }

  return payload as PublicBillingTokenPayload;
}

export async function requestHubCheckout(input: {
  empresa_id: string;
  target_plan_code: string;
  billing_interval: SchoolPaidBillingInterval;
  operation_type: BillingHubOperation;
  amount_in_cents: number;
  currency: "COP";
  plan_name?: string | null;
  redirect_url?: string;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    product_code: "condusoft" as const,
    empresa_id: input.empresa_id,
    target_plan_code: input.target_plan_code,
    billing_interval: input.billing_interval,
    operation_type: input.operation_type,
    amount_in_cents: input.amount_in_cents,
    currency: input.currency,
    ...(input.plan_name ? { plan_name: input.plan_name } : {}),
    redirect_url:
      input.redirect_url ?? `${getCondusoftBaseUrl().replace(/\/$/, "")}/billing/estado`,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };

  const payloadText = JSON.stringify(payload);
  const response = await fetch(`${getHubUrl()}/api/payments/checkout`, {
    method: "POST",
    headers: buildInternalHeaders(payloadText),
    body: payloadText,
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<HubCheckoutResponse>)
    | null;

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error ?? "No se pudo crear el checkout en ClovEnt.");
  }

  return body as HubCheckoutResponse;
}

export async function requestHubStatus(reference: string) {
  const payloadText = JSON.stringify({ reference });
  const timestamp = String(Date.now());
  const signature = buildInternalSignature(payloadText, timestamp);

  const response = await fetch(
    `${getHubUrl()}/api/payments/status/${encodeURIComponent(reference)}`,
    {
      headers: {
        "x-product-code": "condusoft",
        "x-billing-timestamp": timestamp,
        "x-billing-signature": signature,
      },
      cache: "no-store",
    }
  );

  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<HubStatusResponse>)
    | null;

  if (!response.ok || !body?.reference) {
    throw new Error(body?.error ?? "No se pudo consultar el estado del checkout.");
  }

  return body as HubStatusResponse;
}
