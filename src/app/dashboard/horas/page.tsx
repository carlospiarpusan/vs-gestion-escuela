"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Instructor } from "@/types/database";

// ─── Constantes ────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIA_ABREV = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

// ─── Tipos ─────────────────────────────────────────────────────

type HorasMap = Record<string, Record<number, number>>;
type InputOverrides = Record<string, string>;

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
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

// ─── Componente principal ──────────────────────────────────────

export default function HorasPage() {
  const { perfil } = useAuth();
  const today = new Date();

  const [mes, setMes] = useState(today.getMonth());
  const [anio, setAnio] = useState(today.getFullYear());
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [horasMap, setHorasMap] = useState<HorasMap>({});
  const [inputOverrides, setInputOverrides] = useState<InputOverrides>({});
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Valor hora por instructor
  const [valorHoras, setValorHoras] = useState<Record<string, number>>({});
  const [valorHoraEdits, setValorHoraEdits] = useState<Record<string, string>>({});
  const [savingValor, setSavingValor] = useState<Set<string>>(new Set());

  const daysInMonth = getDaysInMonth(anio, mes);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isReadOnly = perfil?.rol === "instructor" || perfil?.rol === "alumno";
  const isAdmin = !["instructor", "alumno"].includes(perfil?.rol ?? "");

  // Anchos fijos de columnas sticky derecha
  const VALOR_COL_W = 110; // px — columna valor total (solo admins)
  const TOTAL_COL_W = 64;  // px — columna total horas
  const DAY_COL_W   = 36;  // px — columna de cada día

  // ── Carga de datos ────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!perfil?.escuela_id) return;
    setLoading(true);
    const supabase = createClient();

    const firstDay = padMonth(anio, mes, 1);
    const lastDay = padMonth(anio, mes, daysInMonth);

    const [instRes, horasRes] = await Promise.all([
      supabase
        .from("instructores")
        .select("id, nombre, apellidos, color, sede_id, valor_hora")
        .eq("escuela_id", perfil.escuela_id)
        .eq("estado", "activo")
        .order("nombre"),
      supabase
        .from("horas_trabajo")
        .select("instructor_id, fecha, horas")
        .eq("escuela_id", perfil.escuela_id)
        .gte("fecha", firstDay)
        .lte("fecha", lastDay),
    ]);

    const map: HorasMap = {};
    const vh: Record<string, number> = {};

    (instRes.data || []).forEach((i: { id: string; valor_hora?: number }) => {
      map[i.id] = {};
      vh[i.id] = Number(i.valor_hora) || 0;
    });

    (horasRes.data || []).forEach((h: { instructor_id: string; fecha: string; horas: number }) => {
      const day = parseInt(h.fecha.split("-")[2], 10);
      if (!map[h.instructor_id]) map[h.instructor_id] = {};
      map[h.instructor_id][day] = Number(h.horas);
    });

    setInstructores((instRes.data as unknown as Instructor[]) || []);
    setHorasMap(map);
    setValorHoras(vh);
    setInputOverrides({});
    setValorHoraEdits({});
    setLoading(false);
  }, [perfil?.escuela_id, mes, anio, daysInMonth]);

  useEffect(() => {
    if (perfil) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, mes, anio]);

  // ── Celdas de horas ──────────────────────────────────────────

  const getCellValue = (instructorId: string, day: number): string => {
    const key = `${instructorId}-${day}`;
    if (key in inputOverrides) return inputOverrides[key];
    const h = horasMap[instructorId]?.[day];
    return h ? String(h) : "";
  };

  const handleChange = (instructorId: string, day: number, value: string) => {
    setInputOverrides(prev => ({ ...prev, [`${instructorId}-${day}`]: value }));
  };

  const handleBlur = async (instructorId: string, day: number) => {
    if (!perfil?.escuela_id) return;
    const key = `${instructorId}-${day}`;
    const raw = inputOverrides[key] ?? String(horasMap[instructorId]?.[day] ?? "");
    const parsed = parseInt(raw, 10);
    const hours = isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 24);

    setHorasMap(prev => ({
      ...prev,
      [instructorId]: { ...prev[instructorId], [day]: hours },
    }));
    setInputOverrides(prev => { const n = { ...prev }; delete n[key]; return n; });

    const instructor = instructores.find(i => i.id === instructorId);
    if (!instructor) return;

    const fecha = padMonth(anio, mes, day);
    const supabase = createClient();
    setSavingCells(prev => new Set(prev).add(key));

    if (hours === 0) {
      await supabase.from("horas_trabajo").delete()
        .eq("instructor_id", instructorId).eq("fecha", fecha);
    } else {
      await supabase.from("horas_trabajo").upsert(
        { escuela_id: perfil.escuela_id, sede_id: instructor.sede_id, instructor_id: instructorId, fecha, horas: hours },
        { onConflict: "instructor_id,fecha" }
      );
    }

    setSavingCells(prev => { const n = new Set(prev); n.delete(key); return n; });
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

    setValorHoras(prev => ({ ...prev, [instructorId]: valor }));
    setValorHoraEdits(prev => { const n = { ...prev }; delete n[instructorId]; return n; });

    setSavingValor(prev => new Set(prev).add(instructorId));
    const supabase = createClient();
    await supabase.from("instructores").update({ valor_hora: valor }).eq("id", instructorId);
    setSavingValor(prev => { const n = new Set(prev); n.delete(instructorId); return n; });
  };

  // ── Totales ───────────────────────────────────────────────────

  const getTotalInstructor = (id: string) =>
    Object.values(horasMap[id] || {}).reduce((s, h) => s + (h || 0), 0);

  const getTotalDay = (day: number) =>
    instructores.reduce((s, i) => s + ((horasMap[i.id] || {})[day] || 0), 0);

  const getTotalValor = (id: string) =>
    getTotalInstructor(id) * (valorHoras[id] || 0);

  const grandTotal = instructores.reduce((s, i) => s + getTotalInstructor(i.id), 0);
  const grandTotalValor = instructores.reduce((s, i) => s + getTotalValor(i.id), 0);

  // ── Navegación de mes ─────────────────────────────────────────

  const prevMonth = () => {
    if (mes === 0) { setAnio(a => a - 1); setMes(11); }
    else setMes(m => m - 1);
  };
  const nextMonth = () => {
    if (mes === 11) { setAnio(a => a + 1); setMes(0); }
    else setMes(m => m + 1);
  };

  const anios = Array.from({ length: 6 }, (_, i) => today.getFullYear() - 2 + i);

  const selectCls =
    "px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] cursor-pointer";
  const navBtnCls =
    "p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[#1d1d1f] dark:text-[#f5f5f7]";

  // right offset para la columna de total horas (deja espacio para la columna valor)
  const totalColRight = isAdmin ? VALOR_COL_W : 0;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Horas de Instructores
          </h2>
          <p className="text-[#86868b] mt-1 text-sm">
            Control mensual de horas trabajadas por instructor
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevMonth} className={navBtnCls} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className={selectCls}>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))} className={selectCls}>
            {anios.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={nextMonth} className={navBtnCls} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 animate-fade-in delay-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-52">
            <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : instructores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 gap-2 text-[#86868b]">
            <span className="text-4xl">📋</span>
            <p className="text-sm">No hay instructores activos para mostrar</p>
          </div>
        ) : (
          /* overflow-x-auto con w-full: la tabla scrollea dentro del card */
          <div className="overflow-x-auto w-full">
            <table
              className="border-collapse"
              style={{ minWidth: `${180 + daysInMonth * DAY_COL_W + TOTAL_COL_W + (isAdmin ? VALOR_COL_W : 0)}px` }}
            >
              {/* ── Encabezado ── */}
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">

                  {/* Instructor — sticky izquierda */}
                  <th
                    scope="col"
                    className="sticky left-0 z-20 bg-gray-50 dark:bg-[#141414] px-4 py-2.5 text-left text-[10px] font-semibold text-[#86868b] uppercase tracking-wider border-r-2 border-gray-200 dark:border-gray-700"
                    style={{ width: 180, minWidth: 180 }}
                  >
                    Instructor
                  </th>

                  {/* Días */}
                  {days.map(d => {
                    const dow = getDayOfWeek(anio, mes, d);
                    const isWE = dow === 0 || dow === 6;
                    const isToday = d === today.getDate() && mes === today.getMonth() && anio === today.getFullYear();
                    return (
                      <th
                        key={d}
                        scope="col"
                        style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
                        className={`py-1.5 text-center border-r border-gray-100 dark:border-gray-800 ${
                          isToday ? "bg-[#0071e3]/10 dark:bg-[#0071e3]/15"
                          : isWE  ? "bg-gray-100 dark:bg-[#1a1a1a]"
                          : "bg-gray-50 dark:bg-[#141414]"
                        }`}
                      >
                        <div className={`text-xs font-bold leading-none mb-0.5 ${isToday ? "text-[#0071e3]" : "text-[#1d1d1f] dark:text-[#f5f5f7]"}`}>
                          {d}
                        </div>
                        <div className={`text-[9px] font-medium ${isToday ? "text-[#0071e3]" : isWE ? "text-[#0071e3]/70" : "text-[#86868b]"}`}>
                          {DIA_ABREV[dow]}
                        </div>
                      </th>
                    );
                  })}

                  {/* Total horas — sticky derecha (desplazada si hay columna valor) */}
                  <th
                    scope="col"
                    className="sticky z-20 bg-gray-50 dark:bg-[#141414] px-2 py-2.5 text-center text-[10px] font-semibold text-[#86868b] uppercase tracking-wider border-l-2 border-gray-200 dark:border-gray-700"
                    style={{ width: TOTAL_COL_W, minWidth: TOTAL_COL_W, right: totalColRight }}
                  >
                    Total h
                  </th>

                  {/* Valor total — sticky derecha extremo (solo admins) */}
                  {isAdmin && (
                    <th
                      scope="col"
                      className="sticky right-0 z-20 bg-gray-50 dark:bg-[#141414] px-2 py-2.5 text-center text-[10px] font-semibold text-[#86868b] uppercase tracking-wider border-l border-gray-200 dark:border-gray-700"
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
                  const totalInst  = getTotalInstructor(inst.id);
                  const totalValor = getTotalValor(inst.id);
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? "bg-white dark:bg-[#1d1d1f]" : "bg-gray-50/40 dark:bg-[#1f1f1f]";
                  const footBg = isEven ? "bg-gray-50 dark:bg-[#141414]" : "bg-gray-100/70 dark:bg-[#111]";

                  return (
                    <tr key={inst.id} className={`border-b border-gray-100 dark:border-gray-800 ${rowBg}`}>

                      {/* Nombre + valor/hora — sticky izquierda */}
                      <td
                        className={`sticky left-0 z-10 px-4 border-r-2 border-gray-200 dark:border-gray-700 ${rowBg}`}
                        style={{ width: 180, minWidth: 180 }}
                      >
                        <div className="flex items-start gap-2 py-2">
                          {inst.color && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                              style={{ backgroundColor: inst.color }}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate block leading-tight">
                              {inst.nombre} {inst.apellidos}
                            </span>

                            {/* Input valor/hora — solo admins */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <span className="text-[10px] text-[#86868b] shrink-0">$/h</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={getValorHoraDisplay(inst.id)}
                                  onChange={e => setValorHoraEdits(prev => ({ ...prev, [inst.id]: e.target.value }))}
                                  onBlur={() => handleValorHoraBlur(inst.id)}
                                  placeholder="0"
                                  className={`w-[72px] text-xs px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-1 focus:ring-[#0071e3]/50 focus:border-[#0071e3] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${savingValor.has(inst.id) ? "opacity-40" : ""}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Celdas de días */}
                      {days.map(d => {
                        const key    = `${inst.id}-${d}`;
                        const val    = getCellValue(inst.id, d);
                        const hasVal = val !== "" && parseFloat(val) > 0;
                        const isSaving = savingCells.has(key);
                        const dow  = getDayOfWeek(anio, mes, d);
                        const isWE = dow === 0 || dow === 6;
                        const isToday = d === today.getDate() && mes === today.getMonth() && anio === today.getFullYear();

                        return (
                          <td
                            key={d}
                            style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
                            className={`p-0 border-r border-gray-100 dark:border-gray-800 transition-opacity ${isSaving ? "opacity-40" : ""} ${
                              isToday && hasVal ? "bg-[#0071e3]/12"
                              : isToday         ? "bg-[#0071e3]/6"
                              : hasVal && isWE  ? "bg-blue-50/60 dark:bg-[#0071e3]/8"
                              : hasVal          ? "bg-[#0071e3]/5 dark:bg-[#0071e3]/7"
                              : isWE            ? "bg-gray-50/60 dark:bg-[#1a1a1a]/60"
                              : ""
                            }`}
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={2}
                              value={val}
                              onChange={e => {
                                const v = e.target.value.replace(/[^0-9]/g, "");
                                handleChange(inst.id, d, v);
                              }}
                              onBlur={() => handleBlur(inst.id, d)}
                              onFocus={e => e.target.select()}
                              readOnly={isReadOnly}
                              placeholder="·"
                              aria-label={`${inst.nombre} día ${d}`}
                              className={`
                                w-full h-9 text-center text-sm bg-transparent
                                border-0 outline-none
                                placeholder:text-gray-300 dark:placeholder:text-gray-700
                                ${hasVal ? "font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]" : "text-[#86868b]"}
                                ${isReadOnly
                                  ? "cursor-default"
                                  : "focus:bg-[#0071e3]/10 dark:focus:bg-[#0071e3]/20 cursor-text"}
                              `}
                            />
                          </td>
                        );
                      })}

                      {/* Total horas — sticky */}
                      <td
                        className={`sticky z-10 px-2 py-0 text-center border-l-2 border-gray-200 dark:border-gray-700 ${footBg}`}
                        style={{ width: TOTAL_COL_W, minWidth: TOTAL_COL_W, right: totalColRight }}
                      >
                        <span className={`text-sm font-bold tabular-nums ${totalInst > 0 ? "text-[#0071e3]" : "text-gray-300 dark:text-gray-600"}`}>
                          {totalInst > 0 ? `${totalInst}h` : "—"}
                        </span>
                      </td>

                      {/* Valor total — sticky right-0 (solo admins) */}
                      {isAdmin && (
                        <td
                          className={`sticky right-0 z-10 px-2 py-0 text-center border-l border-gray-200 dark:border-gray-700 ${footBg}`}
                          style={{ width: VALOR_COL_W, minWidth: VALOR_COL_W }}
                        >
                          <span className={`text-sm font-bold tabular-nums ${totalValor > 0 ? "text-green-600 dark:text-green-400" : "text-gray-300 dark:text-gray-600"}`}>
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
                    className="sticky left-0 z-10 bg-gray-50 dark:bg-[#141414] px-4 py-2 border-r-2 border-gray-200 dark:border-gray-700"
                    style={{ width: 180, minWidth: 180 }}
                  >
                    <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">
                      Total día
                    </span>
                  </td>

                  {days.map(d => {
                    const total = getTotalDay(d);
                    const isWE  = [0, 6].includes(getDayOfWeek(anio, mes, d));
                    return (
                      <td
                        key={d}
                        style={{ width: DAY_COL_W, minWidth: DAY_COL_W }}
                        className={`py-2 text-center border-r border-gray-100 dark:border-gray-800 ${
                          isWE ? "bg-gray-100/70 dark:bg-[#1a1a1a]" : "bg-gray-50 dark:bg-[#141414]"
                        }`}
                      >
                        <span className={`text-xs font-bold tabular-nums ${total > 0 ? "text-[#1d1d1f] dark:text-[#f5f5f7]" : "text-gray-300 dark:text-gray-700"}`}>
                          {total > 0 ? total : ""}
                        </span>
                      </td>
                    );
                  })}

                  {/* Gran total horas */}
                  <td
                    className="sticky z-10 bg-gray-50 dark:bg-[#141414] px-2 py-2 text-center border-l-2 border-gray-200 dark:border-gray-700"
                    style={{ width: TOTAL_COL_W, minWidth: TOTAL_COL_W, right: totalColRight }}
                  >
                    <span className="text-sm font-bold text-[#0071e3] tabular-nums">
                      {grandTotal > 0 ? `${grandTotal}h` : "—"}
                    </span>
                  </td>

                  {/* Gran total valor (solo admins) */}
                  {isAdmin && (
                    <td
                      className="sticky right-0 z-10 bg-gray-50 dark:bg-[#141414] px-2 py-2 text-center border-l border-gray-200 dark:border-gray-700"
                      style={{ width: VALOR_COL_W, minWidth: VALOR_COL_W }}
                    >
                      <span className={`text-sm font-bold tabular-nums ${grandTotalValor > 0 ? "text-green-600 dark:text-green-400" : "text-gray-300 dark:text-gray-700"}`}>
                        {grandTotalValor > 0 ? fmtCOP(grandTotalValor) : "—"}
                      </span>
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Leyenda */}
      {!loading && instructores.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-[#86868b] animate-fade-in">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#0071e3]/10 border border-[#0071e3]/20" />
            Día con horas
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700" />
            Fin de semana
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#0071e3]/10 border border-[#0071e3]/30" />
            Hoy
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800" />
              Valor = horas × $/h
            </div>
          )}
          {!isReadOnly && (
            <span className="ml-auto italic">
              Los cambios se guardan automáticamente al salir de cada celda
            </span>
          )}
        </div>
      )}
    </div>
  );
}
