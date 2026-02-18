"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Users, Calendar, FileText, DollarSign } from "lucide-react";

interface Stats {
  alumnos: number;
  clasesHoy: number;
  examenesPendientes: number;
  ingresosMes: number;
}

export default function DashboardPage() {
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
      const supabase = createClient();
      const hoy = new Date().toISOString().split("T")[0];
      const primerDiaMes = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
        .toISOString()
        .split("T")[0];

      const [alumnosRes, clasesRes, examenesRes, ingresosRes] =
        await Promise.all([
          supabase
            .from("alumnos")
            .select("id", { count: "exact", head: true })
            .eq("estado", "activo"),
          supabase
            .from("clases")
            .select("id", { count: "exact", head: true })
            .eq("fecha", hoy),
          supabase
            .from("examenes")
            .select("id", { count: "exact", head: true })
            .eq("resultado", "pendiente"),
          supabase
            .from("ingresos")
            .select("monto")
            .gte("fecha", primerDiaMes)
            .eq("estado", "cobrado"),
        ]);

      const totalIngresos =
        ingresosRes.data?.reduce((sum, i) => sum + Number(i.monto), 0) ?? 0;

      setStats({
        alumnos: alumnosRes.count ?? 0,
        clasesHoy: clasesRes.count ?? 0,
        examenesPendientes: examenesRes.count ?? 0,
        ingresosMes: totalIngresos,
      });
      setLoadingStats(false);
    };

    fetchStats();
  }, [perfil]);

  const nombre = perfil?.nombre || "Usuario";

  const statCards = [
    {
      label: "Alumnos Activos",
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
      {/* Bienvenida */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          Hola, {nombre}
        </h2>
        <p className="text-[#86868b] mt-1 text-sm">
          Resumen de tu escuela de conducción
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-5 hover:shadow-md transition-shadow"
          >
            {loadingStats ? (
              <div className="h-9 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <div className="flex items-center justify-between">
                <p
                  className="text-2xl font-bold"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: stat.color + "15" }}
                >
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-[#86868b] mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Acceso rápido */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-8 text-center">
        <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2">
          Panel de Gestión
        </h3>
        <p className="text-sm text-[#86868b] max-w-md mx-auto">
          Usa el menú lateral para navegar entre los módulos: alumnos,
          instructores, vehículos, clases, exámenes y finanzas.
        </p>
      </div>
    </div>
  );
}
