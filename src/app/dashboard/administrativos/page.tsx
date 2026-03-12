"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { fetchJsonWithRetry, runSupabaseMutationWithRetry } from "@/lib/retry";
import type { Perfil, Sede } from "@/types/database";
import { Plus, Power } from "lucide-react";

interface AdminRow extends Perfil {
  sede_nombre?: string;
}

type AdministrativosListResponse = {
  totalCount: number;
  rows: AdminRow[];
};

const PAGE_SIZE = 10;

const emptyForm = {
  nombre: "",
  cedula: "",
  email: "",
  sede_id: "",
};

const inputCls = "apple-input";
const labelCls = "apple-label";

export default function AdministrativosPage() {
  const { perfil } = useAuth();

  const [data, setData] = useState<AdminRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [deleting, setDeleting] = useState<AdminRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const fetchIdRef = useRef(0);
  const {
    value: form,
    setValue: setForm,
    restoreDraft,
    clearDraft,
  } = useDraftForm("dashboard:administrativos:form", emptyForm, {
    persist: modalOpen && !editing,
  });

  const canEdit =
    perfil?.rol === "super_admin" ||
    perfil?.rol === "admin_escuela" ||
    perfil?.rol === "admin_sede";

  const fetchAdministrativos = useCallback(async (page = 0, search = "") => {
    if (!perfil?.escuela_id) return;

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setTableError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      if (search.trim()) params.set("q", search.trim());

      const payload = await fetchJsonWithRetry<AdministrativosListResponse>(
        `/api/administrativos?${params.toString()}`,
        { cache: "no-store" }
      );

      if (fetchId !== fetchIdRef.current) return;

      setData(payload.rows || []);
      setTotalCount(payload.totalCount || 0);
    } catch (fetchError: unknown) {
      if (fetchId !== fetchIdRef.current) return;
      setData([]);
      setTotalCount(0);
      setTableError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los administrativos.");
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [perfil?.escuela_id]);

  useEffect(() => {
    if (!perfil?.escuela_id) return;

    let cancelled = false;

    const loadSedes = async () => {
      const supabase = createClient();
      const { data: sedesData } = await supabase
        .from("sedes")
        .select("*")
        .eq("escuela_id", perfil.escuela_id)
        .eq("estado", "activa")
        .order("es_principal", { ascending: false });

      if (cancelled) return;

      setSedes((sedesData as Sede[]) || []);
    };

    void loadSedes();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id]);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    void fetchAdministrativos(currentPage, searchTerm);
  }, [fetchAdministrativos, perfil?.escuela_id, currentPage, searchTerm, reloadKey]);

  const openCreate = () => {
    setEditing(null);
    restoreDraft({
      ...emptyForm,
      sede_id: perfil?.rol === "admin_sede" && perfil.sede_id ? perfil.sede_id : "",
    });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (row: AdminRow) => {
    setEditing(row);
    setForm({
      nombre: row.nombre,
      cedula: "",        // la cédula no se muestra ni edita (son credenciales auth)
      email: row.email,
      sede_id: row.sede_id ?? "",
    });
    setError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.sede_id) {
      setError("Nombre y sede son obligatorios.");
      return;
    }
    if (!perfil?.escuela_id) return;

    setSaving(true);
    setError("");

    try {
      if (editing) {
        // EDITAR: actualizar directamente en la tabla perfiles
        const supabase = createClient();
        await runSupabaseMutationWithRetry(() =>
          supabase
            .from("perfiles")
            .update({
              nombre: form.nombre.trim(),
              sede_id: form.sede_id,
            })
            .eq("id", editing.id)
        );
      } else {
        // CREAR: llamar a la API que crea el usuario en Supabase Auth + perfil
        if (!form.cedula.trim()) {
          setError("La cédula es obligatoria para crear un administrativo.");
          setSaving(false);
          return;
        }

        await fetchJsonWithRetry("/api/crear-administrativo-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre.trim(),
            cedula: form.cedula.trim(),
            email: form.email.trim() || null,
            escuela_id: perfil.escuela_id,
            sede_id: form.sede_id,
          }),
        });
      }
      clearDraft({
        ...emptyForm,
        sede_id: perfil?.rol === "admin_sede" && perfil.sede_id ? perfil.sede_id : "",
      });
      setSaving(false);
      setModalOpen(false);
      setReloadKey((value) => value + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar el administrativo.");
      setSaving(false);
    }
  };

  // Activar / desactivar
  const toggleActivo = async (row: AdminRow) => {
    const supabase = createClient();
    await runSupabaseMutationWithRetry(() =>
      supabase.from("perfiles").update({ activo: !row.activo }).eq("id", row.id)
    );
    setReloadKey((value) => value + 1);
  };

  // Eliminar perfil
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await runSupabaseMutationWithRetry(() =>
        supabase.from("perfiles").delete().eq("id", deleting.id)
      );
      setSaving(false);
      setDeleteOpen(false);
      setDeleting(null);
      setReloadKey((value) => value + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar el administrativo.");
      setSaving(false);
    }
  };

  const sedesDisponibles =
    perfil?.rol === "admin_sede" && perfil.sede_id
      ? sedes.filter((s) => s.id === perfil.sede_id)
      : sedes;

  const tableRows = useMemo(() => {
    const sedesMap = new Map(sedes.map((sede) => [sede.id, sede.nombre]));
    return data.map((row) => ({
      ...row,
      sede_nombre: row.sede_nombre ?? (row.sede_id ? sedesMap.get(row.sede_id) ?? "—" : "—"),
    }));
  }, [data, sedes]);

  const columns = useMemo(() => ([
    {
      key: "nombre" as keyof AdminRow,
      label: "Nombre",
      render: (row: AdminRow) => (
        <div>
          <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{row.nombre}</p>
          <p className="text-xs text-[#86868b]">{row.email}</p>
        </div>
      ),
    },
    {
      key: "sede_nombre" as keyof AdminRow,
      label: "Sede",
      render: (row: AdminRow) => (
        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          {row.sede_nombre || "—"}
        </span>
      ),
    },
    {
      key: "activo" as keyof AdminRow,
      label: "Estado",
      render: (row: AdminRow) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            row.activo
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {row.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "created_at" as keyof AdminRow,
      label: "Alta",
      render: (row: AdminRow) => (
        <span className="text-sm text-[#86868b]">
          {new Date(row.created_at).toLocaleDateString("es-CO")}
        </span>
      ),
    },
  ]), []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(0);
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Administrativos
          </h2>
          <p className="text-sm text-[#86868b] mt-0.5">
            Gestiona los administrativos asignados a cada sede
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
          >
            <Plus size={16} /> Nuevo Administrativo
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        {tableError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {tableError}
          </div>
        )}

        <DataTable
          columns={columns}
          data={tableRows}
          loading={loading}
          searchPlaceholder="Buscar por nombre o correo..."
          serverSide
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onSearchChange={handleSearchChange}
          pageSize={PAGE_SIZE}
          onEdit={canEdit ? openEdit : undefined}
          onDelete={canEdit ? (row) => {
            setDeleting(row);
            setDeleteOpen(true);
          } : undefined}
          extraActions={canEdit ? ((row) => (
            <button
              onClick={() => toggleActivo(row)}
              title={row.activo ? "Desactivar" : "Activar"}
              className="apple-icon-button hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
            >
              <Power size={14} />
            </button>
          )) : undefined}
        />
      </div>

      {/* Modal crear / editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Administrativo" : "Nuevo Administrativo"}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className={labelCls}>Nombre completo *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: María Rodríguez"
              className={inputCls}
            />
          </div>

          {/* Cédula y email solo al crear */}
          {!editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Cédula *</label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  placeholder="Número de cédula"
                  className={inputCls}
                />
                <p className="text-xs text-[#86868b] mt-1">Usada como contraseña inicial</p>
              </div>
              <div>
                <label className={labelCls}>Email (opcional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* Al editar mostrar el email como solo lectura */}
          {editing && (
            <div>
              <label className={labelCls}>Correo / Cédula</label>
              <input
                type="text"
                value={form.email}
                disabled
                className={`${inputCls} opacity-50 cursor-not-allowed`}
              />
              <p className="text-xs text-[#86868b] mt-1">Las credenciales de acceso no se pueden cambiar aquí.</p>
            </div>
          )}

          <div>
            <label className={labelCls}>Sede *</label>
            <select
              value={form.sede_id}
              onChange={(e) => setForm({ ...form, sede_id: e.target.value })}
              className={inputCls}
              disabled={perfil?.rol === "admin_sede"}
            >
              <option value="">Selecciona una sede</option>
              {sedesDisponibles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}{s.es_principal ? " (Principal)" : ""}
                </option>
              ))}
            </select>
          </div>

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
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Administrativo"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmar eliminar */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={saving}
        message={`¿Eliminar al administrativo "${deleting?.nombre}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
