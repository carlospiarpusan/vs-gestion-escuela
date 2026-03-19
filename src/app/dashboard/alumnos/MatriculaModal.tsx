"use client";

import Modal from "@/components/dashboard/Modal";
import { getContractPrefixHint, normalizeContractNumber } from "@/lib/contract-number";
import type { MetodoPago } from "@/types/database";
import type { Dispatch, SetStateAction } from "react";
import type { AlumnoRow, MatriculaFormType } from "./constants";
import {
  metodosPago,
  TODAS_CATEGORIAS,
  inputClass,
  labelClass,
  formatMatriculaLabel,
} from "./constants";

interface MatriculaModalProps {
  matriculaOpen: boolean;
  setMatriculaOpen: (open: boolean) => void;
  matriculaAlumno: AlumnoRow | null;
  matriculaForm: MatriculaFormType;
  setMatriculaForm: Dispatch<SetStateAction<MatriculaFormType>>;
  matriculaSaving: boolean;
  handleSaveMatricula: () => void;
  toggleMatriculaCategoria: (cat: string) => void;
  categoriasEscuela: string[];
  tramitadorOptions: string[];
}

export default function MatriculaModal({
  matriculaOpen,
  setMatriculaOpen,
  matriculaAlumno,
  matriculaForm,
  setMatriculaForm,
  matriculaSaving,
  handleSaveMatricula,
  toggleMatriculaCategoria,
  categoriasEscuela,
  tramitadorOptions,
}: MatriculaModalProps) {
  const tramitadorListId = "matricula-tramitador-options";

  return (
    <Modal
      open={matriculaOpen}
      onClose={() => setMatriculaOpen(false)}
      title={`Nueva matrícula — ${matriculaAlumno?.nombre} ${matriculaAlumno?.apellidos}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {matriculaAlumno && matriculaAlumno.matriculas.length > 0 && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-[#0a0a0a]">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
              Matrículas actuales
            </p>
            <div className="space-y-2">
              {matriculaAlumno.matriculas.map((matricula) => (
                <div key={matricula.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {formatMatriculaLabel(matricula)}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {matricula.fecha_inscripcion || "Sin fecha"} ·{" "}
                      {(matricula.categorias ?? []).join(", ") || "Sin categorías"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {matricula.valor_total
                      ? `$${Number(matricula.valor_total).toLocaleString("es-CO")}`
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>
            Categoría del curso *{" "}
            <span className="font-normal normal-case">
              ({matriculaForm.categorias.length} seleccionada
              {matriculaForm.categorias.length !== 1 ? "s" : ""})
            </span>
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS).map((cat) => {
              const selected = matriculaForm.categorias.includes(cat);
              return (
                <button
                  key={`matricula-${cat}`}
                  type="button"
                  onClick={() => toggleMatriculaCategoria(cat)}
                  className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selected
                      ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                      : "border-gray-200 text-[#86868b] hover:border-gray-300 dark:border-gray-700"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>N° contrato</label>
            <input
              type="text"
              value={matriculaForm.numero_contrato}
              onChange={(e) =>
                setMatriculaForm({ ...matriculaForm, numero_contrato: e.target.value })
              }
              onBlur={(e) =>
                setMatriculaForm({
                  ...matriculaForm,
                  numero_contrato:
                    normalizeContractNumber(e.target.value, matriculaForm.categorias) ?? "",
                })
              }
              placeholder={getContractPrefixHint(matriculaForm.categorias)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[#86868b]">
              Se guarda con prefijo obligatorio segun la categoria:{" "}
              {getContractPrefixHint(matriculaForm.categorias)}.
            </p>
          </div>
          <div>
            <label className={labelClass}>Fecha inscripción</label>
            <input
              type="date"
              value={matriculaForm.fecha_inscripcion}
              onChange={(e) =>
                setMatriculaForm({ ...matriculaForm, fecha_inscripcion: e.target.value })
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Valor total del curso</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={matriculaForm.valor_total}
              onChange={(e) => setMatriculaForm({ ...matriculaForm, valor_total: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Notas del contrato</label>
            <input
              type="text"
              value={matriculaForm.notas}
              onChange={(e) => setMatriculaForm({ ...matriculaForm, notas: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
          <label className="flex cursor-pointer items-center gap-3 select-none">
            <div
              className="relative"
              onClick={() =>
                setMatriculaForm({
                  ...matriculaForm,
                  tiene_tramitador: !matriculaForm.tiene_tramitador,
                })
              }
            >
              <div
                className={`h-6 w-10 rounded-full transition-colors ${matriculaForm.tiene_tramitador ? "bg-[#0071e3]" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                <div
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${matriculaForm.tiene_tramitador ? "translate-x-5" : "translate-x-1"}`}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                Tiene tramitador
              </p>
              <p className="text-xs text-[#86868b]">
                El costo se registrará automáticamente en Gastos
              </p>
            </div>
          </label>

          {matriculaForm.tiene_tramitador && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nombre del tramitador</label>
                <input
                  type="text"
                  list={tramitadorOptions.length > 0 ? tramitadorListId : undefined}
                  value={matriculaForm.tramitador_nombre}
                  onChange={(e) =>
                    setMatriculaForm({ ...matriculaForm, tramitador_nombre: e.target.value })
                  }
                  placeholder="Nombre o agencia"
                  className={inputClass}
                />
                {tramitadorOptions.length > 0 ? (
                  <datalist id={tramitadorListId}>
                    {tramitadorOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                ) : null}
                <p className="mt-1 text-[11px] text-[#86868b]">
                  Reutiliza nombres existentes para no duplicar el mismo tercero con variantes.
                </p>
              </div>
              <div>
                <label className={labelClass}>Valor del tramitador</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={matriculaForm.tramitador_valor}
                  onChange={(e) =>
                    setMatriculaForm({ ...matriculaForm, tramitador_valor: e.target.value })
                  }
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-[#86868b]">
                  Con 0 solo queda asignado el tercero; cuando pongas valor se registra el gasto.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
          <p className="mb-3 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
            Abono inicial
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Monto del abono</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={matriculaForm.abono}
                  onChange={(e) => setMatriculaForm({ ...matriculaForm, abono: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Método de pago</label>
                <select
                  value={matriculaForm.metodo_pago_abono}
                  onChange={(e) =>
                    setMatriculaForm({
                      ...matriculaForm,
                      metodo_pago_abono: e.target.value as MetodoPago,
                    })
                  }
                  className={inputClass}
                >
                  {metodosPago.map((metodo) => (
                    <option key={`matricula-${metodo.value}`} value={metodo.value}>
                      {metodo.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {parseFloat(String(matriculaForm.valor_total)) > 0 && (
              <p className="text-xs text-[#86868b]">
                Saldo pendiente tras abono:{" "}
                <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  $
                  {Math.max(
                    0,
                    parseFloat(String(matriculaForm.valor_total)) -
                      (parseFloat(String(matriculaForm.abono)) || 0)
                  ).toLocaleString("es-CO")}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => setMatriculaOpen(false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveMatricula}
            disabled={matriculaSaving}
            className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
          >
            {matriculaSaving ? "Guardando..." : "Crear Matrícula"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
