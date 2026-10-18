"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, CalendarClock, RefreshCw, Save, Undo2 } from "lucide-react";
import { formatDateOnlyForDisplay, getTodayDateString } from "@/lib/date-utils";
import {
  RETENTION_LABELS,
  RETENTION_EVENT_LABELS,
  type RetentionCommand,
  type RetentionOverview,
} from "@/lib/data-retention";

export default function SchoolRetentionPanel({
  schoolId,
  canManage,
  onChanged,
}: {
  schoolId: string;
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [data, setData] = useState<RetentionOverview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [cancelledOn, setCancelledOn] = useState(getTodayDateString);
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [nextReview, setNextReview] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(`/api/cumplimiento/retencion?escuela_id=${schoolId}`, {
        cache: "no-store",
        signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cargar la retencion.");
      if (!signal?.aborted) {
        setData(result);
        setError("");
      }
    },
    [schoolId]
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [load]);
  async function change(command: RetentionCommand) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/cumplimiento/retencion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la retencion.");
      await load();
      await onChanged();
      setReference("");
      setConfirmed(false);
      setReason("");
      setNextReview("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const current = data?.cases.find((item) => item.state !== "withdrawn");
  return (
    <section
      className="space-y-4 border-y border-[var(--surface-border)] py-5"
      aria-label="Retencion por baja del servicio"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock size={18} />
          Baja y conservacion de datos
        </h3>
        <button
          type="button"
          className="apple-icon-button"
          aria-label="Actualizar retencion"
          title="Actualizar retencion"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void load()
              .catch((failure) => setError(failure.message))
              .finally(() => setBusy(false));
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {!data && !error && (
        <p role="status" className="text-sm">
          Cargando retencion...
        </p>
      )}
      {data && (
        <>
          <p className="text-sm text-[var(--gray-500)]">
            Ultimo control automatico:{" "}
            {data.lastCheckedAt ? formatDateOnlyForDisplay(data.lastCheckedAt) : "Sin ejecutar"}
          </p>
          {current ? (
            <div className="space-y-3">
              <p role="status" className="font-semibold">
                {RETENTION_LABELS[current.state]}
              </p>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt>Baja definitiva</dt>
                  <dd>{formatDateOnlyForDisplay(current.cancelled_on)}</dd>
                </div>
                <div>
                  <dt>Revision a los seis meses</dt>
                  <dd>{formatDateOnlyForDisplay(current.review_due_on)}</dd>
                </div>
                <div className="break-words sm:col-span-2">
                  <dt>Soporte</dt>
                  <dd>{current.evidence_ref}</dd>
                </div>
              </dl>
              {current.hold_reason && (
                <p className="text-sm break-words">
                  Conservacion: {current.hold_reason}. Proxima revision:{" "}
                  {formatDateOnlyForDisplay(current.next_review_on)}
                </p>
              )}
              {canManage && (
                <fieldset disabled={busy} className="space-y-3">
                  <label className="apple-label">
                    Justificacion o soporte de la decision
                    <input
                      className="apple-input mt-1"
                      value={reason}
                      maxLength={500}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </label>
                  <label className="apple-label">
                    Proxima revision de conservacion
                    <input
                      type="date"
                      className="apple-input mt-1"
                      value={nextReview}
                      min={getTodayDateString()}
                      onInput={(event) => setNextReview(event.currentTarget.value)}
                      onChange={(event) => setNextReview(event.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="apple-button-secondary"
                      disabled={
                        reason.trim().length < 5 || !nextReview || data.schoolState !== "inactiva"
                      }
                      onClick={() =>
                        void change({
                          action: "hold",
                          schoolId,
                          caseId: current.id,
                          reason,
                          nextReviewOn: nextReview,
                        })
                      }
                    >
                      <Archive size={16} />
                      Justificar conservacion
                    </button>
                    <button
                      type="button"
                      className="apple-button-secondary"
                      disabled={reason.trim().length < 5}
                      onClick={() =>
                        void change({
                          action: "withdraw",
                          schoolId,
                          caseId: current.id,
                          evidenceRef: reason,
                        })
                      }
                    >
                      <Undo2 size={16} />
                      Retirar baja
                    </button>
                  </div>
                </fieldset>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm">Sin baja definitiva registrada.</p>
              {canManage && data.schoolState === "inactiva" && (
                <fieldset disabled={busy} className="space-y-3">
                  <label className="apple-label">
                    Fecha de baja definitiva
                    <input
                      type="date"
                      className="apple-input mt-1"
                      value={cancelledOn}
                      min="2000-01-01"
                      max={getTodayDateString()}
                      onInput={(event) => setCancelledOn(event.currentTarget.value)}
                      onChange={(event) => setCancelledOn(event.target.value)}
                    />
                  </label>
                  <label className="apple-label">
                    Referencia del soporte de cancelacion
                    <input
                      className="apple-input mt-1"
                      value={reference}
                      maxLength={500}
                      onChange={(event) => setReference(event.target.value)}
                    />
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    Baja definitiva documentada; no es una suspension por falta de pago.
                  </label>
                  <button
                    type="button"
                    className="apple-button-primary"
                    disabled={!confirmed || reference.trim().length < 5 || !cancelledOn}
                    onClick={() =>
                      void change({
                        action: "record",
                        schoolId,
                        cancelledOn,
                        evidenceRef: reference,
                        confirmed: true,
                      })
                    }
                  >
                    <Save size={16} />
                    Registrar baja
                  </button>
                </fieldset>
              )}
            </>
          )}
          {data.events.length > 0 && (
            <details className="border-t border-[var(--surface-border)] pt-3 text-sm">
              <summary className="cursor-pointer font-medium">Historial de retencion</summary>
              <ol className="mt-3 space-y-2">
                {data.events.map((event, index) => (
                  <li key={`${event.created_at}:${index}`}>
                    {RETENTION_EVENT_LABELS[event.action] ?? event.action}:{" "}
                    {formatDateOnlyForDisplay(event.created_at)}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
    </section>
  );
}
