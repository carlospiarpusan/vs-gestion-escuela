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

// Abreviaturas en español (getDay(): 0=Dom, 1=Lun, ..., 6=Sáb)
const DIA_ABREV = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

// ─── Tipos ─────────────────────────────────────────────────────

/** instructorId → día del mes (1-31) → horas */
type HorasMap = Record<string, Record<number, number>>;

/** Celdas con un string de edición activo */
type InputOverrides = Record<string, string>; // key: "instructorId-day"

// ─── Helpers ───────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month, day).getDay(); // 0=Dom, 6=Sáb
}

function padMonth(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Componente principal ──────────────────────────────────────

export default function HorasPage() {
  const { perfil } = useAuth();
  const today = new Date();

  const [mes, setMes] = useState(today.getMonth());
  const [anio, setAnio] = useState(today.getFullYear());
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [horasMap, setHorasMap] = useState<HorasMap>({});
  // Valores de edición activos (solo mientras el usuario escribe)
  const [inputOverrides, setInputOverrides] = useState<InputOverrides>({});
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const daysInMonth = getDaysInMonth(anio, mes);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isReadOnly = perfil?.rol === "instructor" || perfil?.rol === "alumno";

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
        .select("id, nombre, apellidos, color, sede_id")
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

    // Construir el mapa instructorId → { día: horas }
    const map: HorasMap = {};
    (instRes.data || []).forEach((i: { id: string }) => { map[i.id] = {}; });
    (horasRes.data || []).forEach((h: { instructor_id: string; fecha: string; horas: number }) => {
      const day = parseInt(h.fecha.split("-")[2], 10);
      if (!map[h.instructor_id]) map[h.instructor_id] = {};
      map[h.instructor_id][day] = Number(h.horas);
    });

    setInstructores((instRes.data as Instructor[]) || []);
    setHorasMap(map);
    setInputOverrides({});
    setLoading(false);
  }, [perfil?.escuela_id, mes, anio, daysInMonth]);

  useEffect(() => {
    if (perfil) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, mes, anio]);

  // ── Manejo de celdas ──────────────────────────────────────────

  /** Devuelve el valor a mostrar en una celda (override mientras edita, o el del mapa) */
  const getCellValue = (instructorId: string, day: number): string => {
    const key = `${instructorId}-${day}`;
    if (key in inputOverrides) return inputOverrides[key];
    const h = horasMap[instructorId]?.[day];
    return h ? String(h) : "";
  };

  const handleChange = (instructorId: string, day: number, value: string) => {
    const key = `${instructorId}-${day}`;
    setInputOverrides(prev => ({ ...prev, [key]: value }));
  };

  const handleBlur = async (instructorId: string, day: number) => {
    if (!perfil?.escuela_id) return;
    const key = `${instructorId}-${day}`;
    const raw = inputOverrides[key] ?? String(horasMap[instructorId]?.[day] ?? "");
    const parsed = parseFloat(raw);
    const hours = isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 24);

    // 1. Actualizar el mapa local
    setHorasMap(prev => ({
      ...prev,
      [instructorId]: { ...prev[instructorId], [day]: hours },
    }));

    // 2. Limpiar el override de edición
    setInputOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    // 3. Persistir en Supabase
    const instructor = instructores.find(i => i.id === instructorId);
    if (!instructor) return;

    const fecha = padMonth(anio, mes, day);
    const supabase = createClient();

    setSavingCells(prev => new Set(prev).add(key));

    if (hours === 0) {
      await supabase
        .from("horas_trabajo")
        .delete()
        .eq("instructor_id", instructorId)
        .eq("fecha", fecha);
    } else {
      await supabase.from("horas_trabajo").upsert(
        {
          escuela_id: perfil.escuela_id,
          sede_id: instructor.sede_id,
          instructor_id: instructorId,
          fecha,
          horas: hours,
        },
        { onConflict: "instructor_id,fecha" }
      );
    }

    setSavingCells(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  // ── Totales ────────────────────────────────────────────────────

  const getTotalInstructor = (instructorId: string) =>
    Object.values(horasMap[instructorId] || {}).reduce((s, h) => s + (h || 0), 0);

  const getTotalDay = (day: number) =>
    instructores.reduce((s, i) => s + ((horasMap[i.id] || {})[day] || 0), 0);

  const grandTotal = instructores.reduce((s, i) => s + getTotalInstructor(i.id), 0);

  // ── Navegación de mes ──────────────────────────────────────────

  const prevMonth = () => {
    if (mes === 0) { setAnio(a => a - 1); setMes(11); }
    else setMes(m => m - 1);
  };
  const nextMonth = () => {
    if (mes === 11) { setAnio(a => a + 1); setMes(0); }
    else setMes(m => m + 1);
  };

  // ── Años disponibles ───────────────────────────────────────────
  const anios = Array.from({ length: 6 }, (_, i) => today.getFullYear() - 2 + i);

  // ── Clases reutilizables ───────────────────────────────────────
  const selectCls =
    "px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] cursor-pointer";
  const navBtnCls =
    "p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[#1d1d1f] dark:text-[#f5f5f7]";

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

        {/* Selector de mes / año */}
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
          <div className="overflow-x-auto">
            <table
              className="border-collapse w-full"
              style={{ minWidth: `${180 + daysInMonth * 46 + 72}px` }}
            >
              {/* ── Encabezado ── */}
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  {/* Columna instructor */}
                  <th
                    scope="col"
                    className="sticky left-0 z-20 bg-gray-50 dark:bg-[#141414] px-4 py-2.5 text-left text-[10px] font-semibold text-[#86868b] uppercase tracking-wider w-[180px] min-w-[180px] border-r border-gray-200 dark:border-gray-700"
                  >
                    Instructor
                  </th>

                  {/* Columnas de días */}
                  {days.map(d => {
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
                        className={`w-[46px] min-w-[46px] py-1.5 text-center border-r border-gray-100 dark:border-gray-800 ${
                          isToday
                            ? "bg-[#0071e3]/10 dark:bg-[#0071e3]/15"
                            : isWE
                            ? "bg-gray-100 dark:bg-[#1a1a1a]"
                            : "bg-gray-50 dark:bg-[#141414]"
                        }`}
                      >
                        <div
                          className={`text-xs font-bold leading-none mb-0.5 ${
                            isToday ? "text-[#0071e3]" : "text-[#1d1d1f] dark:text-[#f5f5f7]"
                          }`}
                        >
                          {d}
                        </div>
                        <div
                          className={`text-[9px] font-medium ${
                            isToday
                              ? "text-[#0071e3]"
                              : isWE
                              ? "text-[#0071e3]/70"
                              : "text-[#86868b]"
                          }`}
                        >
                          {DIA_ABREV[dow]}
                        </div>
                      </th>
                    );
                  })}

                  {/* Columna total */}
                  <th
                    scope="col"
                    className="sticky right-0 z-20 bg-gray-50 dark:bg-[#141414] w-[72px] min-w-[72px] px-2 py-2.5 text-center text-[10px] font-semibold text-[#86868b] uppercase tracking-wider border-l-2 border-gray-200 dark:border-gray-700"
                  >
                    Total
                  </th>
                </tr>
              </thead>

              {/* ── Filas de instructores ── */}
              <tbody>
                {instructores.map((inst, idx) => {
                  const totalInst = getTotalInstructor(inst.id);
                  const isEven = idx % 2 === 0;

                  return (
                    <tr
                      key={inst.id}
                      className={`border-b border-gray-100 dark:border-gray-800 group ${
                        isEven ? "" : "bg-gray-50/40 dark:bg-white/[0.015]"
                      }`}
                    >
                      {/* Nombre del instructor (sticky) */}
                      <td
                        className={`sticky left-0 z-10 px-4 py-0 border-r border-gray-200 dark:border-gray-700 w-[180px] min-w-[180px] ${
                          isEven
                            ? "bg-white dark:bg-[#1d1d1f]"
                            : "bg-gray-50/40 dark:bg-[#1f1f1f]"
                        }`}
                      >
                        <div className="flex items-center gap-2 h-10">
                          {inst.color && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: inst.color }}
                            />
                          )}
                          <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                            {inst.nombre} {inst.apellidos}
                          </span>
                        </div>
                      </td>

                      {/* Celdas de días */}
                      {days.map(d => {
                        const key = `${inst.id}-${d}`;
                        const val = getCellValue(inst.id, d);
                        const hasVal = val !== "" && parseFloat(val) > 0;
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
                            className={`w-[46px] min-w-[46px] p-0 border-r border-gray-100 dark:border-gray-800 transition-opacity ${
                              isSaving ? "opacity-40" : ""
                            } ${
                              isToday && hasVal
                                ? "bg-[#0071e3]/12"
                                : isToday
                                ? "bg-[#0071e3]/6"
                                : hasVal
                                ? isWE
                                  ? "bg-blue-50/60 dark:bg-[#0071e3]/8"
                                  : "bg-[#0071e3]/5 dark:bg-[#0071e3]/7"
                                : isWE
                                ? "bg-gray-50/60 dark:bg-[#1a1a1a]/60"
                                : ""
                            }`}
                          >
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max="24"
                              step="0.5"
                              value={val}
                              onChange={e => handleChange(inst.id, d, e.target.value)}
                              onBlur={() => handleBlur(inst.id, d)}
                              readOnly={isReadOnly}
                              placeholder="·"
                              aria-label={`${inst.nombre} día ${d}`}
                              className={`
                                w-full h-10 text-center text-sm bg-transparent
                                border-0 outline-none select-all
                                [appearance:textfield]
                                [&::-webkit-outer-spin-button]:appearance-none
                                [&::-webkit-inner-spin-button]:appearance-none
                                placeholder:text-gray-300 dark:placeholder:text-gray-700
                                ${hasVal
                                  ? "font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                                  : "text-[#86868b]"}
                                ${isReadOnly
                                  ? "cursor-default"
                                  : "focus:bg-[#0071e3]/10 dark:focus:bg-[#0071e3]/20 cursor-text hover:bg-gray-50 dark:hover:bg-white/5"}
                              `}
                            />
                          </td>
                        );
                      })}

                      {/* Total del instructor (sticky derecha) */}
                      <td
                        className={`sticky right-0 z-10 w-[72px] min-w-[72px] px-2 py-0 text-center border-l-2 border-gray-200 dark:border-gray-700 ${
                          isEven
                            ? "bg-gray-50 dark:bg-[#141414]"
                            : "bg-gray-100/70 dark:bg-[#111]"
                        }`}
                      >
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            totalInst > 0
                              ? "text-[#0071e3]"
                              : "text-gray-300 dark:text-gray-600"
                          }`}
                        >
                          {totalInst > 0 ? `${totalInst}h` : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ── Fila totales por día ── */}
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                  <td className="sticky left-0 z-10 bg-gray-50 dark:bg-[#141414] px-4 py-2 border-r border-gray-200 dark:border-gray-700 w-[180px] min-w-[180px]">
                    <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">
                      Total día
                    </span>
                  </td>
                  {days.map(d => {
                    const total = getTotalDay(d);
                    const isWE = getDayOfWeek(anio, mes, d) === 0 || getDayOfWeek(anio, mes, d) === 6;
                    return (
                      <td
                        key={d}
                        className={`w-[46px] min-w-[46px] py-2 text-center border-r border-gray-100 dark:border-gray-800 ${
                          isWE ? "bg-gray-100/70 dark:bg-[#1a1a1a]" : "bg-gray-50 dark:bg-[#141414]"
                        }`}
                      >
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            total > 0
                              ? "text-[#1d1d1f] dark:text-[#f5f5f7]"
                              : "text-gray-300 dark:text-gray-700"
                          }`}
                        >
                          {total > 0 ? total : ""}
                        </span>
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-gray-50 dark:bg-[#141414] w-[72px] min-w-[72px] px-2 py-2 text-center border-l-2 border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-bold text-[#0071e3] tabular-nums">
                      {grandTotal > 0 ? `${grandTotal}h` : "—"}
                    </span>
                  </td>
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
