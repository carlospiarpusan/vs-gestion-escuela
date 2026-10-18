import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import type {
  ClasificacionIncidenteCumplimiento,
  EstadoIncidenteCumplimiento,
  EstadoRevisionRetencionCumplimiento,
  EstadoRevisionRnBd,
  ImpactoIncidenteCumplimiento,
  ResultadoRespaldoCumplimiento,
  Rol,
  TipoDatoRetencionCumplimiento,
  TipoRespaldoCumplimiento,
} from "@/types/database";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela"];

type ComplianceOverviewRow = {
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
};

type BackupStatsRow = {
  total: number | string | null;
  exitosos: number | string | null;
  ultimo_respaldo: string | null;
};

type IncidentStatsRow = {
  total: number | string | null;
  abiertos: number | string | null;
  ultimo_incidente: string | null;
};

type RetentionStatsRow = {
  total: number | string | null;
  vigentes: number | string | null;
  pendientes: number | string | null;
  en_revision: number | string | null;
};

type BackupRow = {
  id: string;
  fecha_respaldo: string;
  tipo: TipoRespaldoCumplimiento;
  resultado: ResultadoRespaldoCumplimiento;
  responsable: string;
  evidencia_ref: string | null;
  detalle: string | null;
};

type IncidentRow = {
  id: string;
  clasificacion: ClasificacionIncidenteCumplimiento;
  impacto: ImpactoIncidenteCumplimiento;
  estado: EstadoIncidenteCumplimiento;
  titulo: string;
  responsable: string | null;
  fecha_deteccion: string;
  fecha_cierre: string | null;
};

type RetentionRow = {
  id: string;
  tipo_dato: TipoDatoRetencionCumplimiento;
  meses_retencion: number | string | null;
  criterio_legal: string | null;
  estado_revision: EstadoRevisionRetencionCumplimiento;
  revisado_at: string | null;
  evidencia_ref: string | null;
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

function toCount(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { perfil } = auth;
  const url = new URL(request.url);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));

  if (!escuelaId) {
    return NextResponse.json(
      { error: "Selecciona una escuela activa para ver cumplimiento." },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const pool = getServerDbPool();

  try {
    const [
      overviewRes,
      backupStatsRes,
      incidentStatsRes,
      retentionStatsRes,
      backupsRes,
      incidentsRes,
      retentionRes,
    ] = await Promise.all([
      pool.query<ComplianceOverviewRow>(
        `
          select
            politica_privacidad_vigente,
            politica_version,
            politica_revisada_at,
            responsable_nombre,
            responsable_cargo,
            responsable_email,
            responsable_telefono,
            canal_contacto,
            consentimientos_revisados_at,
            rnbd_estado,
            rnbd_revisado_at,
            rnbd_evidencia_ref,
            notas
          from public.cumplimiento_escuelas
          where escuela_id = $1
          order by updated_at desc, created_at desc
          limit 1
        `,
        [escuelaId]
      ),
      pool.query<BackupStatsRow>(
        `
          select
            count(*)::int as total,
            count(*) filter (where resultado = 'exitoso')::int as exitosos,
            max(fecha_respaldo)::text as ultimo_respaldo
          from public.cumplimiento_respaldos
          where escuela_id = $1
        `,
        [escuelaId]
      ),
      pool.query<IncidentStatsRow>(
        `
          select
            count(*)::int as total,
            count(*) filter (where estado <> 'cerrado')::int as abiertos,
            max(fecha_deteccion)::text as ultimo_incidente
          from public.cumplimiento_incidentes
          where escuela_id = $1
        `,
        [escuelaId]
      ),
      pool.query<RetentionStatsRow>(
        `
          select
            count(*)::int as total,
            count(*) filter (where estado_revision = 'vigente')::int as vigentes,
            count(*) filter (where estado_revision = 'pendiente')::int as pendientes,
            count(*) filter (where estado_revision = 'en_revision')::int as en_revision
          from public.cumplimiento_retencion
          where escuela_id = $1
        `,
        [escuelaId]
      ),
      pool.query<BackupRow>(
        `
          select
            id,
            fecha_respaldo::text as fecha_respaldo,
            tipo,
            resultado,
            responsable,
            evidencia_ref,
            detalle
          from public.cumplimiento_respaldos
          where escuela_id = $1
          order by fecha_respaldo desc, created_at desc
          limit 6
        `,
        [escuelaId]
      ),
      pool.query<IncidentRow>(
        `
          select
            id,
            clasificacion,
            impacto,
            estado,
            titulo,
            responsable,
            fecha_deteccion::text as fecha_deteccion,
            fecha_cierre::text as fecha_cierre
          from public.cumplimiento_incidentes
          where escuela_id = $1
          order by fecha_deteccion desc, created_at desc
          limit 6
        `,
        [escuelaId]
      ),
      pool.query<RetentionRow>(
        `
          select
            id,
            tipo_dato,
            meses_retencion,
            criterio_legal,
            estado_revision,
            revisado_at::text as revisado_at,
            evidencia_ref
          from public.cumplimiento_retencion
          where escuela_id = $1
          order by revisado_at desc nulls last, updated_at desc, tipo_dato asc
          limit 8
        `,
        [escuelaId]
      ),
    ]);

    const backupStats = backupStatsRes.rows[0];
    const incidentStats = incidentStatsRes.rows[0];
    const retentionStats = retentionStatsRes.rows[0];

    return NextResponse.json(
      {
        escuelaId,
        overview: overviewRes.rows[0] ?? null,
        stats: {
          respaldosTotal: toCount(backupStats?.total),
          respaldosExitosos: toCount(backupStats?.exitosos),
          ultimoRespaldo: backupStats?.ultimo_respaldo ?? null,
          incidentesTotal: toCount(incidentStats?.total),
          incidentesAbiertos: toCount(incidentStats?.abiertos),
          ultimoIncidente: incidentStats?.ultimo_incidente ?? null,
          retencionTotal: toCount(retentionStats?.total),
          retencionVigente: toCount(retentionStats?.vigentes),
          retencionPendiente: toCount(retentionStats?.pendientes),
          retencionEnRevision: toCount(retentionStats?.en_revision),
        },
        respaldos: backupsRes.rows.map((row) => ({
          ...row,
          fecha_respaldo: row.fecha_respaldo,
        })),
        incidentes: incidentsRes.rows,
        retencion: retentionRes.rows.map((row) => ({
          ...row,
          meses_retencion: row.meses_retencion === null ? null : toCount(row.meses_retencion),
        })),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[API CUMPLIMIENTO] Error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el modulo de cumplimiento." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
