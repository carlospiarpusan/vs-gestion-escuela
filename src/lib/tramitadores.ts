import type { Rol } from "@/types/database";

export type TipoTramitador = "comision" | "descuento";

export const TIPO_TRAMITADOR_LABEL: Record<TipoTramitador, string> = {
  comision: "Comisión por alumno",
  descuento: "Descuento en el curso",
};

/** Roles que ven el catálogo (para elegir tramitador en la matrícula). */
export const TRAMITADOR_CATALOG_READ_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];

/** Roles que crean, editan, fusionan y dan acceso a tramitadores. */
export const TRAMITADOR_MANAGE_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede"];

export type TramitadorCatalogItem = {
  id: string;
  nombre: string;
  tipo: TipoTramitador;
  comision_valor: number | null;
  documento: string | null;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  tiene_acceso: boolean;
  acceso_activo: boolean;
  alumnos: number;
};

export type TramitadorPortalRow = {
  matricula_id: string;
  alumno_nombre: string;
  alumno_documento: string | null;
  alumno_telefono: string | null;
  alumno_email: string | null;
  categorias: string[];
  numero_contrato: string | null;
  fecha_inscripcion: string | null;
  estado: "activo" | "cerrado" | "cancelado";
  valor_curso: number;
  abonado: number;
  saldo: number;
  comision: number | null;
};

export type TramitadorPortalPayload = {
  tramitador: { nombre: string; tipo: TipoTramitador };
  rows: TramitadorPortalRow[];
  totales: { valor_curso: number; abonado: number; saldo: number; comision: number };
};

/** Misma regla que la función SQL normalize_tramitador_nombre. */
export function normalizeTramitadorNombre(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function cleanTramitadorNombre(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Opción mínima para elegir tramitador en la matrícula. */
export type TramitadorOption = {
  id: string;
  nombre: string;
  tipo: TipoTramitador;
  comision_valor: number | null;
};

export function toTramitadorOptions(
  items: Pick<TramitadorCatalogItem, "id" | "nombre" | "tipo" | "comision_valor">[]
): TramitadorOption[] {
  return items.map(({ id, nombre, tipo, comision_valor }) => ({
    id,
    nombre,
    tipo,
    comision_valor,
  }));
}
