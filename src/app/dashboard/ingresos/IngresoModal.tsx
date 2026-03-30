"use client";

import type { Dispatch, SetStateAction } from "react";
import Modal from "@/components/dashboard/Modal";
import type { IncomeLedgerRow } from "@/lib/finance/types";
import type { CategoriaIngreso, EstadoIngreso, MetodoPago } from "@/types/database";
import {
  AlumnoOption,
  categorias,
  estadosIngreso,
  formatMatriculaLabel,
  IngresoFormData,
  inputCls,
  labelCls,
  MatriculaOption,
  metodos,
} from "./constants";

type IngresoModalProps = {
  open: boolean;
  editing: IncomeLedgerRow | null;
  error: string;
  form: IngresoFormData;
  alumnos: AlumnoOption[];
  matriculasDisponibles: MatriculaOption[];
  catalogsLoading?: boolean;
  saving: boolean;
  setForm: Dispatch<SetStateAction<IngresoFormData>>;
  onAlumnoChange: (alumnoId: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function IngresoModal({
  open,
  editing,
  error,
  form,
  alumnos,
  matriculasDisponibles,
  catalogsLoading = false,
  saving,
  setForm,
  onAlumnoChange,
  onClose,
  onSave,
}: IngresoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar ingreso" : "Nuevo ingreso"}
      maxWidth="max-w-xl"
      mobilePresentation="fullscreen"
    >
      <div className="space-y-4">
        {catalogsLoading && (
          <p className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[#66707a] dark:text-[#aeb6bf]">
            Cargando alumnos y matrículas disponibles...
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaIngreso })}
              className={inputCls}
            >
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Alumno</label>
            <select
              value={form.alumno_id}
              onChange={(e) => onAlumnoChange(e.target.value)}
              className={inputCls}
            >
              <option value="">Sin alumno</option>
              {alumnos.map((alumno) => (
                <option key={alumno.id} value={alumno.id}>
                  {alumno.nombre} {alumno.apellidos}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Matrícula</label>
          <select
            value={form.matricula_id}
            onChange={(e) => setForm({ ...form, matricula_id: e.target.value })}
            className={inputCls}
            disabled={!form.alumno_id || matriculasDisponibles.length === 0}
          >
            <option value="">
              {!form.alumno_id
                ? "Selecciona primero un alumno"
                : matriculasDisponibles.length === 0
                  ? "El alumno no tiene matrículas"
                  : "Selecciona una matrícula"}
            </option>
            {matriculasDisponibles.map((matricula) => (
              <option key={matricula.id} value={matricula.id}>
                {formatMatriculaLabel(matricula)}
              </option>
            ))}
          </select>
          {form.alumno_id && matriculasDisponibles.length > 1 && (
            <p className="mt-1 text-[11px] text-[#86868b]">
              El alumno tiene varios cursos; registra el ingreso en la matrícula correcta.
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}>Concepto *</label>
          <input
            type="text"
            value={form.concepto}
            onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelCls}>Monto *</label>
            <input
              type="number"
              step="0.01"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Método de pago</label>
            <select
              value={form.metodo_pago}
              onChange={(e) => setForm({ ...form, metodo_pago: e.target.value as MetodoPago })}
              className={inputCls}
            >
              {metodos.map((metodo) => (
                <option key={metodo.value} value={metodo.value}>
                  {metodo.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  fecha: e.target.value,
                  fecha_vencimiento:
                    !prev.fecha_vencimiento || prev.fecha_vencimiento === prev.fecha
                      ? e.target.value
                      : prev.fecha_vencimiento,
                }))
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Vencimiento</label>
            <input
              type="date"
              value={form.fecha_vencimiento}
              onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Estado</label>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoIngreso })}
              className={inputCls}
            >
              {estadosIngreso.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Medio específico</label>
            <input
              type="text"
              value={form.medio_especifico}
              onChange={(e) => setForm({ ...form, medio_especifico: e.target.value })}
              className={inputCls}
              placeholder="Ej: Nequi 300..."
            />
          </div>
          <div>
            <label className={labelCls}>N° Factura</label>
            <input
              type="text"
              value={form.numero_factura}
              onChange={(e) => setForm({ ...form, numero_factura: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
          >
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear ingreso"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
