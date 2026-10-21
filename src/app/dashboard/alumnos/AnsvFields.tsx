"use client";

import { calculateEnrollmentAnsv, type AnsvSnapshot } from "@/lib/ansv";

export default function AnsvFields({
  birth,
  sex,
  date,
  categories,
  category,
  onCategory,
  saved,
}: {
  birth?: string | null;
  sex?: string | null;
  date: string;
  categories: string[];
  category: string;
  onCategory: (value: string) => void;
  saved?: AnsvSnapshot | null;
}) {
  let snapshot = saved ?? null;
  let issue = "";
  if (!snapshot) {
    try {
      snapshot = calculateEnrollmentAnsv({
        fechaNacimiento: birth,
        sexo: sex,
        fechaMatricula: date,
        categorias: categories,
        categoria: category,
      });
    } catch (error) {
      issue = (error as Error).message;
    }
  }
  return (
    <div className="space-y-2 border-y border-[var(--surface-border)] py-3 text-sm">
      {categories.length > 1 && (
        <label className="apple-label" htmlFor="ansv-category">
          Categoría principal para ANSV *
          <select
            id="ansv-category"
            className="apple-select mt-1"
            required
            value={category}
            onChange={(event) => onCategory(event.target.value)}
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      )}
      <p role="status">
        {snapshot?.valorPesos
          ? `ANSV ${snapshot.categoria}: $${snapshot.valorPesos.toLocaleString("es-CO")} COP · ${snapshot.edad} años · ${snapshot.vigencia}`
          : snapshot?.motivo || issue}
      </p>
      {snapshot && (snapshot.alternativas?.length ?? 0) > 1 && (
        <p className="text-xs text-[var(--gray-500)]">
          {snapshot.alternativas
            ?.map(
              (item) =>
                `${item.categoria}: ${item.valorPesos ? `$${item.valorPesos.toLocaleString("es-CO")}` : "Por revisar"}`
            )
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
