"use client";

import Modal from "@/components/dashboard/Modal";
import AnsvFields from "./AnsvFields";
import type { MetodoPago } from "@/types/database";
import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { AlumnoRow, MatriculaFormType, MatriculaResumen } from "./constants";
import { useContractPreview } from "./useContractPreview";
import {
  metodosPago,
  TODAS_CATEGORIAS,
  formatMatriculaLabel,
  inputClass,
  labelClass,
  orderRegularContractCategories,
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
  catalogsLoading?: boolean;
  categoriasEscuela: string[];
  tramitadorOptions: string[];
  editingMatricula?: MatriculaResumen | null;
  formError?: string;
  onEditMatricula?: (alumno: AlumnoRow, matricula: MatriculaResumen) => void;
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
  catalogsLoading = false,
  categoriasEscuela,
  tramitadorOptions,
  editingMatricula = null,
  formError = "",
  onEditMatricula,
}: MatriculaModalProps) {
  const editing = Boolean(editingMatricula);
  const paidTramitador = Boolean(
    editingMatricula && Number(editingMatricula.tramitador_valor || 0) > 0
  );
  const tramitadorListId = "matricula-tramitador-options";
  const {
    preview: contractPreview,
    loading: loadingContractPreview,
    error: contractPreviewError,
    hasCategorias,
  } = useContractPreview({
    enabled: matriculaOpen && (!editing || Boolean(editingMatricula?.numero_contrato)),
    categorias: matriculaForm.categorias,
    lockedNumber: editingMatricula?.numero_contrato,
  });
  const regularCategories = orderRegularContractCategories(
    categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS
  );

  useEffect(() => {
    if (
      matriculaForm.categorias.length > 0 &&
      (!matriculaForm.ansv_categoria ||
        !matriculaForm.categorias.includes(matriculaForm.ansv_categoria))
    ) {
      setMatriculaForm((prev) => ({
        ...prev,
        ansv_categoria: prev.categorias[0] || "",
      }));
    }
  }, [matriculaForm.categorias, matriculaForm.ansv_categoria, setMatriculaForm]);

  return (
    <Modal
      open={matriculaOpen}
      onClose={() => {
        if (!matriculaSaving) setMatriculaOpen(false);
      }}
      title={`${editing ? "Editar matrícula" : "Nueva matrícula"} — ${matriculaAlumno?.nombre} ${matriculaAlumno?.apellidos}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {editing && (editingMatricula?.facturax_invoice || matriculaAlumno?.facturado) && (
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            Esta matrícula tiene facturación asociada. Puedes editar notas y estado; el valor, las
            categorías y la fecha deben conservarse.
          </p>
        )}
        {catalogsLoading && (
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[#66707a] dark:text-[#aeb6bf]">
            Cargando categorías y sugerencias para la matrícula...
          </div>
        )}

        {!editing && matriculaAlumno && matriculaAlumno.matriculas.length > 0 && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-[#0a0a0a]">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
              Matrículas actuales
            </p>
            <div className="space-y-2">
              {matriculaAlumno.matriculas.map((matricula) => (
                <div key={matricula.id} className="flex items-center justify-between gap-3">
                  {onEditMatricula && (
                    <button
                      type="button"
                      className="apple-button-secondary text-xs"
                      onClick={() => onEditMatricula(matriculaAlumno, matricula)}
                    >
                      Editar matrícula {matricula.numero_contrato}
                    </button>
                  )}
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
            <p className="mt-3 border-t border-gray-200 pt-3 text-xs leading-5 text-[#86868b] dark:border-gray-800">
              Si agregas una matrícula nueva, se crea un contrato independiente.
            </p>
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
          <p className="mt-1 text-xs text-[#86868b]">
            Para combo, selecciona moto y carro dentro de esta misma matrícula.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {regularCategories.map((cat) => {
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

        <AnsvFields
          birth={matriculaAlumno?.fecha_nacimiento}
          sex={matriculaAlumno?.sexo}
          date={matriculaForm.fecha_inscripcion}
          categories={matriculaForm.categorias}
          category={matriculaForm.ansv_categoria}
          onCategory={(value) => setMatriculaForm({ ...matriculaForm, ansv_categoria: value })}
          saved={
            editing &&
            editingMatricula?.fecha_inscripcion === matriculaForm.fecha_inscripcion &&
            JSON.stringify(editingMatricula.categorias) ===
              JSON.stringify(matriculaForm.categorias) &&
            editingMatricula.ansv?.categoria === matriculaForm.ansv_categoria
              ? editingMatricula.ansv
              : null
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>N° contrato automático</label>
            <input
              type="text"
              value={editingMatricula?.numero_contrato || contractPreview?.nextNumber || ""}
              readOnly
              placeholder={
                editing
                  ? "Sin número asignado"
                  : !hasCategorias
                    ? "Selecciona categorías"
                    : loadingContractPreview
                      ? "Calculando..."
                      : "Se asigna al guardar"
              }
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[#86868b]">
              {editing
                ? "Se conserva el número de contrato asignado. No se reserva otro consecutivo."
                : loadingContractPreview
                  ? "Consultando el siguiente consecutivo..."
                  : contractPreview
                    ? `Se reservará ${contractPreview.nextNumber} al guardar. Solo se usa ${contractPreview.prefix} y el consecutivo siguiente.`
                    : contractPreviewError
                      ? "No pudimos previsualizar el contrato. Se reservará automáticamente al guardar."
                      : "El contrato se reserva automáticamente al guardar esta matrícula como MOT, CAR o COM más el consecutivo."}
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

        {editing && (
          <div>
            <label htmlFor="matricula-edit-status" className={labelClass}>
              Estado del curso
            </label>
            <select
              id="matricula-edit-status"
              className={inputClass}
              value={matriculaForm.estado}
              onChange={(e) =>
                setMatriculaForm({
                  ...matriculaForm,
                  estado: e.target.value as MatriculaFormType["estado"],
                })
              }
            >
              <option value="activo">Activo</option>
              <option value="cerrado">Cerrado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <p className="mt-2 text-xs text-[#86868b]">
              El número de contrato se conserva, incluso si cancelas el curso.
            </p>
          </div>
        )}
        <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
          <label className="flex cursor-pointer items-center gap-3 select-none">
            <div
              className="relative"
              onClick={() =>
                !paidTramitador &&
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
                  disabled={paidTramitador}
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
                  disabled={paidTramitador}
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

        {!editing && (
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
        )}

        <div className="sticky bottom-0 bg-[var(--surface-strong)] pt-3">
          {formError && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setMatriculaOpen(false)}
              disabled={matriculaSaving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveMatricula}
              disabled={matriculaSaving}
              className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
            >
              {matriculaSaving ? "Guardando..." : editing ? "Guardar matrícula" : "Crear Matrícula"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
