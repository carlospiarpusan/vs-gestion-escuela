"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useDraftForm } from "@/hooks/useDraftForm";
import { useDashboardList } from "@/hooks/useDashboardList";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { fetchJsonWithRetry } from "@/lib/retry";
import { getDashboardCatalogCached } from "@/lib/dashboard-client-cache";
import { canAuditedRolePerformAction, isAuditedRole } from "@/lib/role-capabilities";
import type { Perfil, Sede } from "@/types/database";
import { Plus, Power } from "lucide-react";

interface AdminRow extends Perfil {
  sede_nombre?: string;
}

const emptyForm = {
  nombre: "",
  cedula: "",
  email: "",
  sede_id: "",
};

const inputCls = "apple-input";
const labelCls = "apple-label";

export default function AdministrativosPage() {
  const list = useDashboardList<AdminRow>({ resource: "administrativos" });
  const { perfil } = list;

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [error, setError] = useState("");
  const {
    value: form,
    setValue: setForm,
    restoreDraft,
    clearDraft,
  } = useDraftForm("dashboard:administrativos:form", emptyForm, {
    persist: list.modalOpen && !list.editing,
  });

  const auditedRole = isAuditedRole(perfil?.rol) ? perfil.rol : null;
  const canEdit = canAuditedRolePerformAction(auditedRole, "staff", "create");

  // --- Load sedes catalog ─────────────────────────────────────────────
  useEffect(() => {
    if (!perfil?.escuela_id) return;

    let cancelled = false;

    const loadSedes = async () => {
      const sedesData = await getDashboardCatalogCached<Sede[]>({
        name: "administrativos-sedes",
        scope: {
          id: perfil.id,
          rol: perfil.rol,
          escuelaId: perfil.escuela_id,
          sedeId: perfil.sede_id,
        },
        loader: async () => {
          const supabase = createClient();
          const { data } = await supabase
            .from("sedes")
            .select("*")
            .eq("escuela_id", perfil.escuela_id)
            .eq("estado", "activa")
            .order("es_principal", { ascending: false });

          return (data as Sede[]) || [];
        },
      });

      if (cancelled) return;
      setSedes(sedesData);
    };

    void loadSedes();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id, perfil?.id, perfil?.rol, perfil?.sede_id]);

  // --- Modal helpers ──────────────────────────────────────────────────

  const openCreate = () => {
    restoreDraft({
      ...emptyForm,
      sede_id: perfil?.rol === "admin_sede" && perfil.sede_id ? perfil.sede_id : "",
    });
    setError("");
    list.openCreate();
  };

  const openEdit = (row: AdminRow) => {
    setForm({
      nombre: row.nombre,
      cedula: "",
      email: row.email,
      sede_id: row.sede_id ?? "",
    });
    setError("");
    list.openEdit(row);
  };

  // --- Save ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.sede_id) {
      setError("Nombre y sede son obligatorios.");
      return;
    }
    if (!perfil?.escuela_id) return;

    list.setSaving(true);
    setError("");

    try {
      if (list.editing) {
        await fetchJsonWithRetry("/api/administrativos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: list.editing.id,
            nombre: form.nombre.trim(),
            sede_id: form.sede_id,
          }),
        });
      } else {
        if (!form.cedula.trim()) {
          setError("La cédula es obligatoria para crear un administrativo.");
          list.setSaving(false);
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
      list.setSaving(false);
      list.setModalOpen(false);
      await list.revalidateAndRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar el administrativo.");
      list.setSaving(false);
    }
  };

  // --- Toggle active ──────────────────────────────────────────────────

  const toggleActivo = async (row: AdminRow) => {
    await fetchJsonWithRetry("/api/administrativos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        activo: !row.activo,
      }),
    });
    await list.revalidateAndRefresh();
  };

  // --- Delete ─────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!list.deleting) return;
    list.setSaving(true);
    try {
      await fetchJsonWithRetry("/api/administrativos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: list.deleting.id }),
      });
      list.setSaving(false);
      list.setDeleteOpen(false);
      list.setDeleting(null);
      await list.revalidateAndRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar el administrativo.");
      list.setSaving(false);
    }
  };

  // --- Derived data ───────────────────────────────────────────────────

  const sedesDisponibles =
    perfil?.rol === "admin_sede" && perfil.sede_id
      ? sedes.filter((s) => s.id === perfil.sede_id)
      : sedes;

  const tableRows = useMemo(() => {
    const sedesMap = new Map(sedes.map((sede) => [sede.id, sede.nombre]));
    return list.data.map((row) => ({
      ...row,
      sede_nombre: row.sede_nombre ?? (row.sede_id ? (sedesMap.get(row.sede_id) ?? "—") : "—"),
    }));
  }, [list.data, sedes]);

  const columns = useMemo(
    () => [
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
    ],
    []
  );

  // --- Render ─────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Administrativos
          </h2>
          <p className="mt-0.5 text-sm text-[#86868b]">
            {canEdit
              ? "Gestiona los administrativos asignados a cada sede"
              : "Consulta los administrativos visibles dentro de tu alcance"}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED]"
          >
            <Plus size={16} /> Nuevo Administrativo
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        {list.tableError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {list.tableError}
          </div>
        )}

        <DataTable
          columns={columns}
          data={tableRows}
          loading={list.loading}
          searchPlaceholder="Buscar por nombre o correo..."
          serverSide
          totalCount={list.totalCount}
          currentPage={list.currentPage}
          onPageChange={list.handlePageChange}
          onSearchChange={list.handleSearchChange}
          pageSize={list.pageSize}
          onEdit={canEdit ? openEdit : undefined}
          onDelete={
            canEdit
              ? (row) => {
                  list.setDeleting(row);
                  list.setDeleteOpen(true);
                }
              : undefined
          }
          extraActions={
            canEdit
              ? (row) => (
                  <button
                    onClick={() => toggleActivo(row)}
                    title={row.activo ? "Desactivar" : "Activar"}
                    className="apple-icon-button hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
                  >
                    <Power size={14} />
                  </button>
                )
              : undefined
          }
        />
      </div>

      {/* Modal crear / editar */}
      <Modal
        open={list.modalOpen}
        onClose={() => list.setModalOpen(false)}
        title={list.editing ? "Editar Administrativo" : "Nuevo Administrativo"}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {error}
            </p>
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
          {!list.editing && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Cédula *</label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  placeholder="Número de cédula"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-[#86868b]">Usada como contraseña inicial</p>
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
          {list.editing && (
            <div>
              <label className={labelCls}>Correo / Cédula</label>
              <input
                type="text"
                value={form.email}
                disabled
                className={`${inputCls} cursor-not-allowed opacity-50`}
              />
              <p className="mt-1 text-xs text-[#86868b]">
                Las credenciales de acceso no se pueden cambiar aquí.
              </p>
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
                  {s.nombre}
                  {s.es_principal ? " (Principal)" : ""}
                </option>
              ))}
            </select>
          </div>

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
              {list.saving
                ? "Guardando..."
                : list.editing
                  ? "Guardar Cambios"
                  : "Crear Administrativo"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmar eliminar */}
      <DeleteConfirm
        open={list.deleteOpen}
        onClose={() => list.setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={list.saving}
        message={`¿Eliminar al administrativo "${list.deleting?.nombre}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
