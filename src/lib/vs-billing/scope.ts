import type { Perfil, Rol } from "@/types/database";

export const INVOICE_STAFF_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];
export function canIssueVsBilling(
  enabled: boolean,
  perfil: Pick<Perfil, "rol" | "activo" | "escuela_id">,
  schoolId: string | null
) {
  return (
    enabled &&
    perfil.activo &&
    INVOICE_STAFF_ROLES.includes(perfil.rol) &&
    (perfil.rol === "super_admin"
      ? schoolId === VS_BILLING_SCHOOL.id
      : perfil.escuela_id === VS_BILLING_SCHOOL.id)
  );
}

export const VS_BILLING_SCHOOL = {
  id: "a5320c4a-3bf6-4da5-b365-da17d7001d4f",
  nit: "901171550",
  dv: "0",
  razonSocial: "Escuela de Conduccion Sin Fronteras S.A.S.",
} as const;

export function canManageVsBilling(
  enabled: boolean,
  perfil: Pick<Perfil, "rol" | "activo" | "escuela_id">,
  selectedSchoolId: string | null
) {
  if (!enabled || !perfil.activo) return false;
  if (perfil.rol === "super_admin") return selectedSchoolId === VS_BILLING_SCHOOL.id;
  return perfil.rol === "admin_escuela" && perfil.escuela_id === VS_BILLING_SCHOOL.id;
}

export type ConnectionKey = {
  id: string;
  nombre: string;
  identificador: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type BillingStudent = {
  schema_version: 1;
  source: "condusoft";
  source_reference: string;
  alumno: {
    id: string;
    nombre: string;
    apellidos: string;
    nombre_completo: string;
    tipo_documento: string | null;
    documento: string;
    email: string | null;
  };
};
