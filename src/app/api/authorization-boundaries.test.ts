// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
const mock = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockImplementation(() =>
    Promise.resolve({
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    })
  );
});
const routes = [
  {
    name: "administrativos",
    load: () => import("./administrativos/route"),
    methods: ["GET", "PATCH", "DELETE"],
  },
  { name: "alumnos/abonos", load: () => import("./alumnos/abonos/route"), methods: ["POST"] },
  { name: "alumnos/cancelar", load: () => import("./alumnos/cancelar/route"), methods: ["POST"] },
  { name: "alumnos/catalogos", load: () => import("./alumnos/catalogos/route"), methods: ["GET"] },
  {
    name: "alumnos/manage",
    load: () => import("./alumnos/manage/route"),
    methods: ["POST", "PUT", "DELETE"],
  },
  {
    name: "alumnos/matriculas",
    load: () => import("./alumnos/matriculas/route"),
    methods: ["POST"],
  },
  { name: "alumnos", load: () => import("./alumnos/route"), methods: ["GET"] },
  { name: "arco", load: () => import("./arco/route"), methods: ["GET", "PATCH"] },
  { name: "cache/revalidate", load: () => import("./cache/revalidate/route"), methods: ["POST"] },
  { name: "caja-diaria", load: () => import("./caja-diaria/route"), methods: ["GET"] },
  { name: "cartera", load: () => import("./cartera/route"), methods: ["GET"] },
  { name: "clases/catalogos", load: () => import("./clases/catalogos/route"), methods: ["GET"] },
  { name: "clases", load: () => import("./clases/route"), methods: ["GET"] },
  {
    name: "contratos/configuracion",
    load: () => import("./contratos/configuracion/route"),
    methods: ["GET", "PUT"],
  },
  { name: "contratos/preview", load: () => import("./contratos/preview/route"), methods: ["GET"] },
  {
    name: "crear-admin-escuela",
    load: () => import("./crear-admin-escuela/route"),
    methods: ["POST"],
  },
  {
    name: "crear-administrativo-auth",
    load: () => import("./crear-administrativo-auth/route"),
    methods: ["POST"],
  },
  { name: "crear-alumno-auth", load: () => import("./crear-alumno-auth/route"), methods: ["POST"] },
  {
    name: "crear-instructor-auth",
    load: () => import("./crear-instructor-auth/route"),
    methods: ["POST"],
  },
  { name: "cumplimiento", load: () => import("./cumplimiento/route"), methods: ["GET"] },
  {
    name: "cumplimiento/retencion",
    load: () => import("./cumplimiento/retencion/route"),
    methods: ["GET", "POST"],
  },
  {
    name: "dashboard/admin-summary",
    load: () => import("./dashboard/admin-summary/route"),
    methods: ["GET"],
  },
  {
    name: "dashboard/alumno-summary",
    load: () => import("./dashboard/alumno-summary/route"),
    methods: ["GET"],
  },
  {
    name: "dashboard/superadmin-analytics",
    load: () => import("./dashboard/superadmin-analytics/route"),
    methods: ["GET"],
  },
  {
    name: "dashboard/superadmin-summary",
    load: () => import("./dashboard/superadmin-summary/route"),
    methods: ["GET"],
  },
  {
    name: "escuelas/categorias",
    load: () => import("./escuelas/categorias/route"),
    methods: ["GET"],
  },
  { name: "escuelas/eliminar", load: () => import("./escuelas/eliminar/route"), methods: ["POST"] },
  { name: "escuelas", load: () => import("./escuelas/route"), methods: ["GET", "PATCH", "POST"] },
  {
    name: "examenes/cale/admin/analytics",
    load: () => import("./examenes/cale/admin/analytics/route"),
    methods: ["GET"],
  },
  {
    name: "examenes/cale/admin/questions/[questionId]",
    load: () => import("./examenes/cale/admin/questions/[questionId]/route"),
    methods: ["PATCH", "DELETE"],
  },
  {
    name: "examenes/cale/admin/questions",
    load: () => import("./examenes/cale/admin/questions/route"),
    methods: ["GET", "POST"],
  },
  {
    name: "examenes/cale/practica",
    load: () => import("./examenes/cale/practica/route"),
    methods: ["GET", "POST"],
  },
  {
    name: "examenes/dashboard",
    load: () => import("./examenes/dashboard/route"),
    methods: ["GET"],
  },
  {
    name: "gastos/facturas-correo",
    load: () => import("./gastos/facturas-correo/route"),
    methods: ["GET", "POST", "DELETE"],
  },
  {
    name: "gastos/facturas-correo/sync",
    load: () => import("./gastos/facturas-correo/sync/route"),
    methods: ["POST"],
  },
  { name: "gastos", load: () => import("./gastos/route"), methods: ["GET"] },
  {
    name: "gastos/tramitadores",
    load: () => import("./gastos/tramitadores/route"),
    methods: ["GET"],
  },
  { name: "horas", load: () => import("./horas/route"), methods: ["GET"] },
  { name: "ingresos", load: () => import("./ingresos/route"), methods: ["GET"] },
  { name: "instructores", load: () => import("./instructores/route"), methods: ["GET"] },
  { name: "mantenimiento", load: () => import("./mantenimiento/route"), methods: ["GET"] },
  {
    name: "nominas",
    load: () => import("./nominas/route"),
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
  { name: "permisos", load: () => import("./permisos/route"), methods: ["GET", "PUT"] },
  { name: "planes", load: () => import("./planes/route"), methods: ["GET", "PATCH"] },
  {
    name: "reportes/contables",
    load: () => import("./reportes/contables/route"),
    methods: ["GET"],
  },
  { name: "sedes", load: () => import("./sedes/route"), methods: ["POST", "PATCH", "DELETE"] },
  {
    name: "suscripciones/cambiar-plan",
    load: () => import("./suscripciones/cambiar-plan/route"),
    methods: ["POST"],
  },
  {
    name: "suscripciones/checkout",
    load: () => import("./suscripciones/checkout/route"),
    methods: ["POST"],
  },
  {
    name: "suscripciones/escuelas/[schoolId]/acciones",
    load: () => import("./suscripciones/escuelas/[schoolId]/acciones/route"),
    methods: ["POST"],
  },
  {
    name: "suscripciones/escuelas/[schoolId]",
    load: () => import("./suscripciones/escuelas/[schoolId]/route"),
    methods: ["GET"],
  },
  { name: "suscripciones/me", load: () => import("./suscripciones/me/route"), methods: ["GET"] },
  {
    name: "suscripciones/resultado",
    load: () => import("./suscripciones/resultado/route"),
    methods: ["GET"],
  },
  { name: "suscripciones", load: () => import("./suscripciones/route"), methods: ["GET"] },
  {
    name: "vehiculos/catalogos",
    load: () => import("./vehiculos/catalogos/route"),
    methods: ["GET"],
  },
  { name: "vehiculos", load: () => import("./vehiculos/route"), methods: ["GET"] },
];
for (const route of routes)
  for (const method of route.methods) {
    it(`${method} ${route.name} rechaza la sesion ausente antes de consultar datos`, async () => {
      const routeHandlers = await route.load();
      const handler = (routeHandlers as Record<string, unknown>)[method] as (
        request: Request,
        context: unknown
      ) => Promise<Response>;
      const request = new Request(`https://example.com/api/${route.name}`, {
        method,
        ...(method === "GET" || method === "HEAD"
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create" }),
            }),
      });
      const response = await handler(request, {
        params: Promise.resolve({
          schoolId: "10000000-0000-4000-8000-000000000001",
          questionId: "10000000-0000-4000-8000-000000000001",
        }),
      });
      expect(response.status).toBe(401);
      expect(mock.query).not.toHaveBeenCalled();
    });
  }
