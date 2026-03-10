import type { Rol } from "@/types/database";

/** All system roles as a constant object */
export const ROLES = {
  SUPER_ADMIN: "super_admin" as Rol,
  ADMIN_ESCUELA: "admin_escuela" as Rol,
  ADMIN_SEDE: "admin_sede" as Rol,
  ADMINISTRATIVO: "administrativo" as Rol,
  INSTRUCTOR: "instructor" as Rol,
  RECEPCION: "recepcion" as Rol,
  ALUMNO: "alumno" as Rol,
} as const;

/** Roles that can manage students */
export const ROLES_GESTION_ALUMNOS: Rol[] = [
  ROLES.SUPER_ADMIN, ROLES.ADMIN_ESCUELA, ROLES.ADMIN_SEDE, ROLES.ADMINISTRATIVO, ROLES.RECEPCION,
];

/** Roles that can manage instructors */
export const ROLES_GESTION_INSTRUCTORES: Rol[] = [
  ROLES.SUPER_ADMIN, ROLES.ADMIN_ESCUELA, ROLES.ADMIN_SEDE, ROLES.ADMINISTRATIVO,
];

/** Roles with admin-level access */
export const ROLES_ADMIN: Rol[] = [
  ROLES.SUPER_ADMIN, ROLES.ADMIN_ESCUELA, ROLES.ADMIN_SEDE,
];
