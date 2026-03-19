"use client";

import Modal from "@/components/dashboard/Modal";
import type { Ingreso, MetodoPago } from "@/types/database";
import type { AlumnoRow, MatriculaResumen } from "./constants";
import { metodosPago, inputClass, labelClass, formatMatriculaLabel } from "./constants";

interface AbonoModalProps {
  abonoOpen: boolean;
  setAbonoOpen: (open: boolean) => void;
  abonoAlumno: AlumnoRow | null;
  abonoMatriculas: MatriculaResumen[];
  abonoMatriculaId: string;
  setAbonoMatriculaId: (id: string) => void;
  abonoIngresosFiltrados: Ingreso[];
  loadingIngresos: boolean;
  valorTotalAbono: number;
  totalPagadoAbono: number;
  saldoPendienteAbono: number;
  abonoMonto: string;
  setAbonoMonto: (val: string) => void;
  abonoMetodo: MetodoPago;
  setAbonoMetodo: (val: MetodoPago) => void;
  abonoConcepto: string;
  setAbonoConcepto: (val: string) => void;
  abonoFecha: string;
  setAbonoFecha: (val: string) => void;
  abonoSaving: boolean;
  handleSaveAbono: () => void;
}

export default function AbonoModal({
  abonoOpen,
  setAbonoOpen,
  abonoAlumno,
  abonoMatriculas,
  abonoMatriculaId,
  setAbonoMatriculaId,
  abonoIngresosFiltrados,
  loadingIngresos,
  valorTotalAbono,
  totalPagadoAbono,
  saldoPendienteAbono,
  abonoMonto,
  setAbonoMonto,
  abonoMetodo,
  setAbonoMetodo,
  abonoConcepto,
  setAbonoConcepto,
  abonoFecha,
  setAbonoFecha,
  abonoSaving,
  handleSaveAbono,
}: AbonoModalProps) {
  return (
    <Modal
      open={abonoOpen}
      onClose={() => setAbonoOpen(false)}
      title={`${abonoAlumno?.tipo_registro === "regular" ? "Abonos" : "Pagos"} — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {abonoMatriculas.length > 1 && (
          <div>
            <label className={labelClass}>Matrícula</label>
            <select
              value={abonoMatriculaId}
              onChange={(e) => setAbonoMatriculaId(e.target.value)}
              className={inputClass}
            >
              {abonoMatriculas.map((matricula) => (
                <option key={matricula.id} value={matricula.id}>
                  {formatMatriculaLabel(matricula)}
                </option>
              ))}
            </select>
          </div>
        )}

        {valorTotalAbono > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-[#0a0a0a]">
              <p className="mb-1 text-[10px] tracking-wider text-[#86868b] uppercase">
                Valor Curso
              </p>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                ${valorTotalAbono.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="rounded-xl bg-green-50 p-3 text-center dark:bg-green-900/20">
              <p className="mb-1 text-[10px] tracking-wider text-green-600 uppercase dark:text-green-400">
                Pagado
              </p>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                ${totalPagadoAbono.toLocaleString("es-CO")}
              </p>
            </div>
            <div
              className={`rounded-xl p-3 text-center ${saldoPendienteAbono <= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}
            >
              <p
                className={`mb-1 text-[10px] tracking-wider uppercase ${saldoPendienteAbono <= 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
              >
                {saldoPendienteAbono <= 0 ? "¡Al día!" : "Pendiente"}
              </p>
              <p
                className={`text-sm font-semibold ${saldoPendienteAbono <= 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}
              >
                ${Math.max(0, saldoPendienteAbono).toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
            Historial de pagos
          </p>
          {loadingIngresos ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
            </div>
          ) : abonoIngresosFiltrados.length === 0 ? (
            <p className="rounded-xl bg-gray-50 py-3 text-center text-xs text-[#86868b] dark:bg-[#0a0a0a]">
              Sin pagos registrados
            </p>
          ) : (
            <div className="max-h-44 space-y-1.5 overflow-y-auto">
              {abonoIngresosFiltrados.map((ingreso) => (
                <div
                  key={ingreso.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-[#0a0a0a]"
                >
                  <div>
                    <p className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {ingreso.concepto}
                    </p>
                    <p className="text-[10px] text-[#86868b]">
                      {ingreso.fecha} ·{" "}
                      {metodosPago.find((metodo) => metodo.value === ingreso.metodo_pago)?.label ||
                        ingreso.metodo_pago}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-sm font-semibold text-green-600 dark:text-green-400">
                    +${ingreso.monto.toLocaleString("es-CO")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <p className="text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
            {abonoAlumno?.tipo_registro === "regular"
              ? "Registrar nuevo abono"
              : "Registrar nuevo pago"}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Monto *</label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={abonoMonto}
                onChange={(e) => setAbonoMonto(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha *</label>
              <input
                type="date"
                value={abonoFecha}
                onChange={(e) => setAbonoFecha(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Método de pago</label>
              <select
                value={abonoMetodo}
                onChange={(e) => setAbonoMetodo(e.target.value as MetodoPago)}
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

          <div>
            <label className={labelClass}>Concepto (opcional)</label>
            <input
              type="text"
              placeholder={
                abonoAlumno?.tipo_registro === "aptitud_conductor"
                  ? `Pago aptitud — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`
                  : abonoAlumno?.tipo_registro === "practica_adicional"
                    ? `Práctica adicional — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`
                    : `Abono — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`
              }
              value={abonoConcepto}
              onChange={(e) => setAbonoConcepto(e.target.value)}
              className={inputClass}
            />
          </div>

          {valorTotalAbono > 0 && parseFloat(abonoMonto) > 0 && (
            <p className="text-xs text-[#86868b]">
              Saldo pendiente tras abono:{" "}
              <span
                className={`font-semibold ${saldoPendienteAbono - parseFloat(abonoMonto) <= 0 ? "text-green-600" : "text-amber-600"}`}
              >
                $
                {Math.max(0, saldoPendienteAbono - (parseFloat(abonoMonto) || 0)).toLocaleString(
                  "es-CO"
                )}
              </span>
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSaveAbono}
              disabled={abonoSaving || !abonoMonto}
              className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
            >
              {abonoSaving
                ? "Registrando..."
                : abonoAlumno?.tipo_registro === "regular"
                  ? "Registrar Abono"
                  : "Registrar Pago"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
