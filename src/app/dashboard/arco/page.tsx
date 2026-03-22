"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchJsonWithRetry } from "@/lib/retry";
import Modal from "@/components/dashboard/Modal";
import {
  CheckCircle,
  Clock,
  FileSearch,
  Loader2,
  Pencil,
  Shield,
  XCircle,
  AlertCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import type { SolicitudArco, TipoSolicitudArco, EstadoSolicitudArco } from "@/types/database";

type ArcoRow = SolicitudArco & { escuela_nombre: string | null };

const TIPO_CONFIG: Record<
  TipoSolicitudArco,
  { label: string; icon: typeof FileSearch; color: string }
> = {
  acceso: {
    label: "Acceso",
    icon: FileSearch,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  },
  rectificacion: {
    label: "Rectificacion",
    icon: Pencil,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  },
  cancelacion: {
    label: "Cancelacion",
    icon: XCircle,
    color: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
  },
  oposicion: {
    label: "Oposicion",
    icon: Shield,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
  },
};

const ESTADO_CONFIG: Record<EstadoSolicitudArco, { label: string; color: string }> = {
  pendiente: {
    label: "Pendiente",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  en_proceso: {
    label: "En proceso",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completada: {
    label: "Completada",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  rechazada: {
    label: "Rechazada",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export default function ArcoPage() {
  const { perfil } = useAuth();
  const [rows, setRows] = useState<ArcoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchIdRef = useRef(0);

  // Modal de respuesta
  const [selectedRow, setSelectedRow] = useState<ArcoRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [respuestaEstado, setRespuestaEstado] = useState<"en_proceso" | "completada" | "rechazada">(
    "completada"
  );
  const [respuestaTexto, setRespuestaTexto] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!perfil) return;
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError("");

    try {
      const data = await fetchJsonWithRetry<{ rows: ArcoRow[] }>("/api/arco");
      if (fetchId !== fetchIdRef.current) return;
      setRows(data.rows || []);
    } catch (err: unknown) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : "Error al cargar solicitudes.");
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [perfil]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openRespond = (row: ArcoRow) => {
    setSelectedRow(row);
    setRespuestaEstado(
      row.estado === "pendiente"
        ? "completada"
        : (row.estado as "en_proceso" | "completada" | "rechazada")
    );
    setRespuestaTexto(row.respuesta || "");
    setModalOpen(true);
  };

  const handleRespond = async () => {
    if (!selectedRow || !respuestaTexto.trim()) {
      toast.error("Debes escribir una respuesta.");
      return;
    }

    setSaving(true);
    try {
      await fetchJsonWithRetry("/api/arco", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRow.id,
          estado: respuestaEstado,
          respuesta: respuestaTexto.trim(),
        }),
      });

      toast.success("Solicitud actualizada");
      setModalOpen(false);
      void fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar.");
    } finally {
      setSaving(false);
    }
  };

  const pendientes = rows.filter((r) => r.estado === "pendiente").length;
  const enProceso = rows.filter((r) => r.estado === "en_proceso").length;
  const isSuperAdmin = perfil?.rol === "super_admin";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          Solicitudes ARCO
        </h2>
        <p className="mt-0.5 text-sm text-[#86868b]">
          Gestiona las solicitudes de derechos de datos personales (Ley 1581/2012). Plazo legal: 15
          dias habiles.
        </p>
      </div>

      {/* Resumen */}
      {!loading && rows.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 dark:bg-[#1d1d1f]">
            <p className="text-xs text-[#86868b]">Total</p>
            <p className="mt-1 text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {rows.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 dark:bg-[#1d1d1f]">
            <p className="text-xs text-[#86868b]">Pendientes</p>
            <p
              className={`mt-1 text-2xl font-semibold ${pendientes > 0 ? "text-yellow-600" : "text-[#1d1d1f] dark:text-[#f5f5f7]"}`}
            >
              {pendientes}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 dark:bg-[#1d1d1f]">
            <p className="text-xs text-[#86868b]">En proceso</p>
            <p
              className={`mt-1 text-2xl font-semibold ${enProceso > 0 ? "text-blue-600" : "text-[#1d1d1f] dark:text-[#f5f5f7]"}`}
            >
              {enProceso}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 dark:bg-[#1d1d1f]">
            <p className="text-xs text-[#86868b]">Resueltas</p>
            <p className="mt-1 text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {rows.filter((r) => r.estado === "completada" || r.estado === "rechazada").length}
            </p>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#86868b]" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-[#86868b]/50" />
            <p className="mt-3 text-sm text-[#86868b]">No hay solicitudes ARCO registradas.</p>
            <p className="mt-1 text-xs text-[#86868b]">
              Los titulares de datos pueden enviar solicitudes desde{" "}
              <a href="/arco" target="_blank" className="text-[#0071e3] underline">
                /arco
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const tipoConf = TIPO_CONFIG[row.tipo];
              const estadoConf = ESTADO_CONFIG[row.estado];
              const TipoIcon = tipoConf.icon;
              const fechaCreacion = new Date(row.created_at).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });

              // Calcular dias habiles transcurridos (aprox)
              const diasTranscurridos = Math.floor(
                (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              const diasHabilesAprox = Math.floor((diasTranscurridos * 5) / 7);
              const vencida = row.estado === "pendiente" && diasHabilesAprox > 15;

              return (
                <button
                  key={row.id}
                  onClick={() => openRespond(row)}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-left transition-colors hover:bg-gray-100/80 dark:border-gray-800 dark:bg-[#0a0a0a]/50 dark:hover:bg-[#0a0a0a]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tipoConf.color}`}
                      >
                        <TipoIcon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {row.nombre}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${estadoConf.color}`}
                          >
                            {estadoConf.label}
                          </span>
                          {vencida && (
                            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <AlertCircle size={10} /> Vencida
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#86868b]">
                          {tipoConf.label} · CC {row.dni} · {row.email}
                          {isSuperAdmin && row.escuela_nombre ? ` · ${row.escuela_nombre}` : ""}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-[#86868b]">
                          {row.descripcion}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-[#86868b]">{fechaCreacion}</p>
                      <p className="mt-0.5 text-[10px] text-[#86868b]">{diasHabilesAprox}d hab.</p>
                    </div>
                  </div>

                  {row.respuesta && (
                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2 dark:border-green-900/30 dark:bg-green-900/10">
                      <p className="text-[10px] font-medium text-green-700 dark:text-green-400">
                        Respuesta:
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-green-800 dark:text-green-300">
                        {row.respuesta}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de respuesta */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Responder solicitud ARCO"
        maxWidth="max-w-xl"
      >
        {selectedRow && (
          <div className="space-y-4">
            {/* Detalle de la solicitud */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-[#0a0a0a]">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[#86868b]">Solicitante</p>
                  <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {selectedRow.nombre}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#86868b]">Cedula</p>
                  <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {selectedRow.dni}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#86868b]">Correo</p>
                  <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {selectedRow.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#86868b]">Tipo</p>
                  <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {TIPO_CONFIG[selectedRow.tipo].label}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-[#86868b]">Descripcion</p>
                <p className="mt-1 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {selectedRow.descripcion}
                </p>
              </div>
            </div>

            {/* Estado de la respuesta */}
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Estado</label>
              <select
                value={respuestaEstado}
                onChange={(e) =>
                  setRespuestaEstado(e.target.value as "en_proceso" | "completada" | "rechazada")
                }
                className="apple-select"
              >
                <option value="en_proceso">En proceso</option>
                <option value="completada">Completada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>

            {/* Texto de respuesta */}
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">
                Respuesta al solicitante *
              </label>
              <textarea
                value={respuestaTexto}
                onChange={(e) => setRespuestaTexto(e.target.value)}
                rows={4}
                className="apple-textarea"
                placeholder="Describe las acciones tomadas para atender la solicitud..."
              />
            </div>

            {/* Aviso legal */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-900/10">
              <Clock size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                La Ley 1581/2012 establece un plazo maximo de 15 dias habiles para responder.
                Prorrogable por 8 dias adicionales con justificacion.
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleRespond}
                disabled={saving || !respuestaTexto.trim()}
                className="flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
              >
                <Send size={14} />
                {saving ? "Guardando..." : "Enviar respuesta"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
