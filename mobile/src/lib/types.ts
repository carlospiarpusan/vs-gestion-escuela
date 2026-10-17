export type Rol =
  | "super_admin"
  | "admin_escuela"
  | "admin_sede"
  | "administrativo"
  | "instructor"
  | "recepcion"
  | "alumno";

export type MobileModuleId =
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
  | "subscriptions"
  | "payroll"
  | "contracts"
  | "logbook"
  | "permissions"
  | "compliance"
  | "analytics"
  | "arco";

export type ModuleViewMode = "home" | "daily" | "online-summary" | "placeholder" | "cale";

export type ModuleSectionId =
  | "overview"
  | "operation"
  | "finance"
  | "progress"
  | "activity"
  | "configuration"
  | "platform";

export type PrimaryNavDestinationId =
  | "home"
  | "cale"
  | "classes"
  | "progress"
  | "activity"
  | "students"
  | "billing"
  | "operation"
  | "finance"
  | "schools"
  | "platform"
  | "more";

export type PrimaryNavDestination = {
  id: PrimaryNavDestinationId;
  label: string;
  title: string;
  subtitle: string;
  icon: string;
  kind: "home" | "module" | "section" | "more";
  moduleIds?: MobileModuleId[];
};

export type RoleNavigationConfig = {
  role: Rol;
  defaultDestination: PrimaryNavDestinationId;
  destinations: PrimaryNavDestination[];
};

export type Perfil = {
  id: string;
  escuela_id: string | null;
  sede_id: string | null;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  cedula?: string | null;
};

export type SchoolSubscriptionStatus =
  | "trialing"
  | "pending_payment"
  | "active"
  | "grace"
  | "read_only"
  | "suspended";

export type SchoolBillingInterval = "trial" | "monthly" | "annual";

export type SchoolSubscriptionAccess = {
  school_id: string;
  cycle_id: string | null;
  plan_id: "basico" | "profesional" | "enterprise";
  billing_interval: SchoolBillingInterval;
  status: SchoolSubscriptionStatus;
  actual_status: Exclude<SchoolSubscriptionStatus, "pending_payment">;
  can_write: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  scheduled_plan_id: "basico" | "profesional" | "enterprise" | null;
  scheduled_billing_interval: "monthly" | "annual" | null;
  scheduled_effective_at: string | null;
  requires_review: boolean;
  pending_payment_reference: string | null;
  pending_payment_created_at: string | null;
};

export type DashboardSummary = {
  headline: string;
  note: string;
  stats: Array<{
    id: string;
    label: string;
    value: string;
    tone?: "default" | "success" | "warning" | "danger";
  }>;
  highlights: Array<{
    id: string;
    title: string;
    description: string;
  }>;
};

export type ModuleDescriptor = {
  id: MobileModuleId;
  label: string;
  shortLabel: string;
  area: string;
  section: ModuleSectionId;
  description: string;
  mode: ModuleViewMode;
  roles: Rol[];
  offline: boolean;
  icon: string;
  tabSlotByRole?: Partial<Record<Rol, PrimaryNavDestinationId>>;
  defaultRouteByRole?: Partial<Record<Rol, PrimaryNavDestinationId>>;
  priorityInMore: number;
  hiddenFromPrimaryNav?: boolean;
};

export type PendingMutationStatus = "pending" | "syncing" | "applied" | "failed";

export type PendingMutation = {
  id: string;
  entityId: string;
  type: string;
  payload: Record<string, unknown>;
  status: PendingMutationStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CachedRow<T = Record<string, unknown>> = {
  entityType: string;
  entityId: string;
  payload: T;
  updatedAt: string;
};

export type ModuleListState<T = Record<string, unknown>> = {
  rows: T[];
  fromCache: boolean;
  online: boolean;
};

export type PublicFeature = {
  title: string;
  description: string;
};
