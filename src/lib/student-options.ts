export type StudentOption = { id: string; nombre: string; apellidos: string; dni: string };
export type StudentEnrollmentOption = {
  id: string;
  alumno_id: string;
  numero_contrato: string | null;
  categorias: string[];
  valor_total: number | null;
  fecha_inscripcion: string | null;
};
export type StudentOptionsResponse = {
  rows: StudentOption[];
  hasMore: boolean;
  matriculas?: StudentEnrollmentOption[];
};
