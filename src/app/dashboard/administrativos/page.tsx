"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Perfil, Sede } from "@/types/database";
import { Plus, UserCog, Power, Pencil } from "lucide-react";

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
  const { perfil } = useAuth();

  const [data, setData] = useState<AdminRow[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [deleting, setDeleting] = useState<AdminRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const canEdit =
    perfil?.rol === "super_admin" ||
    perfil?.rol === "admin_escuela" ||
    perfil?.rol === "admin_sede";

  useEffect(() => {
    if (!perfil?.escuela_id) return;

    let cancelled = false;

    const loadData = async () => {
      const supabase = createClient();

      const [adminsRes, sedesRes] = await Promise.all([
        supabase
          .from("perfiles")
          .select("*")
          .eq("rol", "administrativo")
          .eq("escuela_id", perfil.escuela_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("sedes")
          .select("*")
          .eq("escuela_id", perfil.escuela_id)
          .eq("estado", "activa")
          .order("es_principal", { ascending: false }),
      ]);

      if (cancelled) return;

      const sedesData = (sedesRes.data as Sede[]) || [];
      const sedesMap = new Map(sedesData.map((sede) => [sede.id, sede.nombre]));
      const rows = ((adminsRes.data as Perfil[]) || []).map((adminPerfil) => ({
        ...adminPerfil,
        sede_nombre: adminPerfil.sede_id ? sedesMap.get(adminPerfil.sede_id) ?? "—" : "—",
      }));

      const filtered =
        perfil.rol === "admin_sede" && perfil.sede_id
          ? rows.filter((row) => row.sede_id === perfil.sede_id)
          : rows;

      setSedes(sedesData);
      setData(filtered);
      setLoading(false);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id, perfil?.rol, perfil?.sede_id, reloadKey]);

  const openCreate = () => {
    setEditing(null);
    setForm({
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

    if (editing) {
      // EDITAR: actualizar directamente en la tabla perfiles
      const supabase = createClient();
      const { error: err } = await supabase
        .from("perfiles")
        .update({
          nombre: form.nombre.trim(),
          sede_id: form.sede_id,
        })
        .eq("id", editing.id);

      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    } else {
      // CREAR: llamar a la API que crea el usuario en Supabase Auth + perfil
      if (!form.cedula.trim()) {
        setError("La cédula es obligatoria para crear un administrativo.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/crear-administrativo-auth", {
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

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error al crear el administrativo.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalOpen(false);
    setReloadKey((value) => value + 1);
  };

  // Activar / desactivar
  const toggleActivo = async (row: AdminRow) => {
    const supabase = createClient();
    await supabase.from("perfiles").update({ activo: !row.activo }).eq("id", row.id);
    setReloadKey((value) => value + 1);
  };

  // Eliminar perfil
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("perfiles").delete().eq("id", deleting.id);
    setSaving(false);
    setDeleteOpen(false);
    setDeleting(null);
    setReloadKey((value) => value + 1);
  };

  const sedesDisponibles =
    perfil?.rol === "admin_sede" && perfil.sede_id
      ? sedes.filter((s) => s.id === perfil.sede_id)
      : sedes;

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
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <UserCog size={40} className="mx-auto text-[#86868b] mb-3" />
            <p className="text-sm text-[#86868b]">No hay administrativos registrados.</p>
            {canEdit && (
              <button
                onClick={openCreate}
                className="mt-4 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
              >
                Crear primer administrativo
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left pb-3 text-xs text-[#86868b] font-medium">Nombre</th>
                  <th className="text-left pb-3 text-xs text-[#86868b] font-medium">Correo / Cédula</th>
                  <th className="text-left pb-3 text-xs text-[#86868b] font-medium">Sede</th>
                  <th className="text-left pb-3 text-xs text-[#86868b] font-medium">Estado</th>
                  {canEdit && (
                    <th className="text-right pb-3 text-xs text-[#86868b] font-medium">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{row.nombre}</td>
                    <td className="py-3 text-[#86868b]">{row.email}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium">
                        {row.sede_nombre}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          row.activo
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {row.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(row)}
                            title="Editar"
                            className="apple-icon-button hover:text-[#0071e3]"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => toggleActivo(row)}
                            title={row.activo ? "Desactivar" : "Activar"}
                            className="apple-icon-button hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
                          >
                            <Power size={15} />
                          </button>
                          <button
                            onClick={() => { setDeleting(row); setDeleteOpen(true); }}
                            title="Eliminar"
                            className="apple-icon-button hover:text-red-500"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
