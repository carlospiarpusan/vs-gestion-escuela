/**
 * Server-side contract utilities that require a database connection.
 * These functions check schema capabilities and reserve sequential contract numbers.
 */

import type { Pool, PoolClient } from "pg";
import {
  derivePrefixFromCategories,
  normalizeContractSequencePrefix,
  parseHistoricContractConsecutive,
  parseHistoricContractPrefix,
  type ContractSequencePrefix,
} from "./contracts";

type DbClient = Pool | PoolClient;
type ContractSequenceColumn =
  | "siguiente_consecutivo_mot"
  | "siguiente_consecutivo_car"
  | "siguiente_consecutivo_com";

type OccupiedContractRow = {
  numero_contrato: string | null;
  prefijo_contrato: string | null;
  consecutivo_contrato: number | string | null;
};

type ContractConfigRow = {
  siguiente_consecutivo_mot: number | string | null;
  siguiente_consecutivo_car: number | string | null;
  siguiente_consecutivo_com: number | string | null;
};

type ContractSequenceRun = {
  start: number;
  end: number;
  length: number;
};

export type ContractSchemaCapabilities = {
  /** Whether the matriculas_alumno table has a `prefijo_contrato` column. */
  matriculaPrefix: boolean;
  /** Whether the matriculas_alumno table has a `consecutivo_contrato` column. */
  matriculaConsecutive: boolean;
};

/**
 * Detect whether the matriculas_alumno table has the prefix and consecutive columns.
 * This allows the app to gracefully degrade when running against older schemas.
 */
export async function getContractSchemaCapabilities(
  db: DbClient
): Promise<ContractSchemaCapabilities> {
  const res = await db.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'matriculas_alumno'
       AND column_name IN ('prefijo_contrato', 'consecutivo_contrato')`
  );
  const cols = new Set(res.rows.map((r) => r.column_name));
  return {
    matriculaPrefix: cols.has("prefijo_contrato"),
    matriculaConsecutive: cols.has("consecutivo_contrato"),
  };
}

export type ReservedContractNumber = {
  /** Full formatted contract number, e.g. "MOT-0042". */
  nextNumber: string;
  /** Prefix used, e.g. "MOT". */
  prefix: ContractSequencePrefix;
  /** Numeric sequence, e.g. 42. */
  nextSequence: number;
};

const CONTRACT_SEQUENCE_COLUMN_MAP: Record<ContractSequencePrefix, ContractSequenceColumn> = {
  MOT: "siguiente_consecutivo_mot",
  CAR: "siguiente_consecutivo_car",
  COM: "siguiente_consecutivo_com",
};

function getContractSequenceColumn(prefix: ContractSequencePrefix): ContractSequenceColumn {
  return CONTRACT_SEQUENCE_COLUMN_MAP[prefix];
}

function getConfiguredContractSequenceStart(
  row: ContractConfigRow | null | undefined,
  prefix: ContractSequencePrefix
) {
  const raw = row?.[getContractSequenceColumn(prefix)];
  const value = raw == null ? null : Number(raw);
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

export function formatReservedContractNumber(prefix: ContractSequencePrefix, sequence: number) {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export function extractOccupiedContractSequence(
  row: OccupiedContractRow,
  targetPrefix: ContractSequencePrefix
): number | null {
  const storedPrefix = normalizeContractSequencePrefix(row.prefijo_contrato);
  const parsedPrefix = parseHistoricContractPrefix(row.numero_contrato);
  const prefix = storedPrefix ?? parsedPrefix;

  if (prefix !== targetPrefix) return null;

  const rawStoredSequence =
    row.consecutivo_contrato == null ? null : Number(row.consecutivo_contrato);
  if (Number.isInteger(rawStoredSequence) && Number(rawStoredSequence) > 0) {
    return Number(rawStoredSequence);
  }

  const parsedSequence = parseHistoricContractConsecutive(row.numero_contrato);
  return parsedSequence && parsedSequence > 0 ? parsedSequence : null;
}

export function listOccupiedContractSequences(
  rows: OccupiedContractRow[],
  targetPrefix: ContractSequencePrefix
) {
  const occupied = new Set<number>();

  for (const row of rows) {
    const sequence = extractOccupiedContractSequence(row, targetPrefix);
    if (sequence) occupied.add(sequence);
  }

  return Array.from(occupied).sort((a, b) => a - b);
}

export function findSmallestAvailableContractSequence(
  occupiedSequences: Iterable<number>,
  startAt?: number
) {
  const normalized = Array.from(occupiedSequences)
    .filter((value): value is number => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);
  const occupied = new Set(normalized);

  if (normalized.length === 0) {
    return Number.isInteger(startAt) ? Math.max(1, Math.trunc(startAt as number)) : 1;
  }

  if (Number.isInteger(startAt)) {
    let candidate = Math.max(1, Math.trunc(startAt as number));
    while (occupied.has(candidate)) {
      candidate += 1;
    }

    return candidate;
  }

  const runs = buildContractSequenceRuns(normalized);
  const anchorRun = runs.reduce<ContractSequenceRun>((best, current) => {
    if (current.length > best.length) return current;
    if (current.length === best.length && current.end > best.end) return current;
    return best;
  }, runs[0]);

  let candidate = anchorRun.end + 1;
  while (occupied.has(candidate)) {
    candidate += 1;
  }

  return candidate;
}

export function buildContractSequenceRuns(
  occupiedSequences: Iterable<number>
): ContractSequenceRun[] {
  const normalized = Array.from(new Set(occupiedSequences))
    .filter((value): value is number => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);

  if (normalized.length === 0) return [];

  const runs: ContractSequenceRun[] = [];
  let start = normalized[0];
  let end = normalized[0];

  for (const sequence of normalized.slice(1)) {
    if (sequence === end + 1) {
      end = sequence;
      continue;
    }

    runs.push({ start, end, length: end - start + 1 });
    start = sequence;
    end = sequence;
  }

  runs.push({ start, end, length: end - start + 1 });
  return runs;
}

async function ensureContractConfigRow(db: DbClient, escuelaId: string) {
  await db.query(
    `INSERT INTO public.configuracion_contratos_escuela (escuela_id, nombre_legal_escuela)
     VALUES ($1, '')
     ON CONFLICT (escuela_id) DO NOTHING`,
    [escuelaId]
  );
}

async function loadOccupiedContractRows(
  db: DbClient,
  opts: { escuelaId: string; prefix: ContractSequencePrefix }
) {
  const capabilities = await getContractSchemaCapabilities(db);
  const rows = await db.query<OccupiedContractRow>(
    `
      select
        numero_contrato,
        ${capabilities.matriculaPrefix ? "prefijo_contrato" : "null::text as prefijo_contrato"},
        ${capabilities.matriculaConsecutive ? "consecutivo_contrato" : "null::bigint as consecutivo_contrato"}
      from public.matriculas_alumno
      where escuela_id = $1
        and (
          numero_contrato ilike ($2 || '-%')
          ${capabilities.matriculaPrefix ? "or prefijo_contrato = $2" : ""}
        )
    `,
    [opts.escuelaId, opts.prefix]
  );

  return rows.rows;
}

async function lockContractConfigRow(db: DbClient, escuelaId: string) {
  await db.query(
    `
      select escuela_id
      from public.configuracion_contratos_escuela
      where escuela_id = $1
      for update
    `,
    [escuelaId]
  );
}

async function loadContractConfigRow(db: DbClient, escuelaId: string) {
  const res = await db.query<ContractConfigRow>(
    `
      select
        siguiente_consecutivo_mot,
        siguiente_consecutivo_car,
        siguiente_consecutivo_com
      from public.configuracion_contratos_escuela
      where escuela_id = $1
      limit 1
    `,
    [escuelaId]
  );

  return res.rows[0] ?? null;
}

export async function previewNextContractNumber(
  db: DbClient,
  opts: { escuelaId: string; categorias: string[] }
): Promise<ReservedContractNumber> {
  const prefix = derivePrefixFromCategories(opts.categorias);
  await ensureContractConfigRow(db, opts.escuelaId);
  const configRow = await loadContractConfigRow(db, opts.escuelaId);

  const occupiedRows = await loadOccupiedContractRows(db, {
    escuelaId: opts.escuelaId,
    prefix,
  });
  const occupiedSequences = listOccupiedContractSequences(occupiedRows, prefix);
  const nextSequence = findSmallestAvailableContractSequence(
    occupiedSequences,
    getConfiguredContractSequenceStart(configRow, prefix)
  );

  return {
    nextNumber: formatReservedContractNumber(prefix, nextSequence),
    prefix,
    nextSequence,
  };
}

export async function alignSchoolContractSequenceConfig(db: DbClient, escuelaId: string) {
  await ensureContractConfigRow(db, escuelaId);

  const [motRows, carRows, comRows] = await Promise.all([
    loadOccupiedContractRows(db, { escuelaId, prefix: "MOT" }),
    loadOccupiedContractRows(db, { escuelaId, prefix: "CAR" }),
    loadOccupiedContractRows(db, { escuelaId, prefix: "COM" }),
  ]);

  const nextMot = Math.max(...listOccupiedContractSequences(motRows, "MOT"), 0) + 1;
  const nextCar = Math.max(...listOccupiedContractSequences(carRows, "CAR"), 0) + 1;
  const nextCom = Math.max(...listOccupiedContractSequences(comRows, "COM"), 0) + 1;

  await db.query(
    `
      update public.configuracion_contratos_escuela
      set
        siguiente_consecutivo_mot = $2,
        siguiente_consecutivo_car = $3,
        siguiente_consecutivo_com = $4,
        updated_at = now()
      where escuela_id = $1
    `,
    [escuelaId, nextMot, nextCar, nextCom]
  );

  return {
    escuelaId,
    siguiente_consecutivo_mot: nextMot,
    siguiente_consecutivo_car: nextCar,
    siguiente_consecutivo_com: nextCom,
  };
}

/**
 * Reserve the next sequential contract number for a given school.
 *
 * The sequence is maintained per-prefix in `configuracion_contratos_escuela`:
 *   - MOT -> siguiente_consecutivo_mot
 *   - CAR -> siguiente_consecutivo_car
 *   - COM -> siguiente_consecutivo_com
 *
 * If no config row exists for the school, it creates one with defaults.
 * The row is locked with FOR UPDATE to prevent race conditions.
 */
export async function reserveNextContractNumber(
  db: DbClient,
  opts: { escuelaId: string; categorias: string[] }
): Promise<ReservedContractNumber> {
  const prefix = derivePrefixFromCategories(opts.categorias);
  const col = getContractSequenceColumn(prefix);

  await ensureContractConfigRow(db, opts.escuelaId);
  await lockContractConfigRow(db, opts.escuelaId);
  const configRow = await loadContractConfigRow(db, opts.escuelaId);

  const occupiedRows = await loadOccupiedContractRows(db, {
    escuelaId: opts.escuelaId,
    prefix,
  });
  const occupiedSequences = listOccupiedContractSequences(occupiedRows, prefix);
  const nextSequence = findSmallestAvailableContractSequence(
    occupiedSequences,
    getConfiguredContractSequenceStart(configRow, prefix)
  );
  const nextSequenceAfterReservation = findSmallestAvailableContractSequence(
    [...occupiedSequences, nextSequence],
    nextSequence + 1
  );

  await db.query(
    `
      update public.configuracion_contratos_escuela
      set ${col} = $2, updated_at = now()
      where escuela_id = $1
    `,
    [opts.escuelaId, nextSequenceAfterReservation]
  );

  return {
    nextNumber: formatReservedContractNumber(prefix, nextSequence),
    prefix,
    nextSequence,
  };
}
