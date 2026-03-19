import type { Rol } from "@/types/database";

type RouteRule = {
  prefix: string;
  roles: Rol[];
};

const DASHBOARD_ROUTE_RULES: RouteRule[] = [
  { prefix: "/dashboard/escuelas", roles: ["super_admin"] },
  { prefix: "/dashboard/administrativos", roles: ["super_admin", "admin_escuela", "admin_sede"] },
  {
    prefix: "/dashboard/alumnos",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "recepcion"],
  },
  {
    prefix: "/dashboard/instructores",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    prefix: "/dashboard/vehiculos",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "instructor"],
  },
  {
    prefix: "/dashboard/bitacora",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "instructor"],
  },
  {
    prefix: "/dashboard/clases",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    prefix: "/dashboard/horas",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "instructor"],
  },
  {
    prefix: "/dashboard/examenes",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "alumno"],
  },
  {
    prefix: "/dashboard/ingresos",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    prefix: "/dashboard/cartera",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    prefix: "/dashboard/caja-diaria",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    prefix: "/dashboard/gastos",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    prefix: "/dashboard/informes",
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  { prefix: "/dashboard/sedes", roles: ["super_admin", "admin_escuela", "admin_sede"] },
];

const SUPER_ADMIN_ALLOWED_PREFIXES = [
  "/dashboard/escuelas",
  "/dashboard/sedes",
  "/dashboard/examenes",
  "/dashboard/informes",
];

export function canAccessDashboardPath(rol: Rol | null | undefined, pathname: string): boolean {
  if (!rol) return false;
  if (pathname === "/dashboard") return true;

  if (rol === "super_admin") {
    return (
      pathname.startsWith("/dashboard") &&
      (SUPER_ADMIN_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
        DASHBOARD_ROUTE_RULES.some((rule) => pathname.startsWith(rule.prefix)))
    );
  }

  const matchedRule = DASHBOARD_ROUTE_RULES.find((rule) => pathname.startsWith(rule.prefix));
  if (!matchedRule) return false;

  return matchedRule.roles.includes(rol);
}

export function getDashboardFallbackPath(rol: Rol | null | undefined): string {
  if (rol === "instructor") return "/dashboard/vehiculos?tab=bitacora";
  return "/dashboard";
}
