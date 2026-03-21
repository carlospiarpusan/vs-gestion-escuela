import type { Rol } from "@/types/database";
import { getDashboardRolesForCapabilityModule } from "@/lib/role-capabilities";

export type DashboardAreaId =
  | "overview"
  | "operation"
  | "finance"
  | "exams"
  | "configuration"
  | "platform";

export type DashboardIconKey =
  | "home"
  | "students"
  | "classes"
  | "vehicles"
  | "hours"
  | "exams"
  | "income"
  | "portfolio"
  | "cash"
  | "expenses"
  | "automation"
  | "reports"
  | "instructors"
  | "staff"
  | "branches"
  | "schools"
  | "logbook"
  | "permissions";

export type DashboardModuleId =
  | "home"
  | "students"
  | "classes"
  | "vehicles"
  | "hours"
  | "exams"
  | "income"
  | "portfolio"
  | "cash"
  | "expenses"
  | "automation"
  | "reports"
  | "instructors"
  | "staff"
  | "branches"
  | "schools"
  | "logbook"
  | "permissions";

export type DashboardAreaDescriptor = {
  id: DashboardAreaId;
  label: string;
  description: string;
  priority: number;
};

export type DashboardModuleDescriptor = {
  id: DashboardModuleId;
  label: string;
  shortLabel: string;
  href: string;
  pathPrefix: string;
  description: string;
  area: DashboardAreaId;
  icon: DashboardIconKey;
  roles: Rol[];
  priority: number;
  mobilePriority?: number;
  homePriority?: number;
  visibleInNav?: boolean;
};

export type DashboardNavConfig = DashboardAreaDescriptor & {
  modules: DashboardModuleDescriptor[];
};

export const DASHBOARD_AREAS: DashboardAreaDescriptor[] = [
  {
    id: "overview",
    label: "Principal",
    description: "Lo más importante para orientarte y actuar rápido.",
    priority: 0,
  },
  {
    id: "operation",
    label: "Operación",
    description: "Alumnos, agenda, flota y ejecución diaria de la escuela.",
    priority: 1,
  },
  {
    id: "finance",
    label: "Finanzas",
    description: "Cobros, cartera, caja y control económico del día a día.",
    priority: 2,
  },
  {
    id: "exams",
    label: "Exámenes",
    description: "Seguimiento, banco y operación de evaluaciones.",
    priority: 3,
  },
  {
    id: "configuration",
    label: "Configuración",
    description: "Equipo operativo y estructura interna de la escuela.",
    priority: 4,
  },
  {
    id: "platform",
    label: "Plataforma",
    description: "Control multi-escuela y estructura global del sistema.",
    priority: 5,
  },
];

export const DASHBOARD_MODULES: DashboardModuleDescriptor[] = [
  {
    id: "home",
    label: "Inicio",
    shortLabel: "Inicio",
    href: "/dashboard",
    pathPrefix: "/dashboard",
    description: "Prioridades, alertas y accesos rápidos de la operación.",
    area: "overview",
    icon: "home",
    roles: [
      "super_admin",
      "admin_escuela",
      "admin_sede",
      "administrativo",
      "instructor",
      "recepcion",
      "alumno",
    ],
    priority: 0,
    mobilePriority: 0,
    homePriority: 0,
  },
  {
    id: "students",
    label: "Alumnos",
    shortLabel: "Alumnos",
    href: "/dashboard/alumnos",
    pathPrefix: "/dashboard/alumnos",
    description: "Expedientes, matrículas, categorías y seguimiento del alumno.",
    area: "operation",
    icon: "students",
    roles: getDashboardRolesForCapabilityModule("students", ["recepcion"]),
    priority: 10,
    mobilePriority: 1,
    homePriority: 10,
  },
  {
    id: "classes",
    label: "Clases",
    shortLabel: "Clases",
    href: "/dashboard/clases",
    pathPrefix: "/dashboard/clases",
    description: "Programación, control y estado de clases teóricas y prácticas.",
    area: "operation",
    icon: "classes",
    roles: getDashboardRolesForCapabilityModule("classes"),
    priority: 20,
    homePriority: 20,
  },
  {
    id: "vehicles",
    label: "Vehículos",
    shortLabel: "Vehículos",
    href: "/dashboard/vehiculos",
    pathPrefix: "/dashboard/vehiculos",
    description: "Disponibilidad, mantenimiento y bitácora operativa de la flota.",
    area: "operation",
    icon: "vehicles",
    roles: getDashboardRolesForCapabilityModule("vehicles", ["instructor"]),
    priority: 30,
    mobilePriority: 2,
    homePriority: 30,
  },
  {
    id: "hours",
    label: "Horas",
    shortLabel: "Horas",
    href: "/dashboard/horas",
    pathPrefix: "/dashboard/horas",
    description: "Registro y cierre mensual de horas trabajadas por instructor.",
    area: "operation",
    icon: "hours",
    roles: getDashboardRolesForCapabilityModule("hours", ["instructor"]),
    priority: 40,
    mobilePriority: 3,
    homePriority: 40,
  },
  {
    id: "income",
    label: "Ingresos",
    shortLabel: "Ingresos",
    href: "/dashboard/ingresos",
    pathPrefix: "/dashboard/ingresos",
    description: "Libro de ingresos, abonos y control de recaudo.",
    area: "finance",
    icon: "income",
    roles: getDashboardRolesForCapabilityModule("income"),
    priority: 50,
    mobilePriority: 1,
    homePriority: 50,
  },
  {
    id: "portfolio",
    label: "Cartera",
    shortLabel: "Cartera",
    href: "/dashboard/cartera",
    pathPrefix: "/dashboard/cartera",
    description: "Pendientes por cobrar, segmentación y seguimiento de deuda.",
    area: "finance",
    icon: "portfolio",
    roles: getDashboardRolesForCapabilityModule("portfolio"),
    priority: 60,
    homePriority: 60,
  },
  {
    id: "cash",
    label: "Caja diaria",
    shortLabel: "Caja",
    href: "/dashboard/caja-diaria",
    pathPrefix: "/dashboard/caja-diaria",
    description: "Vista diaria de recaudo y movimientos por método de pago.",
    area: "finance",
    icon: "cash",
    roles: getDashboardRolesForCapabilityModule("cash"),
    priority: 70,
    homePriority: 70,
  },
  {
    id: "expenses",
    label: "Gastos",
    shortLabel: "Gastos",
    href: "/dashboard/gastos",
    pathPrefix: "/dashboard/gastos",
    description: "Libro de gastos, cuentas por pagar e importación de facturas.",
    area: "finance",
    icon: "expenses",
    roles: getDashboardRolesForCapabilityModule("expenses"),
    priority: 80,
    mobilePriority: 2,
    homePriority: 80,
  },
  {
    id: "automation",
    label: "Automatización",
    shortLabel: "Automatización",
    href: "/dashboard/automatizacion",
    pathPrefix: "/dashboard/automatizacion",
    description: "Correo de facturas, importaciones y sincronización automática del gasto.",
    area: "finance",
    icon: "automation",
    roles: getDashboardRolesForCapabilityModule("automation"),
    priority: 85,
    homePriority: 55,
  },
  {
    id: "reports",
    label: "Informes",
    shortLabel: "Informes",
    href: "/dashboard/informes",
    pathPrefix: "/dashboard/informes",
    description: "Vista analítica y de lectura para toma de decisiones.",
    area: "finance",
    icon: "reports",
    roles: getDashboardRolesForCapabilityModule("reports"),
    priority: 90,
    mobilePriority: 3,
    homePriority: 90,
  },
  {
    id: "exams",
    label: "Exámenes",
    shortLabel: "Exámenes",
    href: "/dashboard/examenes",
    pathPrefix: "/dashboard/examenes",
    description: "Práctica, seguimiento y administración de evaluaciones.",
    area: "exams",
    icon: "exams",
    roles: getDashboardRolesForCapabilityModule("exams", ["alumno"]),
    priority: 100,
    mobilePriority: 4,
    homePriority: 100,
  },
  {
    id: "instructors",
    label: "Instructores",
    shortLabel: "Instructores",
    href: "/dashboard/instructores",
    pathPrefix: "/dashboard/instructores",
    description: "Equipo instructor, disponibilidad y datos operativos.",
    area: "configuration",
    icon: "instructors",
    roles: getDashboardRolesForCapabilityModule("instructors"),
    priority: 110,
    homePriority: 110,
  },
  {
    id: "staff",
    label: "Administrativos",
    shortLabel: "Administrativos",
    href: "/dashboard/administrativos",
    pathPrefix: "/dashboard/administrativos",
    description: "Personal administrativo y control de accesos internos.",
    area: "configuration",
    icon: "staff",
    roles: getDashboardRolesForCapabilityModule("staff"),
    priority: 120,
    homePriority: 120,
  },
  {
    id: "permissions",
    label: "Permisos",
    shortLabel: "Permisos",
    href: "/dashboard/permisos",
    pathPrefix: "/dashboard/permisos",
    description: "Matriz de roles, alcances y restricciones operativas.",
    area: "configuration",
    icon: "permissions",
    roles: getDashboardRolesForCapabilityModule("permissions"),
    priority: 125,
  },
  {
    id: "branches",
    label: "Sedes",
    shortLabel: "Sedes",
    href: "/dashboard/sedes",
    pathPrefix: "/dashboard/sedes",
    description: "Estructura física y operativa de sedes.",
    area: "configuration",
    icon: "branches",
    roles: getDashboardRolesForCapabilityModule("branches"),
    priority: 130,
    homePriority: 130,
  },
  {
    id: "schools",
    label: "Escuelas",
    shortLabel: "Escuelas",
    href: "/dashboard/escuelas",
    pathPrefix: "/dashboard/escuelas",
    description: "Vista global de escuelas, planes, cupos y estado de plataforma.",
    area: "platform",
    icon: "schools",
    roles: getDashboardRolesForCapabilityModule("schools"),
    priority: 140,
    mobilePriority: 1,
    homePriority: 10,
  },
  {
    id: "logbook",
    label: "Bitácora",
    shortLabel: "Bitácora",
    href: "/dashboard/bitacora",
    pathPrefix: "/dashboard/bitacora",
    description: "Acceso legado al registro contextual de bitácora de vehículos.",
    area: "operation",
    icon: "logbook",
    roles: getDashboardRolesForCapabilityModule("logbook", ["instructor"]),
    priority: 35,
    visibleInNav: false,
  },
];

const areaIndex = new Map(DASHBOARD_AREAS.map((area) => [area.id, area]));

export function getDashboardArea(areaId: DashboardAreaId) {
  return areaIndex.get(areaId) ?? null;
}

export function isDashboardModuleVisibleToRole(
  module: DashboardModuleDescriptor,
  rol?: Rol | null
) {
  return Boolean(rol && module.roles.includes(rol));
}

export function getDashboardModulesForRole(
  rol?: Rol | null,
  options?: { navOnly?: boolean }
): DashboardModuleDescriptor[] {
  const navOnly = options?.navOnly ?? true;

  return DASHBOARD_MODULES.filter((module) => {
    if (!isDashboardModuleVisibleToRole(module, rol)) return false;
    if (navOnly && module.visibleInNav === false) return false;
    return true;
  }).sort((a, b) => a.priority - b.priority);
}

export function getDashboardNavigationForRole(rol?: Rol | null): DashboardNavConfig[] {
  const modules = getDashboardModulesForRole(rol, { navOnly: true });
  const grouped = new Map<DashboardAreaId, DashboardModuleDescriptor[]>();

  for (const moduleItem of modules) {
    const bucket = grouped.get(moduleItem.area) ?? [];
    bucket.push(moduleItem);
    grouped.set(moduleItem.area, bucket);
  }

  return DASHBOARD_AREAS.map((area) => ({
    ...area,
    modules: (grouped.get(area.id) ?? []).sort((a, b) => a.priority - b.priority),
  })).filter((area) => area.modules.length > 0);
}

export function findDashboardModuleByPath(pathname: string) {
  if (pathname === "/dashboard") {
    return DASHBOARD_MODULES.find((module) => module.id === "home") ?? null;
  }

  return (
    DASHBOARD_MODULES.filter((module) => module.pathPrefix !== "/dashboard")
      .filter((module) => pathname.startsWith(module.pathPrefix))
      .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0] ?? null
  );
}

export function getDashboardPageMeta(pathname: string) {
  if (pathname.startsWith("/dashboard/mi-cuenta")) {
    return {
      title: "Mi cuenta",
      description: "Datos de acceso, información personal y preferencias del usuario.",
      area: getDashboardArea("configuration"),
      module: null,
    };
  }

  const matchedModule = findDashboardModuleByPath(pathname);
  if (!matchedModule) {
    return {
      title: "Dashboard",
      description: "Panel operativo de la plataforma.",
      area: null,
      module: null,
    };
  }

  return {
    title: matchedModule.label,
    description: matchedModule.description,
    area: getDashboardArea(matchedModule.area),
    module: matchedModule,
  };
}

export function getDashboardPrimaryMobileModules(rol?: Rol | null) {
  return getDashboardModulesForRole(rol, { navOnly: true })
    .filter((module) => typeof module.mobilePriority === "number")
    .sort((a, b) => (a.mobilePriority ?? 999) - (b.mobilePriority ?? 999))
    .slice(0, 4);
}

export function getDashboardHomePriorityModules(rol?: Rol | null) {
  return getDashboardModulesForRole(rol, { navOnly: true })
    .filter((module) => typeof module.homePriority === "number" && module.id !== "home")
    .sort((a, b) => (a.homePriority ?? 999) - (b.homePriority ?? 999))
    .slice(0, rol === "alumno" ? 2 : rol === "instructor" ? 4 : 6);
}

export function getDashboardDefaultRoute(rol?: Rol | null) {
  if (rol === "instructor") return "/dashboard/vehiculos?tab=bitacora";
  return "/dashboard";
}
