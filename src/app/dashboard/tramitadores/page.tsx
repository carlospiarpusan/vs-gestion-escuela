"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitMerge, KeyRound, Pencil, Plus, Power, Trash2 } from "lucide-react";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { fetchJsonWithRetry } from "@/lib/retry";
import { formatCop } from "@/lib/intl-formatters";
import {
  TIPO_TRAMITADOR_LABEL,
  normalizeTramitadorNombre,
  type TipoTramitador,
  type TramitadorCatalogItem,
} from "@/lib/tramitadores";

type FormState = {
  nombre: string;
  tipo: TipoTramitador;
  comision_valor: string;
  documento: string;
  telefono: string;
  notas: string;
};

const emptyForm: FormState = {
  nombre: "",
  tipo: "comision",
  comision_valor: "",
  documento: "",
  telefono: "",
  notas: "",
};

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const iconButton =
  "apple-icon-button inline-flex h-8 w-8 items-center justify-center hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]";
const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0071e3] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50";
const secondaryButton =
  "rounded-lg border border-[var(--surface-border)] px-3.5 py-2 text-sm text-[var(--gray-700)] transition-colors hover:bg-[var(--surface-soft)] dark:text-[#f5f5f7]";

export default function TramitadoresPage() {
  const [rows, setRows] = useState<TramitadorCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [editing, setEditing] = useState<TramitadorCatalogItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [accessTarget, setAccessTarget] = useState<TramitadorCatalogItem | null>(null);
  const [accessDocumento, setAccessDocumento] = useState("");
  const [mergeSource, setMergeSource] = useState<TramitadorCatalogItem | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [deleting, setDeleting] = useState<TramitadorCatalogItem | null>(null);
  const [dialogError, setDialogError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJsonWithRetry<{ tramitadores: TramitadorCatalogItem[] }>(
        "/api/tramitadores?todos=1",
        { cache: "no-store" }
      );
      setRows(data.tramitadores);
      setPageError("");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "No se pudieron cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const term = normalizeTramitadorNombre(search);
    return rows.filter(
      (row) =>
        (showInactive || row.activo) &&
        (!term ||
          normalizeTramitadorNombre(row.nombre).includes(term) ||
          (row.documento ?? "").includes(term))
    );
  }, [rows, search, showInactive]);

  const similar = useMemo(() => {
    const key = normalizeTramitadorNombre(form.nombre);
    if (key.length < 3) return [];
    return rows.filter((row) => {
      if (row.id === editing?.id) return false;
      const other = normalizeTramitadorNombre(row.nombre);
      return other.includes(key) || key.includes(other);
    });
  }, [editing?.id, form.nombre, rows]);

  const inactiveCount = rows.filter((row) => !row.activo).length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (row: TramitadorCatalogItem) => {
    setEditing(row);
    setForm({
      nombre: row.nombre,
      tipo: row.tipo,
      comision_valor: row.comision_valor === null ? "" : String(row.comision_valor),
      documento: row.documento ?? "",
      telefono: row.telefono ?? "",
      notas: row.notas ?? "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const run = async (
    action: () => Promise<unknown>,
    onDone: () => void,
    setError: (v: string) => void
  ) => {
    setSaving(true);
    setError("");
    try {
      await action();
      onDone();
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.nombre.trim().length < 2) {
      setFormError("Escribe el nombre del tramitador.");
      return;
    }
    const comision = form.comision_valor === "" ? null : Number(form.comision_valor);
    if (
      form.tipo === "comision" &&
      (comision === null || !Number.isFinite(comision) || comision < 0)
    ) {
      setFormError("Indica la comisión fija por alumno.");
      return;
    }
    const body = {
      nombre: form.nombre,
      tipo: form.tipo,
      comision_valor: form.tipo === "comision" ? comision : null,
      documento: form.documento,
      telefono: form.telefono,
      notas: form.notas,
    };
    void run(
      () =>
        fetchJsonWithRetry(
          "/api/tramitadores",
          editing ? jsonInit("PATCH", { id: editing.id, ...body }) : jsonInit("POST", body)
        ),
      () => setFormOpen(false),
      setFormError
    );
  };

  const toggleActivo = (row: TramitadorCatalogItem) =>
    run(
      () =>
        fetchJsonWithRetry(
          "/api/tramitadores",
          jsonInit("PATCH", { id: row.id, activo: !row.activo })
        ),
      () => undefined,
      setPageError
    );

  const toggleAcceso = (row: TramitadorCatalogItem) =>
    run(
      () =>
        fetchJsonWithRetry(
          "/api/tramitadores/acceso",
          jsonInit("PATCH", { tramitador_id: row.id, activo: !row.acceso_activo })
        ),
      () => undefined,
      setPageError
    );

  const openAccess = (row: TramitadorCatalogItem) => {
    if (row.tiene_acceso) {
      void toggleAcceso(row);
      return;
    }
    setAccessTarget(row);
    setAccessDocumento(row.documento ?? "");
    setDialogError("");
  };

  const createAccess = (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessTarget) return;
    void run(
      () =>
        fetchJsonWithRetry(
          "/api/tramitadores/acceso",
          jsonInit("POST", { tramitador_id: accessTarget.id, documento: accessDocumento })
        ),
      () => setAccessTarget(null),
      setDialogError
    );
  };

  const confirmMerge = (event: React.FormEvent) => {
    event.preventDefault();
    if (!mergeSource || !mergeTargetId) {
      setDialogError("Elige el tramitador que se conserva.");
      return;
    }
    void run(
      () =>
        fetchJsonWithRetry(
          "/api/tramitadores/fusionar",
          jsonInit("POST", { origen_id: mergeSource.id, destino_id: mergeTargetId })
        ),
      () => setMergeSource(null),
      setDialogError
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    void run(
      () => fetchJsonWithRetry("/api/tramitadores", jsonInit("DELETE", { id: deleting.id })),
      () => setDeleting(null),
      setDialogError
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Tramitadores
          </h2>
          <p className="mt-0.5 text-sm text-[#86868b]">
            Un registro por persona. Se eligen al matricular alumnos.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={primaryButton}>
          <Plus size={16} /> Nuevo tramitador
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="tramitadores-buscar" className="sr-only">
          Buscar tramitador
        </label>
        <input
          id="tramitadores-buscar"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o cédula"
          className="apple-input sm:max-w-xs"
        />
        {inactiveCount > 0 ? (
          <label className="flex items-center gap-2 text-sm text-[#86868b]">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            Mostrar inactivos ({inactiveCount})
          </label>
        ) : null}
      </div>

      {pageError ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300"
        >
          {pageError}
        </p>
      ) : null}

      <div className="overflow-x-auto border-t border-[var(--surface-border)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs font-medium tracking-wide text-[#86868b] uppercase">
              <th className="py-2.5 pr-3">Nombre</th>
              <th className="px-3 py-2.5">Tipo</th>
              <th className="px-3 py-2.5 text-right">Comisión</th>
              <th className="px-3 py-2.5 text-right">Alumnos</th>
              <th className="px-3 py-2.5">Acceso</th>
              <th className="py-2.5 pl-3 text-right">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[#86868b]">
                  Cargando…
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[#86868b]">
                  Sin tramitadores.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={row.id} className={row.activo ? "" : "opacity-55"}>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{row.nombre}</p>
                    {row.documento || row.telefono ? (
                      <p className="text-xs text-[#86868b]">
                        {[row.documento, row.telefono].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--gray-700)] dark:text-[#d2d2d7]">
                    {TIPO_TRAMITADOR_LABEL[row.tipo]}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {row.tipo === "comision" && row.comision_valor !== null
                      ? formatCop(row.comision_valor)
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.alumnos}</td>
                  <td className="px-3 py-2.5">
                    {!row.activo ? (
                      <span className="text-xs text-[#86868b]">Inactivo</span>
                    ) : row.tiene_acceso ? (
                      <span
                        className={`text-xs font-medium ${row.acceso_activo ? "text-green-700 dark:text-green-400" : "text-[#86868b]"}`}
                      >
                        {row.acceso_activo ? "Activo" : "Bloqueado"}
                      </span>
                    ) : (
                      <span className="text-xs text-[#86868b]">Sin acceso</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-3">
                    <div className="flex justify-end gap-0.5">
                      <button
                        type="button"
                        className={iconButton}
                        onClick={() => openEdit(row)}
                        title="Editar"
                        aria-label={`Editar ${row.nombre}`}
                      >
                        <Pencil size={14} />
                      </button>
                      {row.activo ? (
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => openAccess(row)}
                          disabled={saving}
                          title={
                            row.tiene_acceso
                              ? row.acceso_activo
                                ? "Bloquear acceso"
                                : "Habilitar acceso"
                              : "Dar acceso"
                          }
                          aria-label={`${row.tiene_acceso ? (row.acceso_activo ? "Bloquear acceso de" : "Habilitar acceso de") : "Dar acceso a"} ${row.nombre}`}
                        >
                          <KeyRound size={14} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={iconButton}
                        onClick={() => {
                          setMergeSource(row);
                          setMergeTargetId("");
                          setDialogError("");
                        }}
                        title="Fusionar con otro"
                        aria-label={`Fusionar ${row.nombre} con otro tramitador`}
                      >
                        <GitMerge size={14} />
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        onClick={() => void toggleActivo(row)}
                        disabled={saving}
                        title={row.activo ? "Desactivar" : "Activar"}
                        aria-label={`${row.activo ? "Desactivar" : "Activar"} ${row.nombre}`}
                      >
                        <Power size={14} />
                      </button>
                      {row.alumnos === 0 && !row.tiene_acceso ? (
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => {
                            setDeleting(row);
                            setDialogError("");
                          }}
                          title="Eliminar"
                          aria-label={`Eliminar ${row.nombre}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar tramitador" : "Nuevo tramitador"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-3">
          {formError ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300"
            >
              {formError}
            </p>
          ) : null}
          <div>
            <label htmlFor="tramitador-nombre" className="apple-label">
              Nombre *
            </label>
            <input
              id="tramitador-nombre"
              required
              value={form.nombre}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              className="apple-input"
              autoComplete="off"
            />
            {similar.length > 0 ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Parecido a: {similar.map((row) => row.nombre).join(", ")}
              </p>
            ) : null}
          </div>
          <fieldset>
            <legend className="apple-label">Tipo *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["comision", "descuento"] as const).map((tipo) => (
                <label
                  key={tipo}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.tipo === tipo ? "border-[#0071e3] text-[#0071e3]" : "border-[var(--surface-border)] text-[var(--gray-700)] dark:text-[#d2d2d7]"}`}
                >
                  <input
                    type="radio"
                    name="tramitador-tipo"
                    value={tipo}
                    checked={form.tipo === tipo}
                    onChange={() => setForm({ ...form, tipo })}
                    className="sr-only"
                  />
                  {TIPO_TRAMITADOR_LABEL[tipo]}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-[#86868b]">
              {form.tipo === "comision"
                ? "Se le paga un valor fijo por alumno y se registra como gasto."
                : "El valor del curso ya va rebajado; no genera gasto."}
            </p>
          </fieldset>
          {form.tipo === "comision" ? (
            <div>
              <label htmlFor="tramitador-comision" className="apple-label">
                Comisión por alumno *
              </label>
              <input
                id="tramitador-comision"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                required
                value={form.comision_valor}
                onChange={(event) => setForm({ ...form, comision_valor: event.target.value })}
                className="apple-input"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="tramitador-documento" className="apple-label">
                Cédula
              </label>
              <input
                id="tramitador-documento"
                inputMode="numeric"
                value={form.documento}
                onChange={(event) => setForm({ ...form, documento: event.target.value })}
                className="apple-input"
              />
            </div>
            <div>
              <label htmlFor="tramitador-telefono" className="apple-label">
                Teléfono
              </label>
              <input
                id="tramitador-telefono"
                type="tel"
                value={form.telefono}
                onChange={(event) => setForm({ ...form, telefono: event.target.value })}
                className="apple-input"
              />
            </div>
          </div>
          <details open={Boolean(form.notas)}>
            <summary className="cursor-pointer text-sm text-[#86868b]">Notas</summary>
            <textarea
              id="tramitador-notas"
              aria-label="Notas"
              rows={2}
              value={form.notas}
              onChange={(event) => setForm({ ...form, notas: event.target.value })}
              className="apple-input mt-2"
            />
          </details>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setFormOpen(false)} className={secondaryButton}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(accessTarget)}
        onClose={() => setAccessTarget(null)}
        title="Dar acceso"
        maxWidth="max-w-sm"
      >
        <form onSubmit={createAccess} className="space-y-3">
          <p className="text-sm text-[var(--gray-700)] dark:text-[#d2d2d7]">
            {accessTarget?.nombre} entrará con su cédula. La cédula es la contraseña inicial y
            deberá cambiarla. Solo verá sus alumnos asignados.
          </p>
          {dialogError ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300"
            >
              {dialogError}
            </p>
          ) : null}
          <div>
            <label htmlFor="tramitador-acceso-cedula" className="apple-label">
              Cédula *
            </label>
            <input
              id="tramitador-acceso-cedula"
              required
              minLength={5}
              inputMode="numeric"
              value={accessDocumento}
              onChange={(event) => setAccessDocumento(event.target.value)}
              className="apple-input"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAccessTarget(null)} className={secondaryButton}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? "Creando…" : "Crear acceso"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(mergeSource)}
        onClose={() => setMergeSource(null)}
        title="Fusionar tramitador"
        maxWidth="max-w-sm"
      >
        <form onSubmit={confirmMerge} className="space-y-3">
          <p className="text-sm text-[var(--gray-700)] dark:text-[#d2d2d7]">
            Los {mergeSource?.alumnos ?? 0} alumnos y los gastos de{" "}
            <strong>{mergeSource?.nombre}</strong> pasan al tramitador elegido, y{" "}
            {mergeSource?.nombre} se elimina.
          </p>
          {dialogError ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300"
            >
              {dialogError}
            </p>
          ) : null}
          <div>
            <label htmlFor="tramitador-fusion-destino" className="apple-label">
              Conservar *
            </label>
            <select
              id="tramitador-fusion-destino"
              required
              value={mergeTargetId}
              onChange={(event) => setMergeTargetId(event.target.value)}
              className="apple-input"
            >
              <option value="">Selecciona</option>
              {rows
                .filter((row) => row.id !== mergeSource?.id)
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.nombre} ({row.alumnos}){row.activo ? "" : " — inactivo"}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMergeSource(null)} className={secondaryButton}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? "Fusionando…" : "Fusionar"}
            </button>
          </div>
        </form>
      </Modal>

      <DeleteConfirm
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={saving}
        error={dialogError}
        message={`¿Eliminar a "${deleting?.nombre}"?`}
      />
    </div>
  );
}
