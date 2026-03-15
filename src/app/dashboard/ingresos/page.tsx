"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import {
  AccountingSectionTabs,
  AccountingWorkspaceHeader,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { runSupabaseMutationWithRetry } from "@/lib/retry";
import { INCOME_SECTION_ITEMS, type IncomeSection } from "@/lib/income-view";
import type { CategoriaIngreso, EstadoIngreso, MetodoPago } from "@/types/database";
import { Download, Plus } from "lucide-react";

import CajaDiariaSection from "./CajaDiariaSection";
import CarteraSection from "./CarteraSection";
import LibroSection from "./LibroSection";
import {
  type AlumnoOption,
  categorias,
  emptyForm,
  fetchAllAlumnoOptions,
  fetchAllMatriculaOptions,
  formatMatriculaLabel,
  type IngresoFormData,
  type IngresoRow,
  inputCls,
  labelCls,
  type MatriculaOption,
  metodos,
  estadosIngreso,
} from "./shared";

function parseSection(value: string | null): IncomeSection {
  if (value === "panel" || value === "libro") return "libro";
  if (value === "cartera" || value === "caja") return value;
  return "libro";
}

export default function IngresosPage() {
  const { perfil } = useAuth();
  const searchParams = useSearchParams();

  // ─── Section ──────────────────────────────────────────────────────

  const [activeSection, setActiveSection] = useState<IncomeSection>(
    parseSection(searchParams.get("section"))
  );

  useEffect(() => {
    setActiveSection(parseSection(searchParams.get("section")));
  }, [searchParams]);

  // ─── Catalogs ─────────────────────────────────────────────────────

  const [alumnos, setAlumnos] = useState<AlumnoOption[]>([]);
  const [matriculas, setMatriculas] = useState<MatriculaOption[]>([]);
  const catalogFetchIdRef = useRef(0);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const escuelaId = perfil.escuela_id;
    const fetchId = ++catalogFetchIdRef.current;
    const supabase = createClient();

    const load = async () => {
      try {
        const [a, m] = await Promise.all([
          fetchAllAlumnoOptions(supabase, escuelaId),
          fetchAllMatriculaOptions(supabase, escuelaId),
        ]);
        if (fetchId !== catalogFetchIdRef.current) return;
        setAlumnos(a);
        setMatriculas(m);
      } catch (err) {
        console.error("[IngresosPage] Error cargando catálogos:", err);
      }
    };

    void load();
  }, [perfil?.escuela_id]);

  // ─── CRUD state ───────────────────────────────────────────────────

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<IngresoRow | null>(null);
  const [deleting, setDeleting] = useState<IngresoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const {
    value: form,
    setValue: setForm,
    restoreDraft,
    clearDraft,
  } = useDraftForm("dashboard:ingresos:form", emptyForm, {
    persist: modalOpen && !editing,
  });

  const matriculasDisponibles = useMemo(
    () => (form.alumno_id ? matriculas.filter((m) => m.alumno_id === form.alumno_id) : []),
    [form.alumno_id, matriculas]
  );

  // ─── Export CSV ───────────────────────────────────────────────────

  const [exporting, setExporting] = useState(false);
  const exportCsvRef = useRef<(() => Promise<void>) | null>(null);

  const handleExportCsv = async () => {
    if (!exportCsvRef.current) return;
    setExporting(true);
    try {
      await exportCsvRef.current();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo exportar.");
    } finally {
      setExporting(false);
    }
  };

  // ─── CRUD handlers ────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    restoreDraft(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (row: IngresoRow) => {
    setEditing(row);
    setForm({
      alumno_id: row.alumno_id || "",
      matricula_id: row.matricula_id || "",
      categoria: row.categoria,
      concepto: row.concepto,
      monto: row.monto.toString(),
      metodo_pago: row.metodo_pago,
      medio_especifico: row.medio_especifico || "",
      numero_factura: row.numero_factura || "",
      fecha: row.fecha,
      fecha_vencimiento: row.fecha_vencimiento || row.fecha,
      estado: row.estado,
      notas: row.notas || "",
    });
    setError("");
    setModalOpen(true);
  };

  const openDelete = (row: IngresoRow) => {
    setDeleting(row);
    setDeleteOpen(true);
  };

  const handleAlumnoChange = (alumnoId: string) => {
    const opciones = matriculas.filter((m) => m.alumno_id === alumnoId);
    setForm((prev) => ({
      ...prev,
      alumno_id: alumnoId,
      matricula_id: opciones.length === 1 ? opciones[0].id : "",
    }));
  };

  const handleSave = async () => {
    if (!form.concepto || !form.monto) {
      setError("Concepto y monto son obligatorios.");
      return;
    }

    const montoNum = parseFloat(form.monto);
    if (Number.isNaN(montoNum)) {
      setError("El monto debe ser un valor numérico válido.");
      return;
    }

    const matriculasDelAlumno = form.alumno_id
      ? matriculas.filter((m) => m.alumno_id === form.alumno_id)
      : [];
    if (form.alumno_id && matriculasDelAlumno.length > 0 && !form.matricula_id) {
      setError("Selecciona la matrícula a la que corresponde este ingreso.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const supabase = createClient();
      const payload = {
        alumno_id: form.alumno_id || null,
        matricula_id: form.matricula_id || null,
        categoria: form.categoria,
        concepto: form.concepto,
        monto: montoNum,
        metodo_pago: form.metodo_pago,
        medio_especifico: form.medio_especifico || null,
        numero_factura: form.numero_factura || null,
        fecha: form.fecha,
        fecha_vencimiento: form.fecha_vencimiento || form.fecha,
        estado: form.estado,
        notas: form.notas || null,
      };

      if (editing) {
        await runSupabaseMutationWithRetry(() =>
          supabase.from("ingresos").update(payload).eq("id", editing.id)
        );
      } else {
        if (!perfil) {
          setError("No se encontró el perfil activo para guardar.");
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
            .single();
          sedeId = sedeData?.id || null;
        }

        await runSupabaseMutationWithRetry(() =>
          supabase.from("ingresos").insert({
            ...payload,
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
            user_id: perfil.id,
          })
        );
      }

      clearDraft(emptyForm);
      setSaving(false);
      setModalOpen(false);
      setReloadKey((v) => v + 1);
    } catch (networkErr: unknown) {
      setError(networkErr instanceof Error ? networkErr.message : "Error de red al guardar.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const { error: deleteError } = await createClient()
        .from("ingresos")
        .delete()
        .eq("id", deleting.id);
      if (deleteError) {
        setError(deleteError.message);
        setSaving(false);
        return;
      }
      setSaving(false);
      setDeleteOpen(false);
      setDeleting(null);
      setReloadKey((v) => v + 1);
    } catch (networkErr: unknown) {
      setError(networkErr instanceof Error ? networkErr.message : "Error de red al eliminar.");
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────

  if (!perfil?.escuela_id) return null;

  const escuelaId = perfil.escuela_id;

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Ingresos"
        title="Ingresos"
        description="Libro de recaudo, cartera y caja diaria."
        actions={
          <>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
            >
              <Plus size={16} />
              Nuevo ingreso
            </button>
            {activeSection !== "caja" && (
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 px-4 py-2.5 text-sm font-semibold text-[#0071e3] transition-colors hover:bg-[#0071e3]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]"
              >
                <Download size={16} />
                {exporting ? "Exportando CSV..." : "Exportar CSV"}
              </button>
            )}
          </>
        }
      />

      <div className="mb-4">
        <AccountingSectionTabs
          value={activeSection}
          items={INCOME_SECTION_ITEMS}
          onChange={setActiveSection}
        />
      </div>

      {activeSection === "libro" && (
        <LibroSection
          escuelaId={escuelaId}
          alumnos={alumnos}
          matriculas={matriculas}
          reloadKey={reloadKey}
          onEdit={openEdit}
          onDelete={openDelete}
          exportCsvRef={exportCsvRef}
        />
      )}

      {activeSection === "cartera" && (
        <CarteraSection
          escuelaId={escuelaId}
          alumnos={alumnos}
          reloadKey={reloadKey}
          exportCsvRef={exportCsvRef}
        />
      )}

      {activeSection === "caja" && (
        <CajaDiariaSection escuelaId={escuelaId} alumnos={alumnos} reloadKey={reloadKey} />
      )}

      {/* CRUD Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Ingreso" : "Nuevo Ingreso"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value as CategoriaIngreso })
                }
                className={inputCls}
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Alumno</label>
              <select
                value={form.alumno_id}
                onChange={(e) => handleAlumnoChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Sin alumno</option>
                {alumnos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.apellidos}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Matrícula</label>
            <select
              value={form.matricula_id}
              onChange={(e) => setForm({ ...form, matricula_id: e.target.value })}
              className={inputCls}
              disabled={!form.alumno_id || matriculasDisponibles.length === 0}
            >
              <option value="">
                {!form.alumno_id
                  ? "Selecciona primero un alumno"
                  : matriculasDisponibles.length === 0
                    ? "El alumno no tiene matrículas"
                    : "Selecciona una matrícula"}
              </option>
              {matriculasDisponibles.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatMatriculaLabel(m)}
                </option>
              ))}
            </select>
            {form.alumno_id && matriculasDisponibles.length > 1 && (
              <p className="mt-1 text-[11px] text-[#86868b]">
                El alumno tiene varios cursos; registra el ingreso en la matrícula correcta.
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>Concepto *</label>
            <input
              type="text"
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={labelCls}>Monto *</label>
              <input
                type="number"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Método de pago</label>
              <select
                value={form.metodo_pago}
                onChange={(e) => setForm({ ...form, metodo_pago: e.target.value as MetodoPago })}
                className={inputCls}
              >
                {metodos.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    fecha: e.target.value,
                    fecha_vencimiento:
                      !prev.fecha_vencimiento || prev.fecha_vencimiento === prev.fecha
                        ? e.target.value
                        : prev.fecha_vencimiento,
                  }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Vencimiento</label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoIngreso })}
                className={inputCls}
              >
                {estadosIngreso.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Medio específico</label>
              <input
                type="text"
                value={form.medio_especifico}
                onChange={(e) => setForm({ ...form, medio_especifico: e.target.value })}
                className={inputCls}
                placeholder="Ej: Nequi 300..."
              />
            </div>
            <div>
              <label className={labelCls}>N° Factura</label>
              <input
                type="text"
                value={form.numero_factura}
                onChange={(e) => setForm({ ...form, numero_factura: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

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
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Ingreso"}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={saving}
        message="¿Eliminar este ingreso? Esta acción no se puede deshacer."
      />
    </div>
  );
}
