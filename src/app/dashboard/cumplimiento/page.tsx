"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Database,
  FileCheck2,
  Mail,
  Phone,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import PageScaffold from "@/components/dashboard/PageScaffold";
import SummaryRow from "@/components/dashboard/SummaryRow";
import { useAuth } from "@/hooks/useAuth";
import { fetchJsonWithRetry } from "@/lib/retry";
import { APP_TIME_ZONE, extractDateOnly, formatDateOnlyForDisplay } from "@/lib/date-utils";
import type {
  ClasificacionIncidenteCumplimiento,
  EstadoIncidenteCumplimiento,
  EstadoRevisionRetencionCumplimiento,
  EstadoRevisionRnBd,
  ImpactoIncidenteCumplimiento,
  ResultadoRespaldoCumplimiento,
  TipoDatoRetencionCumplimiento,
  TipoRespaldoCumplimiento,
} from "@/types/database";
import SchoolRetentionPanel from "./SchoolRetentionPanel";

type CompliancePayload = {
  escuelaId: string;
  overview: {
    politica_privacidad_vigente: boolean | null;
    politica_version: string | null;
    politica_revisada_at: string | null;
    responsable_nombre: string | null;
    responsable_cargo: string | null;
    responsable_email: string | null;
    responsable_telefono: string | null;
    canal_contacto: string | null;
    consentimientos_revisados_at: string | null;
    rnbd_estado: EstadoRevisionRnBd | null;
    rnbd_revisado_at: string | null;
    rnbd_evidencia_ref: string | null;
    notas: string | null;
  } | null;
  stats: {
    respaldosTotal: number;
    respaldosExitosos: number;
    ultimoRespaldo: string | null;
    incidentesTotal: number;
    incidentesAbiertos: number;
    ultimoIncidente: string | null;
    retencionTotal: number;
    retencionVigente: number;
    retencionPendiente: number;
    retencionEnRevision: number;
  };
  respaldos: Array<{
    id: string;
    fecha_respaldo: string;
    tipo: TipoRespaldoCumplimiento;
    resultado: ResultadoRespaldoCumplimiento;
    responsable: string;
    evidencia_ref: string | null;
    detalle: string | null;
  }>;
  incidentes: Array<{
    id: string;
    clasificacion: ClasificacionIncidenteCumplimiento;
    impacto: ImpactoIncidenteCumplimiento;
    estado: EstadoIncidenteCumplimiento;
    titulo: string;
    responsable: string | null;
    fecha_deteccion: string;
    fecha_cierre: string | null;
  }>;
  retencion: Array<{
    id: string;
    tipo_dato: TipoDatoRetencionCumplimiento;
    meses_retencion: number | null;
    criterio_legal: string | null;
    estado_revision: EstadoRevisionRetencionCumplimiento;
    revisado_at: string | null;
    evidencia_ref: string | null;
  }>;
};

const RELATED_LINKS = [
  {
    href: "/dashboard/arco",
    label: "Solicitudes ARCO",
    description: "Seguimiento a peticiones sobre datos personales y derechos del titular.",
  },
  {
    href: "/dashboard/contratos",
    label: "Contratos",
    description: "Plantillas y respaldo legal que acompanan el proceso del alumno.",
  },
  {
    href: "/dashboard/permisos",
    label: "Permisos",
    description: "Matriz de roles y alcance operativo para el control interno.",
  },
];

function formatDateLabel(value: string | null) {
  if (!value) return "Sin registro";
  const dateOnly = extractDateOnly(value);
  if (dateOnly) return formatDateOnlyForDisplay(dateOnly);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}

function toTitleLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function getRnBdLabel(value: EstadoRevisionRnBd | null) {
  if (value === "aplica") return "Aplica";
  if (value === "no_aplica") return "No aplica";
  if (value === "pendiente") return "Pendiente";
  return "Sin definir";
}

function getStatusClasses(
  state:
    | ResultadoRespaldoCumplimiento
    | EstadoIncidenteCumplimiento
    | EstadoRevisionRetencionCumplimiento
    | EstadoRevisionRnBd
) {
  if (state === "exitoso" || state === "cerrado" || state === "vigente" || state === "aplica") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (
    state === "parcial" ||
    state === "contenido" ||
    state === "en_revision" ||
    state === "en_investigacion"
  ) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }

  if (state === "fallido" || state === "abierto") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-muted)]/60 px-5 py-6">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--gray-500)]">{description}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="apple-panel px-5 py-5 sm:px-7 sm:py-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--gray-500)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function DashboardCompliancePage() {
  const { perfil, escuelaNombre, activeEscuelaId } = useAuth();
  const [payload, setPayload] = useState<CompliancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompliance = useCallback(async () => {
    if (!perfil) return;

    if (perfil.rol === "super_admin" && !activeEscuelaId) {
      setPayload(null);
      setError("Selecciona una escuela activa para revisar cumplimiento.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchJsonWithRetry<CompliancePayload>("/api/cumplimiento", undefined, {
        attempts: 2,
      });
      setPayload(data);
    } catch (loadError) {
      setPayload(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el modulo de cumplimiento."
      );
    } finally {
      setLoading(false);
    }
  }, [activeEscuelaId, perfil]);

  useEffect(() => {
    void loadCompliance();
  }, [loadCompliance]);

  const summaryItems = useMemo(() => {
    const overview = payload?.overview;
    const stats = payload?.stats;

    return [
      {
        id: "politica",
        label: "Politica",
        value:
          overview?.politica_privacidad_vigente == null
            ? "Sin registro"
            : overview.politica_privacidad_vigente
              ? "Vigente"
              : "Pendiente",
        detail: overview?.politica_revisada_at
          ? `Revision: ${formatDateLabel(overview.politica_revisada_at)}`
          : "Aun no hay revision documentada.",
        icon: <ShieldCheck size={18} />,
        tone: "primary" as const,
      },
      {
        id: "rnbd",
        label: "RNBD",
        value: getRnBdLabel(overview?.rnbd_estado ?? null),
        detail: overview?.rnbd_revisado_at
          ? `Ultima revision: ${formatDateLabel(overview.rnbd_revisado_at)}`
          : "Sin fecha de revision registrada.",
        icon: <FileCheck2 size={18} />,
        tone: "success" as const,
      },
      {
        id: "respaldos",
        label: "Respaldos",
        value: String(stats?.respaldosTotal ?? 0),
        detail: stats?.ultimoRespaldo
          ? `Ultimo respaldo: ${formatDateLabel(stats.ultimoRespaldo)}`
          : "Todavia no hay respaldos cargados.",
        icon: <Database size={18} />,
        tone: "warning" as const,
      },
      {
        id: "incidentes",
        label: "Incidentes abiertos",
        value: String(stats?.incidentesAbiertos ?? 0),
        detail:
          (stats?.incidentesTotal ?? 0) > 0
            ? `${stats?.incidentesTotal ?? 0} incidentes registrados en total.`
            : "Sin incidentes registrados.",
        icon: <AlertTriangle size={18} />,
        tone: "danger" as const,
      },
    ];
  }, [payload]);

  const selectedSchoolLabel = escuelaNombre || "Escuela activa";

  return (
    <PageScaffold
      eyebrow="Gobierno Interno"
      title="Cumplimiento"
      description="Consolida politica de privacidad, responsable del tratamiento, RNBD, respaldos, incidentes y matriz de retencion de la escuela activa."
      actions={
        <button
          type="button"
          onClick={() => void loadCompliance()}
          className="apple-button-secondary inline-flex items-center gap-2"
        >
          <RefreshCcw size={16} />
          Recargar
        </button>
      }
      aside={
        <div className="rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface-muted)]/80 px-4 py-4 text-sm text-[var(--gray-500)]">
          <p className="apple-kicker">Escuela en contexto</p>
          <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
            {selectedSchoolLabel}
          </p>
          <p className="mt-2 leading-6">
            {perfil?.rol === "super_admin"
              ? "La vista toma la escuela seleccionada en el dashboard."
              : "Estas viendo el estado de cumplimiento de tu escuela."}
          </p>
        </div>
      }
    >
      <SummaryRow items={summaryItems} columns={4} />

      {loading ? (
        <section className="apple-panel px-5 py-6 sm:px-7">
          <p className="text-sm text-[var(--gray-500)]">Cargando modulo de cumplimiento...</p>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="apple-panel px-5 py-6 sm:px-7">
          <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="font-semibold">No se pudo cargar Cumplimiento.</p>
              <p className="mt-1 text-sm leading-6">{error}</p>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard
            title="Gobierno y responsable"
            description="Referencia base de politica, contacto responsable y estado del RNBD para la escuela activa."
          >
            {payload?.overview ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-[var(--surface-border)] px-4 py-4">
                    <p className="apple-kicker">Version de politica</p>
                    <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                      {payload.overview.politica_version || "Sin version cargada"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--gray-500)]">
                      {payload.overview.politica_revisada_at
                        ? `Ultima revision: ${formatDateLabel(payload.overview.politica_revisada_at)}`
                        : "Aun no se ha documentado una revision."}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-[var(--surface-border)] px-4 py-4">
                    <p className="apple-kicker">RNBD</p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                        payload.overview.rnbd_estado ?? "pendiente"
                      )}`}
                    >
                      {getRnBdLabel(payload.overview.rnbd_estado)}
                    </span>
                    <p className="mt-2 text-sm text-[var(--gray-500)]">
                      {payload.overview.rnbd_revisado_at
                        ? `Revision: ${formatDateLabel(payload.overview.rnbd_revisado_at)}`
                        : "Sin fecha de revision."}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-[var(--surface-border)] px-4 py-4">
                  <p className="apple-kicker">Responsable del tratamiento</p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                    {payload.overview.responsable_nombre || "Sin responsable registrado"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--gray-500)]">
                    {payload.overview.responsable_cargo || "Sin cargo registrado"}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm text-[var(--gray-500)]">
                      <Mail size={15} />
                      <span>{payload.overview.responsable_email || "Sin correo"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--gray-500)]">
                      <Phone size={15} />
                      <span>{payload.overview.responsable_telefono || "Sin telefono"}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[var(--gray-500)]">
                    Canal de contacto: {payload.overview.canal_contacto || "Sin definir"}
                  </p>
                  <p className="mt-3 text-sm text-[var(--gray-500)]">
                    Consentimientos revisados:{" "}
                    {formatDateLabel(payload.overview.consentimientos_revisados_at)}
                  </p>
                  {payload.overview.notas ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--gray-500)]">
                      {payload.overview.notas}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState
                title="Sin ficha general cargada"
                description="Todavia no hay politica, responsable ni RNBD registrados para la escuela activa."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Respaldos recientes"
            description="Ultimos respaldos documentados y su resultado operativo."
          >
            {payload?.respaldos.length ? (
              <div className="space-y-3">
                {payload.respaldos.map((respaldo) => (
                  <article
                    key={respaldo.id}
                    className="rounded-3xl border border-[var(--surface-border)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {toTitleLabel(respaldo.tipo)}
                        </p>
                        <p className="mt-1 text-sm text-[var(--gray-500)]">
                          {formatDateLabel(respaldo.fecha_respaldo)} · {respaldo.responsable}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          respaldo.resultado
                        )}`}
                      >
                        {toTitleLabel(respaldo.resultado)}
                      </span>
                    </div>
                    {respaldo.detalle ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--gray-500)]">
                        {respaldo.detalle}
                      </p>
                    ) : null}
                    {respaldo.evidencia_ref ? (
                      <p className="mt-2 text-xs text-[var(--gray-500)]">
                        Evidencia: {respaldo.evidencia_ref}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Sin respaldos registrados"
                description="Cuando empieces a documentar backups de base de datos, archivos o seguridad, apareceran aqui."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Incidentes"
            description="Bitacora de eventos de seguridad, privacidad, acceso o continuidad."
          >
            {payload?.incidentes.length ? (
              <div className="space-y-3">
                {payload.incidentes.map((incidente) => (
                  <article
                    key={incidente.id}
                    className="rounded-3xl border border-[var(--surface-border)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {incidente.titulo}
                        </p>
                        <p className="mt-1 text-sm text-[var(--gray-500)]">
                          {toTitleLabel(incidente.clasificacion)} · Impacto{" "}
                          {toTitleLabel(incidente.impacto)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          incidente.estado
                        )}`}
                      >
                        {toTitleLabel(incidente.estado)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[var(--gray-500)]">
                      Deteccion: {formatDateLabel(incidente.fecha_deteccion)}
                      {incidente.fecha_cierre
                        ? ` · Cierre: ${formatDateLabel(incidente.fecha_cierre)}`
                        : ""}
                    </p>
                    <p className="mt-2 text-sm text-[var(--gray-500)]">
                      Responsable: {incidente.responsable || "Sin responsable"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Sin incidentes registrados"
                description="La escuela activa no tiene incidentes documentados en este momento."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Retencion y rutas relacionadas"
            description="Matriz resumida de retencion y accesos rapidos a otros flujos del control interno."
          >
            <div className="space-y-5">
              {payload && (
                <SchoolRetentionPanel
                  key={payload.escuelaId}
                  schoolId={payload.escuelaId}
                  canManage={perfil?.rol === "super_admin"}
                  onChanged={loadCompliance}
                />
              )}
              {payload?.retencion.length ? (
                <div className="space-y-3">
                  {payload.retencion.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-3xl border border-[var(--surface-border)] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {toTitleLabel(item.tipo_dato)}
                          </p>
                          <p className="mt-1 text-sm text-[var(--gray-500)]">
                            {item.meses_retencion === null
                              ? "Plazo sujeto a revision documentada"
                              : `${item.meses_retencion} meses de retencion`}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            item.estado_revision
                          )}`}
                        >
                          {toTitleLabel(item.estado_revision)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-[var(--gray-500)]">
                        Revisado: {formatDateLabel(item.revisado_at)}
                      </p>
                      {item.criterio_legal ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--gray-500)]">
                          {item.criterio_legal}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Sin matriz de retencion"
                  description="Aun no se han cargado tipos de dato ni periodos de retencion para la escuela activa."
                />
              )}

              <div className="grid gap-3">
                {RELATED_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group rounded-3xl border border-[var(--surface-border)] px-4 py-4 transition hover:border-[var(--brand-300)] hover:bg-[var(--surface-muted)]/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {link.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--gray-500)]">
                          {link.description}
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="shrink-0 text-[var(--gray-400)] transition group-hover:translate-x-0.5"
                      />
                    </div>
                  </Link>
                ))}
              </div>

              <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)]/60 px-4 py-4">
                <div className="flex items-start gap-3">
                  <Archive className="mt-0.5 shrink-0 text-[var(--gray-500)]" size={18} />
                  <p className="text-sm leading-6 text-[var(--gray-500)]">
                    Los vencimientos requieren revisar la eliminacion y documentar cualquier
                    conservacion adicional. Este control no elimina automaticamente contratos,
                    facturas, nominas ni evidencias protegidas.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </PageScaffold>
  );
}
