/**
 * GastosPage - Expense management page for the school dashboard.
 *
 * This page allows authenticated users to view, create, edit, and delete
 * expense records (gastos) stored in the Supabase "gastos" table.
 *
 * Features:
 *  - CRUD operations for expenses via Supabase client.
 *  - Real-time form validation (required fields, numeric monto).
 *  - Error feedback displayed inside the modal form.
 *  - Responsive grid layout with dark-mode support.
 *
 * @module dashboard/gastos
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Gasto, CategoriaGasto, MetodoPagoGasto } from "@/types/database";
import { Plus } from "lucide-react";

/** All available expense categories. */
const categorias: CategoriaGasto[] = ["combustible", "mantenimiento_vehiculo", "alquiler", "servicios", "nominas", "seguros", "material_didactico", "marketing", "impuestos", "suministros", "reparaciones", "otros"];

/** Accepted payment methods. */
const metodos: MetodoPagoGasto[] = ["efectivo", "tarjeta", "transferencia", "domiciliacion"];

/** Default (empty) form values used when creating a new expense. */
const emptyForm = {
  categoria: "otros" as CategoriaGasto, concepto: "", monto: "",
  metodo_pago: "transferencia" as MetodoPagoGasto, proveedor: "",
  numero_factura: "", fecha: new Date().toISOString().split("T")[0],
  recurrente: false, notas: "",
};

export default function GastosPage() {
  // --- Auth & state ---
  const { perfil } = useAuth();
  const [data, setData] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [deleting, setDeleting] = useState<Gasto | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  /**
   * Fetch all expenses from Supabase ordered by date descending.
   * Called on mount and after every successful create/update/delete.
   */
  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("gastos").select("*").order("fecha", { ascending: false });
    setData((data as Gasto[]) || []);
    setLoading(false);
  }, []);

  // Fetch data once the authenticated profile is available.
  useEffect(() => {
    if (perfil) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  /** Open the modal in "create" mode with a blank form. */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); };

  /** Open the modal in "edit" mode, pre-filling the form with the selected row. */
  const openEdit = (row: Gasto) => {
    setEditing(row);
    setForm({ categoria: row.categoria, concepto: row.concepto, monto: row.monto.toString(), metodo_pago: row.metodo_pago, proveedor: row.proveedor || "", numero_factura: row.numero_factura || "", fecha: row.fecha, recurrente: row.recurrente, notas: row.notas || "" });
    setError(""); setModalOpen(true);
  };

  /** Open the delete-confirmation dialog for the given row. */
  const openDelete = (row: Gasto) => { setDeleting(row); setDeleteOpen(true); };

  /**
   * Validate the form and persist the expense (create or update).
   * Wrapped in try/catch to handle unexpected network errors gracefully.
   */
  const handleSave = async () => {
    // Validate required fields.
    if (!form.concepto || !form.monto) { setError("Concepto y monto son obligatorios."); return; }

    // Validate that monto is a valid number.
    const montoNum = parseFloat(form.monto);
    if (isNaN(montoNum)) { setError("El monto debe ser un número válido."); return; }

    setSaving(true); setError("");

    try {
      const supabase = createClient();

      // Build the payload shared by both insert and update operations.
      const payload = {
        categoria: form.categoria, concepto: form.concepto, monto: montoNum,
        metodo_pago: form.metodo_pago, proveedor: form.proveedor || null,
        numero_factura: form.numero_factura || null, fecha: form.fecha,
        recurrente: form.recurrente, notas: form.notas || null,
      };

      if (editing) {
        // Update existing expense row.
        const { error: err } = await supabase.from("gastos").update(payload).eq("id", editing.id);
        if (err) { setError(err.message); setSaving(false); return; }
      } else {
        // Insert new expense, attaching school/site/user context.
        if (!perfil) return;
        const { error: err } = await supabase.from("gastos").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: perfil.sede_id, user_id: perfil.id });
        if (err) { setError(err.message); setSaving(false); return; }
      }

      // Success — close modal and refresh the table.
      setSaving(false); setModalOpen(false); fetchData();
    } catch (networkError: unknown) {
      // Handle unexpected network / runtime errors.
      const message = networkError instanceof Error ? networkError.message : "Error de red inesperado.";
      setError(message);
      setSaving(false);
    }
  };

  /**
   * Delete the selected expense row.
   * Wrapped in try/catch so network failures surface in the UI.
   */
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const { error: err } = await createClient().from("gastos").delete().eq("id", deleting.id);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      // Success — close dialog and refresh.
      setSaving(false); setDeleteOpen(false); setDeleting(null); fetchData();
    } catch (networkError: unknown) {
      const message = networkError instanceof Error ? networkError.message : "Error al eliminar el gasto.";
      setError(message);
      setSaving(false);
    }
  };

  /** Column definitions for the DataTable component. */
  const columns = [
    { key: "fecha" as keyof Gasto, label: "Fecha" },
    { key: "concepto" as keyof Gasto, label: "Concepto", render: (r: Gasto) => <span className="font-medium">{r.concepto}</span> },
    { key: "categoria" as keyof Gasto, label: "Categoría", render: (r: Gasto) => <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-[#86868b] font-medium">{r.categoria.replace("_", " ")}</span> },
    { key: "monto" as keyof Gasto, label: "Monto", render: (r: Gasto) => <span className="font-medium text-red-500">${Number(r.monto).toLocaleString("es-CO")}</span> },
    { key: "metodo_pago" as keyof Gasto, label: "Método" },
    { key: "proveedor" as keyof Gasto, label: "Proveedor" },
  ];

  /** Shared Tailwind classes for form inputs. */
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

  return (
    <div>
      {/* Page header with title and "new expense" action button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Gastos</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Registra los gastos de tu escuela</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"><Plus size={16} /> Nuevo Gasto</button>
      </div>

      {/* Data table card */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <DataTable columns={columns} data={data} loading={loading} searchPlaceholder="Buscar por concepto..." searchKeys={["concepto", "proveedor", "fecha"]} onEdit={openEdit} onDelete={openDelete} />
      </div>

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Gasto" : "Nuevo Gasto"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {/* Inline error banner */}
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

          {/* Category & payment method selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Categoría</label><select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as CategoriaGasto })} className={inputCls}>{categorias.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Método de Pago</label><select value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value as MetodoPagoGasto })} className={inputCls}>{metodos.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          </div>

          {/* Concepto (required) */}
          <div><label className="block text-xs text-[#86868b] mb-1">Concepto *</label><input type="text" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} className={inputCls} /></div>

          {/* Monto, fecha, and invoice number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Monto *</label><input type="number" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Fecha</label><input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">N° Factura</label><input type="text" value={form.numero_factura} onChange={e => setForm({ ...form, numero_factura: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Proveedor and recurrente toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Proveedor</label><input type="text" value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} className={inputCls} /></div>
            <div className="flex items-end pb-1"><label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] cursor-pointer"><input type="checkbox" checked={form.recurrente} onChange={e => setForm({ ...form, recurrente: e.target.checked })} className="rounded" /> Gasto recurrente</label></div>
          </div>

          {/* Optional notes */}
          <div><label className="block text-xs text-[#86868b] mb-1">Notas</label><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Gasto"}</button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation dialog */}
      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message="¿Eliminar este gasto?" />
    </div>
  );
}
