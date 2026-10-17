import { createClient } from "@/lib/supabase";
import { getCurrentYear, getTodayDateString } from "@/lib/date-utils";
import { studentBillingFormDefaults } from "@/lib/student-billing-defaults";
import {
  inferTipoPermisoFromCategories,
  normalizeStoredCourseCategories,
  SELECTABLE_COURSE_CATEGORIES,
} from "@/lib/course-categories";
import type {
  EstadoAlumno,
  Alumno,
  MatriculaAlumno,
  MetodoPago,
  TipoDocumentoAlumno,
  TipoPermiso,
  TipoRegistroAlumno,
} from "@/types/database";

export const PAGE_SIZE = 10;

export const MONTH_OPTIONS = [
  { value: "", label: "Todos los meses" },
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(getCurrentYear() - i));

export const estadosAlumno: EstadoAlumno[] = ["activo", "inactivo", "graduado", "pre_registrado"];

export function formatEstadoLabel(estado: EstadoAlumno) {
  if (estado === "pre_registrado") return "Pre-registrado";
  if (estado === "graduado") return "Graduado";
  if (estado === "inactivo") return "Inactivo";
  return "Activo";
}
export const tiposRegistroAlumno: { value: TipoRegistroAlumno; label: string }[] = [
  { value: "regular", label: "Alumno regular" },
  { value: "aptitud_conductor", label: "Aptitud conductores" },
  { value: "practica_adicional", label: "Práctica adicional" },
];
export const metodosPago: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datáfono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];
export const TODAS_CATEGORIAS = [...SELECTABLE_COURSE_CATEGORIES];
export const CATEGORIAS_APTITUD = ["C1", "C2", "C3"];
export const CONTRACT_CATEGORY_BUTTON_ORDER = ["A1", "A2", "B1", "C1", "RC1", "C2", "C3"];

export type MatriculaResumen = Pick<
  MatriculaAlumno,
  | "id"
  | "alumno_id"
  | "numero_contrato"
  | "prefijo_contrato"
  | "consecutivo_contrato"
  | "categorias"
  | "valor_total"
  | "fecha_inscripcion"
  | "estado"
  | "notas"
  | "tiene_tramitador"
  | "tramitador_nombre"
  | "tramitador_valor"
  | "created_at"
> & { facturax_invoice?: { number: string | null; state: string } | null };

export type AlumnoRow = Alumno & {
  matriculas: MatriculaResumen[];
  categorias_resumen: string[];
  valor_total_resumen: number;
  total_pagado: number;
  saldo_pendiente: number;
};

export type AlumnosListResponse = {
  totalCount: number;
  summary: {
    regularCount: number;
    specialCount: number;
    periodStudentCount: number;
  };
  rows: AlumnoRow[];
};

const defaultBillingContact = studentBillingFormDefaults({});
export const emptyForm = {
  tipo_registro: "regular" as TipoRegistroAlumno,
  nombre: "",
  apellidos: "",
  dni: "",
  tipo_documento: "CC" as TipoDocumentoAlumno,
  email: "",
  telefono: "",
  lugar_expedicion_documento: "",
  fecha_nacimiento: "",
  direccion: "",
  ciudad: defaultBillingContact.ciudad,
  departamento: defaultBillingContact.departamento,
  pais: defaultBillingContact.datos_facturacion.country,
  municipio_codigo: defaultBillingContact.datos_facturacion.cityCode,
  regimen_fiscal: defaultBillingContact.datos_facturacion.taxRegime,
  responsabilidad_fiscal: defaultBillingContact.datos_facturacion.responsibilities,
  tipo_permiso: "B" as TipoPermiso,
  categorias: [] as string[],
  estado: "activo" as EstadoAlumno,
  empresa_convenio: "",
  nota_examen_teorico: "",
  fecha_examen_teorico: "",
  nota_examen_practico: "",
  fecha_examen_practico: "",
  notas: "",
  numero_contrato: "",
  fecha_inscripcion: getTodayDateString(),
  valor_total: "",
  abono: "",
  metodo_pago_abono: "efectivo" as MetodoPago,
  tiene_tramitador: false,
  tramitador_nombre: "",
  tramitador_valor: "",
  consentimiento_datos: false,
  facturado: false,
  numero_factura_electronica: "",
};

export const emptyMatriculaForm = {
  fecha_inscripcion: getTodayDateString(),
  categorias: [] as string[],
  valor_total: "",
  notas: "",
  abono: "",
  metodo_pago_abono: "efectivo" as MetodoPago,
  tiene_tramitador: false,
  tramitador_nombre: "",
  tramitador_valor: "",
};

export type AlumnoFormType = typeof emptyForm;
export type MatriculaFormType = typeof emptyMatriculaForm;

export function applyAlumnoBillingDefaults(form: AlumnoFormType): AlumnoFormType {
  const suggested = studentBillingFormDefaults({
    ciudad: form.ciudad,
    departamento: form.departamento,
    datos_facturacion: {
      country: form.pais,
      cityCode: form.municipio_codigo,
      taxRegime: form.regimen_fiscal,
      responsibilities: form.responsabilidad_fiscal,
    },
  });
  return {
    ...form,
    ciudad: suggested.ciudad,
    departamento: suggested.departamento,
    pais: suggested.datos_facturacion.country,
    municipio_codigo: suggested.datos_facturacion.cityCode,
    regimen_fiscal: suggested.datos_facturacion.taxRegime,
    responsabilidad_fiscal: suggested.datos_facturacion.responsibilities,
  };
}

export const inputClass = "apple-input";
export const labelClass = "apple-label";

export function mapTipoPermiso(categorias: string[]) {
  return inferTipoPermisoFromCategories(categorias);
}

export function buildAptitudReference() {
  return `APT-${Date.now()}`;
}

export function buildPracticeReference() {
  return `PRA-${Date.now()}`;
}

export function formatTipoRegistroLabel(tipo: TipoRegistroAlumno) {
  if (tipo === "aptitud_conductor") return "Aptitud";
  if (tipo === "practica_adicional") return "Práctica";
  return "Curso";
}

export function formatNotaExamen(nota: number | null, fecha: string | null) {
  if (nota === null || Number.isNaN(Number(nota))) return "Sin registrar";
  const notaLabel = Number(nota).toLocaleString("es-CO", {
    minimumFractionDigits: Number(nota) % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });
  return fecha ? `${notaLabel} · ${fecha}` : notaLabel;
}

export function formatMatriculaLabel(matricula: MatriculaResumen) {
  if (matricula.numero_contrato) return `Contrato ${matricula.numero_contrato}`;
  if ((matricula.categorias ?? []).length > 0) return (matricula.categorias ?? []).join(", ");
  return "Sin contrato";
}

export function getCategoriasDisponiblesParaTipos(
  tipos: TipoRegistroAlumno[],
  categoriasEscuela: string[]
) {
  const tiposActivos = tipos.length > 0 ? tipos : tiposRegistroAlumno.map((tipo) => tipo.value);
  const categorias = new Set<string>();

  if (tiposActivos.includes("regular")) {
    (categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS).forEach((cat) =>
      categorias.add(cat)
    );
  }

  if (tiposActivos.includes("aptitud_conductor")) {
    CATEGORIAS_APTITUD.forEach((cat) => categorias.add(cat));
  }

  return Array.from(categorias);
}

export function orderRegularContractCategories(categorias: string[]) {
  const uniqueCategories = normalizeStoredCourseCategories(categorias);
  const preferred = new Set(CONTRACT_CATEGORY_BUTTON_ORDER);
  const leading = CONTRACT_CATEGORY_BUTTON_ORDER.filter((categoria) =>
    uniqueCategories.includes(categoria)
  );
  const trailing = uniqueCategories.filter((categoria) => !preferred.has(categoria));

  return [...leading, ...trailing];
}

export async function resolveSedeId(escuelaId: string, preferredSedeId: string | null) {
  if (preferredSedeId) return preferredSedeId;

  const supabase = createClient();
  const { data } = await supabase
    .from("sedes")
    .select("id")
    .eq("escuela_id", escuelaId)
    .order("es_principal", { ascending: false })
    .limit(1)
    .single();

  return data?.id || null;
}
