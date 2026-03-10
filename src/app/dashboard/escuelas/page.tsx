"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Escuela, EstadoEscuela, PlanEscuela } from "@/types/database";
import { Plus, Building2, Eye, EyeOff } from "lucide-react";

const planes: PlanEscuela[] = ["gratuito", "basico", "profesional", "enterprise"];
const estados: EstadoEscuela[] = ["activa", "inactiva", "suspendida"];

const CATEGORIAS_INDIVIDUALES = ["A1", "A2", "B1", "C1", "RC1", "C2", "C3"];
const CATEGORIAS_COMBO = [
  "A2 y B1", "A2 y C1", "A2 y RC1", "A2 y C2", "A2 y C3",
  "A1 y B1", "A1 y C1", "A1 y RC1", "A1 y C2", "A1 y C3",
];

const emptyEscuelaForm = {
  nombre: "",
  cif: "",
  telefono: "",
  email: "",
  direccion: "",
  plan: "basico" as PlanEscuela,
  estado: "activa" as EstadoEscuela,
  max_alumnos: 50,
  max_sedes: 1,
  categorias: [] as string[],
};

const emptyAdminForm = {
  nombre: "",
  email: "",
  password: "",
};

const inputClass = "apple-input";

const labelClass = "apple-label";

export default function EscuelasPage() {
  const { perfil } = useAuth();

  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Escuela | null>(null);
  const [deleting, setDeleting] = useState<Escuela | null>(null);
  const [saving, setSaving] = useState(false);
  const [escuelaForm, setEscuelaForm] = useState(emptyEscuelaForm);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [crearAdmin, setCrearAdmin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const fetchEscuelas = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("escuelas")
      .select("*")
      .order("created_at", { ascending: false });
    setEscuelas((data as Escuela[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (perfil) fetchEscuelas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  const openCreate = () => {
    setEditing(null);
    setEscuelaForm(emptyEscuelaForm);
    setAdminForm(emptyAdminForm);
    setCrearAdmin(true);
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const toggleCategoria = (cat: string) => {
    setEscuelaForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
        ? prev.categorias.filter((c) => c !== cat)
        : [...prev.categorias, cat],
    }));
  };

  const openEdit = (escuela: Escuela) => {
    setEditing(escuela);
    setEscuelaForm({
      nombre: escuela.nombre,
      cif: escuela.cif || "",
      telefono: escuela.telefono || "",
      email: escuela.email || "",
      direccion: escuela.direccion || "",
      plan: escuela.plan,
      estado: escuela.estado,
      max_alumnos: escuela.max_alumnos,
      max_sedes: escuela.max_sedes,
      categorias: escuela.categorias || [],
    });
    setAdminForm(emptyAdminForm);
    setCrearAdmin(false);
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const openDelete = (escuela: Escuela) => {
    setDeleting(escuela);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!escuelaForm.nombre.trim() || !escuelaForm.cif.trim()) {
      setError("El nombre y el NIT son obligatorios.");
      return;
    }
    if (!editing && crearAdmin) {
      if (!adminForm.nombre.trim() || !adminForm.email.trim() || !adminForm.password) {
        setError("Completa todos los datos del administrador.");
        return;
      }
      if (adminForm.password.length < 6) {
        setError("La contraseña del administrador debe tener al menos 6 caracteres.");
        return;
      }
    }

    setSaving(true);
    setError("");
    const supabase = createClient();

    try {
      if (editing) {
        const { error } = await supabase
          .from("escuelas")
          .update({
            nombre: escuelaForm.nombre,
            cif: escuelaForm.cif,
            telefono: escuelaForm.telefono || null,
            email: escuelaForm.email || null,
            direccion: escuelaForm.direccion || null,
            plan: escuelaForm.plan,
            estado: escuelaForm.estado,
            max_alumnos: escuelaForm.max_alumnos,
            max_sedes: escuelaForm.max_sedes,
            categorias: escuelaForm.categorias,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: nuevaEscuela, error: errEscuela } = await supabase
          .from("escuelas")
          .insert([{
            nombre: escuelaForm.nombre,
            cif: escuelaForm.cif,
            telefono: escuelaForm.telefono || null,
            email: escuelaForm.email || null,
            direccion: escuelaForm.direccion || null,
            plan: escuelaForm.plan,
            estado: escuelaForm.estado,
            max_alumnos: escuelaForm.max_alumnos,
            max_sedes: escuelaForm.max_sedes,
            categorias: escuelaForm.categorias,
            fecha_alta: new Date().toISOString().split("T")[0],
          }])
          .select()
          .single();

        if (errEscuela) throw errEscuela;

        if (nuevaEscuela) {
          // Crear Sede 1 automáticamente como sede principal
          await supabase.from("sedes").insert([{
            escuela_id: nuevaEscuela.id,
            nombre: "Sede 1",
            direccion: escuelaForm.direccion || null,
            telefono: escuelaForm.telefono || null,
            email: escuelaForm.email || null,
            es_principal: true,
            estado: "activa",
          }]);

          if (crearAdmin) {
            const res = await fetch("/api/crear-admin-escuela", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                escuela_id: nuevaEscuela.id,
                nombre: adminForm.nombre,
                email: adminForm.email,
                password: adminForm.password,
              }),
            });
            const json = await res.json();
            if (!res.ok) {
              // Rollback: eliminar sede y escuela para no dejar datos huérfanos
              await supabase.from("sedes").delete().eq("escuela_id", nuevaEscuela.id);
              await supabase.from("escuelas").delete().eq("id", nuevaEscuela.id);
              throw new Error(json.error || "Error al crear el administrador");
            }
          }
        }
      }

      setModalOpen(false);
      fetchEscuelas();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al guardar";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    setDeleteError("");
    try {
      const supabase = createClient();
      const id = deleting.id;

      // Eliminar en cascada todos los registros relacionados
      await supabase.from("mantenimiento_vehiculos").delete().eq("escuela_id", id);
      await supabase.from("ingresos").delete().eq("escuela_id", id);
      await supabase.from("gastos").delete().eq("escuela_id", id);
      await supabase.from("examenes").delete().eq("escuela_id", id);
      await supabase.from("clases").delete().eq("escuela_id", id);
      await supabase.from("vehiculos").delete().eq("escuela_id", id);
      await supabase.from("instructores").delete().eq("escuela_id", id);
      await supabase.from("alumnos").delete().eq("escuela_id", id);
      // Eliminar perfiles ANTES de sedes para evitar que ON DELETE SET NULL
      // en perfiles.sede_id viole el check constraint perfiles_jerarquia
      await supabase.from("perfiles").delete().eq("escuela_id", id);
      await supabase.from("sedes").delete().eq("escuela_id", id);

      const { error } = await supabase.from("escuelas").delete().eq("id", id);
      if (error) throw error;

      setDeleteOpen(false);
      setDeleting(null);
      fetchEscuelas();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al eliminar";
      setDeleteError(msg);
    } finally {
      setSaving(false);
    }
  };

  const planColors: Record<string, string> = {
    gratuito: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    basico: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    profesional: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  const estadoColors: Record<string, string> = {
    activa: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    inactiva: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    suspendida: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const columns = [
    {
      key: "nombre" as keyof Escuela,
      label: "Escuela",
      render: (row: Escuela) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
            <Building2 size={14} className="text-[#0071e3]" />
          </div>
          <div>
            <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{row.nombre}</p>
            {row.direccion && (
              <p className="text-xs text-[#86868b]">{row.direccion}</p>
            )}
          </div>
        </div>
      ),
    },
    { key: "cif" as keyof Escuela, label: "NIT" },
    { key: "telefono" as keyof Escuela, label: "Teléfono" },
    { key: "email" as keyof Escuela, label: "Correo" },
    {
      key: "plan" as keyof Escuela,
      label: "Plan",
      render: (row: Escuela) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${planColors[row.plan]}`}>
          {row.plan}
        </span>
      ),
    },
    {
      key: "categorias" as keyof Escuela,
      label: "Categorías",
      render: (row: Escuela) => {
        const cats = row.categorias || [];
        if (cats.length === 0) return <span className="text-[#86868b] text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <span key={c} className="px-1.5 py-0.5 text-[10px] rounded-md bg-[#0071e3]/10 text-[#0071e3] font-semibold">
                {c}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "estado" as keyof Escuela,
      label: "Estado",
      render: (row: Escuela) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${estadoColors[row.estado]}`}>
          {row.estado}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Escuelas
          </h2>
          <p className="text-sm text-[#86868b] mt-0.5">
            Gestiona todas las autoescuelas de la plataforma
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} />
          Nueva Escuela
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <DataTable
          columns={columns}
          data={escuelas}
          loading={loading}
          searchPlaceholder="Buscar por nombre o NIT..."
          searchKeys={["nombre", "cif", "email"]}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Escuela" : "Nueva Escuela"}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Sección: Datos de la escuela */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-3">
              Datos de la escuela
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input
                    type="text"
                    value={escuelaForm.nombre}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, nombre: e.target.value })}
                    placeholder="AutoEscuela Ejemplo"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>NIT *</label>
                  <input
                    type="text"
                    value={escuelaForm.cif}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, cif: e.target.value })}
                    placeholder="900.123.456-7"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input
                    type="tel"
                    value={escuelaForm.telefono}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, telefono: e.target.value })}
                    placeholder="601 234 567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Correo</label>
                  <input
                    type="email"
                    value={escuelaForm.email}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, email: e.target.value })}
                    placeholder="info@escuela.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  type="text"
                  value={escuelaForm.direccion}
                  onChange={(e) => setEscuelaForm({ ...escuelaForm, direccion: e.target.value })}
                  placeholder="Calle Principal #123, Ciudad"
                  className={inputClass}
                />
              </div>

              {/* Categorías habilitadas */}
              <div>
                <label className={labelClass}>
                  Categorías habilitadas{" "}
                  <span className="normal-case font-normal">
                    ({escuelaForm.categorias.length} seleccionada{escuelaForm.categorias.length !== 1 ? "s" : ""})
                  </span>
                </label>
                <div className="space-y-2 mt-1">
                  <div>
                    <p className="text-[10px] text-[#86868b] mb-1.5">Individuales</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIAS_INDIVIDUALES.map((cat) => {
                        const sel = escuelaForm.categorias.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategoria(cat)}
                            className={`px-3 py-1 text-xs rounded-lg font-semibold border-2 transition-colors ${
                              sel
                                ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                                : "border-gray-200 dark:border-gray-700 text-[#86868b] hover:border-gray-300"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#86868b] mb-1.5">Combos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIAS_COMBO.map((cat) => {
                        const sel = escuelaForm.categorias.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategoria(cat)}
                            className={`px-3 py-1 text-xs rounded-lg font-semibold border-2 transition-colors ${
                              sel
                                ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                                : "border-gray-200 dark:border-gray-700 text-[#86868b] hover:border-gray-300"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Plan</label>
                  <select
                    value={escuelaForm.plan}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, plan: e.target.value as PlanEscuela })}
                    className={inputClass}
                  >
                    {planes.map((p) => (
                      <option key={p} value={p} className="capitalize">{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Estado</label>
                  <select
                    value={escuelaForm.estado}
                    onChange={(e) => setEscuelaForm({ ...escuelaForm, estado: e.target.value as EstadoEscuela })}
                    className={inputClass}
                  >
                    {estados.map((e) => (
                      <option key={e} value={e} className="capitalize">{e}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Sección: Administrador (solo en creación) */}
          {!editing && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b]">
                  Administrador de la escuela
                </p>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={crearAdmin}
                    onChange={(e) => setCrearAdmin(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#0071e3]"
                  />
                  <span className="text-xs text-[#86868b]">Crear ahora</span>
                </label>
              </div>

              {crearAdmin ? (
                <div className="space-y-3 p-4 rounded-xl bg-[#f5f5f7] dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800">
                  <div>
                    <label className={labelClass}>Nombre completo *</label>
                    <input
                      type="text"
                      value={adminForm.nombre}
                      onChange={(e) => setAdminForm({ ...adminForm, nombre: e.target.value })}
                      placeholder="Carlos García"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Correo *</label>
                      <input
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                        placeholder="admin@escuela.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Contraseña *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={adminForm.password}
                          onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                          placeholder="Mín. 6 caracteres"
                          className={`${inputClass} pr-9`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#86868b] px-1">
                  Podrás crear el administrador más adelante desde el panel de usuarios.
                </p>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-1">
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
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Escuela"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Error eliminación */}
      {deleteError && deleteOpen && (
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center">
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg shadow-lg border border-red-200 dark:border-red-800">
            {deleteError}
          </p>
        </div>
      )}

      {/* Confirmación eliminar */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(""); }}
        onConfirm={handleDelete}
        loading={saving}
        message={`¿Eliminar la escuela "${deleting?.nombre}"? Se eliminarán todos sus datos. Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
