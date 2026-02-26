"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Users, Calendar, FileText, DollarSign, CreditCard, CheckCircle, Clock, BookOpen } from "lucide-react";

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
  categorias: string[] | null;
  valor_total: number | null;
  fecha_inscripcion: string | null;
}

interface Ingreso {
  id: string;
  concepto: string;
  monto: number;
  metodo_pago: string;
  fecha: string;
  estado: string;
  categoria: string;
}

interface ClaseProxima {
  id: string;
  tipo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
}

/* ─────────────────── helpers ─────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

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

const TIPO_CLASE: Record<string, string> = { practica: "Práctica", teorica: "Teórica" };

/* ─────────────────── vista alumno ─────────────────── */
function AlumnoDashboard() {
  const { user, perfil } = useAuth();
  const [alumno, setAlumno] = useState<AlumnoInfo | null>(null);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [clases, setClases] = useState<ClaseProxima[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const supabase = createClient();
      const hoy = new Date().toISOString().split("T")[0];

      const { data: alumnoData } = await supabase
        .from("alumnos")
        .select("id, nombre, apellidos, dni, email, estado, categorias, valor_total, fecha_inscripcion")
        .eq("user_id", user.id)
        .maybeSingle();

      if (alumnoData) {
        setAlumno(alumnoData);
        const [ingresosRes, clasesRes] = await Promise.all([
          supabase
            .from("ingresos")
            .select("id, concepto, monto, metodo_pago, fecha, estado, categoria")
            .eq("alumno_id", alumnoData.id)
            .order("fecha", { ascending: false }),
          supabase
            .from("clases")
            .select("id, tipo, fecha, hora_inicio, hora_fin, estado")
            .eq("alumno_id", alumnoData.id)
            .gte("fecha", hoy)
            .order("fecha", { ascending: true })
            .limit(5),
        ]);
        setIngresos(ingresosRes.data ?? []);
        setClases(clasesRes.data ?? []);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const nombre = alumno?.nombre || perfil?.nombre || "Alumno";
  const totalPagado = ingresos
    .filter((i) => i.estado === "cobrado")
    .reduce((s, i) => s + Number(i.monto), 0);
  const totalPendiente = ingresos
    .filter((i) => i.estado === "pendiente")
    .reduce((s, i) => s + Number(i.monto), 0);
  const valorTotal = alumno?.valor_total ?? 0;
  const porcentajePagado = valorTotal > 0 ? Math.min(100, Math.round((totalPagado / valorTotal) * 100)) : 0;

  return (
    <div className="animate-fade-in">
      {/* Bienvenida */}
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          Hola, {nombre}
        </h2>
        <p className="text-[#86868b] mt-2 text-lg font-medium">Tu estado de cuenta</p>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Valor total curso */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#86868b]">Valor del curso</span>
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
              <BookOpen size={15} className="text-[#0071e3]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
            {valorTotal > 0 ? fmt(valorTotal) : "—"}
          </p>
        </div>

        {/* Pagado */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#86868b]">Total pagado</span>
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={15} className="text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalPagado)}</p>
        </div>

        {/* Pendiente */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#86868b]">Saldo pendiente</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
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
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Progreso de pago</span>
            <span className="text-sm font-semibold text-[#0071e3]">{porcentajePagado}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0071e3] rounded-full transition-all duration-700"
              style={{ width: `${porcentajePagado}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-[#86868b]">{fmt(totalPagado)} pagado</span>
            <span className="text-xs text-[#86868b]">{fmt(valorTotal)} total</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historial de pagos */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <CreditCard size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Historial de pagos</h3>
          </div>
          {ingresos.length === 0 ? (
            <p className="text-center text-sm text-[#86868b] py-10">Sin registros de pago</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
              {ingresos.map((ing) => (
                <div key={ing.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">{ing.concepto}</p>
                    <p className="text-xs text-[#86868b]">
                      {new Date(ing.fecha + "T00:00:00").toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {METODO_LABEL[ing.metodo_pago] ?? ing.metodo_pago}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{fmt(Number(ing.monto))}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[ing.estado]}`}>
                      {ESTADO_PAGO[ing.estado] ?? ing.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas clases */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Calendar size={16} className="text-[#0071e3]" />
            <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Próximas clases</h3>
          </div>
          {clases.length === 0 ? (
            <p className="text-center text-sm text-[#86868b] py-10">No tienes clases programadas</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {clases.map((cl) => (
                <div key={cl.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      Clase {TIPO_CLASE[cl.tipo] ?? cl.tipo}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {new Date(cl.fecha + "T00:00:00").toLocaleDateString("es-CO", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[#0071e3] shrink-0">
                    {cl.hora_inicio} – {cl.hora_fin}
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

        const [alumnosRes, clasesRes, examenesRes, ingresosRes] = await Promise.all([
          supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
          supabase.from("clases").select("id", { count: "exact", head: true }).eq("fecha", hoy),
          supabase.from("examenes").select("id", { count: "exact", head: true }).eq("resultado", "pendiente"),
          supabase.from("ingresos").select("monto").gte("fecha", primerDiaMes).eq("estado", "cobrado"),
        ]);

        const totalIngresos =
          ingresosRes.data?.reduce((sum, i) => {
            const parsed = Number(i.monto);
            return sum + (isNaN(parsed) ? 0 : parsed);
          }, 0) ?? 0;

        setStats({
          alumnos: alumnosRes.count ?? 0,
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
    { label: "Alumnos Activos", value: stats.alumnos.toString(), icon: <Users size={20} />, color: "#0071e3" },
    { label: "Clases Hoy", value: stats.clasesHoy.toString(), icon: <Calendar size={20} />, color: "#28c840" },
    { label: "Exámenes Pendientes", value: stats.examenesPendientes.toString(), icon: <FileText size={20} />, color: "#ff9f0a" },
    {
      label: "Ingresos del Mes",
      value: `$${stats.ingresosMes.toLocaleString("es-CO")}`,
      icon: <DollarSign size={20} />,
      color: "#bf5af2",
    },
  ];

  return (
    <div>
      <div className="mb-8 animate-fade-in">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          Hola, {nombre}
        </h2>
        <p className="text-[#86868b] mt-2 text-lg font-medium">Resumen de tu escuela de conducción</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-fade-in delay-100">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-6 hover:scale-[1.02] transition-transform duration-300 shadow-sm border border-gray-100 dark:border-gray-800"
          >
            {loadingStats ? (
              <div className="h-9 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <div className="p-2 rounded-xl" style={{ backgroundColor: stat.color + "15" }}>
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-[#86868b] mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-10 text-center animate-fade-in delay-200 border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2">Panel de Gestión</h3>
        <p className="text-sm text-[#86868b] max-w-md mx-auto">
          Usa el menú lateral para navegar entre los módulos: alumnos, instructores, vehículos, clases, exámenes y
          finanzas.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── página principal ─────────────────── */
export default function DashboardPage() {
  const { perfil } = useAuth();

  if (perfil?.rol === "alumno") return <AlumnoDashboard />;
  return <AdminDashboard />;
}
