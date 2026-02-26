"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Examen, Alumno, Evaluacion, Pregunta } from "@/types/database";
import {
  ClipboardCheck, CheckCircle, XCircle, Clock, TrendingUp,
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, BarChart2, BookOpen,
} from "lucide-react";

// ─── Tipos locales ───────────────────────────────────────────────────────────
type ExamenConAlumno = Examen & { alumno_nombre: string };
type PreguntaConEvaluacion = Pregunta & { evaluacion_id: string };

// ─── Valores vacíos ───────────────────────────────────────────────────────────
const emptyEval = { titulo: "", descripcion: "", categoria: "", activa: true };
const emptyPregunta = { texto: "", opciones: ["", "", "", ""], respuesta_correcta: 0 };

const LETRAS = ["A", "B", "C", "D"];

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";
const labelCls = "block text-xs text-[#86868b] mb-1";

// ─── Componente principal ────────────────────────────────────────────────────
export default function ExamenesPage() {
  const { perfil } = useAuth();
  const isSuperAdmin = perfil?.rol === "super_admin";
  const [tab, setTab] = useState<"analiticas" | "evaluaciones">("analiticas");

  return (
    <div className="space-y-5">
      {/* Cabecera + tabs */}
      <div>
        <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Exámenes</h2>
        {isSuperAdmin && (
          <div className="flex gap-1 mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
            {(["analiticas", "evaluaciones"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  tab === t
                    ? "bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-sm"
                    : "text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
                }`}
              >
                {t === "analiticas" ? <BarChart2 size={14} /> : <BookOpen size={14} />}
                {t === "analiticas" ? "Analíticas" : "Evaluaciones"}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "analiticas" ? (
        <AnaliticsView perfil={perfil} />
      ) : (
        <EvaluacionesView />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALÍTICAS
// ═══════════════════════════════════════════════════════════════════════════════
function AnaliticsView({ perfil }: { perfil: { id: string } | null }) {
  const [examenes, setExamenes] = useState<ExamenConAlumno[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [exRes, alRes] = await Promise.all([
      supabase.from("examenes").select("*").order("fecha", { ascending: false }),
      supabase.from("alumnos").select("id, nombre, apellidos"),
    ]);
    const map = new Map(
      ((alRes.data || []) as Pick<Alumno, "id" | "nombre" | "apellidos">[]).map((a) => [
        a.id, `${a.nombre} ${a.apellidos}`,
      ])
    );
    setExamenes(
      ((exRes.data as Examen[]) || []).map((e) => ({
        ...e, alumno_nombre: map.get(e.alumno_id) || "—",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { if (perfil) fetchData(); }, [perfil?.id]); // eslint-disable-line

  const total = examenes.length;
  const aprobados = examenes.filter((e) => e.resultado === "aprobado").length;
  const suspendidos = examenes.filter((e) => e.resultado === "suspendido").length;
  const pendientes = examenes.filter((e) => e.resultado === "pendiente").length;
  const tasaAprobacion = total > 0 ? Math.round((aprobados / total) * 100) : 0;
  const teoricos = examenes.filter((e) => e.tipo === "teorico");
  const practicos = examenes.filter((e) => e.tipo === "practico");

  const resumenMap = new Map<string, { nombre: string; apr: number; sus: number; tot: number }>();
  examenes.forEach((e) => {
    const r = resumenMap.get(e.alumno_id) || { nombre: e.alumno_nombre, apr: 0, sus: 0, tot: 0 };
    r.tot++;
    if (e.resultado === "aprobado") r.apr++;
    if (e.resultado === "suspendido") r.sus++;
    resumenMap.set(e.alumno_id, r);
  });
  const resumen = Array.from(resumenMap.values()).sort((a, b) => b.tot - a.tot);

  const resultadoColor: Record<string, string> = {
    aprobado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    suspendido: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total exámenes", value: total, icon: <ClipboardCheck size={18} />, color: "text-[#0071e3] bg-[#0071e3]/10" },
          { label: "Aprobados", value: aprobados, icon: <CheckCircle size={18} />, color: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400" },
          { label: "Suspendidos", value: suspendidos, icon: <XCircle size={18} />, color: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400" },
          { label: "Pendientes", value: pendientes, icon: <Clock size={18} />, color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{s.value}</p>
            <p className="text-xs text-[#86868b] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tasa + Por tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#0071e3]" />
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Tasa de aprobación</p>
          </div>
          <p className="text-4xl font-bold text-[#0071e3] mb-3">{tasaAprobacion}%</p>
          <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div className="h-full rounded-full bg-[#0071e3] transition-all" style={{ width: `${tasaAprobacion}%` }} />
          </div>
          <div className="flex justify-between text-xs text-[#86868b] mt-2">
            <span>{aprobados} aprobados</span><span>{suspendidos} suspendidos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-4">Por tipo de examen</p>
          <div className="space-y-4">
            {[
              { label: "Teórico", arr: teoricos },
              { label: "Práctico", arr: practicos },
            ].map(({ label, arr }) => {
              const apr = arr.filter((e) => e.resultado === "aprobado").length;
              const pct = arr.length > 0 ? Math.round((apr / arr.length) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{label}</span>
                    <span className="text-[#86868b]">{apr}/{arr.length} · {pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[#0071e3]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Por alumno + Últimos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-5">
          <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-4">Resultado por alumno</p>
          {resumen.length === 0 ? (
            <p className="text-sm text-[#86868b] text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {resumen.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{a.nombre}</p>
                    <p className="text-xs text-[#86868b]">{a.tot} examen{a.tot !== 1 ? "es" : ""}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {a.apr > 0 && <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{a.apr} ✓</span>}
                    {a.sus > 0 && <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{a.sus} ✗</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-5">
          <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-4">Últimos exámenes</p>
          {examenes.length === 0 ? (
            <p className="text-sm text-[#86868b] text-center py-4">Sin exámenes registrados</p>
          ) : (
            <div className="space-y-1">
              {examenes.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{e.alumno_nombre}</p>
                    <p className="text-xs text-[#86868b]">{e.tipo === "teorico" ? "Teórico" : "Práctico"} · {e.fecha}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold capitalize ${resultadoColor[e.resultado]}`}>{e.resultado}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUACIONES
// ═══════════════════════════════════════════════════════════════════════════════
function EvaluacionesView() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [preguntas, setPreguntas] = useState<PreguntaConEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);

  // Modales evaluación
  const [modalEval, setModalEval] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluacion | null>(null);
  const [formEval, setFormEval] = useState(emptyEval);
  const [savingEval, setSavingEval] = useState(false);
  const [errorEval, setErrorEval] = useState("");
  const [deleteEvalOpen, setDeleteEvalOpen] = useState(false);
  const [deletingEval, setDeletingEval] = useState<Evaluacion | null>(null);

  // Modales pregunta
  const [modalPregunta, setModalPregunta] = useState(false);
  const [editingPregunta, setEditingPregunta] = useState<Pregunta | null>(null);
  const [preguntaEvalId, setPreguntaEvalId] = useState<string>("");
  const [formPregunta, setFormPregunta] = useState(emptyPregunta);
  const [savingPregunta, setSavingPregunta] = useState(false);
  const [errorPregunta, setErrorPregunta] = useState("");
  const [deletePreguntaOpen, setDeletePreguntaOpen] = useState(false);
  const [deletingPregunta, setDeletingPregunta] = useState<Pregunta | null>(null);

  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    const [evRes, prRes] = await Promise.all([
      supabase.from("evaluaciones").select("*").order("created_at", { ascending: false }),
      supabase.from("preguntas").select("*").order("orden"),
    ]);
    setEvaluaciones((evRes.data as Evaluacion[]) || []);
    setPreguntas((prRes.data as PreguntaConEvaluacion[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  // ── Evaluación CRUD ──────────────────────────────────────────────────────
  const openCreateEval = () => {
    setEditingEval(null); setFormEval(emptyEval); setErrorEval(""); setModalEval(true);
  };
  const openEditEval = (ev: Evaluacion) => {
    setEditingEval(ev);
    setFormEval({ titulo: ev.titulo, descripcion: ev.descripcion || "", categoria: ev.categoria || "", activa: ev.activa });
    setErrorEval(""); setModalEval(true);
  };
  const handleSaveEval = async () => {
    if (!formEval.titulo.trim()) { setErrorEval("El título es obligatorio."); return; }
    setSavingEval(true); setErrorEval("");
    const supabase = createClient();
    const payload = { titulo: formEval.titulo, descripcion: formEval.descripcion || null, categoria: formEval.categoria || null, activa: formEval.activa };
    const { error } = editingEval
      ? await supabase.from("evaluaciones").update(payload).eq("id", editingEval.id)
      : await supabase.from("evaluaciones").insert([payload]);
    if (error) setErrorEval(error.message);
    else { setModalEval(false); fetchAll(); }
    setSavingEval(false);
  };
  const handleDeleteEval = async () => {
    if (!deletingEval) return;
    const supabase = createClient();
    await supabase.from("evaluaciones").delete().eq("id", deletingEval.id);
    setDeleteEvalOpen(false); setDeletingEval(null); fetchAll();
  };

  // ── Pregunta CRUD ────────────────────────────────────────────────────────
  const openCreatePregunta = (evalId: string) => {
    setEditingPregunta(null); setPreguntaEvalId(evalId);
    setFormPregunta(emptyPregunta); setErrorPregunta(""); setModalPregunta(true);
  };
  const openEditPregunta = (p: Pregunta) => {
    setEditingPregunta(p); setPreguntaEvalId(p.evaluacion_id);
    setFormPregunta({ texto: p.texto, opciones: [...p.opciones], respuesta_correcta: p.respuesta_correcta });
    setErrorPregunta(""); setModalPregunta(true);
  };
  const handleSavePregunta = async () => {
    if (!formPregunta.texto.trim()) { setErrorPregunta("La pregunta es obligatoria."); return; }
    if (formPregunta.opciones.some((o) => !o.trim())) { setErrorPregunta("Completa todas las opciones."); return; }
    setSavingPregunta(true); setErrorPregunta("");
    const supabase = createClient();
    const payload = {
      evaluacion_id: preguntaEvalId,
      texto: formPregunta.texto,
      opciones: formPregunta.opciones,
      respuesta_correcta: formPregunta.respuesta_correcta,
      orden: editingPregunta?.orden ?? preguntas.filter((p) => p.evaluacion_id === preguntaEvalId).length,
    };
    const { error } = editingPregunta
      ? await supabase.from("preguntas").update(payload).eq("id", editingPregunta.id)
      : await supabase.from("preguntas").insert([payload]);
    if (error) setErrorPregunta(error.message);
    else { setModalPregunta(false); fetchAll(); }
    setSavingPregunta(false);
  };
  const handleDeletePregunta = async () => {
    if (!deletingPregunta) return;
    await createClient().from("preguntas").delete().eq("id", deletingPregunta.id);
    setDeletePreguntaOpen(false); setDeletingPregunta(null); fetchAll();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <p className="text-sm text-[#86868b]">
          {evaluaciones.length} evaluación{evaluaciones.length !== 1 ? "es" : ""} creada{evaluaciones.length !== 1 ? "s" : ""}
        </p>
        <button onClick={openCreateEval}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors">
          <Plus size={15} /> Nueva Evaluación
        </button>
      </div>

      {evaluaciones.length === 0 && (
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-10 text-center">
          <p className="text-[#86868b] text-sm">No hay evaluaciones. Crea la primera.</p>
        </div>
      )}

      {/* Lista de evaluaciones */}
      <div className="space-y-3">
        {evaluaciones.map((ev) => {
          const preguntasEv = preguntas.filter((p) => p.evaluacion_id === ev.id);
          const abierta = expandida === ev.id;
          return (
            <div key={ev.id} className="bg-white dark:bg-[#1d1d1f] rounded-2xl overflow-hidden">
              {/* Cabecera de la evaluación */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setExpandida(abierta ? null : ev.id)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                    {abierta ? <ChevronUp size={16} className="text-[#86868b]" /> : <ChevronDown size={16} className="text-[#86868b]" />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{ev.titulo}</p>
                      {ev.categoria && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-[#0071e3]/10 text-[#0071e3] font-semibold">{ev.categoria}</span>
                      )}
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-semibold ${ev.activa ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
                        {ev.activa ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <p className="text-xs text-[#86868b] mt-0.5">{preguntasEv.length} pregunta{preguntasEv.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <button onClick={() => openEditEval(ev)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-[#86868b] hover:text-[#0071e3] transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => { setDeletingEval(ev); setDeleteEvalOpen(true); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-[#86868b] hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Preguntas expandidas */}
              {abierta && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 pb-4 pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b]">Preguntas</p>
                    <button onClick={() => openCreatePregunta(ev.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/20 font-medium transition-colors">
                      <Plus size={12} /> Agregar pregunta
                    </button>
                  </div>

                  {preguntasEv.length === 0 ? (
                    <p className="text-xs text-[#86868b] py-3 text-center">Sin preguntas. Agrega la primera.</p>
                  ) : (
                    <div className="space-y-2">
                      {preguntasEv.map((p, idx) => (
                        <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#f5f5f7] dark:bg-[#0a0a0a]">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5">
                              <span className="text-[#86868b] mr-1">{idx + 1}.</span>{p.texto}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {p.opciones.map((op, i) => (
                                <p key={i} className={`text-[11px] px-2 py-0.5 rounded-md ${i === p.respuesta_correcta ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold" : "text-[#86868b]"}`}>
                                  {LETRAS[i]}. {op}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEditPregunta(p)}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-[#86868b] hover:text-[#0071e3] transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => { setDeletingPregunta(p); setDeletePreguntaOpen(true); }}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-[#86868b] hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal Evaluación ── */}
      <Modal open={modalEval} onClose={() => setModalEval(false)} title={editingEval ? "Editar Evaluación" : "Nueva Evaluación"} maxWidth="max-w-md">
        <div className="space-y-4">
          {errorEval && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{errorEval}</p>}
          <div>
            <label className={labelCls}>Título *</label>
            <input type="text" value={formEval.titulo} onChange={(e) => setFormEval({ ...formEval, titulo: e.target.value })} placeholder="Examen teórico categoría B1" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea value={formEval.descripcion} onChange={(e) => setFormEval({ ...formEval, descripcion: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categoría</label>
              <input type="text" value={formEval.categoria} onChange={(e) => setFormEval({ ...formEval, categoria: e.target.value })} placeholder="A1, B1, C1..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select value={formEval.activa ? "activa" : "inactiva"} onChange={(e) => setFormEval({ ...formEval, activa: e.target.value === "activa" })} className={inputCls}>
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setModalEval(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSaveEval} disabled={savingEval} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">
              {savingEval ? "Guardando..." : editingEval ? "Guardar Cambios" : "Crear Evaluación"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Pregunta ── */}
      <Modal open={modalPregunta} onClose={() => setModalPregunta(false)} title={editingPregunta ? "Editar Pregunta" : "Nueva Pregunta"} maxWidth="max-w-lg">
        <div className="space-y-4">
          {errorPregunta && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{errorPregunta}</p>}
          <div>
            <label className={labelCls}>Pregunta *</label>
            <textarea value={formPregunta.texto} onChange={(e) => setFormPregunta({ ...formPregunta, texto: e.target.value })} rows={2} placeholder="Escribe la pregunta..." className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>Opciones de respuesta *</label>
            <div className="space-y-2 mt-1">
              {formPregunta.opciones.map((op, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === formPregunta.respuesta_correcta ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-[#86868b]"}`}>
                    {LETRAS[i]}
                  </span>
                  <input
                    type="text"
                    value={op}
                    onChange={(e) => {
                      const ops = [...formPregunta.opciones];
                      ops[i] = e.target.value;
                      setFormPregunta({ ...formPregunta, opciones: ops });
                    }}
                    placeholder={`Opción ${LETRAS[i]}`}
                    className={inputCls}
                  />
                  <input
                    type="radio"
                    name="respuesta_correcta"
                    checked={formPregunta.respuesta_correcta === i}
                    onChange={() => setFormPregunta({ ...formPregunta, respuesta_correcta: i })}
                    className="w-4 h-4 accent-green-500 flex-shrink-0"
                    title="Marcar como correcta"
                  />
                </div>
              ))}
              <p className="text-[10px] text-[#86868b] pl-8">Selecciona el radio (●) para marcar la respuesta correcta</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setModalPregunta(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSavePregunta} disabled={savingPregunta} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">
              {savingPregunta ? "Guardando..." : editingPregunta ? "Guardar Cambios" : "Agregar Pregunta"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirms eliminar */}
      <DeleteConfirm open={deleteEvalOpen} onClose={() => setDeleteEvalOpen(false)} onConfirm={handleDeleteEval} loading={false}
        message={`¿Eliminar la evaluación "${deletingEval?.titulo}"? Se eliminarán todas sus preguntas.`} />
      <DeleteConfirm open={deletePreguntaOpen} onClose={() => setDeletePreguntaOpen(false)} onConfirm={handleDeletePregunta} loading={false}
        message="¿Eliminar esta pregunta?" />
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
