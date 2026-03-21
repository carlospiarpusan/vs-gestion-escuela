import type { Rol } from "@/types/database";

export type AuditedRole = "super_admin" | "admin_escuela" | "admin_sede" | "administrativo";

export type RoleCapabilityState = "full" | "scoped" | "readonly" | "none";
export type RoleCapabilityScope = "platform" | "school" | "branch" | "self" | "none";
export type RoleCapabilityAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "sync"
  | "close"
  | "configure";

export type RoleCapabilityModuleId =
  | "home"
  | "students"
  | "classes"
  | "vehicles"
  | "logbook"
  | "hours"
  | "income"
  | "portfolio"
  | "cash"
  | "expenses"
  | "automation"
  | "reports"
  | "exams"
  | "instructors"
  | "staff"
  | "branches"
  | "schools"
  | "permissions"
  | "account";

export type RoleCapability = {
  state: RoleCapabilityState;
  scope: RoleCapabilityScope;
  actions: RoleCapabilityAction[];
  note?: string;
};

export type RoleCapabilityModuleDescriptor = {
  id: RoleCapabilityModuleId;
  label: string;
  description: string;
  visibleInAudit?: boolean;
};

export type RoleSummaryDescriptor = {
  role: AuditedRole;
  label: string;
  shortLabel: string;
  scopeLabel: string;
  description: string;
  can: string[];
  cannot: string[];
};

const NONE_CAPABILITY: RoleCapability = {
  state: "none",
  scope: "none",
  actions: [],
};

export const AUDITED_ROLE_ORDER: AuditedRole[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
];

export const ROLE_CAPABILITY_MODULES: RoleCapabilityModuleDescriptor[] = [
  {
    id: "schools",
    label: "Escuelas",
    description: "Control global de escuelas, planes, cupos y estado de plataforma.",
    visibleInAudit: true,
  },
  {
    id: "branches",
    label: "Sedes",
    description: "Estructura física y operativa de sedes.",
    visibleInAudit: true,
  },
  {
    id: "staff",
    label: "Administrativos",
    description: "Equipo administrativo y acceso interno.",
    visibleInAudit: true,
  },
  {
    id: "instructors",
    label: "Instructores",
    description: "Equipo instructor y datos operativos.",
    visibleInAudit: true,
  },
  {
    id: "students",
    label: "Alumnos",
    description: "Expedientes, matrículas y seguimiento del alumno.",
    visibleInAudit: true,
  },
  {
    id: "classes",
    label: "Clases",
    description: "Programación y operación diaria de clases.",
    visibleInAudit: true,
  },
  {
    id: "vehicles",
    label: "Vehículos",
    description: "Flota, disponibilidad y mantenimientos.",
    visibleInAudit: true,
  },
  {
    id: "hours",
    label: "Horas",
    description: "Registro y cierre mensual de horas de instructores.",
    visibleInAudit: true,
  },
  {
    id: "exams",
    label: "Exámenes",
    description: "Simulacros, analítica y banco CALE.",
    visibleInAudit: true,
  },
  {
    id: "income",
    label: "Ingresos",
    description: "Libro de ingresos, abonos y recaudo.",
    visibleInAudit: true,
  },
  {
    id: "portfolio",
    label: "Cartera",
    description: "Pendientes por cobrar y seguimiento de deuda.",
    visibleInAudit: true,
  },
  {
    id: "cash",
    label: "Caja diaria",
    description: "Vista diaria de recaudo por método de pago.",
    visibleInAudit: true,
  },
  {
    id: "expenses",
    label: "Gastos",
    description: "Libro de gastos y cuentas por pagar.",
    visibleInAudit: true,
  },
  {
    id: "automation",
    label: "Automatización",
    description: "Correo de facturas, importaciones y sincronización.",
    visibleInAudit: true,
  },
  {
    id: "reports",
    label: "Informes",
    description: "Analítica, comparativos y exportaciones.",
    visibleInAudit: true,
  },
  {
    id: "account",
    label: "Mi cuenta",
    description: "Perfil, acceso y preferencias propias.",
    visibleInAudit: true,
  },
  {
    id: "permissions",
    label: "Permisos",
    description: "Matriz de roles y alcances operativos.",
    visibleInAudit: false,
  },
  {
    id: "home",
    label: "Inicio",
    description: "Resumen inicial del rol.",
    visibleInAudit: false,
  },
  {
    id: "logbook",
    label: "Bitácora",
    description: "Registro contextual de flota.",
    visibleInAudit: false,
  },
];

export const ROLE_SUMMARIES: Record<AuditedRole, RoleSummaryDescriptor> = {
  super_admin: {
    role: "super_admin",
    label: "Super admin",
    shortLabel: "Super admin",
    scopeLabel: "Toda la plataforma",
    description:
      "Control global de escuelas, estructura general y gobierno general de la plataforma.",
    can: [
      "Administra escuelas, planes y los controles base en toda la plataforma.",
      "Supervisa el estado y capacidad de las escuelas afiliadas.",
      "Crea, edita y elimina preguntas del banco maestro de evaluaciones CALE.",
    ],
    cannot: [
      "No accede a datos financieros, alumnos individuales ni informes operativos de las escuelas.",
      "No opera el día a día de alumnos, clases, ingresos o personal interno como si fuera una escuela.",
    ],
  },
  admin_escuela: {
    role: "admin_escuela",
    label: "Admin de escuela",
    shortLabel: "Admin escuela",
    scopeLabel: "Toda su escuela",
    description:
      "Dirige la operación completa de su escuela y el equipo interno, sin alcance global de plataforma.",
    can: [
      "Gestiona sedes y administrativos de su escuela.",
      "Opera alumnos, clases, flota, ingresos, gastos y automatización dentro de su escuela.",
      "Puede ajustar valor hora y generar cierres mensuales desde Horas.",
    ],
    cannot: [
      "No administra escuelas globales ni datos de otras escuelas.",
      "No puede editar el banco maestro CALE.",
      "No puede salir de la escuela asignada.",
    ],
  },
  admin_sede: {
    role: "admin_sede",
    label: "Admin de sede",
    shortLabel: "Admin sede",
    scopeLabel: "Solo su sede",
    description:
      "Opera el día a día de su sede con alcance restringido y sin control estructural de escuela.",
    can: [
      "Gestiona alumnos, clases, vehículos, horas, ingresos, gastos y automatización de su sede.",
      "Consulta sedes de su escuela y administrativos de su sede.",
      "Puede ajustar valor hora y generar cierres mensuales dentro de su alcance.",
    ],
    cannot: [
      "No puede crear, editar ni eliminar sedes.",
      "No puede crear, editar ni eliminar administrativos.",
      "No puede operar otra escuela ni otra sede fuera de su alcance.",
    ],
  },
  administrativo: {
    role: "administrativo",
    label: "Administrativo",
    shortLabel: "Administrativo",
    scopeLabel: "Operación diaria de su sede",
    description:
      "Rol operativo para ejecución diaria y finanzas del día a día, sin permisos estructurales.",
    can: [
      "Gestiona alumnos, instructores, clases, vehículos, ingresos y gastos de su alcance.",
      "Puede generar cierres mensuales desde Horas y operar automatización de facturas.",
      "Consulta exámenes, cartera, caja diaria e informes para seguimiento operativo.",
    ],
    cannot: [
      "No puede crear, editar ni eliminar sedes.",
      "No puede crear, editar ni eliminar administrativos.",
      "No puede cambiar valor hora ni editar el banco maestro CALE.",
    ],
  },
};

const AUDITED_ROLE_CAPABILITY_MATRIX: Record<
  AuditedRole,
  Partial<Record<RoleCapabilityModuleId, RoleCapability>>
> = {
  super_admin: {
    home: { state: "readonly", scope: "platform", actions: ["view"] },
    schools: {
      state: "full",
      scope: "platform",
      actions: ["view", "create", "edit", "delete", "configure"],
    },
    branches: NONE_CAPABILITY,
    staff: NONE_CAPABILITY,
    instructors: NONE_CAPABILITY,
    students: NONE_CAPABILITY,
    classes: NONE_CAPABILITY,
    vehicles: NONE_CAPABILITY,
    logbook: NONE_CAPABILITY,
    hours: NONE_CAPABILITY,
    exams: {
      state: "full",
      scope: "platform",
      actions: ["view", "create", "edit", "delete", "export", "configure"],
      note: "Edita, crea y elimina preguntas del banco administrativo CALE.",
    },
    income: NONE_CAPABILITY,
    portfolio: NONE_CAPABILITY,
    cash: NONE_CAPABILITY,
    expenses: NONE_CAPABILITY,
    automation: NONE_CAPABILITY,
    reports: NONE_CAPABILITY,
    permissions: {
      state: "readonly",
      scope: "platform",
      actions: ["view"],
    },
    account: {
      state: "full",
      scope: "self",
      actions: ["view", "edit"],
    },
  },
  admin_escuela: {
    home: { state: "readonly", scope: "school", actions: ["view"] },
    schools: NONE_CAPABILITY,
    branches: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "delete", "configure"],
    },
    staff: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "delete", "configure"],
    },
    instructors: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "delete"],
    },
    students: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    classes: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    vehicles: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    logbook: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "delete"],
    },
    hours: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "close", "configure"],
      note: "Puede modificar valor hora y generar cierres mensuales de su escuela.",
    },
    exams: {
      state: "readonly",
      scope: "school",
      actions: ["view"],
      note: "Consulta analítica y banco CALE activo, sin editar el banco maestro.",
    },
    income: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    portfolio: {
      state: "readonly",
      scope: "school",
      actions: ["view", "export"],
    },
    cash: {
      state: "readonly",
      scope: "school",
      actions: ["view", "export"],
    },
    expenses: {
      state: "full",
      scope: "school",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    automation: {
      state: "full",
      scope: "school",
      actions: ["view", "sync", "configure"],
    },
    reports: {
      state: "readonly",
      scope: "school",
      actions: ["view", "export"],
    },
    permissions: {
      state: "readonly",
      scope: "school",
      actions: ["view"],
    },
    account: {
      state: "full",
      scope: "self",
      actions: ["view", "edit"],
    },
  },
  admin_sede: {
    home: { state: "readonly", scope: "branch", actions: ["view"] },
    schools: NONE_CAPABILITY,
    branches: {
      state: "readonly",
      scope: "school",
      actions: ["view"],
      note: "Consulta las sedes de su escuela, sin mutarlas.",
    },
    staff: {
      state: "readonly",
      scope: "branch",
      actions: ["view"],
      note: "Consulta administrativos de su sede, sin gestionarlos.",
    },
    instructors: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete"],
    },
    students: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    classes: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    vehicles: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    logbook: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete"],
    },
    hours: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "close", "configure"],
      note: "Puede modificar valor hora y generar cierres mensuales de su sede.",
    },
    exams: {
      state: "readonly",
      scope: "branch",
      actions: ["view"],
      note: "Consulta analítica y banco CALE activo, sin editar el banco maestro.",
    },
    income: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    portfolio: {
      state: "readonly",
      scope: "branch",
      actions: ["view", "export"],
    },
    cash: {
      state: "readonly",
      scope: "branch",
      actions: ["view", "export"],
    },
    expenses: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    automation: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "sync", "configure"],
    },
    reports: {
      state: "readonly",
      scope: "branch",
      actions: ["view", "export"],
    },
    permissions: {
      state: "readonly",
      scope: "branch",
      actions: ["view"],
    },
    account: {
      state: "full",
      scope: "self",
      actions: ["view", "edit"],
    },
  },
  administrativo: {
    home: { state: "readonly", scope: "branch", actions: ["view"] },
    schools: NONE_CAPABILITY,
    branches: NONE_CAPABILITY,
    staff: NONE_CAPABILITY,
    instructors: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete"],
    },
    students: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    classes: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    vehicles: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    logbook: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete"],
    },
    hours: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "close"],
      note: "Puede cerrar el mes, pero no modificar valor hora.",
    },
    exams: {
      state: "readonly",
      scope: "branch",
      actions: ["view"],
      note: "Consulta analítica y banco CALE activo, sin editar el banco maestro.",
    },
    income: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    portfolio: {
      state: "readonly",
      scope: "branch",
      actions: ["view", "export"],
    },
    cash: {
      state: "readonly",
      scope: "branch",
      actions: ["view", "export"],
    },
    expenses: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "create", "edit", "delete", "export"],
    },
    automation: {
      state: "scoped",
      scope: "branch",
      actions: ["view", "sync", "configure"],
    },
    reports: {
      state: "readonly",
      scope: "branch",
      actions: ["view", "export"],
    },
    permissions: {
      state: "readonly",
      scope: "branch",
      actions: ["view"],
    },
    account: {
      state: "full",
      scope: "self",
      actions: ["view", "edit"],
    },
  },
};

function mergeRoles(base: Rol[], extraRoles: Rol[]) {
  return Array.from(new Set([...base, ...extraRoles]));
}

export function isAuditedRole(role: Rol | null | undefined): role is AuditedRole {
  return Boolean(role && AUDITED_ROLE_ORDER.includes(role as AuditedRole));
}

export function getRoleSummary(role: AuditedRole) {
  return ROLE_SUMMARIES[role];
}

export function getCapabilityModuleDescriptor(moduleId: RoleCapabilityModuleId) {
  return ROLE_CAPABILITY_MODULES.find((module) => module.id === moduleId) ?? null;
}

export function getAuditedRoleCapability(
  role: AuditedRole | null | undefined,
  moduleId: RoleCapabilityModuleId
): RoleCapability {
  if (!role) return NONE_CAPABILITY;
  return AUDITED_ROLE_CAPABILITY_MATRIX[role][moduleId] ?? NONE_CAPABILITY;
}

export function canAuditedRoleAccessModule(
  role: AuditedRole | null | undefined,
  moduleId: RoleCapabilityModuleId
) {
  return getAuditedRoleCapability(role, moduleId).state !== "none";
}

export function canAuditedRolePerformAction(
  role: AuditedRole | null | undefined,
  moduleId: RoleCapabilityModuleId,
  action: RoleCapabilityAction
) {
  return getAuditedRoleCapability(role, moduleId).actions.includes(action);
}

export function getAuditedRolesForCapabilityModule(
  moduleId: RoleCapabilityModuleId
): AuditedRole[] {
  return AUDITED_ROLE_ORDER.filter((role) => canAuditedRoleAccessModule(role, moduleId));
}

export function getAuditedRolesForCapabilityAction(
  moduleId: RoleCapabilityModuleId,
  action: RoleCapabilityAction
): AuditedRole[] {
  return AUDITED_ROLE_ORDER.filter((role) => canAuditedRolePerformAction(role, moduleId, action));
}

export function getDashboardRolesForCapabilityModule(
  moduleId: RoleCapabilityModuleId,
  extraRoles: Rol[] = []
) {
  return mergeRoles(getAuditedRolesForCapabilityModule(moduleId), extraRoles);
}

export function getCapabilityScopeLabel(scope: RoleCapabilityScope) {
  switch (scope) {
    case "platform":
      return "Toda la plataforma";
    case "school":
      return "Toda su escuela";
    case "branch":
      return "Solo su sede";
    case "self":
      return "Solo su cuenta";
    default:
      return "Sin acceso";
  }
}

export function getCapabilityStateLabel(state: RoleCapabilityState) {
  switch (state) {
    case "full":
      return "Completo";
    case "scoped":
      return "Limitado";
    case "readonly":
      return "Consulta";
    default:
      return "Sin acceso";
  }
}

export function getAuditedVisibleModules() {
  return ROLE_CAPABILITY_MODULES.filter((module) => module.visibleInAudit);
}
