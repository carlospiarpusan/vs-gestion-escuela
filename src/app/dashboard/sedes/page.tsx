"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Escuela, Sede, EstadoSede } from "@/types/database";
import { Plus, MapPin, Phone, Mail, Clock, Star, Building2, AlertTriangle } from "lucide-react";

/* ─── estilos reutilizables ─── */
const inputCls = "apple-input";
const labelCls = "apple-label";
const CATEGORIAS_INDIVIDUALES = ["A1", "A2", "B1", "C1", "RC1", "C2", "C3"];
const CATEGORIAS_COMBO = [
  "A2 y B1", "A2 y C1", "A2 y RC1", "A2 y C2", "A2 y C3",
  "A1 y B1", "A1 y C1", "A1 y RC1", "A1 y C2", "A1 y C3",
];
const TODAS_CATEGORIAS = [...CATEGORIAS_INDIVIDUALES, ...CATEGORIAS_COMBO];

const emptyForm = {
  escuela_id: "",
  nombre: "",
  estado: "activa" as EstadoSede,
  es_principal: false,
  direccion: "",
  ciudad: "",
  provincia: "",
  codigo_postal: "",
  telefono: "",
  email: "",
  horario_apertura: "",
  horario_cierre: "",
  categorias: [] as string[],
};

type FormType = typeof emptyForm;
type EscuelaOption = Pick<Escuela, "id" | "nombre" | "categorias">;
type SedeRow = Sede & { escuela_nombre?: string };

export default function SedesPage() {
  const { perfil } = useAuth();
  const canEdit = perfil?.rol === "super_admin" || perfil?.rol === "admin_escuela";
  const isSuperAdmin = perfil?.rol === "super_admin";

  const [sedes, setSedes] = useState<SedeRow[]>([]);
  const [escuelas, setEscuelas] = useState<EscuelaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Sede | null>(null);
  const [deleting, setDeleting] = useState<Sede | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting2, setDeleting2] = useState(false);
  const [form, setForm] = useState<FormType>(emptyForm);
  const [categoriasEscuela, setCategoriasEscuela] = useState<string[]>([]);
  const [filtroEscuela, setFiltroEscuela] = useState("all");
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!perfil) return;

    let cancelled = false;

    const loadSedes = async () => {
      const supabase = createClient();

      if (isSuperAdmin) {
        const [sedesRes, escuelasRes] = await Promise.all([
          supabase
            .from("sedes")
            .select("*")
            .order("es_principal", { ascending: false })
            .order("nombre"),
          supabase
            .from("escuelas")
            .select("id, nombre, categorias")
            .order("nombre"),
        ]);

        if (cancelled) return;

        const escuelasData = (escuelasRes.data as EscuelaOption[]) || [];
        const schoolNameById = new Map(escuelasData.map((escuela) => [escuela.id, escuela.nombre]));
        const sedesData = ((sedesRes.data as Sede[]) || []).map((sede) => ({
          ...sede,
          escuela_nombre: schoolNameById.get(sede.escuela_id) ?? "Escuela desconocida",
        }));

        setEscuelas(escuelasData);
        setSedes(sedesData);
        setCategoriasEscuela([]);
        setLoading(false);
        return;
      }

      if (!perfil.escuela_id) {
        setLoading(false);
        return;
      }

      const [sedesRes, escuelaRes] = await Promise.all([
        supabase
          .from("sedes")
          .select("*")
          .eq("escuela_id", perfil.escuela_id)
          .order("es_principal", { ascending: false })
          .order("nombre"),
        supabase
          .from("escuelas")
          .select("id, nombre, categorias")
          .eq("id", perfil.escuela_id)
          .single(),
      ]);

      if (cancelled) return;

      setEscuelas(escuelaRes.data ? [escuelaRes.data as EscuelaOption] : []);
      setSedes((sedesRes.data as SedeRow[]) || []);
      setCategoriasEscuela(escuelaRes.data?.categorias || []);
      setLoading(false);
    };

    void loadSedes();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, perfil, reloadKey]);

  const sedesFiltradas = useMemo(() => {
    if (!isSuperAdmin || filtroEscuela === "all") return sedes;
    return sedes.filter((sede) => sede.escuela_id === filtroEscuela);
  }, [filtroEscuela, isSuperAdmin, sedes]);

  const getSchoolCategories = (escuelaId: string) =>
    escuelas.find((escuela) => escuela.id === escuelaId)?.categorias || [];

  /* ── abrir modal crear ── */
  const openCreate = () => {
    const escuelaIdInicial =
      isSuperAdmin && filtroEscuela !== "all"
        ? filtroEscuela
        : isSuperAdmin
          ? ""
          : perfil?.escuela_id || "";

    setEditing(null);
    setForm({
      ...emptyForm,
      escuela_id: escuelaIdInicial,
      es_principal: escuelaIdInicial ? sedes.filter((sede) => sede.escuela_id === escuelaIdInicial).length === 0 : false,
      categorias: escuelaIdInicial ? getSchoolCategories(escuelaIdInicial) : categoriasEscuela,
    });
    setError("");
    setModalOpen(true);
  };

  /* ── abrir modal editar ── */
  const openEdit = (sede: Sede) => {
    setEditing(sede);
    setForm({
      escuela_id: sede.escuela_id,
      nombre: sede.nombre,
      estado: sede.estado,
      es_principal: sede.es_principal,
      direccion: sede.direccion || "",
      ciudad: sede.ciudad || "",
      provincia: sede.provincia || "",
      codigo_postal: sede.codigo_postal || "",
      telefono: sede.telefono || "",
      email: sede.email || "",
      horario_apertura: sede.horario_apertura || "",
      horario_cierre: sede.horario_cierre || "",
      categorias: getSchoolCategories(sede.escuela_id),
    });
    setCategoriasEscuela(getSchoolCategories(sede.escuela_id));
    setError("");
    setModalOpen(true);
  };

  const toggleCategoria = (categoria: string) => {
    setForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(categoria)
        ? prev.categorias.filter((item) => item !== categoria)
        : [...prev.categorias, categoria],
    }));
  };

  const toggleTodasCategorias = () => {
    const todasActivas = TODAS_CATEGORIAS.every((categoria) => form.categorias.includes(categoria));
    setForm((prev) => ({
      ...prev,
      categorias: todasActivas ? [] : TODAS_CATEGORIAS,
    }));
  };

  /* ── guardar ── */
  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre de la sede es obligatorio.");
      return;
    }
    const escuelaId = isSuperAdmin ? form.escuela_id : perfil?.escuela_id;
    if (!escuelaId) {
      setError("Selecciona la escuela a la que pertenece la sede.");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();
    const categoriasPayload = TODAS_CATEGORIAS.filter((categoria) => form.categorias.includes(categoria));

    const { error: escuelaError } = await supabase
      .from("escuelas")
      .update({ categorias: categoriasPayload })
      .eq("id", escuelaId);
    if (escuelaError) {
      setError(escuelaError.message);
      setSaving(false);
      return;
    }

    const payload = {
      escuela_id: escuelaId,
      nombre: form.nombre.trim(),
      estado: form.estado,
      es_principal: form.es_principal,
      direccion: form.direccion.trim() || null,
      ciudad: form.ciudad.trim() || null,
      provincia: form.provincia.trim() || null,
      codigo_postal: form.codigo_postal.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim().toLowerCase() || null,
      horario_apertura: form.horario_apertura || null,
      horario_cierre: form.horario_cierre || null,
    };

    let savedId = editing?.id;

    if (editing) {
      const { error: err } = await supabase
        .from("sedes")
        .update(payload)
        .eq("id", editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { data: inserted, error: err } = await supabase
        .from("sedes")
        .insert(payload)
        .select("id")
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      savedId = inserted.id;
    }

    // Si esta sede se marca como principal, quitar es_principal a las demás
    if (form.es_principal && savedId) {
      await supabase
        .from("sedes")
        .update({ es_principal: false })
        .eq("escuela_id", escuelaId)
        .neq("id", savedId)
        .eq("es_principal", true);
    }

    setSaving(false);
    setModalOpen(false);
    setCategoriasEscuela(categoriasPayload);
    setReloadKey((value) => value + 1);
  };

  /* ── abrir confirmación borrar ── */
  const openDelete = (sede: Sede) => {
    setDeleting(sede);
    setDeleteError("");
    setDeleteOpen(true);
  };

  /* ── borrar ── */
  const handleDelete = async () => {
    if (!deleting) return;
    const totalSedesEscuela = sedes.filter((sede) => sede.escuela_id === deleting.escuela_id).length;

    if (deleting.es_principal) {
      setDeleteError("No puedes eliminar la sede principal. Primero designa otra sede como principal.");
      return;
    }
    if (totalSedesEscuela <= 1) {
      setDeleteError("No puedes eliminar la única sede de la escuela.");
      return;
    }

    setDeleting2(true);
    const supabase = createClient();

    // Verificar si hay registros asignados a esta sede
    const [alumnosRes, instructoresRes] = await Promise.all([
      supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("sede_id", deleting.id),
      supabase.from("instructores").select("id", { count: "exact", head: true }).eq("sede_id", deleting.id),
    ]);
    const totalAsignados = (alumnosRes.count ?? 0) + (instructoresRes.count ?? 0);

    if (totalAsignados > 0) {
      setDeleteError(
        `Esta sede tiene ${alumnosRes.count ?? 0} alumno(s) y ${instructoresRes.count ?? 0} instructor(es) asignados. Reasígnalos antes de eliminar la sede.`
      );
      setDeleting2(false);
      return;
    }

    const { error: err } = await supabase.from("sedes").delete().eq("id", deleting.id);
    if (err) {
      setDeleteError(err.message);
      setDeleting2(false);
      return;
    }

    setDeleting2(false);
    setDeleteOpen(false);
    setDeleting(null);
    setReloadKey((value) => value + 1);
  };

  /* ── render ── */
  const todasCategoriasActivas = TODAS_CATEGORIAS.every((categoria) => form.categorias.includes(categoria));

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Sedes
          </h2>
          <p className="text-sm text-[#86868b] mt-1">
            {isSuperAdmin
              ? "Gestiona las sedes de todas las escuelas desde un solo panel"
              : "Gestiona las sedes o sucursales de tu escuela"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {isSuperAdmin && (
            <select
              value={filtroEscuela}
              onChange={(e) => setFiltroEscuela(e.target.value)}
              className="apple-input min-w-[230px]"
            >
              <option value="all">Todas las escuelas</option>
              {escuelas.map((escuela) => (
                <option key={escuela.id} value={escuela.id}>
                  {escuela.nombre}
                </option>
              ))}
            </select>
          )}
          {canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors self-start sm:self-auto"
            >
              <Plus size={16} />
              Nueva Sede
            </button>
          )}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-[#86868b]">Escuelas con sedes</p>
            <p className="mt-2 text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {new Set(sedes.map((sede) => sede.escuela_id)).size}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-[#86868b]">Sedes visibles</p>
            <p className="mt-2 text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {sedesFiltradas.length}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-[#86868b]">Sedes principales visibles</p>
            <p className="mt-2 text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {sedesFiltradas.filter((sede) => sede.es_principal).length}
            </p>
          </div>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sedesFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-[#1d1d1f] rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800">
          <Building2 size={40} className="mx-auto text-[#86868b] mb-4" />
          <p className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-1">Sin sedes registradas</p>
          <p className="text-sm text-[#86868b]">
            {isSuperAdmin
              ? "No hay sedes para el filtro actual. Crea la primera o cambia de escuela."
              : "Crea la primera sede de tu escuela"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sedesFiltradas.map((sede) => (
            <div
              key={sede.id}
              className={`bg-white dark:bg-[#1d1d1f] rounded-2xl p-5 border transition-shadow hover:shadow-md ${
                sede.es_principal
                  ? "border-[#0071e3]/40 dark:border-[#0071e3]/30"
                  : "border-gray-100 dark:border-gray-800"
              }`}
            >
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      sede.es_principal
                        ? "bg-[#0071e3]/10"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    <Building2
                      size={16}
                      className={sede.es_principal ? "text-[#0071e3]" : "text-[#86868b]"}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                      {sede.nombre}
                    </h3>
                    {isSuperAdmin && (
                      <p className="mt-0.5 text-[11px] text-[#86868b] truncate">{sede.escuela_nombre}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {sede.es_principal && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#0071e3]">
                          <Star size={9} fill="currentColor" /> Principal
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          sede.estado === "activa"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {sede.estado === "activa" ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(sede)}
                      className="p-1.5 rounded-lg text-[#86868b] hover:text-[#0071e3] hover:bg-[#0071e3]/10 transition-colors"
                      title="Editar sede"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openDelete(sede)}
                      className="p-1.5 rounded-lg text-[#86868b] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Eliminar sede"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Detalles */}
              <div className="space-y-1.5 text-xs text-[#86868b]">
                {(sede.direccion || sede.ciudad) && (
                  <div className="flex items-start gap-1.5">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span className="truncate">
                      {[sede.direccion, sede.ciudad, sede.provincia].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {sede.telefono && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="shrink-0" />
                    <span>{sede.telefono}</span>
                  </div>
                )}
                {sede.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{sede.email}</span>
                  </div>
                )}
                {(sede.horario_apertura || sede.horario_cierre) && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="shrink-0" />
                    <span>
                      {sede.horario_apertura && sede.horario_cierre
                        ? `${sede.horario_apertura} – ${sede.horario_cierre}`
                        : sede.horario_apertura || sede.horario_cierre}
                    </span>
                  </div>
                )}
                {!sede.direccion && !sede.ciudad && !sede.telefono && !sede.email && !sede.horario_apertura && (
                  <span className="italic">Sin información adicional</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Crear/Editar ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Sede" : "Nueva Sede"}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {isSuperAdmin && (
            <div>
              <label className={labelCls}>Escuela *</label>
              <select
                value={form.escuela_id}
                onChange={(e) => {
                  const escuelaId = e.target.value;
                  const categorias = getSchoolCategories(escuelaId);
                  setCategoriasEscuela(categorias);
                  setForm((prev) => ({
                    ...prev,
                    escuela_id: escuelaId,
                    categorias,
                    es_principal: escuelaId
                      ? sedes.filter((sede) => sede.escuela_id === escuelaId).length === 0
                      : false,
                  }));
                }}
                className={inputCls}
              >
                <option value="">Selecciona una escuela</option>
                {escuelas.map((escuela) => (
                  <option key={escuela.id} value={escuela.id}>
                    {escuela.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nombre y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Sede Centro"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoSede })}
                className={inputCls}
              >
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>
          </div>

          {/* Sede principal */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.es_principal}
                onChange={(e) => setForm({ ...form, es_principal: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${form.es_principal ? "bg-[#0071e3]" : "bg-gray-200 dark:bg-gray-700"}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${form.es_principal ? "translate-x-5" : "translate-x-1"}`} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Sede principal</p>
              <p className="text-xs text-[#86868b]">Se asignará automáticamente a los nuevos registros</p>
            </div>
          </label>

          <div className="rounded-2xl border border-gray-200/80 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-[#0a0a0a]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <label className={labelCls}>Categorías habilitadas</label>
                <p className="text-xs text-[#86868b] mt-1">
                  {isSuperAdmin
                    ? "Esta selección aplica a la escuela elegida y se actualiza desde esta misma edición."
                    : "Esta selección aplica a toda la escuela y ahora se administra desde la edición de sedes."}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleTodasCategorias}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-white dark:hover:bg-[#1d1d1f] transition-colors"
              >
                {todasCategoriasActivas ? "Desmarcar todas" : "Seleccionar todas"}
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-2">
                  Individuales
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {CATEGORIAS_INDIVIDUALES.map((categoria) => {
                    const activa = form.categorias.includes(categoria);
                    return (
                      <button
                        key={categoria}
                        type="button"
                        onClick={() => toggleCategoria(categoria)}
                        className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                          activa
                            ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                            : "border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        {categoria}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-2">
                  Combos
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {CATEGORIAS_COMBO.map((categoria) => {
                    const activa = form.categorias.includes(categoria);
                    return (
                      <button
                        key={categoria}
                        type="button"
                        onClick={() => toggleCategoria(categoria)}
                        className={`px-3 py-2 rounded-xl border text-sm font-semibold text-left transition-colors ${
                          activa
                            ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                            : "border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        {categoria}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className={labelCls}>Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              placeholder="Calle 45 # 12-34"
              className={inputCls}
            />
          </div>

          {/* Ciudad y Departamento/Provincia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ciudad</label>
              <input
                type="text"
                value={form.ciudad}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                placeholder="Bogotá"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Departamento / Provincia</label>
              <input
                type="text"
                value={form.provincia}
                onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                placeholder="Cundinamarca"
                className={inputCls}
              />
            </div>
          </div>

          {/* Código postal y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Código postal</label>
              <input
                type="text"
                value={form.codigo_postal}
                onChange={(e) => setForm({ ...form, codigo_postal: e.target.value })}
                placeholder="110111"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="601 234 5678"
                className={inputCls}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Correo electrónico</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="sede@miescuela.com"
              className={inputCls}
            />
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Apertura</label>
              <input
                type="time"
                value={form.horario_apertura}
                onChange={(e) => setForm({ ...form, horario_apertura: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Cierre</label>
              <input
                type="time"
                value={form.horario_cierre}
                onChange={(e) => setForm({ ...form, horario_cierre: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Sede"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Eliminar ── */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(""); }}
        onConfirm={handleDelete}
        loading={deleting2}
        title="Eliminar sede"
        description={
          <div className="space-y-2">
            <p>
              ¿Estás seguro de que quieres eliminar la sede{" "}
              <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]">{deleting?.nombre}</strong>?
            </p>
            {deleteError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
