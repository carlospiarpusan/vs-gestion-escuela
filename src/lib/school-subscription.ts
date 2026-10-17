import type {
  PlanEscuelaPago,
  SchoolBillingInterval,
  SchoolPaidBillingInterval,
  SchoolSubscriptionStatus,
} from "@/types/database";

export function getSchoolSubscriptionStatusLabel(status: SchoolSubscriptionStatus) {
  switch (status) {
    case "trialing":
      return "Prueba activa";
    case "pending_payment":
      return "Pago en validación";
    case "active":
      return "Activa";
    case "grace":
      return "En gracia";
    case "read_only":
      return "Solo lectura";
    case "suspended":
      return "Suspendida";
    default:
      return status;
  }
}

export function getSchoolSubscriptionIntervalLabel(interval: SchoolBillingInterval) {
  switch (interval) {
    case "trial":
      return "Prueba";
    case "monthly":
      return "Mensual";
    case "annual":
      return "Anual";
    default:
      return interval;
  }
}

export function getSchoolSubscriptionPlanLabel(planId: PlanEscuelaPago) {
  switch (planId) {
    case "basico":
      return "Básico";
    case "profesional":
      return "Profesional";
    case "enterprise":
      return "Enterprise";
    default:
      return planId;
  }
}

export function isSchoolSubscriptionWriteEnabled(status: SchoolSubscriptionStatus) {
  return status === "trialing" || status === "active" || status === "grace";
}

export function isSchoolSubscriptionHardBlocked(status: SchoolSubscriptionStatus) {
  return status === "suspended";
}

export function getSchoolSubscriptionStatusTone(status: SchoolSubscriptionStatus) {
  switch (status) {
    case "active":
    case "trialing":
      return "success";
    case "pending_payment":
    case "grace":
      return "warning";
    case "read_only":
      return "default";
    case "suspended":
      return "danger";
    default:
      return "default";
  }
}

export function getNextCycleDuration(interval: SchoolPaidBillingInterval) {
  return interval === "annual" ? "1 year" : "1 month";
}
