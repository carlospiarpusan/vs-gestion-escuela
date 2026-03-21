import type { Rol } from "@/types/database";
import {
  findDashboardModuleByPath,
  getDashboardDefaultRoute,
  isDashboardModuleVisibleToRole,
} from "@/lib/dashboard-nav";

export function canAccessDashboardPath(rol: Rol | null | undefined, pathname: string): boolean {
  if (!rol) return false;
  if (pathname === "/dashboard") return true;
  if (pathname.startsWith("/dashboard/mi-cuenta")) return true;

  const matchedModule = findDashboardModuleByPath(pathname);
  if (!matchedModule) return false;

  return isDashboardModuleVisibleToRole(matchedModule, rol);
}

export function getDashboardFallbackPath(rol: Rol | null | undefined): string {
  return getDashboardDefaultRoute(rol);
}
