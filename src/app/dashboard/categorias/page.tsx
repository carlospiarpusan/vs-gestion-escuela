"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Building2, MapPin } from "lucide-react";

export default function CategoriasPage() {
  const { perfil } = useAuth();
  const [habilitadas, setHabilitadas] = useState<string[] | null>(null);

  useEffect(() => {
    if (!perfil?.escuela_id) return;

    let cancelled = false;

    const fetchCategorias = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("escuelas")
        .select("categorias")
        .eq("id", perfil.escuela_id)
        .single();

      if (cancelled) return;
      setHabilitadas(data?.categorias || []);
    };

    void fetchCategorias();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id]);

  const loading = Boolean(perfil?.escuela_id) && habilitadas === null;
  const categoriasActuales = habilitadas ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!perfil?.escuela_id) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Categorías</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Gestión centralizada por escuela</p>
        </div>
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-8 text-center">
          <Building2 size={32} className="mx-auto text-[#86868b] mb-4" />
          <p className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-2">
            Como super administrador, las categorías se gestionan desde cada escuela.
          </p>
          <p className="text-[#86868b] text-sm">
            Usa la sección <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]">Escuelas</strong> para editar categorías.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Categorías</h2>
        <p className="text-sm text-[#86868b] mt-0.5">Esta configuración ahora vive dentro de Sedes</p>
      </div>

      <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center shrink-0">
            <MapPin size={20} className="text-[#0071e3]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Las categorías se configuran desde Editar sede
            </h3>
            <p className="text-sm text-[#86868b] mt-1">
              Para evitar tener dos lugares distintos configurando lo mismo, la selección se movió al modal de
              <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]"> Sedes</strong>.
            </p>
            <p className="text-sm text-[#86868b] mt-3">
              Categorías habilitadas actualmente: <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]">{categoriasActuales.length}</strong>
            </p>

            {categoriasActuales.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {categoriasActuales.map((categoria) => (
                  <span
                    key={categoria}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0071e3]/10 text-[#0071e3]"
                  >
                    {categoria}
                  </span>
                ))}
              </div>
            )}

            <Link
              href="/dashboard/sedes"
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-sm font-medium hover:bg-[#0077ED] transition-colors"
            >
              Ir a Sedes
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
