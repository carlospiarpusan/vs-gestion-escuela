"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";
import { AlertCircle, ChevronLeft, ChevronRight, ReceiptText, RefreshCw } from "lucide-react";
import TableScrollArea from "@/components/dashboard/TableScrollArea";
import {
  getDashboardListCached,
  invalidateDashboardClientCaches,
} from "@/lib/dashboard-client-cache";
import { fetchJsonWithRetry } from "@/lib/retry";
import { revalidateTaggedServerCaches } from "@/lib/server-cache-client";
import { buildScopedMutationRevalidationTags } from "@/lib/server-cache-tags";
import type { CierreHorasInstructor, Instructor } from "@/types/database";

// ─── Constantes ────────────────────────────────────────────────

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIA_ABREV = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

// ─── Tipos ─────────────────────────────────────────────────────

type HorasMap = Record<string, Record<number, number>>;
type InputOverrides = Record<string, string>;
type InstructorHorasRow = Pick<Instructor, "id" | "nombre" | "apellidos" | "color" | "sede_id"> & {
  valor_hora?: number | null;
};
type CierreHoraMensualRow = Pick<
  CierreHorasInstructor,
  | "id"
  | "instructor_id"
  | "gasto_id"
  | "periodo_anio"
  | "periodo_mes"
  | "fecha_cierre"
  | "total_horas"
  | "valor_hora"
  | "monto_total"
  | "updated_at"
>;
type GeneracionGastoHoraRow = {
  instructor_id: string;
  gasto_id: string;
  instructor_nombre: string;
  total_horas: number | string;
  valor_hora: number | string;
  monto_total: number | string;
  accion: "creado" | "actualizado";
};
type HorasDashboardResponse = {
  instructores: InstructorHorasRow[];
  horas: Array<{ instructor_id: string; fecha: string; horas: number }>;
  monthClosures: CierreHoraMensualRow[];
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) return message;
  }
  return fallback;
}

// ─── Helpers ───────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month, day).getDay();
}

function padMonth(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

// ─── Componente principal ──────────────────────────────────────

export default function HorasPage() {
  const { perfil } = useAuth();
  const isMobile = useIsMobileVariant();
  const today = new Date();

  const [mes, setMes] = useState(today.getMonth());
  const [anio, setAnio] = useState(today.getFullYear());
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [horasMap, setHorasMap] = useState<HorasMap>({});
  const [inputOverrides, setInputOverrides] = useState<InputOverrides>({});
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Valor hora por instructor
  const [valorHoras, setValorHoras] = useState<Record<string, number>>({});
  const [valorHoraEdits, setValorHoraEdits] = useState<Record<string, string>>({});
  const [savingValor, setSavingValor] = useState<Set<string>>(new Set());
  const [monthClosures, setMonthClosures] = useState<CierreHoraMensualRow[]>([]);
  const [loadingClosures, setLoadingClosures] = useState(false);
  const [closingMonth, setClosingMonth] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);
  const [closureNotice, setClosureNotice] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(anio, mes);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isReadOnly = perfil?.rol === "instructor" || perfil?.rol === "alumno";
  const canEditValor = ["super_admin", "admin_escuela", "admin_sede"].includes(perfil?.rol ?? "");
  const canGenerateMonthlyExpenses = Boolean(
    perfil?.escuela_id &&
    ["super_admin", "admin_escuela", "admin_sede", "administrativo"].includes(perfil?.rol ?? "")
  );
  const monthNumber = mes + 1;
  const monthKey = `${anio}-${String(monthNumber).padStart(2, "0")}`;
  const selectedMonthLabel = `${MESES[mes]} ${anio}`;
  const selectedMonthLastDay = new Date(anio, mes + 1, 0);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthClosed = selectedMonthLastDay < startOfToday;

  // Anchos fijos de columnas sticky derecha
  const VALOR_COL_W = 110; // px — columna valor total (solo admins)
  const TOTAL_COL_W = 64; // px — columna total horas
  const DAY_COL_W = 36; // px — columna de cada día

  // ── Carga de datos ────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!perfil?.escuela_id) return;
    setLoading(true);
    setLoadingClosures(true);
    setClosureError(null);

    try {
      const params = new URLSearchParams({
        anio: String(anio),
        mes: String(mes),
      });
      if (canGenerateMonthlyExpenses && monthClosed) {
        params.set("include_closures", "1");
      }
      const payload = await getDashboardListCached<HorasDashboardResponse>({
        name: "horas-dashboard",
        scope: {
          id: perfil.id,
          rol: perfil.rol,
          escuelaId: perfil.escuela_id,
          sedeId: perfil.sede_id,
        },
        params,
        loader: () => fetchJsonWithRetry<HorasDashboardResponse>(`/api/horas?${params.toString()}`),
      });

      const map: HorasMap = {};
      const vh: Record<string, number> = {};

      payload.instructores.forEach((i) => {
        map[i.id] = {};
        vh[i.id] = Number(i.valor_hora) || 0;
      });

      payload.horas.forEach((h) => {
        const day = parseInt(h.fecha.split("-")[2], 10);
        if (!map[h.instructor_id]) map[h.instructor_id] = {};
        map[h.instructor_id][day] = Number(h.horas);
      });

      setInstructores(payload.instructores as unknown as Instructor[]);
      setHorasMap(map);
      setValorHoras(vh);
      setMonthClosures(
        canGenerateMonthlyExpenses && monthClosed ? payload.monthClosures || [] : []
      );
      setInputOverrides({});
      setValorHoraEdits({});
      setSaveError(null);
    } catch (loadError) {
      console.error("[HorasPage] Error cargando horas:", loadError);
      setInstructores([]);
      setHorasMap({});
      setValorHoras({});
      setMonthClosures([]);
      setSaveError("No se pudieron cargar las horas del mes.");
      if (canGenerateMonthlyExpenses && monthClosed) {
        setClosureError("No se pudo verificar el cierre contable del mes.");
      }
    } finally {
      setLoading(false);
      setLoadingClosures(false);
    }
  }, [
    anio,
    canGenerateMonthlyExpenses,
    mes,
    monthClosed,
    perfil?.escuela_id,
    perfil?.id,
    perfil?.rol,
    perfil?.sede_id,
  ]);

  useEffect(() => {
    if (perfil) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, mes, anio]);

  // ── Celdas de horas ──────────────────────────────────────────

  const getCellValue = (instructorId: string, day: number): string => {
    const key = `${instructorId}-${day}`;
    if (key in inputOverrides) return inputOverrides[key];
    const map = horasMap[instructorId];
    if (!map || !(day in map)) return "";
    return String(map[day]); // muestra "0" para descanso
  };

  const handleChange = (instructorId: string, day: number, value: string) => {
    setInputOverrides((prev) => ({ ...prev, [`${instructorId}-${day}`]: value }));
  };

  const handleBlur = async (instructorId: string, day: number) => {
    if (!perfil?.escuela_id) return;
    const key = `${instructorId}-${day}`;
    const previousValue = horasMap[instructorId]?.[day];
    const raw = inputOverrides[key] ?? String(horasMap[instructorId]?.[day] ?? "");
    const isEmpty = raw.trim() === "";
    const parsed = parseInt(raw, 10);
    const hours = isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 24);

    // Si el campo queda vacío, limpiar del mapa local
    if (isEmpty) {
      setHorasMap((prev) => {
        const next = { ...prev, [instructorId]: { ...prev[instructorId] } };
        delete next[instructorId][day];
        return next;
      });
    } else {
      setHorasMap((prev) => ({
        ...prev,
        [instructorId]: { ...prev[instructorId], [day]: hours },
      }));
    }
    setInputOverrides((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

    const instructor = instructores.find((i) => i.id === instructorId);
    if (!instructor) return;

    const fecha = padMonth(anio, mes, day);
    const supabase = createClient();
    setSavingCells((prev) => new Set(prev).add(key));
    setSaveError(null);

    const query = isEmpty
      ? supabase.from("horas_trabajo").delete().eq("instructor_id", instructorId).eq("fecha", fecha)
      : supabase
          .from("horas_trabajo")
          .upsert(
            {
              escuela_id: perfil.escuela_id,
              sede_id: instructor.sede_id,
              instructor_id: instructorId,
              fecha,
              horas: hours,
            },
            { onConflict: "instructor_id,fecha" }
          );

    const { error } = await query;

    if (error) {
      setSaveError("No se pudo guardar la hora. Recarga la página si el problema persiste.");
      setHorasMap((prev) => {
        const next = { ...prev, [instructorId]: { ...(prev[instructorId] || {}) } };
        if (previousValue === undefined) {
          delete next[instructorId][day];
        } else {
          next[instructorId][day] = previousValue;
        }
        return next;
      });
    } else {
      invalidateDashboardClientCaches([
        "dashboard-list:horas-dashboard:",
        "dashboard-list:horas-grid:",
      ]);
    }

    setSavingCells((prev) => {
      const n = new Set(prev);
      n.delete(key);
      return n;
    });
  };

  // ── Valor hora por instructor ────────────────────────────────

  const getValorHoraDisplay = (instructorId: string): string => {
    if (instructorId in valorHoraEdits) return valorHoraEdits[instructorId];
    const v = valorHoras[instructorId];
    return v ? String(v) : "";
  };

  const handleValorHoraBlur = async (instructorId: string) => {
    const raw = valorHoraEdits[instructorId] ?? String(valorHoras[instructorId] ?? "");
    const parsed = parseFloat(raw.replace(/[^0-9.]/g, ""));
    const valor = isNaN(parsed) ? 0 : Math.max(parsed, 0);
    const previousValue = valorHoras[instructorId] ?? 0;

    setValorHoras((prev) => ({ ...prev, [instructorId]: valor }));
    setValorHoraEdits((prev) => {
      const n = { ...prev };
      delete n[instructorId];
      return n;
    });

    setSavingValor((prev) => new Set(prev).add(instructorId));
    setSaveError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("instructores")
      .update({ valor_hora: valor })
      .eq("id", instructorId);
    if (error) {
      setSaveError("No se pudo guardar el valor por hora.");
      setValorHoras((prev) => ({ ...prev, [instructorId]: previousValue }));
    } else {
      invalidateDashboardClientCaches([
        "dashboard-list:horas-dashboard:",
        "dashboard-list:horas-grid:",
      ]);
    }
    setSavingValor((prev) => {
      const n = new Set(prev);
      n.delete(instructorId);
      return n;
    });
  };

  // ── Totales ───────────────────────────────────────────────────

  const getTotalInstructor = (id: string) =>
    Object.values(horasMap[id] || {}).reduce((s, h) => s + (h || 0), 0);

  const getTotalDay = (day: number) =>
    instructores.reduce((s, i) => s + ((horasMap[i.id] || {})[day] || 0), 0);

  const getTotalValor = (id: string) => getTotalInstructor(id) * (valorHoras[id] || 0);

  const grandTotal = instructores.reduce((s, i) => s + getTotalInstructor(i.id), 0);
  const grandTotalValor = instructores.reduce((s, i) => s + getTotalValor(i.id), 0);
  const closureByInstructor = useMemo(
    () => new Map(monthClosures.map((row) => [row.instructor_id, row])),
    [monthClosures]
  );
  const closureTotal = useMemo(
    () => monthClosures.reduce((sum, row) => sum + Number(row.monto_total || 0), 0),
    [monthClosures]
  );
  const instructorsMissingRate = instructores.filter(
    (inst) => getTotalInstructor(inst.id) > 0 && (valorHoras[inst.id] ?? 0) <= 0
  );

  useEffect(() => {
    setClosureNotice(null);
    setClosureError(null);
  }, [monthKey]);

  const handleGenerateMonthlyExpenses = async () => {
    if (!monthClosed || !canGenerateMonthlyExpenses || !perfil?.escuela_id) return;

    setClosingMonth(true);
    setClosureError(null);
    setClosureNotice(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("generar_gastos_horas_mes", {
        p_anio: anio,
        p_mes: monthNumber,
      });

      if (error) {
        throw error;
      }

      const generatedRows = (data as GeneracionGastoHoraRow[] | null) ?? [];
      const totalGenerado = generatedRows.reduce(
        (sum, row) => sum + Number(row.monto_total || 0),
        0
      );

      if (generatedRows.length === 0) {
        setClosureNotice(
          `No había horas con valor para trasladar a gastos en ${selectedMonthLabel}.`
        );
      } else {
        setClosureNotice(
          `${generatedRows.length} gasto(s) ${monthClosures.length > 0 ? "actualizado(s)" : "generado(s)"} por ${fmtCOP(totalGenerado)} para ${selectedMonthLabel}.`
        );
      }

      invalidateDashboardClientCaches([
        "dashboard-list:horas-dashboard:",
        "dashboard-list:horas-closures:",
        "dashboard-list:horas-grid:",
        "dashboard-list:gastos-ledger:",
        "accounting-report:",
      ]);
      void revalidateTaggedServerCaches(
        buildScopedMutationRevalidationTags({
          scope: { escuelaId: perfil?.escuela_id, sedeId: perfil?.sede_id },
          includeFinance: true,
          includeDashboard: true,
        })
      );
      await fetchData();
    } catch (generationError) {
      console.error("[HorasPage] Error generando gastos mensuales:", generationError);
      setClosureError(
        getErrorMessage(generationError, "No se pudo generar el gasto mensual de horas.")
      );
    } finally {
      setClosingMonth(false);
    }
  };

  // ── Navegación de mes ─────────────────────────────────────────

  const prevMonth = () => {
    if (mes === 0) {
      setAnio((a) => a - 1);
      setMes(11);
    } else setMes((m) => m - 1);
  };
  const nextMonth = () => {
    if (mes === 11) {
      setAnio((a) => a + 1);
      setMes(0);
    } else setMes((m) => m + 1);
  };

  const anios = Array.from({ length: 6 }, (_, i) => today.getFullYear() - 2 + i);

  const pickerShellCls =
    "inline-flex items-center gap-1.5 rounded-[24px] border border-gray-200/80 bg-white/90 p-1.5 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-[#1d1d1f]/90";
  const sharedSelectCls =
    "h-9 rounded-2xl border border-transparent bg-transparent px-3 text-sm font-medium text-[#1d1d1f] outline-none transition focus:border-[#0071e3]/30 focus:bg-white focus:ring-0 dark:text-[#f5f5f7] dark:focus:bg-white/5";
  const monthSelectCls = `${sharedSelectCls} min-w-[8.75rem]`;
  const yearSelectCls = `${sharedSelectCls} w-[5.4rem]`;
  const navBtnCls =
    "inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-transparent text-[#1d1d1f] transition hover:bg-[#f5f5f7] hover:text-[#0071e3] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 dark:text-[#f5f5f7] dark:hover:bg-white/8 dark:hover:text-[#6cb6ff]";

  // right offset para la columna de total horas (deja espacio para la columna valor)
  const totalColRight = canEditValor ? VALOR_COL_W : 0;

  const renderMobileHoursCards = () => (
    <div className="space-y-4 p-4">
      {instructores.map((inst) => {
        const totalInst = getTotalInstructor(inst.id);
        const totalValor = getTotalValor(inst.id);
        const cierreMes = closureByInstructor.get(inst.id);

        return (
          <div
            key={inst.id}
            className="rounded-[1.75rem] border border-gray-100 bg-[#f7f9fc] p-4 dark:border-gray-800 dark:bg-[#111214]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {inst.color ? (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: inst.color }}
                    />
                  ) : null}
                  <h3 className="truncate text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {inst.nombre} {inst.apellidos}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-[#86868b]">
                  {totalInst > 0
                    ? `${totalInst}h registradas en ${selectedMonthLabel}`
                    : `Sin horas registradas en ${selectedMonthLabel}`}
                </p>
              </div>
              {cierreMes ? (
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  Gasto generado
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white px-3 py-3 dark:bg-[#1a1c20]">
                <p className="text-[11px] tracking-[0.18em] text-[#86868b] uppercase">
                  Total horas
                </p>
                <p className="mt-1 text-lg font-semibold text-[#0071e3]">
                  {totalInst > 0 ? `${totalInst}h` : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3 dark:bg-[#1a1c20]">
                <p className="text-[11px] tracking-[0.18em] text-[#86868b] uppercase">
                  Valor total
                </p>
                <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                  {totalValor > 0 ? fmtCOP(totalValor) : "—"}
                </p>
              </div>
            </div>

            {canEditValor ? (
              <div className="mt-4">
                <label className="mb-2 block text-[11px] font-semibold tracking-[0.18em] text-[#86868b] uppercase">
                  Valor por hora
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={getValorHoraDisplay(inst.id)}
                  onChange={(e) =>
                    setValorHoraEdits((prev) => ({ ...prev, [inst.id]: e.target.value }))
                  }
                  onBlur={() => handleValorHoraBlur(inst.id)}
                  placeholder="0"
                  className={`apple-input ${savingValor.has(inst.id) ? "opacity-40" : ""}`}
                />
              </div>
            ) : null}

            {canGenerateMonthlyExpenses && monthClosed && totalInst > 0 ? (
              <div
                className={`mt-4 rounded-2xl px-3 py-3 text-sm ${
                  cierreMes
                    ? "border border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300"
                    : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300"
                }`}
              >
                {cierreMes
                  ? `Gasto generado: ${fmtCOP(Number(cierreMes.monto_total || 0))}`
                  : "Pendiente de pasar a gasto"}
              </div>
            ) : null}

            <div className="mt-4">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-[#86868b] uppercase">
                Registro diario
              </p>
              <div className="grid grid-cols-4 gap-2">
                {days.map((d) => {
                  const key = `${inst.id}-${d}`;
                  const val = getCellValue(inst.id, d);
                  const numVal = parseFloat(val);
                  const hasVal = val !== "" && numVal > 0;
                  const isRest =
                    val === "0" || (val !== "" && numVal === 0 && horasMap[inst.id]?.[d] === 0);
                  const isSaving = savingCells.has(key);
                  const dow = getDayOfWeek(anio, mes, d);
                  const isWE = dow === 0 || dow === 6;
                  const isToday =
                    d === today.getDate() &&
                    mes === today.getMonth() &&
                    anio === today.getFullYear();

                  return (
                    <div
                      key={d}
                      className={`rounded-2xl border px-2 py-2 transition-opacity ${
                        isSaving ? "opacity-40" : ""
                      } ${
                        isRest
                          ? "border-amber-200 bg-amber-100/70 dark:border-amber-800 dark:bg-amber-900/20"
                          : isToday && hasVal
                            ? "border-[#0071e3]/30 bg-[#0071e3]/12"
                            : isToday
                              ? "border-[#0071e3]/20 bg-[#0071e3]/6"
                              : hasVal && isWE
                                ? "border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-[#0071e3]/8"
                                : hasVal
                                  ? "border-[#0071e3]/10 bg-[#0071e3]/5 dark:border-[#0071e3]/20 dark:bg-[#0071e3]/7"
                                  : isWE
                                    ? "border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-[#1a1a1a]/60"
                                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-[#17181c]"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-semibold ${
                            isToday ? "text-[#0071e3]" : "text-[#1d1d1f] dark:text-[#f5f5f7]"
                          }`}
                        >
                          {d}
                        </span>
                        <span
                          className={`text-[10px] ${
                            isToday
                              ? "text-[#0071e3]"
                              : isWE
                                ? "text-[#0071e3]/70"
                                : "text-[#86868b]"
                          }`}
                        >
                          {DIA_ABREV[dow]}
                        </span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={val}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          handleChange(inst.id, d, v);
                        }}
                        onBlur={() => handleBlur(inst.id, d)}
                        onFocus={(e) => e.target.select()}
                        readOnly={isReadOnly}
                        placeholder="·"
                        aria-label={`${inst.nombre} día ${d}`}
                        className={`h-11 w-full rounded-xl border border-transparent bg-white/80 px-1 text-center text-sm outline-none dark:bg-[#0f1013] ${
                          isRest
                            ? "font-semibold text-amber-600 dark:text-amber-400"
                            : hasVal
                              ? "font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                              : "text-[#86868b]"
                        } ${
                          isReadOnly
                            ? "cursor-default"
                            : "focus:border-[#0071e3]/30 focus:bg-[#0071e3]/10 dark:focus:bg-[#0071e3]/20"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <div className="rounded-[1.75rem] border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#17181c]">
        <div className={`grid gap-3 ${canEditValor ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-[#111214]">
            <p className="text-[11px] tracking-[0.18em] text-[#86868b] uppercase">Total mes</p>
            <p className="mt-1 text-lg font-semibold text-[#0071e3]">
              {grandTotal > 0 ? `${grandTotal}h` : "—"}
            </p>
          </div>
          {canEditValor ? (
            <div className="rounded-2xl bg-gray-50 px-3 py-3 dark:bg-[#111214]">
              <p className="text-[11px] tracking-[0.18em] text-[#86868b] uppercase">
                Total a gasto
              </p>
              <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                {grandTotalValor > 0 ? fmtCOP(grandTotalValor) : "—"}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Cabecera ── */}
      <div className="animate-fade-in mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Horas de Instructores
          </h2>
          <p className="mt-1 text-sm text-[#86868b]">
            Control mensual de horas trabajadas por instructor
          </p>
        </div>

        <div className={`${pickerShellCls} shrink-0`}>
          <button onClick={prevMonth} className={navBtnCls} aria-label="Mes anterior">
            <ChevronLeft size={15} />
          </button>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className={monthSelectCls}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className={yearSelectCls}
          >
            {anios.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button onClick={nextMonth} className={navBtnCls} aria-label="Mes siguiente">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {saveError}
        </div>
      )}

      {canGenerateMonthlyExpenses && (
        <div className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#1d1d1f] dark:text-[#f5f5f7]">
                <ReceiptText size={18} className="text-[#0071e3]" />
                <h3 className="text-lg font-semibold">Cierre contable de horas</h3>
              </div>
              <p className="mt-1 text-sm text-[#86868b]">
                Cuando el mes termina, puedes convertir el valor total de horas de cada instructor
                en gasto de nómina sin duplicados.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  monthClosed
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                {monthClosed
                  ? `Mes cerrado: ${selectedMonthLabel}`
                  : `Mes aún abierto: ${selectedMonthLabel}`}
              </span>
              <button
                onClick={handleGenerateMonthlyExpenses}
                disabled={
                  closingMonth ||
                  loading ||
                  loadingClosures ||
                  !monthClosed ||
                  grandTotalValor <= 0 ||
                  instructorsMissingRate.length > 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED] disabled:cursor-not-allowed disabled:bg-[#0071e3]/40"
              >
                {closingMonth ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <ReceiptText size={16} />
                )}
                {closingMonth
                  ? "Generando gastos..."
                  : monthClosures.length > 0
                    ? "Regenerar gastos del mes"
                    : "Generar gastos del mes"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-[#141414]">
              <p className="text-[11px] tracking-[0.18em] text-[#86868b] uppercase">
                Total horas del mes
              </p>
              <p className="mt-1 text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {grandTotal > 0 ? `${grandTotal}h` : "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-[#141414]">
              <p className="text-[11px] tracking-[0.18em] text-[#86868b] uppercase">
                Valor a gasto
              </p>
              <p className="mt-1 text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {grandTotalValor > 0 ? fmtCOP(grandTotalValor) : "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-[#141414]">
              <p className="text-[11px] tracking-[0.18em] text-[#86868b] uppercase">
                Gastos ya generados
              </p>
              <p className="mt-1 text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {loadingClosures ? "..." : `${monthClosures.length}`}
              </p>
              <p className="mt-1 text-xs text-[#86868b]">
                {loadingClosures
                  ? "Verificando..."
                  : monthClosures.length > 0
                    ? fmtCOP(closureTotal)
                    : "Sin cierre todavía"}
              </p>
            </div>
          </div>

          {!monthClosed && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
              Este mes todavía no ha terminado. El traslado a gastos se habilita cuando cierre el
              período.
            </div>
          )}

          {monthClosed && instructorsMissingRate.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
              Hay instructores con horas registradas y valor por hora en `0`:{" "}
              {instructorsMissingRate.map((inst) => `${inst.nombre} ${inst.apellidos}`).join(", ")}.
              Corrige ese valor antes de generar el gasto del mes.
            </div>
          )}

          {closureError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {closureError}
            </div>
          )}

          {closureNotice && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
              {closureNotice}
            </div>
          )}
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="animate-fade-in overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm delay-100 dark:border-gray-800 dark:bg-[#1d1d1f]">
        {loading ? (
          <div className="flex h-52 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
          </div>
        ) : instructores.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center gap-2 text-[#86868b]">
            <span className="text-4xl">📋</span>
            <p className="text-sm">No hay instructores activos para mostrar</p>
          </div>
        ) : isMobile ? (
          renderMobileHoursCards()
        ) : (
          <TableScrollArea framed={false} viewportClassName="w-full">
            <table
              className="border-collapse"
              style={{
                minWidth: `${180 + daysInMonth * DAY_COL_W + TOTAL_COL_W + (canEditValor ? VALOR_COL_W : 0)}px`,
              }}
            >
              {/* ── Encabezado ── */}
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  {/* Instructor — sticky izquierda */}
                  <th
                    scope="col"
                    className="sticky left-0 z-20 border-r-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-[10px] font-semibold tracking-wider text-[#86868b] uppercase dark:border-gray-700 dark:bg-[#141414]"
                    style={{ width: 180, minWidth: 180 }}
                  >
                    Instructor
                  </th>

                  {/* Días */}
                  {days.map((d) => {
                    const dow = getDayOfWeek(anio, mes, d);
                    const isWE = dow === 0 || dow === 6;
                    const isToday =
                      d === today.getDate() &&
                      mes === today.getMonth() &&
                      anio === today.getFullYear();
                    return (
                      <th
                        key={d}
                        scope="col"
                        style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
                        className={`border-r border-gray-100 py-1.5 text-center dark:border-gray-800 ${
                          isToday
                            ? "bg-[#0071e3]/10 dark:bg-[#0071e3]/15"
                            : isWE
                              ? "bg-gray-100 dark:bg-[#1a1a1a]"
                              : "bg-gray-50 dark:bg-[#141414]"
                        }`}
                      >
                        <div
                          className={`mb-0.5 text-xs leading-none font-bold ${isToday ? "text-[#0071e3]" : "text-[#1d1d1f] dark:text-[#f5f5f7]"}`}
                        >
                          {d}
                        </div>
                        <div
                          className={`text-[9px] font-medium ${isToday ? "text-[#0071e3]" : isWE ? "text-[#0071e3]/70" : "text-[#86868b]"}`}
                        >
                          {DIA_ABREV[dow]}
                        </div>
                      </th>
                    );
                  })}

                  {/* Total horas — sticky derecha (desplazada si hay columna valor) */}
                  <th
                    scope="col"
                    className="sticky z-20 border-l-2 border-gray-200 bg-gray-50 px-2 py-2.5 text-center text-[10px] font-semibold tracking-wider text-[#86868b] uppercase dark:border-gray-700 dark:bg-[#141414]"
                    style={{ width: TOTAL_COL_W, minWidth: TOTAL_COL_W, right: totalColRight }}
                  >
                    Total h
                  </th>

                  {/* Valor total — sticky derecha extremo (solo admins de escuela/sede) */}
                  {canEditValor && (
                    <th
                      scope="col"
                      className="sticky right-0 z-20 border-l border-gray-200 bg-gray-50 px-2 py-2.5 text-center text-[10px] font-semibold tracking-wider text-[#86868b] uppercase dark:border-gray-700 dark:bg-[#141414]"
                      style={{ width: VALOR_COL_W, minWidth: VALOR_COL_W }}
                    >
                      Valor total
                    </th>
                  )}
                </tr>
              </thead>

              {/* ── Filas de instructores ── */}
              <tbody>
                {instructores.map((inst, idx) => {
                  const totalInst = getTotalInstructor(inst.id);
                  const totalValor = getTotalValor(inst.id);
                  const cierreMes = closureByInstructor.get(inst.id);
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven
                    ? "bg-white dark:bg-[#1d1d1f]"
                    : "bg-gray-50/40 dark:bg-[#1f1f1f]";
                  const stickyRowBg = isEven
                    ? "bg-white dark:bg-[#1d1d1f]"
                    : "bg-gray-50 dark:bg-[#1f1f1f]";
                  const stickyFootBg = isEven
                    ? "bg-gray-50 dark:bg-[#141414]"
                    : "bg-gray-100 dark:bg-[#111]";

                  return (
                    <tr
                      key={inst.id}
                      className={`border-b border-gray-100 dark:border-gray-800 ${rowBg}`}
                    >
                      {/* Nombre + valor/hora — sticky izquierda */}
                      <td
                        className={`sticky left-0 z-10 border-r-2 border-gray-200 px-4 dark:border-gray-700 ${stickyRowBg}`}
                        style={{ width: 180, minWidth: 180 }}
                      >
                        <div className="flex items-start gap-2 py-2">
                          {inst.color && (
                            <span
                              className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: inst.color }}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm leading-tight font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                              {inst.nombre} {inst.apellidos}
                            </span>

                            {/* Input valor/hora — solo admins de escuela/sede */}
                            {canEditValor && (
                              <div className="mt-1.5 flex items-center gap-1">
                                <span className="shrink-0 text-[10px] text-[#86868b]">$/h</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={getValorHoraDisplay(inst.id)}
                                  onChange={(e) =>
                                    setValorHoraEdits((prev) => ({
                                      ...prev,
                                      [inst.id]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => handleValorHoraBlur(inst.id)}
                                  placeholder="0"
                                  className={`w-[72px] [appearance:textfield] rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-[#1d1d1f] focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]/50 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-[#f5f5f7] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${savingValor.has(inst.id) ? "opacity-40" : ""}`}
                                />
                              </div>
                            )}

                            {canGenerateMonthlyExpenses && monthClosed && totalInst > 0 && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                                {cierreMes ? (
                                  <>
                                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                      Gasto generado: {fmtCOP(Number(cierreMes.monto_total || 0))}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle size={11} className="text-amber-500" />
                                    <span className="font-medium text-amber-600 dark:text-amber-400">
                                      Pendiente de pasar a gasto
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Celdas de días */}
                      {days.map((d) => {
                        const key = `${inst.id}-${d}`;
                        const val = getCellValue(inst.id, d);
                        const numVal = parseFloat(val);
                        const hasVal = val !== "" && numVal > 0;
                        const isRest =
                          val === "0" ||
                          (val !== "" && numVal === 0 && horasMap[inst.id]?.[d] === 0);
                        const isSaving = savingCells.has(key);
                        const dow = getDayOfWeek(anio, mes, d);
                        const isWE = dow === 0 || dow === 6;
                        const isToday =
                          d === today.getDate() &&
                          mes === today.getMonth() &&
                          anio === today.getFullYear();

                        return (
                          <td
                            key={d}
                            style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
                            className={`border-r border-gray-100 p-0 transition-opacity dark:border-gray-800 ${isSaving ? "opacity-40" : ""} ${
                              isRest
                                ? "bg-amber-100/70 dark:bg-amber-900/20"
                                : isToday && hasVal
                                  ? "bg-[#0071e3]/12"
                                  : isToday
                                    ? "bg-[#0071e3]/6"
                                    : hasVal && isWE
                                      ? "bg-blue-50/60 dark:bg-[#0071e3]/8"
                                      : hasVal
                                        ? "bg-[#0071e3]/5 dark:bg-[#0071e3]/7"
                                        : isWE
                                          ? "bg-gray-50/60 dark:bg-[#1a1a1a]/60"
                                          : ""
                            }`}
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={2}
                              value={val}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^0-9]/g, "");
                                handleChange(inst.id, d, v);
                              }}
                              onBlur={() => handleBlur(inst.id, d)}
                              onFocus={(e) => e.target.select()}
                              readOnly={isReadOnly}
                              placeholder="·"
                              aria-label={`${inst.nombre} día ${d}`}
                              className={`h-9 w-full border-0 bg-transparent text-center text-sm outline-none placeholder:text-gray-300 dark:placeholder:text-gray-700 ${
                                isRest
                                  ? "font-semibold text-amber-600 dark:text-amber-400"
                                  : hasVal
                                    ? "font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                                    : "text-[#86868b]"
                              } ${
                                isReadOnly
                                  ? "cursor-default"
                                  : "cursor-text focus:bg-[#0071e3]/10 dark:focus:bg-[#0071e3]/20"
                              } `}
                            />
                          </td>
                        );
                      })}

                      {/* Total horas — sticky */}
                      <td
                        className={`sticky z-10 border-l-2 border-gray-200 px-2 py-0 text-center dark:border-gray-700 ${stickyFootBg}`}
                        style={{ width: TOTAL_COL_W, minWidth: TOTAL_COL_W, right: totalColRight }}
                      >
                        <span
                          className={`text-sm font-bold tabular-nums ${totalInst > 0 ? "text-[#0071e3]" : "text-gray-300 dark:text-gray-600"}`}
                        >
                          {totalInst > 0 ? `${totalInst}h` : "—"}
                        </span>
                      </td>

                      {/* Valor total — sticky right-0 (solo admins de escuela/sede) */}
                      {canEditValor && (
                        <td
                          className={`sticky right-0 z-10 border-l border-gray-200 px-2 py-0 text-center dark:border-gray-700 ${stickyFootBg}`}
                          style={{ width: VALOR_COL_W, minWidth: VALOR_COL_W }}
                        >
                          <span
                            className={`text-sm font-bold tabular-nums ${totalValor > 0 ? "text-green-600 dark:text-green-400" : "text-gray-300 dark:text-gray-600"}`}
                          >
                            {totalValor > 0 ? fmtCOP(totalValor) : "—"}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* ── Fila totales por día ── */}
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                  <td
                    className="sticky left-0 z-10 border-r-2 border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-[#141414]"
                    style={{ width: 180, minWidth: 180 }}
                  >
                    <span className="text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">
                      Total día
                    </span>
                  </td>

                  {days.map((d) => {
                    const total = getTotalDay(d);
                    const isWE = [0, 6].includes(getDayOfWeek(anio, mes, d));
                    return (
                      <td
                        key={d}
                        style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
                        className={`border-r border-gray-100 py-2 text-center dark:border-gray-800 ${
                          isWE ? "bg-gray-100/70 dark:bg-[#1a1a1a]" : "bg-gray-50 dark:bg-[#141414]"
                        }`}
                      >
                        <span
                          className={`text-xs font-bold tabular-nums ${total > 0 ? "text-[#1d1d1f] dark:text-[#f5f5f7]" : "text-gray-300 dark:text-gray-700"}`}
                        >
                          {total > 0 ? total : ""}
                        </span>
                      </td>
                    );
                  })}

                  {/* Gran total horas */}
                  <td
                    className="sticky z-10 border-l-2 border-gray-200 bg-gray-50 px-2 py-2 text-center dark:border-gray-700 dark:bg-[#141414]"
                    style={{ width: TOTAL_COL_W, minWidth: TOTAL_COL_W, right: totalColRight }}
                  >
                    <span className="text-sm font-bold text-[#0071e3] tabular-nums">
                      {grandTotal > 0 ? `${grandTotal}h` : "—"}
                    </span>
                  </td>

                  {/* Gran total valor (solo admins de escuela/sede) */}
                  {canEditValor && (
                    <td
                      className="sticky right-0 z-10 border-l border-gray-200 bg-gray-50 px-2 py-2 text-center dark:border-gray-700 dark:bg-[#141414]"
                      style={{ width: VALOR_COL_W, minWidth: VALOR_COL_W }}
                    >
                      <span
                        className={`text-sm font-bold tabular-nums ${grandTotalValor > 0 ? "text-green-600 dark:text-green-400" : "text-gray-300 dark:text-gray-700"}`}
                      >
                        {grandTotalValor > 0 ? fmtCOP(grandTotalValor) : "—"}
                      </span>
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </TableScrollArea>
        )}
      </div>

      {/* Leyenda */}
      {!loading && instructores.length > 0 && (
        <div
          className={`animate-fade-in mt-4 flex flex-wrap gap-4 text-xs text-[#86868b] ${
            isMobile ? "items-start" : "items-center"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-[#0071e3]/20 bg-[#0071e3]/10" />
            Día con horas
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-amber-200 bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30" />
            Descanso (0)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-[#1a1a1a]" />
            Fin de semana
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-[#0071e3]/30 bg-[#0071e3]/10" />
            Hoy
          </div>
          {canEditValor && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-green-200 bg-green-100 dark:border-green-800 dark:bg-green-900/30" />
              Valor = horas × $/h
            </div>
          )}
          {!isReadOnly && (
            <span className={`${isMobile ? "w-full italic" : "ml-auto italic"}`}>
              Los cambios se guardan automáticamente al salir de cada celda
            </span>
          )}
        </div>
      )}
    </div>
  );
}
