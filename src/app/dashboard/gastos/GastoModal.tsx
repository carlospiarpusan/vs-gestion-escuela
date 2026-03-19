"use client";

import Modal from "@/components/dashboard/Modal";
import type { CategoriaGasto, EstadoPagoGasto, MetodoPagoGasto } from "@/types/database";
import { categorias, metodos, estadosPagoGasto, type GastoFormState } from "./constants";

export interface GastoModalProps {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  form: GastoFormState;
  setForm: (value: GastoFormState | ((prev: GastoFormState) => GastoFormState)) => void;
  error: string;
  saving: boolean;
  onSave: () => void;
  tramitadorOptions: string[];
}

export default function GastoModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  error,
  saving,
  onSave,
  tramitadorOptions,
}: GastoModalProps) {
  const inputCls = "apple-input";
  const isTramitador = form.categoria === "tramitador";
  const tramitadorListId = "gasto-tramitador-options";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar Gasto" : "Nuevo Gasto"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Inline error banner */}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
            {error}
          </p>
        )}

        {/* Category & payment method selectors */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaGasto })}
              className={inputCls}
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Método de Pago</label>
            <select
              value={form.metodo_pago}
              onChange={(e) => setForm({ ...form, metodo_pago: e.target.value as MetodoPagoGasto })}
              className={inputCls}
            >
              {metodos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Estado de pago</label>
            <select
              value={form.estado_pago}
              onChange={(e) => setForm({ ...form, estado_pago: e.target.value as EstadoPagoGasto })}
              className={inputCls}
            >
              {estadosPagoGasto.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Concepto (required) */}
        <div>
          <label className="mb-1 block text-xs text-[#86868b]">Concepto *</label>
          <input
            type="text"
            value={form.concepto}
            onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* Monto, fecha, and invoice number */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Monto *</label>
            <input
              type="number"
              step="0.01"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Fecha</label>
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
            <label className="mb-1 block text-xs text-[#86868b]">Vencimiento</label>
            <input
              type="date"
              value={form.fecha_vencimiento}
              onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">N° Factura</label>
            <input
              type="text"
              value={form.numero_factura}
              onChange={(e) => setForm({ ...form, numero_factura: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        {/* Proveedor and recurrente toggle */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">
              {isTramitador ? "Tramitador *" : "Proveedor"}
            </label>
            <input
              type="text"
              list={isTramitador && tramitadorOptions.length > 0 ? tramitadorListId : undefined}
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              placeholder={isTramitador ? "Nombre del tercero" : ""}
              className={inputCls}
            />
            {isTramitador && tramitadorOptions.length > 0 ? (
              <datalist id={tramitadorListId}>
                {tramitadorOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            ) : null}
            {isTramitador ? (
              <p className="mt-1 text-[11px] text-[#86868b]">
                Usa el mismo nombre siempre para consolidar cartera y pagos por tercero.
              </p>
            ) : null}
          </div>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
              <input
                type="checkbox"
                checked={form.recurrente}
                onChange={(e) => setForm({ ...form, recurrente: e.target.checked })}
                className="rounded"
              />{" "}
              Gasto recurrente
            </label>
          </div>
        </div>

        {/* Optional notes */}
        <div>
          <label className="mb-1 block text-xs text-[#86868b]">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Action buttons */}
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
            {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Gasto"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
