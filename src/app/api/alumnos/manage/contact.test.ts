// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
const mock = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn(), provision: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
  buildSupabaseAdminClient: mock.provision,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
const id = "10000000-0000-4000-8000-000000000001";
const body = {
  consentimiento_datos: true,
  sede_id: id,
  tipo_registro: "regular",
  nombre: "Ana",
  apellidos: "Prueba",
  dni: "12345678",
  tipo_documento: "CC",
  email: "ana@example.com",
  telefono: "3001234567",
  lugar_expedicion_documento: "Ipiales",
  fecha_nacimiento: "2000-01-15",
  sexo: "F",
  fecha_inscripcion: "2026-09-01",
  direccion: "Calle 1 numero 2",
  departamento: "Nariño",
  ciudad: "IPIALES",
  categorias: ["B1"],
  estado: "activo",
  datos_facturacion: {
    country: "CO",
    cityCode: "52356",
    personType: "2",
    responsibilities: "R-99-PN",
    taxRegime: "ordinario",
    taxScheme: "ZZ",
  },
};
const request = (value: unknown) =>
  new Request("https://condusoft.co/api/alumnos/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id, rol: "admin_escuela", escuela_id: id, sede_id: id },
  });
  mock.query.mockResolvedValue({ rows: [] });
});
it.each(["email", "telefono", "direccion", "departamento", "ciudad", "datos_facturacion"])(
  "la API exige %s antes de crear cuentas o registros",
  async (field) => {
    const incomplete = { ...body, [field]: null };
    expect((await POST(request(incomplete))).status).toBe(400);
    expect(mock.provision).not.toHaveBeenCalled();
    expect(mock.query).not.toHaveBeenCalled();
  }
);
it("rechaza ubicación inconsistente aunque se omita el formulario", async () => {
  expect((await POST(request({ ...body, departamento: "Antioquia" }))).status).toBe(400);
  expect(mock.query).not.toHaveBeenCalled();
});
it("un contacto completo llega a las comprobaciones existentes de sede", async () => {
  await POST(request(body));
  expect(mock.query).toHaveBeenCalled();
  expect(mock.provision).not.toHaveBeenCalled();
});

it.each(["country", "cityCode", "personType", "responsibilities", "taxRegime", "taxScheme"])(
  "exige el dato fiscal %s aunque se evite el formulario",
  async (field) => {
    const datos_facturacion = { ...body.datos_facturacion, [field]: "" };
    expect((await POST(request({ ...body, datos_facturacion }))).status).toBe(400);
    expect(mock.provision).not.toHaveBeenCalled();
    expect(mock.query).not.toHaveBeenCalled();
  }
);
it.each(["fecha_nacimiento", "fecha_inscripcion", "fecha_examen_teorico", "fecha_examen_practico"])(
  "rechaza %s imposible antes de crear cuentas",
  async (field) => {
    expect((await POST(request({ ...body, [field]: "2026-02-31" }))).status).toBe(400);
    expect(mock.provision).not.toHaveBeenCalled();
    expect(mock.query).not.toHaveBeenCalled();
  }
);
