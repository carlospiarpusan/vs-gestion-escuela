/**
 * InstructoresPage - Instructor management dashboard page.
 *
 * Provides a full CRUD interface for managing driving-school instructors,
 * backed by a Supabase "instructores" table.  Features include:
 *   - Paginated / searchable data table via <DataTable />
 *   - Create & edit modal with form validation
 *   - Delete confirmation dialog
 *   - Multi-select specialties filtered to school's enabled categories
 *
 * @module dashboard/instructores
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { fetchJsonWithRetry, runSupabaseMutationWithRetry } from "@/lib/retry";
import {
  getDashboardListCached,
  invalidateDashboardClientCaches,
} from "@/lib/dashboard-client-cache";
import { revalidateTaggedServerCaches } from "@/lib/server-cache-client";
import { buildScopedMutationRevalidationTags } from "@/lib/server-cache-tags";
import { fetchSchoolCategories } from "@/lib/school-categories";
import { canAuditedRolePerformAction, isAuditedRole } from "@/lib/role-capabilities";
import type { Instructor, EstadoInstructor } from "@/types/database";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { instructorSchema } from "./schemas";

const PAGE_SIZE = 10;

type InstructoresListResponse = {
  totalCount: number;
  rows: Instructor[];
};

/** Allowed activity states for an instructor record. */
const estados: EstadoInstructor[] = ["activo", "inactivo"];

/** Blank form used when creating a new instructor or resetting the modal. */
const emptyForm = {
  nombre: "",
  apellidos: "",
  dni: "",
  email: "",
  telefono: "",
  licencia: "",
  especialidades: [] as string[],
  estado: "activo" as EstadoInstructor,
  color: "#0071e3",
};

export default function InstructoresPage() {
  const { perfil } = useAuth();
  const auditedRole = isAuditedRole(perfil?.rol) ? perfil.rol : null;
  const canCreateInstructor = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "instructors", "create")
    : true;
  const canEditInstructor = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "instructors", "edit")
    : true;
  const canDeleteInstructor = auditedRole
    ? canAuditedRolePerformAction(auditedRole, "instructors", "delete")
    : true;

  // --- State -----------------------------------------------------------
  const [data, setData] = useState<Instructor[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const fetchIdRef = useRef(0);
  const [tableError, setTableError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [deleting, setDeleting] = useState<Instructor | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoriasEscuela, setCategoriasEscuela] = useState<string[]>([]);
  const {
    value: form,
    setValue: setForm,
    restoreDraft,
    clearDraft,
  } = useDraftForm("dashboard:instructores:form", emptyForm, {
    persist: modalOpen && !editing,
  });

  // --- Data fetching ----------------------------------------------------

  /** Fetch paginated instructors from Supabase, ordered by most-recent first. */
  const fetchData = useCallback(
    async (page = 0, search = "") => {
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

        const payload = await getDashboardListCached<InstructoresListResponse>({
          name: "instructores-table",
          scope: {
            id: perfil.id,
            rol: perfil.rol,
            escuelaId: perfil.escuela_id,
            sedeId: perfil.sede_id,
          },
          params,
          loader: () =>
            fetchJsonWithRetry<InstructoresListResponse>(`/api/instructores?${params.toString()}`),
        });

        if (fetchId !== fetchIdRef.current) return;

        setData(payload.rows || []);
        setTotalCount(payload.totalCount || 0);
      } catch (fetchError: unknown) {
        if (fetchId !== fetchIdRef.current) return;
        setData([]);
        setTotalCount(0);
        setTableError(
          fetchError instanceof Error
            ? fetchError.message
            : "No se pudieron cargar los instructores."
        );
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [perfil]
  );

  // Re-fetch whenever page, search, or profile changes.
  useEffect(() => {
    if (!perfil) return;
    void fetchData(currentPage, searchTerm);
  }, [fetchData, perfil, currentPage, searchTerm]);

  useEffect(() => {
    if (!perfil?.escuela_id) return;

    let cancelled = false;

    const loadCategorias = async () => {
      try {
        const categorias = await fetchSchoolCategories(perfil.escuela_id!);
        if (!cancelled) {
          setCategoriasEscuela(categorias);
        }
      } catch {
        if (!cancelled) {
          setCategoriasEscuela([]);
        }
      }
    };

    void loadCategorias();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id]);

  /** Callback del DataTable server-side: cambio de página */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /** Callback del DataTable server-side: cambio de búsqueda */
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(0);
  }, []);

  // --- Modal helpers ----------------------------------------------------

  /** Open the modal in "create" mode with a blank form. */
  const openCreate = () => {
    if (!canCreateInstructor) return;
    setEditing(null);
    restoreDraft(emptyForm);
    setModalOpen(true);
  };

  /** Open the modal in "edit" mode, pre-filling the form with existing data. */
  const openEdit = (row: Instructor) => {
    if (!canEditInstructor) return;
    setEditing(row);
    setForm({
      nombre: row.nombre,
      apellidos: row.apellidos,
      dni: row.dni,
      email: row.email || "",
      telefono: row.telefono,
      licencia: row.licencia,
      especialidades: row.especialidades ?? (row.especialidad ? [row.especialidad] : []),
      estado: row.estado,
      color: row.color,
    });
    setModalOpen(true);
  };

  /** Open the delete-confirmation dialog for the given instructor. */
  const openDelete = (row: Instructor) => {
    if (!canDeleteInstructor) return;
    setDeleting(row);
    setDeleteOpen(true);
  };

  /** Toggle a category in the especialidades array. */
  const toggleEspecialidad = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      especialidades: prev.especialidades.includes(cat)
        ? prev.especialidades.filter((e) => e !== cat)
        : [...prev.especialidades, cat],
    }));
  };

  // --- Save (create / update) -------------------------------------------

  const handleSave = async () => {
    if ((!editing && !canCreateInstructor) || (editing && !canEditInstructor)) {
      toast.error("No tienes permisos para gestionar instructores.");
      return;
    }

    const result = instructorSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message || "Verifica los datos del formulario.");
      return;
    }
    setSaving(true);

    // Use first selected specialty as the legacy single-value field
    const especialidadPrincipal = form.especialidades[0];

    try {
      const supabase = createClient();

      if (editing) {
        await runSupabaseMutationWithRetry(() =>
          supabase
            .from("instructores")
            .update({
              nombre: form.nombre,
              apellidos: form.apellidos,
              dni: form.dni,
              email: form.email || null,
              telefono: form.telefono,
              licencia: form.licencia,
              especialidad: especialidadPrincipal,
              especialidades: form.especialidades,
              estado: form.estado,
              color: form.color,
            })
            .eq("id", editing.id)
        );
      } else {
        if (!perfil) {
          toast.error("No se encontró el perfil activo para guardar.");
          setSaving(false);
          return;
        }

        let sedeId = perfil.sede_id;
        if (!sedeId && perfil.escuela_id) {
          const { data: sedeData } = await supabase
            .from("sedes")
            .select("id")
            .eq("escuela_id", perfil.escuela_id)
            .order("es_principal", { ascending: false })
            .limit(1)
            .maybeSingle();
          sedeId = sedeData?.id ?? null;
        }

        if (!sedeId) {
          toast.error("No se encontró una sede asignada. Contacta al administrador.");
          setSaving(false);
          return;
        }

        // Crear cuenta de acceso para el instructor (email=cédula, password=cédula)
        const authJson = await fetchJsonWithRetry<{ user_id: string }>(
          "/api/crear-instructor-auth",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombre: `${form.nombre} ${form.apellidos}`,
              email: form.email || null,
              dni: form.dni,
              escuela_id: perfil.escuela_id,
              sede_id: sedeId,
            }),
          }
        );

        await runSupabaseMutationWithRetry(() =>
          supabase.from("instructores").insert({
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
            user_id: authJson.user_id,
            nombre: form.nombre,
            apellidos: form.apellidos,
            dni: form.dni,
            email: form.email || null,
            telefono: form.telefono,
            licencia: form.licencia,
            especialidad: especialidadPrincipal,
            especialidades: form.especialidades,
            estado: form.estado,
            color: form.color,
          })
        );
      }

      clearDraft(emptyForm);
      setSaving(false);
      setModalOpen(false);
      toast.success(editing ? "Instructor actualizado" : "Instructor creado");
      invalidateDashboardClientCaches();
      await revalidateTaggedServerCaches(
        buildScopedMutationRevalidationTags({
          scope: {
            escuelaId: perfil?.escuela_id,
            sedeId: perfil?.sede_id,
          },
          includeFinance: false,
          includeDashboard: true,
        })
      );
      void fetchData(currentPage, searchTerm);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al guardar.";
      toast.error(message);
      setSaving(false);
    }
  };

  // --- Delete -----------------------------------------------------------

  const handleDelete = async () => {
    if (!deleting) return;
    if (!canDeleteInstructor) {
      toast.error("No tienes permisos para eliminar instructores.");
      return;
    }
    setSaving(true);

    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("instructores").delete().eq("id", deleting.id);

      if (err) {
        toast.error(err.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      setDeleteOpen(false);
      setDeleting(null);
      toast.success("Instructor eliminado");
      invalidateDashboardClientCaches();
      await revalidateTaggedServerCaches(
        buildScopedMutationRevalidationTags({
          scope: {
            escuelaId: perfil?.escuela_id,
            sedeId: perfil?.sede_id,
          },
          includeFinance: false,
          includeDashboard: true,
        })
      );
      void fetchData(currentPage, searchTerm);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al eliminar.";
      toast.error(message);
      setSaving(false);
    }
  };

  // --- Table column definitions -----------------------------------------

  const columns = [
    {
      key: "nombre" as keyof Instructor,
      label: "Nombre",
      render: (r: Instructor) => (
        <span className="font-medium">
          {r.nombre} {r.apellidos}
        </span>
      ),
    },
    { key: "dni" as keyof Instructor, label: "Cédula" },
    { key: "telefono" as keyof Instructor, label: "Teléfono" },
    { key: "licencia" as keyof Instructor, label: "Licencia" },
    {
      key: "especialidades" as keyof Instructor,
      label: "Especialidades",
      render: (r: Instructor) => {
        const cats = r.especialidades ?? (r.especialidad ? [r.especialidad] : []);
        return (
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <span
                key={c}
                className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-xs font-medium text-[#0071e3]"
              >
                {c}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "estado" as keyof Instructor,
      label: "Estado",
      render: (r: Instructor) => {
        const c =
          r.estado === "activo"
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
        return (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>{r.estado}</span>
        );
      },
    },
  ];

  const inputCls = "apple-input";

  // --- Render -----------------------------------------------------------

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Instructores
          </h2>
          <p className="mt-0.5 text-sm text-[#86868b]">Gestiona los instructores de tu escuela</p>
        </div>
        {canCreateInstructor ? (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED]"
          >
            <Plus size={16} /> Nuevo Instructor
          </button>
        ) : null}
      </div>

      {/* Data table */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        {tableError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {tableError}
          </div>
        )}
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Buscar por nombre o cédula..."
          serverSide
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onSearchChange={handleSearchChange}
          pageSize={PAGE_SIZE}
          onEdit={canEditInstructor ? openEdit : undefined}
          onDelete={canDeleteInstructor ? openDelete : undefined}
        />
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Instructor" : "Nuevo Instructor"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {/* Nombre + Apellidos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Apellidos *</label>
              <input
                type="text"
                value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Cédula + Teléfono */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Cédula *</label>
              <input
                type="text"
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Teléfono *</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Email + Licencia */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Licencia *</label>
              <input
                type="text"
                value={form.licencia}
                onChange={(e) => setForm({ ...form, licencia: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Especialidades (checkboxes de categorías de la escuela) */}
          <div>
            <label className="mb-2 block text-xs text-[#86868b]">Especialidades *</label>
            {categoriasEscuela.length === 0 ? (
              <p className="text-xs text-[#86868b] italic">
                La escuela no tiene categorías configuradas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categoriasEscuela.map((cat) => {
                  const selected = form.especialidades.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleEspecialidad(cat)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        selected
                          ? "border-[#0071e3] bg-[#0071e3] text-white"
                          : "border-gray-200 bg-white text-[#1d1d1f] hover:border-[#0071e3] dark:border-gray-700 dark:bg-[#0a0a0a] dark:text-[#f5f5f7]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estado + Color */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoInstructor })}
                className={inputCls}
              >
                {estados.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Instructor"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={saving}
        message={`¿Eliminar a ${deleting?.nombre} ${deleting?.apellidos}?`}
      />
    </div>
  );
}
