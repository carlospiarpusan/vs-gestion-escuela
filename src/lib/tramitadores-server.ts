import type { PoolClient } from "pg";
import { getServerDbPool } from "@/lib/server-db";
import type {
  TipoTramitador,
  TramitadorCatalogItem,
  TramitadorPortalPayload,
  TramitadorPortalRow,
} from "@/lib/tramitadores";

type Queryable = Pick<PoolClient, "query">;

export class TramitadorError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

type CatalogSqlRow = {
  id: string;
  nombre: string;
  tipo: TipoTramitador;
  comision_valor: string | number | null;
  documento: string | null;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  perfil_id: string | null;
  acceso_activo: boolean | null;
  alumnos: number;
};

const toNumber = (value: string | number | null | undefined) => Number(value ?? 0) || 0;

export async function listTramitadores(
  escuelaId: string,
  options: { includeInactive?: boolean } = {}
): Promise<TramitadorCatalogItem[]> {
  const pool = getServerDbPool();
  const result = await pool.query<CatalogSqlRow>(
    `
      select t.id, t.nombre, t.tipo, t.comision_valor, t.documento, t.telefono, t.notas, t.activo,
        t.perfil_id, p.activo as acceso_activo,
        (select count(*)::int from public.matriculas_alumno m where m.tramitador_id = t.id) as alumnos
      from public.tramitadores t
      left join public.perfiles p on p.id = t.perfil_id
      where t.escuela_id = $1 ${options.includeInactive ? "" : "and t.activo"}
      order by t.activo desc, t.nombre_normalizado asc
    `,
    [escuelaId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
    comision_valor: row.comision_valor === null ? null : toNumber(row.comision_valor),
    documento: row.documento,
    telefono: row.telefono,
    notas: row.notas,
    activo: row.activo,
    tiene_acceso: Boolean(row.perfil_id),
    acceso_activo: Boolean(row.perfil_id && row.acceso_activo),
    alumnos: row.alumnos,
  }));
}

export type TramitadorRecord = {
  id: string;
  escuela_id: string;
  nombre: string;
  tipo: TipoTramitador;
  comision_valor: number | null;
  activo: boolean;
  perfil_id: string | null;
  documento: string | null;
};

export async function getTramitador(
  db: Queryable,
  id: string,
  options: { forUpdate?: boolean } = {}
): Promise<TramitadorRecord | null> {
  const result = await db.query<TramitadorRecord & { comision_valor: string | null }>(
    `select id, escuela_id, nombre, tipo, comision_valor, activo, perfil_id, documento
     from public.tramitadores where id = $1 ${options.forUpdate ? "for update" : ""}`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    comision_valor: row.comision_valor === null ? null : toNumber(row.comision_valor),
  };
}

/**
 * Resuelve el tramitador elegido para una matrícula. Solo acepta tramitadores
 * del catálogo de la escuela; un nombre escrito a mano se busca sin distinguir
 * mayúsculas ni tildes, pero nunca crea uno nuevo.
 */
export async function resolveEnrollmentTramitador(
  db: Queryable,
  escuelaId: string,
  input: { tramitador_id?: string | null; tramitador_nombre?: string | null },
  options: { alumnoId?: string | null } = {}
): Promise<TramitadorRecord> {
  let record: TramitadorRecord | null = null;

  if (input.tramitador_id) {
    record = await getTramitador(db, input.tramitador_id);
  } else if (input.tramitador_nombre?.trim()) {
    const found = await db.query<{ id: string }>(
      `select id from public.tramitadores
       where escuela_id = $1 and nombre_normalizado = public.normalize_tramitador_nombre($2)`,
      [escuelaId, input.tramitador_nombre]
    );
    record = found.rows[0] ? await getTramitador(db, found.rows[0].id) : null;
  }

  if (!record || record.escuela_id !== escuelaId) {
    throw new TramitadorError(
      "Selecciona un tramitador de la lista. Si no existe, pide a un administrador que lo cree en Tramitadores."
    );
  }
  if (!record.activo) {
    // Un tramitador inactivo solo se conserva en matrículas que ya lo tenían.
    const keeps = options.alumnoId
      ? await db.query(
          "select 1 from public.matriculas_alumno where alumno_id = $1 and tramitador_id = $2 limit 1",
          [options.alumnoId, record.id]
        )
      : { rows: [] };
    if (!keeps.rows[0]) throw new TramitadorError("El tramitador seleccionado está inactivo.");
  }
  return record;
}

/** Datos que ve el tramitador: solo las matrículas que tiene asignadas. */
export async function getTramitadorPortal(perfilId: string): Promise<TramitadorPortalPayload> {
  const pool = getServerDbPool();
  const tramitadorRes = await pool.query<{
    id: string;
    escuela_id: string;
    nombre: string;
    tipo: TipoTramitador;
  }>(
    `select id, escuela_id, nombre, tipo from public.tramitadores
     where perfil_id = $1 and activo limit 1`,
    [perfilId]
  );
  const tramitador = tramitadorRes.rows[0];
  if (!tramitador) {
    throw new TramitadorError("Tu acceso de tramitador no está activo.", 403);
  }

  const result = await pool.query<{
    matricula_id: string;
    alumno_nombre: string;
    alumno_documento: string | null;
    alumno_telefono: string | null;
    alumno_email: string | null;
    categorias: string[] | null;
    numero_contrato: string | null;
    fecha_inscripcion: string | null;
    estado: TramitadorPortalRow["estado"];
    valor_curso: string | number | null;
    abonado: string | number | null;
    comision: string | number | null;
  }>(
    `
      select
        m.id as matricula_id,
        trim(concat(a.nombre, ' ', a.apellidos)) as alumno_nombre,
        a.dni as alumno_documento,
        a.telefono as alumno_telefono,
        a.email as alumno_email,
        coalesce(m.categorias, '{}'::text[]) as categorias,
        m.numero_contrato,
        to_char(m.fecha_inscripcion, 'YYYY-MM-DD') as fecha_inscripcion,
        m.estado,
        coalesce(m.valor_total, 0) as valor_curso,
        coalesce((
          select sum(i.monto) from public.ingresos i
          where i.matricula_id = m.id and i.estado = 'cobrado'
        ), 0) as abonado,
        m.tramitador_valor as comision
      from public.matriculas_alumno m
      join public.alumnos a on a.id = m.alumno_id
      where m.tramitador_id = $1
        and m.escuela_id = $2
        and m.tiene_tramitador
      order by m.fecha_inscripcion desc nulls last, m.created_at desc
      limit 1000
    `,
    [tramitador.id, tramitador.escuela_id]
  );

  const showCommission = tramitador.tipo === "comision";
  const rows: TramitadorPortalRow[] = result.rows.map((row) => {
    const valor = toNumber(row.valor_curso);
    const abonado = toNumber(row.abonado);
    return {
      matricula_id: row.matricula_id,
      alumno_nombre: row.alumno_nombre,
      alumno_documento: row.alumno_documento,
      alumno_telefono: row.alumno_telefono,
      alumno_email: row.alumno_email,
      categorias: row.categorias ?? [],
      numero_contrato: row.numero_contrato,
      fecha_inscripcion: row.fecha_inscripcion,
      estado: row.estado,
      valor_curso: valor,
      abonado,
      saldo: row.estado === "cancelado" ? 0 : Math.max(valor - abonado, 0),
      comision: showCommission && row.comision !== null ? toNumber(row.comision) : null,
    };
  });

  return {
    tramitador: { nombre: tramitador.nombre, tipo: tramitador.tipo },
    rows,
    totales: rows.reduce(
      (acc, row) => {
        if (row.estado === "cancelado") return acc;
        acc.valor_curso += row.valor_curso;
        acc.abonado += row.abonado;
        acc.saldo += row.saldo;
        acc.comision += row.comision ?? 0;
        return acc;
      },
      { valor_curso: 0, abonado: 0, saldo: 0, comision: 0 }
    ),
  };
}
