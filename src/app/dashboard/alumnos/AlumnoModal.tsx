"use client";

import Modal from "@/components/dashboard/Modal";
import { getContractPrefixHint, normalizeContractNumber } from "@/lib/contract-number";
import { BookOpen } from "lucide-react";
import type { EstadoAlumno, MetodoPago, TipoRegistroAlumno } from "@/types/database";
import type { Dispatch, SetStateAction } from "react";
import type { AlumnoFormType, AlumnoRow, MatriculaResumen } from "./constants";
import {
  estadosAlumno,
  tiposRegistroAlumno,
  metodosPago,
  TODAS_CATEGORIAS,
  CATEGORIAS_APTITUD,
  inputClass,
  labelClass,
  formatMatriculaLabel,
  formatEstadoLabel,
} from "./constants";

interface AlumnoModalProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  editing: AlumnoRow | null;
  editingHasMultipleMatriculas: boolean;
  editingMatricula: MatriculaResumen | null;
  isAptitudForm: boolean;
  isPracticeForm: boolean;
  form: AlumnoFormType;
  setForm: Dispatch<SetStateAction<AlumnoFormType>>;
  error: string;
  saving: boolean;
  handleSave: () => void;
  toggleCategoria: (cat: string) => void;
  openNewMatricula: (alumno: AlumnoRow) => void;
  categoriasEscuela: string[];
  tramitadorOptions: string[];
}

export default function AlumnoModal({
  modalOpen,
  setModalOpen,
  editing,
  editingHasMultipleMatriculas,
  editingMatricula,
  isAptitudForm,
  isPracticeForm,
  form,
  setForm,
  error,
  saving,
  handleSave,
  toggleCategoria,
  openNewMatricula,
  categoriasEscuela,
  tramitadorOptions,
}: AlumnoModalProps) {
  const tramitadorListId = "alumno-tramitador-options";

  return (
    <Modal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      title={
        editing
          ? isAptitudForm
            ? "Editar proceso de aptitud"
            : isPracticeForm
              ? "Editar práctica adicional"
              : "Editar Alumno"
          : isAptitudForm
            ? "Nuevo proceso de aptitud"
            : isPracticeForm
              ? "Nueva práctica adicional"
              : "Nuevo Alumno"
      }
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
            {error}
          </p>
        )}

        {editing && editing.tipo_registro === "regular" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                openNewMatricula(editing);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-[#0071e3]/20 px-3 py-2 text-sm text-[#0071e3] transition-colors hover:bg-[#0071e3]/5"
            >
              <BookOpen size={14} />
              Nueva matrícula
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Apellidos *</label>
            <input
              type="text"
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Cédula *</label>
            <input
              type="text"
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono *</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Correo</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Tipo de registro</label>
            <select
              value={form.tipo_registro}
              onChange={(e) => {
                const nextType = e.target.value as TipoRegistroAlumno;
                setForm((prev) => ({
                  ...prev,
                  tipo_registro: nextType,
                  categorias:
                    nextType === "aptitud_conductor"
                      ? prev.categorias.slice(0, 1)
                      : prev.categorias,
                  empresa_convenio:
                    nextType === "aptitud_conductor"
                      ? prev.empresa_convenio || "Supertaxis"
                      : nextType === "practica_adicional"
                        ? prev.empresa_convenio || "Práctica adicional"
                        : "",
                  tiene_tramitador: nextType === "regular" ? prev.tiene_tramitador : false,
                  tramitador_nombre: nextType === "regular" ? prev.tramitador_nombre : "",
                  tramitador_valor: nextType === "regular" ? prev.tramitador_valor : "",
                }));
              }}
              disabled={Boolean(editing)}
              className={`${inputClass} ${editing ? "cursor-not-allowed opacity-70" : ""}`}
            >
              {tiposRegistroAlumno.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
            {editing && (
              <p className="mt-1 text-[11px] text-[#86868b]">
                El tipo se fija al crear el registro para no romper su historial.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {isAptitudForm
                ? "Convenio / empresa"
                : isPracticeForm
                  ? "Servicio / origen"
                  : "Estado"}
            </label>
            {isAptitudForm || isPracticeForm ? (
              <input
                type="text"
                value={form.empresa_convenio}
                onChange={(e) => setForm({ ...form, empresa_convenio: e.target.value })}
                placeholder={isAptitudForm ? "Supertaxis" : "Práctica adicional"}
                className={inputClass}
              />
            ) : (
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                className={inputClass}
              >
                {estadosAlumno.map((estado) => (
                  <option key={estado} value={estado}>
                    {formatEstadoLabel(estado)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {editingHasMultipleMatriculas ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
              Este alumno tiene varias matrículas. Aquí solo se actualizan sus datos personales;
              contrato, valor y categorías se gestionan por matrícula.
            </div>
            <div className="space-y-2">
              {editing?.matriculas.map((matricula) => (
                <div
                  key={matricula.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-[#0a0a0a]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {formatMatriculaLabel(matricula)}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {matricula.fecha_inscripcion || "Sin fecha"} ·{" "}
                      {(matricula.categorias ?? []).join(", ") || "Sin categorías"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {matricula.valor_total
                      ? `$${Number(matricula.valor_total).toLocaleString("es-CO")}`
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : isAptitudForm ? (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Categoría evaluada *</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {Array.from(new Set([...CATEGORIAS_APTITUD, ...form.categorias])).map((cat) => {
                  const selected = form.categorias.includes(cat);
                  return (
                    <button
                      key={`aptitud-${cat}`}
                      type="button"
                      onClick={() => toggleCategoria(cat)}
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
                <label className={labelClass}>Referencia interna</label>
                <input
                  type="text"
                  value={form.numero_contrato}
                  onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })}
                  placeholder="Se genera si la dejas vacía"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha del proceso</label>
                <input
                  type="date"
                  value={form.fecha_inscripcion}
                  onChange={(e) => setForm({ ...form, fecha_inscripcion: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                  className={inputClass}
                >
                  {estadosAlumno.map((estado) => (
                    <option key={estado} value={estado}>
                      {formatEstadoLabel(estado)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Valor del servicio</label>
                <input
                  type="number"
                  min="0"
                  placeholder="120000"
                  value={form.valor_total}
                  onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-xl bg-gray-50 px-4 py-4 dark:bg-[#0a0a0a]">
              <div>
                <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Resultados del examen
                </p>
                <p className="mt-1 text-xs text-[#86868b]">
                  Registra la calificación de 0 a 100 para cada prueba.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Calificación teórica</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0 - 100"
                    value={form.nota_examen_teorico}
                    onChange={(e) => setForm({ ...form, nota_examen_teorico: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha examen teórico</label>
                  <input
                    type="date"
                    value={form.fecha_examen_teorico}
                    onChange={(e) => setForm({ ...form, fecha_examen_teorico: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Calificación práctica</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0 - 100"
                    value={form.nota_examen_practico}
                    onChange={(e) => setForm({ ...form, nota_examen_practico: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha examen práctico</label>
                  <input
                    type="date"
                    value={form.fecha_examen_practico}
                    onChange={(e) => setForm({ ...form, fecha_examen_practico: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : isPracticeForm ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Referencia interna</label>
                <input
                  type="text"
                  value={form.numero_contrato}
                  onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })}
                  placeholder="Se genera si la dejas vacía"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha del servicio</label>
                <input
                  type="date"
                  value={form.fecha_inscripcion}
                  onChange={(e) => setForm({ ...form, fecha_inscripcion: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                  className={inputClass}
                >
                  {estadosAlumno.map((estado) => (
                    <option key={estado} value={estado}>
                      {formatEstadoLabel(estado)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Valor del servicio</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.valor_total}
                  onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-[#4a4a4f] dark:bg-[#0a0a0a] dark:text-[#d2d2d7]">
              Este tipo de registro sirve para personas o alumnos que compran horas prácticas por
              fuera del curso principal. No crea matrícula ni exige categoría.
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className={labelClass}>
                Categoría del curso *{" "}
                <span className="font-normal normal-case">
                  ({form.categorias.length} seleccionada{form.categorias.length !== 1 ? "s" : ""})
                </span>
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {(categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS).map(
                  (cat) => {
                    const selected = form.categorias.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategoria(cat)}
                        className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selected
                            ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                            : "border-gray-200 text-[#86868b] hover:border-gray-300 dark:border-gray-700"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>N° contrato</label>
                <input
                  type="text"
                  value={form.numero_contrato}
                  onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })}
                  onBlur={(e) =>
                    setForm({
                      ...form,
                      numero_contrato:
                        normalizeContractNumber(e.target.value, form.categorias) ?? "",
                    })
                  }
                  placeholder={getContractPrefixHint(form.categorias)}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-[#86868b]">
                  Se guarda con prefijo obligatorio segun la categoria:{" "}
                  {getContractPrefixHint(form.categorias)}.
                </p>
              </div>
              <div>
                <label className={labelClass}>Fecha inscripción</label>
                <input
                  type="date"
                  value={form.fecha_inscripcion}
                  onChange={(e) => setForm({ ...form, fecha_inscripcion: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                  className={inputClass}
                >
                  {estadosAlumno.map((estado) => (
                    <option key={estado} value={estado}>
                      {formatEstadoLabel(estado)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Valor total del curso</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.valor_total}
                  onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
              <label className="flex cursor-pointer items-center gap-3 select-none">
                <div
                  className="relative"
                  onClick={() => setForm({ ...form, tiene_tramitador: !form.tiene_tramitador })}
                >
                  <div
                    className={`h-6 w-10 rounded-full transition-colors ${form.tiene_tramitador ? "bg-[#0071e3]" : "bg-gray-200 dark:bg-gray-700"}`}
                  >
                    <div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.tiene_tramitador ? "translate-x-5" : "translate-x-1"}`}
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

              {form.tiene_tramitador && (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Nombre del tramitador</label>
                    <input
                      type="text"
                      list={tramitadorOptions.length > 0 ? tramitadorListId : undefined}
                      value={form.tramitador_nombre}
                      onChange={(e) => setForm({ ...form, tramitador_nombre: e.target.value })}
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
                      Usa el mismo nombre del tercero para consolidar pagos y pendientes en
                      Tramitadores.
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Valor{" "}
                      {editingMatricula && (editingMatricula.tramitador_valor ?? 0) > 0
                        ? "(ajuste sobre el anterior)"
                        : "(va a Gastos)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.tramitador_valor}
                      onChange={(e) => setForm({ ...form, tramitador_valor: e.target.value })}
                      className={inputClass}
                    />
                    <p className="mt-1 text-[11px] text-[#86868b]">
                      Si lo dejas en 0, el tramitador queda asignado pero no se causa gasto todavía.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!editingHasMultipleMatriculas && !isAptitudForm && !isPracticeForm && (
          <div className="flex items-end">
            <p className="text-xs text-[#86868b]">
              {editing
                ? "La ficha personal se actualiza siempre; los valores del curso viven en la matrícula."
                : "Al crear el alumno se genera también su primera matrícula."}
            </p>
          </div>
        )}

        {editingHasMultipleMatriculas && (
          <div>
            <label className={labelClass}>Estado</label>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
              className={inputClass}
            >
              {estadosAlumno.map((estado) => (
                <option key={estado} value={estado}>
                  {formatEstadoLabel(estado)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass}>Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {!editing && (
          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="mb-3 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
              {isAptitudForm || isPracticeForm ? "Pago inicial" : "Abono inicial"}
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    {isAptitudForm || isPracticeForm ? "Monto del pago" : "Monto del abono"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.abono}
                    onChange={(e) => setForm({ ...form, abono: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Método de pago</label>
                  <select
                    value={form.metodo_pago_abono}
                    onChange={(e) =>
                      setForm({ ...form, metodo_pago_abono: e.target.value as MetodoPago })
                    }
                    className={inputClass}
                  >
                    {metodosPago.map((metodo) => (
                      <option key={metodo.value} value={metodo.value}>
                        {metodo.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {parseFloat(String(form.valor_total)) > 0 && (
                <p className="text-xs text-[#86868b]">
                  Saldo pendiente tras {isAptitudForm || isPracticeForm ? "pago" : "abono"}:{" "}
                  <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    $
                    {Math.max(
                      0,
                      parseFloat(String(form.valor_total)) - (parseFloat(String(form.abono)) || 0)
                    ).toLocaleString("es-CO")}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => setModalOpen(false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : editing
                ? "Guardar Cambios"
                : isAptitudForm
                  ? "Crear Proceso de Aptitud"
                  : isPracticeForm
                    ? "Crear Registro de Práctica"
                    : "Crear Alumno"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
