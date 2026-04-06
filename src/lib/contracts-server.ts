/**
 * Server-side contract utilities that require a database connection.
 * These functions check schema capabilities and reserve sequential contract numbers.
 */

import type { Pool, PoolClient } from "pg";
import { derivePrefixFromCategories, type ContractSequencePrefix } from "./contracts";

type DbClient = Pool | PoolClient;
const CAR_SEQUENCE_FLOOR = 2932;
const CAR_SEQUENCE_FLOOR_SCHOOL_ID = "a5320c4a-3bf6-4da5-b365-da17d7001d4f";

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
  const columnMap: Record<ContractSequencePrefix, string> = {
    MOT: "siguiente_consecutivo_mot",
    CAR: "siguiente_consecutivo_car",
    COM: "siguiente_consecutivo_com",
  };
  const col = columnMap[prefix];
  const floor =
    prefix === "CAR" && opts.escuelaId === CAR_SEQUENCE_FLOOR_SCHOOL_ID ? CAR_SEQUENCE_FLOOR : 1;

  // Ensure config row exists
  await db.query(
    `INSERT INTO public.configuracion_contratos_escuela (escuela_id, nombre_legal_escuela)
     VALUES ($1, '')
     ON CONFLICT (escuela_id) DO NOTHING`,
    [opts.escuelaId]
  );

  // Lock and fetch + increment atomically.
  // CAR contracts ignore legacy history only for the configured legacy school.
  const res = await db.query<{ next_val: string }>(
    `UPDATE public.configuracion_contratos_escuela
     SET ${col} = GREATEST(${col}, $2) + 1, updated_at = now()
     WHERE escuela_id = $1
     RETURNING (GREATEST(${col} - 1, $2))::text AS next_val`,
    [opts.escuelaId, floor]
  );

  const nextSequence = parseInt(res.rows[0]?.next_val ?? "1", 10);
  const paddedSeq = String(nextSequence).padStart(4, "0");
  const nextNumber = `${prefix}-${paddedSeq}`;

  return { nextNumber, prefix, nextSequence };
}
