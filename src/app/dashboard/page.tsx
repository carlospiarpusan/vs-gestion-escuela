"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  MapPin,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";

/* ─────────────────── tipos ─────────────────── */
interface Stats {
  alumnos: number;
  clasesHoy: number;
  examenesPendientes: number;
  ingresosMes: number;
}

interface AlumnoInfo {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  email: string;
  estado: string;
  valor_total: number | null;
}

interface MatriculaInfo {
  id: string;
  numero_contrato: string | null;
  categorias: string[];
  valor_total: number | null;
  fecha_inscripcion: string | null;
  estado: "activo" | "cerrado" | "cancelado";
}

interface Ingreso {
  id: string;
  matricula_id: string | null;
  concepto: string;
  monto: number;
  metodo_pago: string;
  fecha: string;
  estado: string;
  categoria: string;
}

interface ExamenRealizado {
  id: string;
  tipo: "teorico" | "practico";
  fecha: string;
  hora: string | null;
  resultado: "pendiente" | "aprobado" | "suspendido";
  intentos: number;
  notas: string | null;
  total_respuestas: number;
  respuestas_correctas: number;
}

interface PlatformStats {
  escuelas: number;
  escuelasActivas: number;
  sedesActivas: number;
  adminsEscuela: number;
  alumnos: number;
  ingresosMes: number;
}

interface PlatformEscuela {
  id: string;
  nombre: string;
  estado: "activa" | "inactiva" | "suspendida";
  plan: string;
  max_alumnos: number;
  max_sedes: number;
  created_at: string;
}

interface PlatformSede {
  id: string;
  escuela_id: string;
  estado: "activa" | "inactiva";
  es_principal: boolean;
}

interface PlatformAdmin {
  id: string;
  escuela_id: string | null;
  activo: boolean;
}

interface PlatformAlumno {
  id: string;
  escuela_id: string;
}

interface SchoolOverview extends PlatformEscuela {
  sedesTotal: number;
  sedesActivas: number;
  alumnosTotal: number;
  adminsActivos: number;
  hasPrincipalSede: boolean;
  capacidadPct: number;
}

/* ─────────────────── helpers ─────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const ESTADO_PAGO: Record<string, string> = {
  cobrado: "Pagado",
  pendiente: "Pendiente",
  anulado: "Anulado",
};

const ESTADO_COLOR: Record<string, string> = {
  cobrado: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  pendiente: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  anulado: "text-gray-400 bg-gray-100 dark:bg-gray-800",
};

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  datafono: "Datáfono",
  nequi: "Nequi",
  sistecredito: "Sistecrédito",
  otro: "Otro",
};

const TIPO_EXAMEN: Record<ExamenRealizado["tipo"], string> = {
  teorico: "Teórico",
  practico: "Práctico",
};

const RESULTADO_LABEL: Record<ExamenRealizado["resultado"], string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  suspendido: "Suspendido",
};

const RESULTADO_COLOR: Record<ExamenRealizado["resultado"], string> = {
  pendiente: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  aprobado: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  suspendido: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
};

/* ─────────────────── vista alumno ─────────────────── */
function AlumnoDashboard() {
  const { user, perfil } = useAuth();
  const [alumno, setAlumno] = useState<AlumnoInfo | null>(null);
  const [matriculas, setMatriculas] = useState<MatriculaInfo[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [examenes, setExamenes] = useState<ExamenRealizado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const supabase = createClient();

      const { data: alumnoData } = await supabase
        .from("alumnos")
        .select("id, nombre, apellidos, dni, email, estado, valor_total")
        .eq("user_id", user.id)
        .maybeSingle();

      if (alumnoData) {
        setAlumno(alumnoData);
        const [matriculasRes, ingresosRes, examenesRes, respuestasRes] = await Promise.all([
          supabase
            .from("matriculas_alumno")
            .select("id, numero_contrato, categorias, valor_total, fecha_inscripcion, estado")
            .eq("alumno_id", alumnoData.id)
            .order("fecha_inscripcion", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("ingresos")
            .select("id, matricula_id, concepto, monto, metodo_pago, fecha, estado, categoria")
            .eq("alumno_id", alumnoData.id)
            .order("fecha", { ascending: false }),
          supabase
            .from("examenes")
            .select("id, tipo, fecha, hora, resultado, intentos, notas")
            .eq("alumno_id", alumnoData.id)
            .order("fecha", { ascending: false }),
          supabase
            .from("respuestas_examen")
            .select("examen_id, es_correcta")
            .eq("alumno_id", alumnoData.id),
        ]);

        const respuestasPorExamen = new Map<string, { total: number; correctas: number }>();
        for (const respuesta of respuestasRes.data ?? []) {
          if (!respuesta.examen_id) continue;
          const actual = respuestasPorExamen.get(respuesta.examen_id) ?? { total: 0, correctas: 0 };
          actual.total += 1;
          if (respuesta.es_correcta) actual.correctas += 1;
          respuestasPorExamen.set(respuesta.examen_id, actual);
        }

        setMatriculas((matriculasRes.data as MatriculaInfo[]) ?? []);
        setIngresos(ingresosRes.data ?? []);
        setExamenes(
          (examenesRes.data ?? []).map((examen) => {
            const resumen = respuestasPorExamen.get(examen.id) ?? { total: 0, correctas: 0 };
            return {
              ...examen,
              total_respuestas: resumen.total,
              respuestas_correctas: resumen.correctas,
            };
          })
        );
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const nombre = alumno?.nombre || perfil?.nombre || "Alumno";
  const ingresosCobrados = useMemo(
    () => ingresos.filter((ingreso) => ingreso.estado === "cobrado"),
    [ingresos]
  );
  const totalPagado = useMemo(
    () => ingresosCobrados.reduce((sum, ingreso) => sum + Number(ingreso.monto), 0),
    [ingresosCobrados]
  );
  const valorTotal = useMemo(() => {
    if (matriculas.length === 0) return alumno?.valor_total ?? 0;
    return matriculas
      .filter((matricula) => matricula.estado !== "cancelado")
      .reduce((sum, matricula) => sum + Number(matricula.valor_total || 0), 0);
  }, [alumno?.valor_total, matriculas]);
  const totalPendiente = Math.max(valorTotal - totalPagado, 0);
  const porcentajePagado =
    valorTotal > 0 ? Math.min(100, Math.round((totalPagado / valorTotal) * 100)) : 0;
  const resumenMatriculas = useMemo(
    () =>
      matriculas.map((matricula) => {
        const valor = Number(matricula.valor_total || 0);
        const pagado = ingresosCobrados
          .filter((ingreso) => ingreso.matricula_id === matricula.id)
          .reduce((sum, ingreso) => sum + Number(ingreso.monto), 0);

        return {
          ...matricula,
          total_pagado: pagado,
          saldo_pendiente: Math.max(valor - pagado, 0),
        };
      }),
    [ingresosCobrados, matriculas]
  );
  const matriculasById = useMemo(
    () => new Map(resumenMatriculas.map((matricula) => [matricula.id, matricula])),
    [resumenMatriculas]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Bienvenida */}
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl dark:text-[#f5f5f7]">
          Hola, {nombre}
        </h2>
        <p className="mt-2 text-lg font-medium text-[#86868b]">Tu estado de cuenta</p>
      </div>

      {/* Resumen financiero */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Valor total curso */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[#86868b]">Valor del curso</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0071e3]/10">
              <BookOpen size={15} className="text-[#0071e3]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
            {valorTotal > 0 ? fmt(valorTotal) : "—"}
          </p>
        </div>

        {/* Pagado */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[#86868b]">Total pagado</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/10">
              <CheckCircle size={15} className="text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {fmt(totalPagado)}
          </p>
        </div>

        {/* Pendiente */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[#86868b]">Saldo pendiente</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock size={15} className="text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {totalPendiente > 0 ? fmt(totalPendiente) : "Al día"}
          </p>
        </div>
      </div>

      {/* Barra de progreso de pago */}
      {valorTotal > 0 && (
        <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              Progreso de pago
            </span>
            <span className="text-sm font-semibold text-[#0071e3]">{porcentajePagado}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-[#0071e3] transition-all duration-700"
              style={{ width: `${porcentajePagado}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-xs text-[#86868b]">{fmt(totalPagado)} pagado</span>
            <span className="text-xs text-[#86868b]">{fmt(valorTotal)} total</span>
          </div>
        </div>
      )}

      {resumenMatriculas.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Tus cursos</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {resumenMatriculas.map((matricula) => (
              <div
                key={matricula.id}
                className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.numero_contrato
                        ? `Contrato ${matricula.numero_contrato}`
                        : "Curso sin contrato"}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {matricula.fecha_inscripcion
                        ? new Date(matricula.fecha_inscripcion + "T00:00:00").toLocaleDateString(
                            "es-CO",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "Fecha no disponible"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-medium text-[#0071e3]">
                    {matricula.estado}
                  </span>
                </div>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {(matricula.categorias ?? []).map((categoria) => (
                    <span
                      key={`${matricula.id}-${categoria}`}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-[#1d1d1f] dark:bg-gray-800 dark:text-[#f5f5f7]"
                    >
                      {categoria}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-gray-50 p-3 dark:bg-[#0a0a0a]">
                    <p className="mb-1 text-[10px] tracking-wider text-[#86868b] uppercase">
                      Valor
                    </p>
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {matricula.valor_total ? fmt(Number(matricula.valor_total)) : "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-green-50 p-3 dark:bg-green-900/20">
                    <p className="mb-1 text-[10px] tracking-wider text-green-600 uppercase dark:text-green-400">
                      Abonos
                    </p>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      {fmt(matricula.total_pagado)}
                    </p>
                  </div>
                  <div
                    className={`rounded-2xl p-3 ${matricula.saldo_pendiente <= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}
                  >
                    <p
                      className={`mb-1 text-[10px] tracking-wider uppercase ${matricula.saldo_pendiente <= 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
                    >
                      {matricula.saldo_pendiente <= 0 ? "Al día" : "Pendiente"}
                    </p>
                    <p
                      className={`text-sm font-semibold ${matricula.saldo_pendiente <= 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}
                    >
                      {fmt(matricula.saldo_pendiente)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Historial de abonos */}
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <CreditCard size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Historial de abonos
            </h3>
          </div>
          {ingresos.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#86868b]">Sin registros de abonos</p>
          ) : (
            <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
              {ingresos.map((ing) => (
                <div key={ing.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {ing.concepto}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {new Date(ing.fecha + "T00:00:00").toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {METODO_LABEL[ing.metodo_pago] ?? ing.metodo_pago}
                      {ing.matricula_id
                        ? (() => {
                            const matricula = matriculasById.get(ing.matricula_id);
                            if (!matricula) return "";
                            if (matricula.numero_contrato)
                              return ` · Contrato ${matricula.numero_contrato}`;
                            if ((matricula.categorias ?? []).length > 0)
                              return ` · ${(matricula.categorias ?? []).join(", ")}`;
                            return "";
                          })()
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {fmt(Number(ing.monto))}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ESTADO_COLOR[ing.estado]}`}
                    >
                      {ESTADO_PAGO[ing.estado] ?? ing.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evaluaciones realizadas */}
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <FileText size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Evaluaciones realizadas
            </h3>
          </div>
          {examenes.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#86868b]">
              Aún no tienes evaluaciones registradas
            </p>
          ) : (
            <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
              {examenes.map((examen) => (
                <div key={examen.id} className="flex items-start justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {TIPO_EXAMEN[examen.tipo]}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RESULTADO_COLOR[examen.resultado]}`}
                      >
                        {RESULTADO_LABEL[examen.resultado]}
                      </span>
                    </div>
                    <p className="text-xs text-[#86868b]">
                      {new Date(examen.fecha + "T00:00:00").toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {examen.hora ? ` · ${examen.hora}` : ""}
                    </p>
                    {examen.total_respuestas > 0 && (
                      <p className="text-xs text-[#86868b]">
                        {examen.respuestas_correctas}/{examen.total_respuestas} respuestas correctas
                      </p>
                    )}
                    {examen.notas && (
                      <p className="truncate text-xs text-[#86868b]">{examen.notas}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[#0071e3]">
                    Intento {examen.intentos}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── vista super admin ─────────────────── */
function SuperAdminDashboard() {
  const { perfil } = useAuth();
  const [stats, setStats] = useState<PlatformStats>({
    escuelas: 0,
    escuelasActivas: 0,
    sedesActivas: 0,
    adminsEscuela: 0,
    alumnos: 0,
    ingresosMes: 0,
  });
  const [schoolOverviews, setSchoolOverviews] = useState<SchoolOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!perfil) return;

    const fetchPlatformData = async () => {
      try {
        const supabase = createClient();
        const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];

        const [escuelas, sedes, admins, alumnos, ingresosMesRows] = await Promise.all([
          fetchAllSupabaseRows<PlatformEscuela>((from, to) =>
            supabase
              .from("escuelas")
              .select("id, nombre, estado, plan, max_alumnos, max_sedes, created_at")
              .order("created_at", { ascending: false })
              .range(from, to)
              .then(({ data, error }) => ({ data: (data as PlatformEscuela[]) ?? [], error }))
          ),
          fetchAllSupabaseRows<PlatformSede>((from, to) =>
            supabase
              .from("sedes")
              .select("id, escuela_id, estado, es_principal")
              .order("created_at", { ascending: false })
              .range(from, to)
              .then(({ data, error }) => ({ data: (data as PlatformSede[]) ?? [], error }))
          ),
          fetchAllSupabaseRows<PlatformAdmin>((from, to) =>
            supabase
              .from("perfiles")
              .select("id, escuela_id, activo")
              .eq("rol", "admin_escuela")
              .order("created_at", { ascending: false })
              .range(from, to)
              .then(({ data, error }) => ({ data: (data as PlatformAdmin[]) ?? [], error }))
          ),
          fetchAllSupabaseRows<PlatformAlumno>((from, to) =>
            supabase
              .from("alumnos")
              .select("id, escuela_id")
              .eq("tipo_registro", "regular")
              .order("created_at", { ascending: false })
              .range(from, to)
              .then(({ data, error }) => ({ data: (data as PlatformAlumno[]) ?? [], error }))
          ),
          fetchAllSupabaseRows<{ monto: number | string }>((from, to) =>
            supabase
              .from("ingresos")
              .select("monto")
              .gte("fecha", primerDiaMes)
              .eq("estado", "cobrado")
              .order("fecha", { ascending: false })
              .range(from, to)
              .then(({ data, error }) => ({
                data: (data as { monto: number | string }[]) ?? [],
                error,
              }))
          ),
        ]);

        const sedesResumen = new Map<
          string,
          { total: number; activas: number; principal: boolean }
        >();
        for (const sede of sedes) {
          const actual = sedesResumen.get(sede.escuela_id) ?? {
            total: 0,
            activas: 0,
            principal: false,
          };
          actual.total += 1;
          if (sede.estado === "activa") actual.activas += 1;
          if (sede.es_principal) actual.principal = true;
          sedesResumen.set(sede.escuela_id, actual);
        }

        const adminsPorEscuela = new Map<string, number>();
        for (const admin of admins) {
          if (!admin.escuela_id || !admin.activo) continue;
          adminsPorEscuela.set(admin.escuela_id, (adminsPorEscuela.get(admin.escuela_id) ?? 0) + 1);
        }

        const alumnosPorEscuela = new Map<string, number>();
        for (const alumno of alumnos) {
          alumnosPorEscuela.set(
            alumno.escuela_id,
            (alumnosPorEscuela.get(alumno.escuela_id) ?? 0) + 1
          );
        }

        const overviews = escuelas.map((escuela) => {
          const sedesEscuela = sedesResumen.get(escuela.id) ?? {
            total: 0,
            activas: 0,
            principal: false,
          };
          const alumnosTotal = alumnosPorEscuela.get(escuela.id) ?? 0;
          const adminsActivos = adminsPorEscuela.get(escuela.id) ?? 0;
          const capacidadPct =
            escuela.max_alumnos > 0 ? Math.round((alumnosTotal / escuela.max_alumnos) * 100) : 0;

          return {
            ...escuela,
            sedesTotal: sedesEscuela.total,
            sedesActivas: sedesEscuela.activas,
            alumnosTotal,
            adminsActivos,
            hasPrincipalSede: sedesEscuela.principal,
            capacidadPct,
          };
        });

        const ingresosMes = ingresosMesRows.reduce((sum, ingreso) => {
          const parsed = Number(ingreso.monto);
          return sum + (Number.isNaN(parsed) ? 0 : parsed);
        }, 0);

        setStats({
          escuelas: escuelas.length,
          escuelasActivas: escuelas.filter((escuela) => escuela.estado === "activa").length,
          sedesActivas: sedes.filter((sede) => sede.estado === "activa").length,
          adminsEscuela: admins.filter((admin) => admin.activo).length,
          alumnos: alumnos.length,
          ingresosMes,
        });
        setSchoolOverviews(overviews);
      } catch (error) {
        console.error("Error al obtener el resumen de plataforma:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchPlatformData();
  }, [perfil]);

  const recentSchools = useMemo(
    () =>
      [...schoolOverviews]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6),
    [schoolOverviews]
  );

  const planDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const school of schoolOverviews) {
      counts.set(school.plan, (counts.get(school.plan) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count);
  }, [schoolOverviews]);

  const platformAlerts = useMemo(() => {
    const alerts: Array<{
      title: string;
      detail: string;
      href: string;
      tone: "warn" | "danger" | "info";
    }> = [];

    for (const school of schoolOverviews) {
      if (school.estado === "suspendida") {
        alerts.push({
          title: `${school.nombre} está suspendida`,
          detail: "Revisa el estado comercial y operativo de la escuela.",
          href: "/dashboard/escuelas",
          tone: "danger",
        });
      }
      if (school.adminsActivos === 0) {
        alerts.push({
          title: `${school.nombre} no tiene administrador activo`,
          detail: "La escuela necesita al menos un admin de escuela para operar con control.",
          href: "/dashboard/escuelas",
          tone: "warn",
        });
      }
      if (school.sedesTotal === 0) {
        alerts.push({
          title: `${school.nombre} no tiene sedes registradas`,
          detail: "Crea la sede principal para dejar operativa la estructura base.",
          href: "/dashboard/sedes",
          tone: "danger",
        });
      } else if (!school.hasPrincipalSede) {
        alerts.push({
          title: `${school.nombre} no tiene sede principal`,
          detail: "Define una sede principal para evitar inconsistencias en nuevos registros.",
          href: "/dashboard/sedes",
          tone: "warn",
        });
      }
      if (school.max_alumnos > 0 && school.capacidadPct >= 90) {
        alerts.push({
          title: `${school.nombre} está al ${school.capacidadPct}% de capacidad`,
          detail: "Revisa el plan o el límite de alumnos antes de que el equipo se quede corto.",
          href: "/dashboard/escuelas",
          tone: "info",
        });
      }
    }

    return alerts.slice(0, 6);
  }, [schoolOverviews]);

  const statCards = [
    {
      label: "Escuelas",
      value: stats.escuelas.toString(),
      helper: `${stats.escuelasActivas} activas`,
      icon: <Building2 size={18} />,
      color: "#0071e3",
    },
    {
      label: "Sedes activas",
      value: stats.sedesActivas.toString(),
      helper: "Cobertura operativa",
      icon: <MapPin size={18} />,
      color: "#28c840",
    },
    {
      label: "Admins de escuela",
      value: stats.adminsEscuela.toString(),
      helper: "Accesos vigentes",
      icon: <UserCog size={18} />,
      color: "#ff9f0a",
    },
    {
      label: "Alumnos totales",
      value: stats.alumnos.toString(),
      helper: "Base activa del sistema",
      icon: <Users size={18} />,
      color: "#bf5af2",
    },
    {
      label: "Ingresos del mes",
      value: fmt(stats.ingresosMes),
      helper: "Cobrado en todas las escuelas",
      icon: <DollarSign size={18} />,
      color: "#10b981",
    },
    {
      label: "Alertas",
      value: platformAlerts.length.toString(),
      helper: "Escuelas para revisar",
      icon: <ShieldAlert size={18} />,
      color: "#ef4444",
    },
  ];

  return (
    <div>
      <div className="animate-fade-in mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl dark:text-[#f5f5f7]">
          Control central de la plataforma
        </h2>
        <p className="mt-2 text-lg font-medium text-[#86868b]">
          Supervisa escuelas, sedes, capacidad y alertas operativas desde un solo lugar.
        </p>
      </div>

      <div className="animate-fade-in mb-10 grid grid-cols-1 gap-4 delay-100 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]"
          >
            {loading ? (
              <div className="h-10 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                    <p className="mt-2 text-xs text-[#86868b]">{stat.label}</p>
                  </div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                  >
                    {stat.icon}
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#6e6e73] dark:text-[#aeaeb2]">{stat.helper}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Escuelas recientes
                </h3>
                <p className="mt-1 text-sm text-[#86868b]">
                  Nuevas escuelas y su estado actual dentro de la plataforma.
                </p>
              </div>
              <Link
                href="/dashboard/escuelas"
                className="text-sm font-semibold text-[#0071e3] hover:underline"
              >
                Ver todas
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                  />
                ))}
              </div>
            ) : recentSchools.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 px-4 py-6 text-sm text-[#86868b] dark:bg-[#0a0a0a]">
                No hay escuelas registradas todavía.
              </div>
            ) : (
              <div className="space-y-3">
                {recentSchools.map((school) => (
                  <div
                    key={school.id}
                    className="rounded-2xl border border-gray-100 px-4 py-4 dark:border-gray-800"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {school.nombre}
                        </p>
                        <p className="mt-1 text-xs text-[#86868b]">
                          Plan {school.plan} · {school.alumnosTotal} alumnos · {school.sedesActivas}
                          /{Math.max(school.sedesTotal, 0)} sedes activas
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          school.estado === "activa"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : school.estado === "suspendida"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {school.estado}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#86868b] sm:grid-cols-4">
                      <span>Admins activos: {school.adminsActivos}</span>
                      <span>Sede principal: {school.hasPrincipalSede ? "Sí" : "No"}</span>
                      <span>
                        Capacidad:{" "}
                        {school.max_alumnos > 0 ? `${school.capacidadPct}%` : "Sin límite"}
                      </span>
                      <span>Alta: {new Date(school.created_at).toLocaleDateString("es-CO")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Acciones rápidas para superadmin
            </h3>
            <p className="mt-1 text-sm text-[#86868b]">
              Atajos a lo que sí importa en administración central.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard/escuelas"
                className="rounded-2xl border border-gray-100 px-4 py-4 transition-colors hover:border-[#0071e3]/30 hover:bg-[#0071e3]/5 dark:border-gray-800 dark:hover:border-[#0071e3]/30 dark:hover:bg-[#0071e3]/10"
              >
                <div className="flex items-center gap-2 text-[#0071e3]">
                  <Building2 size={16} />
                  <span className="text-sm font-semibold">Gestionar escuelas</span>
                </div>
                <p className="mt-2 text-sm text-[#86868b]">
                  Crear escuelas, ajustar plan, cupos y estado operativo.
                </p>
              </Link>
              <Link
                href="/dashboard/sedes"
                className="rounded-2xl border border-gray-100 px-4 py-4 transition-colors hover:border-[#0071e3]/30 hover:bg-[#0071e3]/5 dark:border-gray-800 dark:hover:border-[#0071e3]/30 dark:hover:bg-[#0071e3]/10"
              >
                <div className="flex items-center gap-2 text-[#0071e3]">
                  <MapPin size={16} />
                  <span className="text-sm font-semibold">Revisar sedes</span>
                </div>
                <p className="mt-2 text-sm text-[#86868b]">
                  Detectar escuelas sin sede principal o con estructura incompleta.
                </p>
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Alertas prioritarias
            </h3>
            <p className="mt-1 text-sm text-[#86868b]">
              Escuelas o estructuras que requieren una revisión rápida.
            </p>

            <div className="mt-5 space-y-3">
              {loading ? (
                [1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                  />
                ))
              ) : platformAlerts.length === 0 ? (
                <div className="rounded-2xl bg-green-50 px-4 py-5 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  No hay alertas críticas para revisar ahora.
                </div>
              ) : (
                platformAlerts.map((alert, index) => (
                  <Link
                    key={`${alert.title}-${index}`}
                    href={alert.href}
                    className={`block rounded-2xl border px-4 py-4 transition-colors ${
                      alert.tone === "danger"
                        ? "border-red-200 bg-red-50 hover:bg-red-100/70 dark:border-red-900/40 dark:bg-red-900/20"
                        : alert.tone === "warn"
                          ? "border-amber-200 bg-amber-50 hover:bg-amber-100/70 dark:border-amber-900/40 dark:bg-amber-900/20"
                          : "border-blue-200 bg-blue-50 hover:bg-blue-100/70 dark:border-blue-900/40 dark:bg-blue-900/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {alert.title}
                        </p>
                        <p className="mt-1 text-sm text-[#6e6e73] dark:text-[#c7c7cc]">
                          {alert.detail}
                        </p>
                      </div>
                      <ArrowRight size={16} className="mt-1 shrink-0 text-[#0071e3]" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Distribución por plan
            </h3>
            <p className="mt-1 text-sm text-[#86868b]">
              Cómo está repartida hoy la base de escuelas.
            </p>

            <div className="mt-5 space-y-4">
              {loading ? (
                [1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-12 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                  />
                ))
              ) : planDistribution.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 px-4 py-5 text-sm text-[#86868b] dark:bg-[#0a0a0a]">
                  Aún no hay escuelas registradas.
                </div>
              ) : (
                planDistribution.map((item) => {
                  const pct =
                    stats.escuelas > 0 ? Math.round((item.count / stats.escuelas) * 100) : 0;
                  return (
                    <div key={item.plan}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-[#1d1d1f] capitalize dark:text-[#f5f5f7]">
                          {item.plan}
                        </span>
                        <span className="text-[#86868b]">
                          {item.count} escuela{item.count === 1 ? "" : "s"} · {pct}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-2.5 rounded-full bg-[#0071e3]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── vista admin/instructor ─────────────────── */
function AdminDashboard() {
  const { perfil } = useAuth();
  const [stats, setStats] = useState<Stats>({
    alumnos: 0,
    clasesHoy: 0,
    examenesPendientes: 0,
    ingresosMes: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!perfil) return;
    const fetchStats = async () => {
      try {
        const supabase = createClient();
        const hoy = new Date().toISOString().split("T")[0];
        const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const primerDiaSiguienteMes = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        )
          .toISOString()
          .split("T")[0];

        const [matriculasRows, alumnosLegacyRows, clasesRes, examenesRes, ingresosRows] =
          await Promise.all([
            fetchAllSupabaseRows<{ alumno_id: string | null }>((from, to) =>
              supabase
                .from("matriculas_alumno")
                .select("alumno_id")
                .gte("fecha_inscripcion", primerDiaMes)
                .lt("fecha_inscripcion", primerDiaSiguienteMes)
                .order("fecha_inscripcion", { ascending: false })
                .range(from, to)
                .then(({ data, error }) => ({
                  data: (data as { alumno_id: string | null }[]) ?? [],
                  error,
                }))
            ),
            fetchAllSupabaseRows<{ id: string }>((from, to) =>
              supabase
                .from("alumnos")
                .select("id")
                .gte("fecha_inscripcion", primerDiaMes)
                .lt("fecha_inscripcion", primerDiaSiguienteMes)
                .eq("tipo_registro", "regular")
                .order("created_at", { ascending: false })
                .range(from, to)
                .then(({ data, error }) => ({ data: (data as { id: string }[]) ?? [], error }))
            ),
            supabase.from("clases").select("id", { count: "exact", head: true }).eq("fecha", hoy),
            supabase
              .from("examenes")
              .select("id", { count: "exact", head: true })
              .eq("resultado", "pendiente"),
            fetchAllSupabaseRows<{ monto: number | string }>((from, to) =>
              supabase
                .from("ingresos")
                .select("monto")
                .gte("fecha", primerDiaMes)
                .eq("estado", "cobrado")
                .order("fecha", { ascending: false })
                .range(from, to)
                .then(({ data, error }) => ({
                  data: (data as { monto: number | string }[]) ?? [],
                  error,
                }))
            ),
          ]);

        const alumnosDelMes = new Set<string>();
        for (const matricula of matriculasRows) {
          if (matricula.alumno_id) alumnosDelMes.add(matricula.alumno_id);
        }
        for (const alumno of alumnosLegacyRows) {
          alumnosDelMes.add(alumno.id);
        }

        const totalIngresos = ingresosRows.reduce((sum, i) => {
          const parsed = Number(i.monto);
          return sum + (isNaN(parsed) ? 0 : parsed);
        }, 0);

        setStats({
          alumnos: alumnosDelMes.size,
          clasesHoy: clasesRes.count ?? 0,
          examenesPendientes: examenesRes.count ?? 0,
          ingresosMes: totalIngresos,
        });
      } catch (error) {
        console.error("Error al obtener estadísticas:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [perfil]);

  const nombre = perfil?.nombre || "Usuario";

  const statCards = [
    {
      label: "Alumnos del Mes",
      value: stats.alumnos.toString(),
      icon: <Users size={20} />,
      color: "#0071e3",
    },
    {
      label: "Clases Hoy",
      value: stats.clasesHoy.toString(),
      icon: <Calendar size={20} />,
      color: "#28c840",
    },
    {
      label: "Exámenes Pendientes",
      value: stats.examenesPendientes.toString(),
      icon: <FileText size={20} />,
      color: "#ff9f0a",
    },
    {
      label: "Ingresos del Mes",
      value: `$${stats.ingresosMes.toLocaleString("es-CO")}`,
      icon: <DollarSign size={20} />,
      color: "#bf5af2",
    },
  ];

  return (
    <div>
      <div className="animate-fade-in mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl dark:text-[#f5f5f7]">
          Hola, {nombre}
        </h2>
        <p className="mt-2 text-lg font-medium text-[#86868b]">
          Resumen de tu escuela de conducción
        </p>
      </div>

      <div className="animate-fade-in mb-10 grid grid-cols-1 gap-6 delay-100 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-transform duration-300 hover:scale-[1.02] dark:border-gray-800 dark:bg-[#1d1d1f]"
          >
            {loadingStats ? (
              <div className="h-9 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <div className="rounded-xl p-2" style={{ backgroundColor: stat.color + "15" }}>
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-[#86868b]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="animate-fade-in rounded-3xl border border-gray-100 bg-white p-10 text-center delay-200 dark:border-gray-800 dark:bg-[#1d1d1f]">
        <h3 className="mb-2 text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          Panel de Gestión
        </h3>
        <p className="mx-auto max-w-md text-sm text-[#86868b]">
          Usa el menú lateral para navegar entre los módulos: alumnos, instructores, vehículos,
          clases, exámenes y finanzas.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── página principal ─────────────────── */
export default function DashboardPage() {
  const { perfil } = useAuth();

  if (perfil?.rol === "super_admin") return <SuperAdminDashboard />;
  if (perfil?.rol === "alumno") return <AlumnoDashboard />;
  return <AdminDashboard />;
}
