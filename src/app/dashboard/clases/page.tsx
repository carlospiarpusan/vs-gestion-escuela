"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useDashboardList } from "@/hooks/useDashboardList";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { getDashboardCatalogCached } from "@/lib/dashboard-client-cache";
import { fetchJsonWithRetry } from "@/lib/retry";
import type { Clase, TipoClase, EstadoClase, Alumno, Instructor, Vehiculo } from "@/types/database";
import { Plus } from "lucide-react";

type ClaseRow = Clase & { alumno_nombre?: string; instructor_nombre?: string };

const tiposClase: TipoClase[] = ["practica", "teorica"];
const estadosClase: EstadoClase[] = ["programada", "completada", "cancelada", "no_asistio"];

const emptyForm = {
  alumno_id: "",
  instructor_id: "",
  vehiculo_id: "",
  tipo: "practica" as TipoClase,
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  estado: "programada" as EstadoClase,
  notas: "",
};

const inputCls = "apple-input";

export default function ClasesPage() {
  const list = useDashboardList<ClaseRow>({ resource: "clases" });
  const { perfil } = list;

  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  // --- Load catalogs ─────────────────────────────────────────────────
  useEffect(() => {
    if (!perfil?.escuela_id) return;

    let cancelled = false;

    const loadCatalogs = async () => {
      const catalogs = await getDashboardCatalogCached<{
        alumnos: Alumno[];
        instructores: Instructor[];
        vehiculos: Vehiculo[];
      }>({
        name: "clases-form",
        scope: {
          id: perfil.id,
          rol: perfil.rol,
          escuelaId: perfil.escuela_id,
          sedeId: perfil.sede_id,
        },
        loader: () =>
          fetchJsonWithRetry<{
            alumnos: Alumno[];
            instructores: Instructor[];
            vehiculos: Vehiculo[];
          }>("/api/clases/catalogos"),
      });

      if (cancelled) return;
      setAlumnos(catalogs.alumnos);
      setInstructores(catalogs.instructores);
      setVehiculos(catalogs.vehiculos);
    };

    void loadCatalogs();

    return () => {
      cancelled = true;
    };
  }, [perfil?.escuela_id, perfil?.id, perfil?.rol, perfil?.sede_id]);

  // --- Modal helpers ─────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    setError("");
    list.openCreate();
  };

  const openEdit = (row: ClaseRow) => {
    setForm({
      alumno_id: row.alumno_id,
      instructor_id: row.instructor_id || "",
      vehiculo_id: row.vehiculo_id || "",
      tipo: row.tipo,
      fecha: row.fecha,
      hora_inicio: row.hora_inicio,
      hora_fin: row.hora_fin,
      estado: row.estado,
      notas: row.notas || "",
    });
    setError("");
    list.openEdit(row);
  };

  // --- Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.alumno_id || !form.fecha || !form.hora_inicio || !form.hora_fin) {
      setError("Alumno, fecha, hora inicio y hora fin son obligatorios.");
      return;
    }
    list.setSaving(true);
    setError("");

    try {
      const supabase = createClient();

      const payload = {
        alumno_id: form.alumno_id,
        instructor_id: form.instructor_id || null,
        vehiculo_id: form.vehiculo_id || null,
        tipo: form.tipo,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        estado: form.estado,
        notas: form.notas || null,
      };

      if (list.editing) {
        const { error: err } = await supabase
          .from("clases")
          .update(payload)
          .eq("id", list.editing!.id);
        if (err) {
          setError(err.message);
          list.setSaving(false);
          return;
        }
      } else {
        if (!perfil?.escuela_id) {
          setError("No se encontró una escuela activa para programar la clase.");
          list.setSaving(false);
          return;
        }

        let sedeId = perfil.sede_id;
        if (!sedeId) {
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
          setError("No se encontró una sede activa para programar la clase.");
          list.setSaving(false);
          return;
        }

        const { error: err } = await supabase.from("clases").insert({
          ...payload,
          escuela_id: perfil.escuela_id,
          sede_id: sedeId,
          user_id: perfil.id,
        });
        if (err) {
          setError(err.message);
          list.setSaving(false);
          return;
        }
      }

      list.setSaving(false);
      list.setModalOpen(false);
      await list.revalidateAndRefresh();
    } catch (networkError) {
      setError(
        networkError instanceof Error
          ? networkError.message
          : "Error de conexion inesperado al guardar la clase."
      );
      list.setSaving(false);
    }
  };

  // --- Delete ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!list.deleting) return;
    list.setSaving(true);

    try {
      const { error: err } = await createClient()
        .from("clases")
        .delete()
        .eq("id", list.deleting.id);
      if (err) {
        setError(err.message);
        list.setSaving(false);
        return;
      }
      list.setSaving(false);
      list.setDeleteOpen(false);
      list.setDeleting(null);
      await list.revalidateAndRefresh();
    } catch (networkError) {
      setError(
        networkError instanceof Error
          ? networkError.message
          : "Error de conexion inesperado al eliminar la clase."
      );
      list.setSaving(false);
    }
  };

  // --- Columns ───────────────────────────────────────────────────────
  const estadoColors: Record<string, string> = {
    programada: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completada: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelada: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    no_asistio: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  const columns = [
    { key: "fecha" as keyof ClaseRow, label: "Fecha" },
    {
      key: "hora_inicio" as keyof ClaseRow,
      label: "Horario",
      render: (r: ClaseRow) => (
        <span>
          {r.hora_inicio?.slice(0, 5)} - {r.hora_fin?.slice(0, 5)}
        </span>
      ),
    },
    {
      key: "alumno_nombre" as keyof ClaseRow,
      label: "Alumno",
      render: (r: ClaseRow) => <span>{r.alumno_nombre}</span>,
    },
    {
      key: "instructor_nombre" as keyof ClaseRow,
      label: "Instructor",
      render: (r: ClaseRow) => <span>{r.instructor_nombre}</span>,
    },
    {
      key: "tipo" as keyof ClaseRow,
      label: "Tipo",
      render: (r: ClaseRow) => (
        <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-xs font-medium text-[#0071e3]">
          {r.tipo}
        </span>
      ),
    },
    {
      key: "estado" as keyof ClaseRow,
      label: "Estado",
      render: (r: ClaseRow) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoColors[r.estado]}`}>
          {r.estado.replace("_", " ")}
        </span>
      ),
    },
  ];

  // --- Render ────────────────────────────────────────────────────────
  return (
    <div>
      <div className="animate-fade-in mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Clases
          </h2>
          <p className="mt-2 text-lg font-medium text-[#86868b]">Programa y gestiona las clases</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED]"
        >
          <Plus size={16} /> Nueva Clase
        </button>
      </div>

      <div className="animate-fade-in rounded-3xl border border-gray-100 bg-white p-6 shadow-sm delay-100 sm:p-8 dark:border-gray-800 dark:bg-[#1d1d1f]">
        {list.tableError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {list.tableError}
          </div>
        )}
        <DataTable
          columns={columns}
          data={list.data}
          loading={list.loading}
          searchPlaceholder="Buscar por fecha, tipo, estado..."
          onEdit={openEdit}
          onDelete={(row) => {
            list.setDeleting(row);
            list.setDeleteOpen(true);
          }}
          serverSide
          totalCount={list.totalCount}
          currentPage={list.currentPage}
          onPageChange={list.handlePageChange}
          onSearchChange={list.handleSearchChange}
          pageSize={list.pageSize}
        />
      </div>

      <Modal
        open={list.modalOpen}
        onClose={() => list.setModalOpen(false)}
        title={list.editing ? "Editar Clase" : "Nueva Clase"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Alumno *</label>
            <select
              value={form.alumno_id}
              onChange={(e) => setForm({ ...form, alumno_id: e.target.value })}
              className={inputCls}
            >
              <option value="">Seleccionar alumno...</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.apellidos}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Instructor</label>
              <select
                value={form.instructor_id}
                onChange={(e) => setForm({ ...form, instructor_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Sin asignar</option>
                {instructores.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} {i.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Vehículo</label>
              <select
                value={form.vehiculo_id}
                onChange={(e) => setForm({ ...form, vehiculo_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Sin asignar</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} ({v.matricula})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoClase })}
                className={inputCls}
              >
                {tiposClase.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoClase })}
                className={inputCls}
              >
                {estadosClase.map((e) => (
                  <option key={e} value={e}>
                    {e.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Fecha *</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Hora inicio *</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Hora fin *</label>
              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className={`${inputCls} resize-none`}
            />
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
              {list.saving ? "Guardando..." : list.editing ? "Guardar Cambios" : "Crear Clase"}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteConfirm
        open={list.deleteOpen}
        onClose={() => list.setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={list.saving}
        message="¿Eliminar esta clase?"
      />
    </div>
  );
}
