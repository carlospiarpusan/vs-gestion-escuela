// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { facturaxRequest } from "./facturax-client";
import { InvoiceDataIncompleteError } from "./student-invoice-data";
vi.mock("server-only", () => ({}));
beforeEach(() => {
  vi.stubEnv("FACTURAX_INVOICING_ENABLED", "true");
  vi.stubEnv("FACTURAX_EMISSION_API_KEY", `fx_cs_${"a".repeat(43)}`);
});
afterEach(() => vi.unstubAllEnvs());
it("usa HTTPS fijo, no sigue redirecciones y no reintenta mutaciones", async () => {
  const fetcher = vi.fn().mockRejectedValue(Error("timeout"));
  await expect(
    facturaxRequest(z.unknown(), { action: "emit" }, undefined, fetcher)
  ).rejects.toThrow(/Consulta el estado/);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe("https://www.facturax.co/api/integrations/condusoft/v1");
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    redirect: "error",
    cache: "no-store",
    method: "POST",
  });
});
it("no acepta la antigua clave de solo lectura", async () => {
  vi.stubEnv("FACTURAX_EMISSION_API_KEY", `cs_vsf_${"a".repeat(43)}`);
  const fetcher = vi.fn();
  await expect(facturaxRequest(z.unknown(), {}, undefined, fetcher)).rejects.toThrow(/activar/);
  expect(fetcher).not.toHaveBeenCalled();
});
it("valida respuestas y limita su tamano", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("a".repeat(3_000_001)));
  await expect(
    facturaxRequest(z.object({ ok: z.literal(true) }), {}, undefined, fetcher)
  ).rejects.toThrow(/confirmar/);
});
it("conserva campos faltantes del 422 de FacturaX sin reintentar ni perder el codigo", async () => {
  const issues = [{ field: "student.fiscal.phone", message: "Completa el telefono." }];
  const fetcher = vi.fn().mockResolvedValue(
    Response.json(
      {
        error: "Ficha incompleta",
        code: "INVOICE_DATA_INCOMPLETE",
        issues,
        missingFields: [issues[0].field],
      },
      { status: 422 }
    )
  );
  await expect(
    facturaxRequest(z.unknown(), { action: "quote" }, undefined, fetcher)
  ).rejects.toMatchObject({ status: 422, code: "INVOICE_DATA_INCOMPLETE", issues });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("no convierte errores de emision desconocidos en datos faltantes", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ error: "Consulta el estado" }, { status: 503 }));
  try {
    await facturaxRequest(z.unknown(), { action: "emit" }, undefined, fetcher);
    throw Error("Unexpected success");
  } catch (error) {
    expect(error).not.toBeInstanceOf(InvoiceDataIncompleteError);
    expect(error).toMatchObject({ status: 503 });
  }
  expect(fetcher).toHaveBeenCalledTimes(1);
});
