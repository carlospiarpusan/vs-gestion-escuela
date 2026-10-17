import "server-only";
import type { ZodType } from "zod";
import {
  INVOICE_DATA_CODE,
  invoiceDataIssuesSchema,
  InvoiceDataIncompleteError,
} from "./student-invoice-data";

const API = "https://www.facturax.co/api/integrations/condusoft/v1";
export class FacturaxError extends Error {
  constructor(
    message: string,
    public status = 503
  ) {
    super(message);
  }
}
export function facturaxConfigured() {
  return (
    process.env.FACTURAX_INVOICING_ENABLED === "true" &&
    /^fx_cs_[A-Za-z0-9_-]{43}$/.test(process.env.FACTURAX_EMISSION_API_KEY ?? "")
  );
}
export async function facturaxRequest<T>(
  schema: ZodType<T>,
  body: unknown,
  requestId?: string,
  fetcher: typeof fetch = fetch
): Promise<T> {
  if (!facturaxConfigured())
    throw new FacturaxError("Falta activar la conexion de emision con FacturaX.");
  try {
    const response = await fetcher(requestId ? `${API}?id=${encodeURIComponent(requestId)}` : API, {
      method: requestId ? "GET" : "POST",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
      headers: {
        Authorization: `Bearer ${process.env.FACTURAX_EMISSION_API_KEY}`,
        "Content-Type": "application/json",
      },
      ...(requestId ? {} : { body: JSON.stringify(body) }),
    });
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 3_000_000) {
          await reader.cancel();
          throw new Error("Response too large");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!response.ok && response.status === 422 && result?.code === INVOICE_DATA_CODE) {
      const issues = invoiceDataIssuesSchema.safeParse(result.issues);
      if (issues.success && issues.data.length)
        throw new InvoiceDataIncompleteError(
          issues.data,
          "FacturaX requiere completar los datos del alumno."
        );
    }
    if (!response.ok)
      throw new FacturaxError(
        typeof result?.error === "string"
          ? result.error.slice(0, 2000)
          : "FacturaX no pudo completar la solicitud.",
        [400, 401, 403, 404, 409, 415, 422, 429, 503].includes(response.status)
          ? response.status
          : 503
      );
    return schema.parse(result);
  } catch (error) {
    if (error instanceof FacturaxError || error instanceof InvoiceDataIncompleteError) throw error;
    // No automatic retries: emission may have succeeded even when its response was lost.
    throw new FacturaxError(
      "No se pudo confirmar la respuesta de FacturaX. Consulta el estado antes de volver a emitir."
    );
  }
}
