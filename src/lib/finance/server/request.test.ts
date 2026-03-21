import { describe, expect, it } from "vitest";
import type { AllowedPerfil } from "@/app/api/reportes/contables/types";
import { DASHBOARD_SCHOOL_COOKIE } from "@/lib/dashboard-scope";
import {
  buildFinanceListContext,
  buildFinanceServerCacheKey,
  buildFinanceScope,
  isFreshDataRequested,
} from "@/lib/finance/server/request";

const SUPER_ADMIN: AllowedPerfil = {
  id: "11111111-1111-4111-8111-111111111111",
  rol: "super_admin",
  escuela_id: null,
  sede_id: null,
  activo: true,
};

const ADMIN_SEDE: AllowedPerfil = {
  id: "22222222-2222-4222-8222-222222222222",
  rol: "admin_sede",
  escuela_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  sede_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  activo: true,
};

describe("finance/server/request", () => {
  it("usa el cookie de escuela activa para super_admin cuando la URL no trae escuela", () => {
    const request = new Request("https://example.com/api/ingresos?page=1", {
      headers: {
        cookie: `${DASHBOARD_SCHOOL_COOKIE}=cccccccc-cccc-4ccc-8ccc-cccccccccccc`,
      },
    });

    const scope = buildFinanceScope(request, SUPER_ADMIN, new URL(request.url));

    expect(scope).toEqual({
      escuelaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      sedeId: null,
    });
  });

  it("respeta el alcance bloqueado de admin_sede aunque la URL intente cambiarlo", () => {
    const request = new Request(
      "https://example.com/api/gastos?escuela_id=dddddddd-dddd-4ddd-8ddd-dddddddddddd&sede_id=eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
    );

    const scope = buildFinanceScope(request, ADMIN_SEDE, new URL(request.url));

    expect(scope).toEqual({
      escuelaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      sedeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
  });

  it("genera claves de cache estables aunque cambie el orden de los params", () => {
    const paramsA = new URLSearchParams("to=2026-03-31&from=2026-03-01&page=1");
    const paramsB = new URLSearchParams("page=1&from=2026-03-01&to=2026-03-31");
    const scope = {
      escuelaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      sedeId: null,
    };

    expect(buildFinanceServerCacheKey("income", SUPER_ADMIN.id, scope, paramsA)).toBe(
      buildFinanceServerCacheKey("income", SUPER_ADMIN.id, scope, paramsB)
    );
  });

  it("normaliza rango, paginación y búsqueda en el contexto base", () => {
    const request = new Request(
      "https://example.com/api/cartera?from=2026-03-01&to=2026-03-31&page=2&pageSize=25&q=%20aptitud%20"
    );

    const context = buildFinanceListContext(request, ADMIN_SEDE, {
      defaultPageSize: 10,
    });

    expect(context.from).toBe("2026-03-01");
    expect(context.to).toBe("2026-03-31");
    expect(context.page).toBe(2);
    expect(context.pageSize).toBe(25);
    expect(context.search).toBe("aptitud");
    expect(context.scope).toEqual({
      escuelaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      sedeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
  });

  it("permite pedir datos frescos sin romper el resto de params", () => {
    expect(isFreshDataRequested(new URLSearchParams("fresh=1&page=1"))).toBe(true);
    expect(isFreshDataRequested(new URLSearchParams("page=1"))).toBe(false);
  });
});
