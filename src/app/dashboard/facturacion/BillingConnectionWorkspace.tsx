"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  CalendarClock,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Trash2,
  X,
} from "lucide-react";
import { APP_TIME_ZONE } from "@/lib/date-utils";
import { VS_BILLING_SCHOOL, type ConnectionKey } from "@/lib/vs-billing/scope";
import { expiryFromBogotaInput, toBogotaDateTimeInput } from "@/lib/vs-billing/expiry";

const API = "/api/integraciones/vs-facturacion/claves";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--surface-border)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "w-full min-w-0 rounded-md border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-base text-[var(--foreground)]";
type Overview = { empresa: typeof VS_BILLING_SCHOOL; claves: ConnectionKey[] };
type Action = { tipo: "crear" } | { tipo: "editar" | "revocar" | "eliminar"; clave: ConnectionKey };
type ExpiryMode = "90" | "fecha" | "sin_vencimiento";

function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-CO", {
        timeZone: APP_TIME_ZONE,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Sin uso";
}
function status(key: ConnectionKey) {
  return key.revoked_at
    ? "Revocada"
    : key.expires_at !== null && new Date(key.expires_at).getTime() <= Date.now()
      ? "Vencida"
      : "Activa";
}
async function api<T>(options?: RequestInit): Promise<T> {
  const response = await fetch(API, { ...options, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo confirmar la operacion.");
  return data as T;
}

export default function BillingConnectionWorkspace() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("90");
  const [expiryDate, setExpiryDate] = useState("");
  const [name, setName] = useState("vs-facturacion");
  const [secret, setSecret] = useState("");
  const [visible, setVisible] = useState(false);
  const [endpoint, setEndpoint] = useState("/api/integraciones/vs-facturacion/v1");
  const controller = useRef<AbortController | null>(null);
  const mutationLock = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const reload = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError("");
    try {
      const data = await api<Overview>({ signal: current.signal });
      if (!current.signal.aborted) setOverview(data);
    } catch (err) {
      if (!current.signal.aborted) {
        setOverview(null);
        setError(err instanceof Error ? err.message : "No se pudo cargar.");
      }
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    setEndpoint(`${window.location.origin}/api/integraciones/vs-facturacion/v1`);
    void reload();
    return () => controller.current?.abort();
  }, [reload]);

  function beginAction(next: Action) {
    setError("");
    setNotice("");
    if (next.tipo === "editar") {
      setExpiryMode(next.clave.expires_at === null ? "sin_vencimiento" : "fecha");
      setExpiryDate(next.clave.expires_at ? toBogotaDateTimeInput(next.clave.expires_at) : "");
    } else {
      setExpiryMode("90");
      setExpiryDate("");
    }
    setAction(next);
  }
  useEffect(() => {
    if (action) {
      formRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
      formRef.current?.focus();
    }
  }, [action]);

  async function mutate(event: FormEvent) {
    event.preventDefault();
    if (!action || mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action.tipo === "crear" || action.tipo === "editar") {
        const expiresAt =
          expiryMode === "sin_vencimiento"
            ? null
            : expiryMode === "fecha"
              ? expiryFromBogotaInput(expiryDate)
              : undefined;
        if (action.tipo === "editar") {
          await api({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: action.clave.id,
              expires_at:
                expiresAt === undefined
                  ? new Date(Date.now() + 90 * 86_400_000).toISOString()
                  : expiresAt,
            }),
          });
          setNotice("Vigencia actualizada. La clave sigue siendo la misma.");
        } else {
          const result = await api<{ clave: ConnectionKey; token: string }>({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: name, confirmar_rotacion: true, expires_at: expiresAt }),
          });
          setSecret(result.token);
          setVisible(false);
          setNotice("Clave creada. La clave anterior ha quedado revocada.");
        }
      } else {
        await api({
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: action.clave.id, accion: action.tipo }),
        });
        setSecret("");
        setNotice(
          action.tipo === "eliminar" ? "Conexion eliminada y acceso cancelado." : "Acceso revocado."
        );
      }
      setAction(null);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo confirmar la operacion. Recarga el estado."
      );
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }
  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setNotice("Clave copiada.");
    } catch {
      setError("No se pudo acceder al portapapeles.");
    }
  }

  return (
    <div
      className="mx-auto w-full max-w-5xl min-w-0 space-y-6 text-[var(--foreground)]"
      style={{ letterSpacing: 0 }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--surface-border)] pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Conexion con vs-facturacion</h1>
          <p className="mt-1 text-sm text-[var(--gray-500)]">API privada · Solo lectura</p>
        </div>
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void reload()}
          title="Recargar"
          aria-label="Recargar"
          className={buttonClass}
        >
          <RefreshCw size={17} />
        </button>
      </header>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
          {notice}
        </p>
      )}
      {loading && (
        <p role="status" className="min-h-24 py-5 text-sm">
          Cargando conexion...
        </p>
      )}
      {overview && !loading && (
        <>
          <section className="min-w-0 border-b border-[var(--surface-border)] pb-5">
            <h2 className="text-lg font-semibold break-words">{overview.empresa.razonSocial}</h2>
            <p className="mt-1 text-sm">
              NIT {overview.empresa.nit}-{overview.empresa.dv}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={17} className="text-emerald-600" />
                Datos del alumno
              </span>
              <span>Sin matriculas, cursos ni valores</span>
            </div>
          </section>
          <section className="min-w-0 space-y-3">
            <h2 className="text-lg font-semibold">Acceso API</h2>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              URL base
              <input readOnly value={endpoint} className={`${inputClass} text-sm`} />
            </label>
            <dl className="grid min-w-0 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--gray-500)]">Autenticacion</dt>
                <dd className="mt-1 font-medium">Bearer token</dd>
              </div>
              <div>
                <dt className="text-[var(--gray-500)]">Permisos</dt>
                <dd className="mt-1 font-medium">alumnos:leer</dd>
              </div>
              <div>
                <dt className="text-[var(--gray-500)]">Campos compartidos</dt>
                <dd className="mt-1">Identificador, nombre, documento y correo</dd>
              </div>
              <div>
                <dt className="text-[var(--gray-500)]">Vigencia predeterminada</dt>
                <dd className="mt-1">90 dias</dd>
              </div>
            </dl>
          </section>
          {secret && (
            <section
              className="space-y-3 border-y border-amber-300 bg-amber-50/50 px-3 py-4 dark:bg-amber-950/20"
              aria-label="Clave generada"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Clave generada</h2>
                <button
                  type="button"
                  onClick={() => setSecret("")}
                  title="Ocultar definitivamente la clave"
                  aria-label="Ocultar definitivamente la clave"
                  className={buttonClass}
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Se muestra una sola vez. Uso exclusivo en el servidor de vs-facturacion; no en el
                navegador.
              </p>
              <div className="flex min-w-0 gap-2">
                <input
                  aria-label="Clave API"
                  type={visible ? "text" : "password"}
                  readOnly
                  autoComplete="off"
                  spellCheck={false}
                  value={secret}
                  className={`${inputClass} font-mono text-sm`}
                />
                <button
                  type="button"
                  onClick={() => setVisible((value) => !value)}
                  title={visible ? "Ocultar clave" : "Mostrar clave"}
                  aria-label={visible ? "Ocultar clave" : "Mostrar clave"}
                  className={buttonClass}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
                <button
                  type="button"
                  onClick={() => void copySecret()}
                  title="Copiar clave"
                  aria-label="Copiar clave"
                  className={buttonClass}
                >
                  <Copy size={17} />
                </button>
              </div>
            </section>
          )}
          <section className="space-y-4 border-t border-[var(--surface-border)] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Conexiones y claves</h2>
              <button
                type="button"
                disabled={busy || Boolean(action)}
                onClick={() => beginAction({ tipo: "crear" })}
                className={buttonClass}
              >
                <KeyRound size={17} />
                Generar clave
              </button>
            </div>
            {action && (
              <form
                ref={formRef}
                tabIndex={-1}
                onSubmit={mutate}
                className="space-y-3 border-l-4 border-amber-500 pl-4"
                aria-label="Confirmar cambio de clave"
              >
                {action.tipo !== "crear" && (
                  <h3 className="font-medium break-words">{action.clave.nombre}</h3>
                )}
                <p className="text-sm">
                  {action.tipo === "crear"
                    ? "La nueva clave reemplazara cualquier clave activa de esta conexion."
                    : action.tipo === "editar"
                      ? "Cambiar vigencia"
                      : action.tipo === "eliminar"
                        ? "Se eliminara la conexion del listado y su clave dejara de funcionar. Se conservara el registro de auditoria."
                        : "vs-facturacion perdera el acceso con esta clave."}
                </p>
                {action.tipo === "crear" && (
                  <label className="grid gap-1.5 text-sm font-medium">
                    Nombre de la conexion
                    <input
                      required
                      minLength={1}
                      maxLength={80}
                      value={name}
                      disabled={busy}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                )}
                {(action.tipo === "crear" || action.tipo === "editar") && (
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <label className="grid min-w-0 gap-1.5 text-sm font-medium">
                      Vigencia
                      <select
                        value={expiryMode}
                        disabled={busy}
                        onChange={(e) => setExpiryMode(e.target.value as ExpiryMode)}
                        className={inputClass}
                      >
                        <option value="90">90 dias desde hoy</option>
                        <option value="fecha">Fecha y hora</option>
                        <option value="sin_vencimiento">Sin vencimiento</option>
                      </select>
                    </label>
                    {expiryMode === "fecha" && (
                      <label className="grid min-w-0 gap-1.5 text-sm font-medium">
                        Fecha y hora de Bogota
                        <input
                          type="datetime-local"
                          required
                          disabled={busy}
                          value={expiryDate}
                          min={toBogotaDateTimeInput(new Date().toISOString())}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className={inputClass}
                        />
                      </label>
                    )}
                    {expiryMode === "sin_vencimiento" && (
                      <p className="text-sm text-amber-800 sm:col-span-2 dark:text-amber-200">
                        La clave no caducara por tiempo. Seguira vigente hasta revocarla, eliminar
                        la conexion o retirar el acceso a su responsable.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    className={`${buttonClass} bg-[var(--brand-600)] text-white`}
                  >
                    <Check size={16} />
                    {busy
                      ? "Procesando..."
                      : action.tipo === "crear"
                        ? "Confirmar nueva clave"
                        : action.tipo === "editar"
                          ? "Guardar vigencia"
                          : action.tipo === "eliminar"
                            ? "Confirmar eliminacion"
                            : "Confirmar revocacion"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAction(null)}
                    className={buttonClass}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
            {!overview.claves.length && (
              <p className="py-5 text-sm text-[var(--gray-500)]">Sin claves creadas.</p>
            )}
            <div className="divide-y divide-[var(--surface-border)]">
              {overview.claves.map((key) => (
                <article
                  key={key.id}
                  className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{key.nombre}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--gray-500)]">
                      {key.identificador}
                    </p>
                    <p className="mt-2 text-sm">
                      {key.expires_at === null
                        ? "Sin vencimiento"
                        : `Vence: ${date(key.expires_at)}`}
                    </p>
                    <p className="mt-1 text-sm text-[var(--gray-500)]">
                      Ultima consulta: {date(key.last_used_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`text-sm ${status(key) === "Activa" ? "text-emerald-700 dark:text-emerald-300" : "text-[var(--gray-500)]"}`}
                    >
                      {status(key)}
                    </span>
                    {!key.revoked_at && (
                      <>
                        <button
                          type="button"
                          disabled={busy || Boolean(action)}
                          onClick={() => beginAction({ tipo: "editar", clave: key })}
                          title="Cambiar vigencia"
                          aria-label={`Cambiar vigencia de ${key.nombre}`}
                          className={buttonClass}
                        >
                          <CalendarClock size={16} />
                          Cambiar vigencia
                        </button>
                        <button
                          type="button"
                          disabled={busy || Boolean(action)}
                          onClick={() => beginAction({ tipo: "revocar", clave: key })}
                          title="Revocar clave"
                          aria-label={`Revocar ${key.nombre}`}
                          className={buttonClass}
                        >
                          <Unplug size={16} />
                          Revocar
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={busy || Boolean(action)}
                      onClick={() => beginAction({ tipo: "eliminar", clave: key })}
                      title="Eliminar conexion"
                      aria-label={`Eliminar conexion ${key.nombre}`}
                      className={`${buttonClass} text-red-600`}
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
