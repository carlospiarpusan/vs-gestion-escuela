import type {
  ModuleDescriptor,
  MobileModuleId,
  ModuleSectionId,
  PrimaryNavDestination,
  PrimaryNavDestinationId,
  RoleNavigationConfig,
  Rol,
} from "./types";

export const ROLE_LABELS: Record<Rol, string> = {
  super_admin: "Super admin",
  admin_escuela: "Admin escuela",
  admin_sede: "Admin sede",
  administrativo: "Administrativo",
  instructor: "Instructor",
  recepcion: "Recepción",
  alumno: "Alumno",
};

export const SECTION_LABELS: Record<ModuleSectionId, string> = {
  overview: "Inicio",
  operation: "Operación",
  finance: "Finanzas",
  progress: "Progreso",
  activity: "Actividad",
  configuration: "Configuración",
  platform: "Plataforma",
};

const BASE_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "instructor",
  "recepcion",
  "alumno",
];

export const MODULES: ModuleDescriptor[] = [
  {
    id: "home",
    label: "Inicio",
    shortLabel: "Inicio",
    area: "Principal",
    section: "overview",
    description: "Resumen del día, foco operativo y accesos rápidos por rol.",
    mode: "home",
    roles: BASE_ROLES,
    offline: true,
    icon: "home",
    tabSlotByRole: {
      super_admin: "home",
      admin_escuela: "home",
      admin_sede: "home",
      administrativo: "home",
      instructor: "home",
      recepcion: "home",
    },
    defaultRouteByRole: {
      super_admin: "home",
      admin_escuela: "home",
      admin_sede: "home",
      administrativo: "home",
      recepcion: "home",
    },
    priorityInMore: 0,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "students",
    label: "Alumnos",
    shortLabel: "Alumnos",
    area: "Operación",
    section: "operation",
    description: "Expedientes y seguimiento básico del estudiante.",
    mode: "daily",
    roles: ["admin_escuela", "admin_sede", "administrativo", "recepcion"],
    offline: true,
    icon: "users",
    tabSlotByRole: {
      admin_escuela: "operation",
      admin_sede: "operation",
      administrativo: "operation",
      recepcion: "students",
    },
    priorityInMore: 1,
  },
  {
    id: "vehicles",
    label: "Vehículos",
    shortLabel: "Vehículos",
    area: "Operación",
    section: "activity",
    description: "Flota y disponibilidad en formato móvil.",
    mode: "online-summary",
    roles: ["admin_escuela", "admin_sede", "administrativo", "instructor"],
    offline: false,
    icon: "car",
    tabSlotByRole: {
      admin_escuela: "operation",
      admin_sede: "operation",
      administrativo: "operation",
      instructor: "activity",
    },
    priorityInMore: 3,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "hours",
    label: "Horas",
    shortLabel: "Horas",
    area: "Operación",
    section: "activity",
    description: "Horas de trabajo registradas por día, mes o año.",
    mode: "online-summary",
    roles: ["admin_escuela", "admin_sede", "administrativo", "instructor"],
    offline: false,
    icon: "clock",
    tabSlotByRole: {
      admin_escuela: "operation",
      admin_sede: "operation",
      administrativo: "operation",
      instructor: "activity",
    },
    priorityInMore: 2,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "exams",
    label: "Exámenes",
    shortLabel: "Exámenes",
    area: "Exámenes",
    section: "progress",
    description: "Práctica CALE para alumno y lectura simplificada para otros roles.",
    mode: "cale",
    roles: BASE_ROLES,
    offline: true,
    icon: "book",
    tabSlotByRole: {
      super_admin: "platform",
      admin_escuela: "more",
      admin_sede: "more",
      administrativo: "more",
      instructor: "more",
      recepcion: "more",
      alumno: "cale",
    },
    defaultRouteByRole: {
      alumno: "cale",
    },
    priorityInMore: 1,
  },
  {
    id: "income",
    label: "Ingresos",
    shortLabel: "Ingresos",
    area: "Finanzas",
    section: "finance",
    description: "Cobros, abonos y registro de recaudo.",
    mode: "daily",
    roles: ["admin_escuela", "admin_sede", "administrativo", "recepcion"],
    offline: true,
    icon: "banknote",
    tabSlotByRole: {
      admin_escuela: "finance",
      admin_sede: "finance",
      administrativo: "finance",
      recepcion: "billing",
    },
    priorityInMore: 1,
  },
  {
    id: "portfolio",
    label: "Cartera",
    shortLabel: "Cartera",
    area: "Finanzas",
    section: "finance",
    description: "Pendientes de cobro en versión móvil reducida.",
    mode: "placeholder",
    roles: ["admin_escuela", "admin_sede", "administrativo", "recepcion"],
    offline: false,
    icon: "wallet",
    tabSlotByRole: {
      admin_escuela: "finance",
      admin_sede: "finance",
      administrativo: "finance",
      recepcion: "billing",
    },
    priorityInMore: 2,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "cash",
    label: "Caja diaria",
    shortLabel: "Caja",
    area: "Finanzas",
    section: "finance",
    description: "Cierre rápido del día por método de pago.",
    mode: "daily",
    roles: ["admin_escuela", "admin_sede", "administrativo", "recepcion"],
    offline: true,
    icon: "coins",
    tabSlotByRole: {
      admin_escuela: "finance",
      admin_sede: "finance",
      administrativo: "finance",
      recepcion: "billing",
    },
    priorityInMore: 2,
  },
  {
    id: "expenses",
    label: "Gastos",
    shortLabel: "Gastos",
    area: "Finanzas",
    section: "finance",
    description: "Egresos con carga manual y cola offline.",
    mode: "daily",
    roles: ["admin_escuela", "admin_sede", "administrativo"],
    offline: true,
    icon: "receipt",
    tabSlotByRole: {
      admin_escuela: "finance",
      admin_sede: "finance",
      administrativo: "finance",
    },
    priorityInMore: 3,
  },
  {
    id: "automation",
    label: "Automatización",
    shortLabel: "Automatización",
    area: "Finanzas",
    section: "configuration",
    description: "Estado móvil de correo e importaciones. Sin IMAP en esta fase.",
    mode: "placeholder",
    roles: ["admin_escuela", "admin_sede", "administrativo"],
    offline: false,
    icon: "bot",
    priorityInMore: 7,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "reports",
    label: "Informes",
    shortLabel: "Informes",
    area: "Finanzas",
    section: "finance",
    description: "Lectura resumida sin exportaciones en Android.",
    mode: "placeholder",
    roles: ["admin_escuela", "admin_sede", "administrativo"],
    offline: false,
    icon: "bar-chart",
    tabSlotByRole: {
      admin_escuela: "finance",
      admin_sede: "finance",
      administrativo: "finance",
    },
    priorityInMore: 6,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "instructors",
    label: "Instructores",
    shortLabel: "Instructores",
    area: "Configuración",
    section: "operation",
    description: "Directorio y estado de instructores.",
    mode: "online-summary",
    roles: ["admin_escuela", "admin_sede", "administrativo"],
    offline: false,
    icon: "briefcase",
    tabSlotByRole: {
      admin_escuela: "operation",
      admin_sede: "operation",
      administrativo: "operation",
    },
    priorityInMore: 4,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "staff",
    label: "Administrativos",
    shortLabel: "Personal",
    area: "Configuración",
    section: "configuration",
    description: "Equipo administrativo y accesos internos.",
    mode: "online-summary",
    roles: ["super_admin", "admin_escuela", "admin_sede"],
    offline: false,
    icon: "briefcase",
    tabSlotByRole: {
      super_admin: "schools",
    },
    priorityInMore: 5,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "branches",
    label: "Sedes",
    shortLabel: "Sedes",
    area: "Configuración",
    section: "configuration",
    description: "Listado de sedes y estado operativo.",
    mode: "online-summary",
    roles: ["super_admin", "admin_escuela", "admin_sede"],
    offline: false,
    icon: "building",
    tabSlotByRole: {
      super_admin: "schools",
    },
    priorityInMore: 4,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "schools",
    label: "Escuelas",
    shortLabel: "Escuelas",
    area: "Plataforma",
    section: "platform",
    description: "Vista móvil de escuelas y estado de plataforma.",
    mode: "online-summary",
    roles: ["super_admin"],
    offline: false,
    icon: "school",
    tabSlotByRole: {
      super_admin: "schools",
    },
    priorityInMore: 1,
  },
  {
    id: "subscriptions",
    label: "Suscripciones",
    shortLabel: "Suscripciones",
    area: "Plataforma",
    section: "platform",
    description: "Salud comercial y planes sin exportar.",
    mode: "placeholder",
    roles: ["super_admin"],
    offline: false,
    icon: "credit-card",
    tabSlotByRole: {
      super_admin: "platform",
    },
    priorityInMore: 3,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "payroll",
    label: "Nóminas",
    shortLabel: "Nóminas",
    area: "Finanzas",
    section: "finance",
    description: "Seguimiento móvil simplificado de liquidaciones.",
    mode: "placeholder",
    roles: ["admin_escuela", "administrativo"],
    offline: false,
    icon: "wallet",
    tabSlotByRole: {
      admin_escuela: "finance",
      administrativo: "finance",
    },
    priorityInMore: 5,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "contracts",
    label: "Contratos",
    shortLabel: "Contratos",
    area: "Configuración",
    section: "configuration",
    description: "Configuración legal sin impresión ni PDF.",
    mode: "placeholder",
    roles: ["admin_escuela", "super_admin"],
    offline: false,
    icon: "file-text",
    tabSlotByRole: {
      super_admin: "platform",
    },
    priorityInMore: 8,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "logbook",
    label: "Bitácora",
    shortLabel: "Bitácora",
    area: "Operación",
    section: "activity",
    description: "Lectura de actividad y mantenimiento reciente.",
    mode: "online-summary",
    roles: ["admin_escuela", "admin_sede", "administrativo", "instructor"],
    offline: false,
    icon: "clipboard",
    tabSlotByRole: {
      admin_escuela: "operation",
      admin_sede: "operation",
      administrativo: "operation",
      instructor: "activity",
    },
    priorityInMore: 3,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "permissions",
    label: "Permisos",
    shortLabel: "Permisos",
    area: "Configuración",
    section: "configuration",
    description: "Matriz de acceso en lectura móvil.",
    mode: "placeholder",
    roles: ["super_admin", "admin_escuela"],
    offline: false,
    icon: "shield",
    tabSlotByRole: {
      super_admin: "platform",
    },
    priorityInMore: 9,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "compliance",
    label: "Cumplimiento",
    shortLabel: "Cumplimiento",
    area: "Configuración",
    section: "configuration",
    description: "Estado documental y gobierno interno.",
    mode: "placeholder",
    roles: ["super_admin", "admin_escuela"],
    offline: false,
    icon: "shield",
    tabSlotByRole: {
      super_admin: "platform",
    },
    priorityInMore: 10,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "analytics",
    label: "Analíticas",
    shortLabel: "Analíticas",
    area: "Plataforma",
    section: "platform",
    description: "Lectura simplificada de métricas globales.",
    mode: "placeholder",
    roles: ["super_admin"],
    offline: false,
    icon: "bar-chart",
    tabSlotByRole: {
      super_admin: "platform",
    },
    priorityInMore: 2,
    hiddenFromPrimaryNav: true,
  },
  {
    id: "arco",
    label: "ARCO",
    shortLabel: "ARCO",
    area: "Configuración",
    section: "progress",
    description: "Solicitud y seguimiento simplificado de derechos ARCO.",
    mode: "placeholder",
    roles: ["super_admin", "admin_escuela", "alumno"],
    offline: false,
    icon: "file-user",
    tabSlotByRole: {
      alumno: "progress",
      super_admin: "platform",
    },
    priorityInMore: 11,
    hiddenFromPrimaryNav: true,
  },
];

export const ROLE_NAVIGATION: Record<Rol, RoleNavigationConfig> = {
  alumno: {
    role: "alumno",
    defaultDestination: "cale",
    destinations: [
      {
        id: "cale",
        label: "CALE",
        title: "Práctica CALE",
        subtitle: "Continúa tu simulacro, sincroniza el banco y mantén el foco en el examen.",
        icon: "book",
        kind: "module",
        moduleIds: ["exams"],
      },
      {
        id: "progress",
        label: "Resumen",
        title: "Mi resumen",
        subtitle: "Matrículas e intentos CALE.",
        icon: "trending-up",
        kind: "home",
      },
      {
        id: "more",
        label: "Más",
        title: "Más opciones",
        subtitle: "Cuenta, sincronización y accesos secundarios.",
        icon: "more",
        kind: "more",
      },
    ],
  },
  instructor: {
    role: "instructor",
    defaultDestination: "activity",
    destinations: [
      {
        id: "home",
        label: "Inicio",
        title: "Inicio",
        subtitle: "Tu agenda inmediata, pendientes del día y sincronización.",
        icon: "home",
        kind: "home",
      },
      {
        id: "activity",
        label: "Horas",
        title: "Mis horas",
        subtitle: "Tu registro de trabajo por periodo.",
        icon: "clock",
        kind: "section",
        moduleIds: ["hours"],
      },
      {
        id: "more",
        label: "Más",
        title: "Más opciones",
        subtitle: "Cuenta, sincronización y acceso al resto de vistas permitidas.",
        icon: "more",
        kind: "more",
      },
    ],
  },
  recepcion: {
    role: "recepcion",
    defaultDestination: "home",
    destinations: [
      {
        id: "home",
        label: "Inicio",
        title: "Inicio",
        subtitle: "Alta rápida, agenda del día y estado de sincronización.",
        icon: "home",
        kind: "home",
      },
      {
        id: "students",
        label: "Alumnos",
        title: "Alumnos",
        subtitle: "Expedientes y seguimiento de alumnos.",
        icon: "users",
        kind: "section",
        moduleIds: ["students"],
      },
      {
        id: "billing",
        label: "Cobros",
        title: "Cobros",
        subtitle: "Ingresos y caja diaria.",
        icon: "wallet",
        kind: "section",
        moduleIds: ["income", "cash", "portfolio"],
      },
      {
        id: "more",
        label: "Más",
        title: "Más opciones",
        subtitle: "Cuenta, sincronización y vistas secundarias.",
        icon: "more",
        kind: "more",
      },
    ],
  },
  administrativo: {
    role: "administrativo",
    defaultDestination: "home",
    destinations: [
      {
        id: "home",
        label: "Inicio",
        title: "Inicio",
        subtitle: "Lo más urgente del día con foco en operación y finanzas.",
        icon: "home",
        kind: "home",
      },
      {
        id: "operation",
        label: "Operación",
        title: "Operación",
        subtitle: "Alumnos, instructores, vehículos y horas de trabajo.",
        icon: "users",
        kind: "section",
        moduleIds: ["students", "instructors", "vehicles", "hours", "logbook"],
      },
      {
        id: "finance",
        label: "Finanzas",
        title: "Finanzas",
        subtitle: "Cobros, caja, gastos y resúmenes contables esenciales.",
        icon: "wallet",
        kind: "section",
        moduleIds: ["income", "cash", "expenses", "portfolio", "reports", "payroll"],
      },
      {
        id: "more",
        label: "Más",
        title: "Más opciones",
        subtitle: "Cuenta, sincronización y herramientas administrativas secundarias.",
        icon: "more",
        kind: "more",
      },
    ],
  },
  admin_sede: {
    role: "admin_sede",
    defaultDestination: "home",
    destinations: [
      {
        id: "home",
        label: "Inicio",
        title: "Inicio",
        subtitle: "El pulso de la sede y los accesos que más aceleran la jornada.",
        icon: "home",
        kind: "home",
      },
      {
        id: "operation",
        label: "Operación",
        title: "Operación",
        subtitle: "Alumnos, instructores, vehículos y horas de trabajo.",
        icon: "users",
        kind: "section",
        moduleIds: ["students", "instructors", "vehicles", "hours", "logbook"],
      },
      {
        id: "finance",
        label: "Finanzas",
        title: "Finanzas",
        subtitle: "Ingresos, caja y gastos de la sede.",
        icon: "wallet",
        kind: "section",
        moduleIds: ["income", "cash", "expenses", "portfolio", "reports"],
      },
      {
        id: "more",
        label: "Más",
        title: "Más opciones",
        subtitle: "Cuenta, sincronización y módulos de soporte no prioritarios.",
        icon: "more",
        kind: "more",
      },
    ],
  },
  admin_escuela: {
    role: "admin_escuela",
    defaultDestination: "home",
    destinations: [
      {
        id: "home",
        label: "Inicio",
        title: "Inicio",
        subtitle: "Una vista ejecutiva ligera para mover la operación y detectar bloqueos.",
        icon: "home",
        kind: "home",
      },
      {
        id: "operation",
        label: "Operación",
        title: "Operación",
        subtitle: "Alumnos, instructores, vehículos y horas de trabajo.",
        icon: "users",
        kind: "section",
        moduleIds: ["students", "instructors", "vehicles", "hours", "logbook"],
      },
      {
        id: "finance",
        label: "Finanzas",
        title: "Finanzas",
        subtitle: "Recaudo, caja, gastos y lectura rápida del estado financiero.",
        icon: "wallet",
        kind: "section",
        moduleIds: ["income", "cash", "expenses", "portfolio", "reports", "payroll"],
      },
      {
        id: "more",
        label: "Más",
        title: "Más opciones",
        subtitle: "Cuenta, sincronización, contratos, permisos y configuración avanzada.",
        icon: "more",
        kind: "more",
      },
    ],
  },
  super_admin: {
    role: "super_admin",
    defaultDestination: "home",
    destinations: [
      {
        id: "home",
        label: "Inicio",
        title: "Inicio",
        subtitle: "Salud general de la plataforma, alertas y accesos de coordinación central.",
        icon: "home",
        kind: "home",
      },
      {
        id: "schools",
        label: "Escuelas",
        title: "Escuelas",
        subtitle: "Estado de escuelas, sedes y equipo visible desde una sola capa.",
        icon: "school",
        kind: "section",
        moduleIds: ["schools", "branches", "staff"],
      },
      {
        id: "platform",
        label: "Plataforma",
        title: "Plataforma",
        subtitle: "Suscripciones, analíticas, CALE central y controles globales.",
        icon: "layers",
        kind: "section",
        moduleIds: [
          "analytics",
          "subscriptions",
          "exams",
          "permissions",
          "compliance",
          "contracts",
          "arco",
        ],
      },
      {
        id: "more",
        label: "Más",
        title: "Más opciones",
        subtitle: "Cuenta, sincronización y vistas no prioritarias de gobierno.",
        icon: "more",
        kind: "more",
      },
    ],
  },
};

export function getModuleById(id: string | string[]): ModuleDescriptor | null {
  const normalized = Array.isArray(id) ? id[0] : id;
  return MODULES.find((module) => module.id === normalized) || null;
}

export function getVisibleModulesForRole(role: Rol | null | undefined) {
  if (!role) return [];
  return MODULES.filter((module) => canUseMobileModule(role, module.id) && module.id !== "home");
}

export function canUseMobileModule(role: Rol | null | undefined, id: MobileModuleId) {
  const descriptor = getModuleById(id);
  return Boolean(
    role &&
    descriptor &&
    descriptor.roles.includes(role) &&
    descriptor.mode !== "placeholder" &&
    (id !== "exams" || role === "alumno")
  );
}

export function canEditMobileModule(role: Rol | null | undefined, id: MobileModuleId) {
  return (
    canUseMobileModule(role, id) &&
    ["admin_escuela", "admin_sede", "administrativo", "recepcion"].includes(role ?? "") &&
    ["students", "income", "expenses"].includes(id)
  );
}

export function getRoleNavigationConfig(role: Rol | null | undefined): RoleNavigationConfig | null {
  if (!role) return null;
  const navigation = ROLE_NAVIGATION[role];
  if (!navigation) return null;
  return {
    ...navigation,
    destinations: navigation.destinations.filter(
      (destination) =>
        destination.kind !== "section" ||
        destination.moduleIds?.some((id) => canUseMobileModule(role, id))
    ),
  };
}

export function getDestinationById(
  role: Rol | null | undefined,
  destinationId: PrimaryNavDestinationId
): PrimaryNavDestination | null {
  return (
    getRoleNavigationConfig(role)?.destinations.find(
      (destination) => destination.id === destinationId
    ) || null
  );
}

export function getPrimaryModulesForRole(role: Rol | null | undefined) {
  const navigation = getRoleNavigationConfig(role);
  if (!navigation) return [];

  const moduleIds = new Set<MobileModuleId>();
  navigation.destinations.forEach((destination) => {
    destination.moduleIds?.forEach((moduleId) => moduleIds.add(moduleId));
  });

  return Array.from(moduleIds)
    .map((moduleId) => getModuleById(moduleId))
    .filter((module): module is ModuleDescriptor =>
      Boolean(module && canUseMobileModule(role, module.id))
    );
}

export function getModulesForDestination(
  role: Rol | null | undefined,
  destinationId: PrimaryNavDestinationId
) {
  const destination = getDestinationById(role, destinationId);
  if (!destination?.moduleIds?.length) return [];

  return destination.moduleIds
    .map((moduleId) => getModuleById(moduleId))
    .filter((module): module is ModuleDescriptor => Boolean(module))
    .filter((module) => canUseMobileModule(role, module.id));
}

export function getModulesForMore(role: Rol | null | undefined) {
  if (!role) return [];
  const primaryIds = new Set(getPrimaryModulesForRole(role).map((module) => module.id));

  return getVisibleModulesForRole(role)
    .filter((module) => !primaryIds.has(module.id))
    .sort((left, right) => {
      if (left.priorityInMore !== right.priorityInMore) {
        return left.priorityInMore - right.priorityInMore;
      }
      return left.label.localeCompare(right.label, "es");
    });
}

export function getDefaultDestinationForRole(
  role: Rol | null | undefined
): PrimaryNavDestinationId {
  return getRoleNavigationConfig(role)?.defaultDestination ?? "home";
}

export function getDefaultModuleForRole(role: Rol | null | undefined): MobileModuleId {
  if (role === "alumno") return "exams";
  if (role === "instructor") return "hours";
  return "home";
}
