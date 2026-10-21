"use client";

import { useEffect, useMemo, useState } from "react";
import { latestAnsvBirthDate, type AnsvSnapshot } from "@/lib/ansv";
import { resolveInvoiceAnsv, type InvoiceAnsvContext } from "@/lib/vs-billing/invoice-ansv";

export default function InvoiceAnsvCalculator({
  context,
  onCalculated,
  disabled,
}: {
  context: InvoiceAnsvContext;
  onCalculated: (snapshot: AnsvSnapshot | null) => void;
  disabled?: boolean;
}) {
  const [birth, setBirth] = useState(context.fechaNacimiento);
  const [sex, setSex] = useState(context.sexo);
  const [category, setCategory] = useState(context.categoria ?? "");
  const result = useMemo(
    () =>
      resolveInvoiceAnsv(null, {
        ...context,
        fechaNacimiento: birth,
        sexo: sex,
        categoria: category,
      }),
    [context, birth, sex, category]
  );
  useEffect(() => onCalculated(result.snapshot), [result, onCalculated]);
  return (
    <fieldset
      disabled={disabled}
      className="space-y-2 border-y border-[var(--surface-border)] py-3 text-sm"
    >
      <legend className="font-medium">Datos ANSV para esta factura</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label>
          Fecha de nacimiento *
          <input
            type="date"
            className="apple-input mt-1 w-full"
            value={birth}
            max={latestAnsvBirthDate(context.fechaMatricula)}
            onChange={(event) => setBirth(event.target.value)}
          />
        </label>
        <label>
          Sexo para ANSV *
          <select
            className="apple-select mt-1 w-full"
            value={sex}
            onChange={(event) => setSex(event.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </label>
        {context.categorias.length > 1 && (
          <label>
            Categoría principal ANSV *
            <select
              className="apple-select mt-1 w-full"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Seleccionar</option>
              {context.categorias.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {result.issue && (
        <p role="status" className="text-amber-700 dark:text-amber-400">
          {result.issue}
        </p>
      )}
    </fieldset>
  );
}
