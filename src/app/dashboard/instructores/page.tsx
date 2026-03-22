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

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useDraftForm } from "@/hooks/useDraftForm";
import { useDashboardList } from "@/hooks/useDashboardList";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { fetchJsonWithRetry, runSupabaseMutationWithRetry } from "@/lib/retry";
import { fetchSchoolCategories } from "@/lib/school-categories";
import type { Instructor, EstadoInstructor } from "@/types/database";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { instructorSchema } from "./schemas";

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
  const list = useDashboardList<Instructor>({ resource: "instructores" });
  const { perfil } = list;

  const [categoriasEscuela, setCategoriasEscuela] = useState<string[]>([]);
  const {
    value: form,
    setValue: setForm,
    restoreDraft,
    clearDraft,
  } = useDraftForm("dashboard:instructores:form", emptyForm, {
    persist: list.modalOpen && !list.editing,
  });

  // --- Load school categories ─────────────────────────────────────────
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

  // --- Modal helpers ──────────────────────────────────────────────────

  const openCreate = () => {
    restoreDraft(emptyForm);
    list.openCreate();
  };

  const openEdit = (row: Instructor) => {
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
    list.openEdit(row);
  };

  const toggleEspecialidad = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      especialidades: prev.especialidades.includes(cat)
        ? prev.especialidades.filter((e) => e !== cat)
        : [...prev.especialidades, cat],
    }));
  };

  // --- Save (create / update) ─────────────────────────────────────────

  const handleSave = async () => {
    const result = instructorSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message || "Verifica los datos del formulario.");
      return;
    }
    list.setSaving(true);

    const especialidadPrincipal = form.especialidades[0];

    try {
      const supabase = createClient();

      if (list.editing) {
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
            .eq("id", list.editing!.id)
        );
      } else {
        if (!perfil) {
          toast.error("No se encontró el perfil activo para guardar.");
          list.setSaving(false);
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
          list.setSaving(false);
          return;
        }

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
      list.setSaving(false);
      list.setModalOpen(false);
      toast.success(list.editing ? "Instructor actualizado" : "Instructor creado");
      await list.revalidateAndRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al guardar.";
      toast.error(message);
      list.setSaving(false);
    }
  };

  // --- Delete ─────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!list.deleting) return;
    list.setSaving(true);

    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("instructores")
        .delete()
        .eq("id", list.deleting.id);

      if (err) {
        toast.error(err.message);
        list.setSaving(false);
        return;
      }

      list.setSaving(false);
      list.setDeleteOpen(false);
      list.setDeleting(null);
      toast.success("Instructor eliminado");
      await list.revalidateAndRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al eliminar.";
      toast.error(message);
      list.setSaving(false);
    }
  };

  // --- Table columns ──────────────────────────────────────────────────

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

  // --- Render ─────────────────────────────────────────────────────────

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
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED]"
        >
          <Plus size={16} /> Nuevo Instructor
        </button>
      </div>

      {/* Data table */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        {list.tableError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {list.tableError}
          </div>
        )}
        <DataTable
          columns={columns}
          data={list.data}
          loading={list.loading}
          searchPlaceholder="Buscar por nombre o cédula..."
          serverSide
          totalCount={list.totalCount}
          currentPage={list.currentPage}
          onPageChange={list.handlePageChange}
          onSearchChange={list.handleSearchChange}
          pageSize={list.pageSize}
          onEdit={openEdit}
          onDelete={list.openDelete}
        />
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={list.modalOpen}
        onClose={() => list.setModalOpen(false)}
        title={list.editing ? "Editar Instructor" : "Nuevo Instructor"}
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
              onClick={() => list.setModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={list.saving}
              className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
            >
              {list.saving ? "Guardando..." : list.editing ? "Guardar Cambios" : "Crear Instructor"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <DeleteConfirm
        open={list.deleteOpen}
        onClose={() => list.setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={list.saving}
        message={`¿Eliminar a ${list.deleting?.nombre} ${list.deleting?.apellidos}?`}
      />
    </div>
  );
}
