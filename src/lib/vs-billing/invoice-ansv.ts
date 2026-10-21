import { calculateAnsv, readAnsvSnapshot, type AnsvSnapshot } from "@/lib/ansv";

export type InvoiceAnsvContext = {
  fechaNacimiento: string;
  sexo: string;
  fechaMatricula: string;
  categorias: string[];
  categoria?: string;
};

export function resolveInvoiceAnsv(
  saved: unknown,
  context: InvoiceAnsvContext,
  today?: string
): { snapshot: AnsvSnapshot | null; issue: string | null } {
  // A historical snapshot remains authoritative even if the student's profile changes.
  const snapshot = readAnsvSnapshot(saved);
  if (snapshot) return { snapshot, issue: snapshot.motivo };
  try {
    const calculated = calculateAnsv(context, today);
    return { snapshot: calculated, issue: calculated.motivo };
  } catch (error) {
    return {
      snapshot: null,
      issue: error instanceof Error ? error.message : "Completa los datos para calcular ANSV.",
    };
  }
}
