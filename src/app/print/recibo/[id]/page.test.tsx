import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import Page from "./page";
const mock = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("NOT_FOUND");
  },
  redirect: (path: string) => {
    throw Error(`REDIRECT:${path}`);
  },
}));
const id = "00000000-0000-4000-8000-000000000001";
const receipt = {
  id,
  escuela_id: id,
  sede_id: id,
  escuela: "Escuela Demo",
  nit: "901000000-1",
  sede: "Principal",
  direccion: "Calle Demo 1",
  telefono: null,
  alumno: "Ana Demo",
  documento: "12345678",
  contrato: "CAR-001",
  concepto: "Abono de matrícula",
  monto: "60000",
  fecha: "2026-10-20",
  metodo_pago: "efectivo",
  registrado_por: "Administración",
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id, escuela_id: id, sede_id: id, rol: "administrativo" },
  });
  mock.query.mockResolvedValue({ rows: [receipt] });
});
it("genera el recibo del pago existente sin escribir ni archivar documentos", async () => {
  const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id }) }));
  expect(html).toContain("Ana Demo");
  expect(html).toContain("60.000");
  expect(html).toContain("Imprimir recibo");
  expect(mock.query).toHaveBeenCalledOnce();
  expect(mock.query.mock.calls[0][0]).toContain("i.estado='cobrado'");
  expect(mock.query.mock.calls[0][1]).toEqual([id, id, id]);
});
it.each(["escuela_id", "sede_id"])("no entrega un recibo de otra %s", async (key) => {
  mock.query.mockResolvedValue({
    rows: [{ ...receipt, [key]: "00000000-0000-4000-8000-000000000002" }],
  });
  await expect(Page({ params: Promise.resolve({ id }) })).rejects.toThrow("NOT_FOUND");
});
it("redirige sin sesión y rechaza roles sin permiso antes de consultar datos", async () => {
  mock.auth.mockResolvedValue({ ok: false, response: { status: 401 } });
  await expect(Page({ params: Promise.resolve({ id }) })).rejects.toThrow("REDIRECT:/login");
  mock.auth.mockResolvedValue({ ok: false, response: { status: 403 } });
  await expect(Page({ params: Promise.resolve({ id }) })).rejects.toThrow("NOT_FOUND");
  expect(mock.query).not.toHaveBeenCalled();
});
it("no imprime pagos pendientes, anulados o eliminados", async () => {
  mock.query.mockResolvedValue({ rows: [] });
  await expect(Page({ params: Promise.resolve({ id }) })).rejects.toThrow("NOT_FOUND");
});
