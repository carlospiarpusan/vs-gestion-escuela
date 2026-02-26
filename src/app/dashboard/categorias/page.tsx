"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { CheckSquare, Square, Save, Loader2 } from "lucide-react";

const CATEGORIAS_INDIVIDUALES = ["A1", "A2", "B1", "C1", "RC1", "C2", "C3"];

const CATEGORIAS_COMBO = [
  "A2 y B1", "A2 y C1", "A2 y RC1", "A2 y C2", "A2 y C3",
  "A1 y B1", "A1 y C1", "A1 y RC1", "A1 y C2", "A1 y C3",
];

function CategoriaCard({
  label,
  activa,
  onToggle,
}: {
  label: string;
  activa: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left w-full ${
        activa
          ? "border-[#0071e3] bg-[#0071e3]/5 dark:bg-[#0071e3]/10"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      {activa ? (
        <CheckSquare size={17} className="text-[#0071e3] flex-shrink-0" />
      ) : (
        <Square size={17} className="text-[#86868b] flex-shrink-0" />
      )}
      <span
        className={`text-sm font-semibold ${
          activa ? "text-[#0071e3]" : "text-[#1d1d1f] dark:text-[#f5f5f7]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export default function CategoriasPage() {
  const { perfil } = useAuth();
  const [habilitadas, setHabilitadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!perfil) return;
    if (!perfil.escuela_id) {
      setLoading(false);
      return;
    }
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("escuelas")
        .select("categorias")
        .eq("id", perfil.escuela_id)
        .single();
      setHabilitadas(data?.categorias || []);
      setLoading(false);
    };
    fetch();
  }, [perfil?.escuela_id]);

  const toggle = (cat: string) => {
    setSuccess(false);
    setHabilitadas((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const seleccionarTodas = () => {
    setSuccess(false);
    const todas = [...CATEGORIAS_INDIVIDUALES, ...CATEGORIAS_COMBO];
    const todasActivas = todas.every((c) => habilitadas.includes(c));
    setHabilitadas(todasActivas ? [] : todas);
  };

  const handleSave = async () => {
    if (!perfil?.escuela_id) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("escuelas")
      .update({ categorias: habilitadas })
      .eq("id", perfil.escuela_id);
    if (error) setError(error.message);
    else setSuccess(true);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Super admin sin escuela asociada
  if (!perfil?.escuela_id) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Categorías</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Gestiona las categorías habilitadas por escuela</p>
        </div>
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-8 text-center">
          <p className="text-[#86868b] text-sm">
            Como super administrador, gestiona las categorías de cada escuela desde la sección{" "}
            <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]">Escuelas</strong>.
          </p>
        </div>
      </div>
    );
  }

  const todasActivas =
    [...CATEGORIAS_INDIVIDUALES, ...CATEGORIAS_COMBO].every((c) => habilitadas.includes(c));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Categorías</h2>
          <p className="text-sm text-[#86868b] mt-0.5">
            Activa las categorías que ofrece tu escuela ({habilitadas.length} habilitadas)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={seleccionarTodas}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {todasActivas ? "Desmarcar todas" : "Seleccionar todas"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
          Categorías guardadas correctamente.
        </p>
      )}

      {/* Categorías individuales */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-4">
          Categorías Individuales
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {CATEGORIAS_INDIVIDUALES.map((cat) => (
            <CategoriaCard
              key={cat}
              label={cat}
              activa={habilitadas.includes(cat)}
              onToggle={() => toggle(cat)}
            />
          ))}
        </div>
      </div>

      {/* Combos */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-4">
          Combos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIAS_COMBO.map((cat) => (
            <CategoriaCard
              key={cat}
              label={cat}
              activa={habilitadas.includes(cat)}
              onToggle={() => toggle(cat)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
