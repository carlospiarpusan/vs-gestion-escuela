import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { getServerDbPool } from "@/lib/server-db";
import { VS_BILLING_SCHOOL, type BillingStudent, type ConnectionKey } from "./scope";

const KEY_COLUMNS =
  "id, nombre, identificador, created_at::text, expires_at::text, last_used_at::text, revoked_at::text";
const TOKEN_PATTERN = /^cs_vsf_[A-Za-z0-9_-]{43}$/;

export function hashConnectionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function listConnectionKeys() {
  return (
    await getServerDbPool().query<ConnectionKey>(
      `select ${KEY_COLUMNS} from public.vs_facturacion_api_keys
     where escuela_id = $1 and deleted_at is null order by created_at desc, id desc limit 10`,
      [VS_BILLING_SCHOOL.id]
    )
  ).rows;
}

async function transaction<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await getServerDbPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      `vs-billing:${VS_BILLING_SCHOOL.id}`,
    ]);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function revokeKeys(client: PoolClient, actorId: string, id: string | null) {
  const result = await client.query<{ id: string }>(
    `update public.vs_facturacion_api_keys set revoked_at = now()
     where escuela_id = $1 and revoked_at is null and ($2::uuid is null or id = $2)
     returning id`,
    [VS_BILLING_SCHOOL.id, id]
  );
  for (const key of result.rows) {
    await client.query(
      `insert into public.vs_facturacion_api_events (escuela_id, key_id, actor_id, accion)
       values ($1, $2, $3, 'clave_revocada')`,
      [VS_BILLING_SCHOOL.id, key.id, actorId]
    );
  }
}

function validateExpiry(expiresAt: string | null) {
  if (
    expiresAt !== null &&
    (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())
  )
    throw new Error("La vigencia debe ser una fecha futura.");
}

export async function rotateConnectionKey(
  nombre: string,
  actorId: string,
  expiresAt: string | null = new Date(Date.now() + 90 * 86_400_000).toISOString()
) {
  validateExpiry(expiresAt);
  return transaction(async (client) => {
    const token = `cs_vsf_${randomBytes(32).toString("base64url")}`;
    await revokeKeys(client, actorId, null);
    const result = await client.query<ConnectionKey>(
      `insert into public.vs_facturacion_api_keys (escuela_id, nombre, token_hash, identificador, created_by, expires_at)
       values ($1, $2, $3, $4, $5, $6) returning ${KEY_COLUMNS}`,
      [
        VS_BILLING_SCHOOL.id,
        nombre,
        hashConnectionToken(token),
        `cs_vsf_...${token.slice(-4)}`,
        actorId,
        expiresAt,
      ]
    );
    const key = result.rows[0];
    await client.query(
      `insert into public.vs_facturacion_api_events (escuela_id, key_id, actor_id, accion)
       values ($1, $2, $3, 'clave_creada')`,
      [VS_BILLING_SCHOOL.id, key.id, actorId]
    );
    return { clave: key, token };
  });
}

export async function revokeConnectionKey(id: string, actorId: string) {
  await transaction((client) => revokeKeys(client, actorId, id));
}

export async function updateConnectionExpiry(
  id: string,
  expiresAt: string | null,
  actorId: string
) {
  validateExpiry(expiresAt);
  return transaction(async (client) => {
    const previous = await client.query<{ expires_at: string | null }>(
      `select expires_at::text from public.vs_facturacion_api_keys
       where id = $1 and escuela_id = $2 and revoked_at is null and deleted_at is null for update`,
      [id, VS_BILLING_SCHOOL.id]
    );
    if (!previous.rows.length) return null;
    const result = await client.query<ConnectionKey>(
      `update public.vs_facturacion_api_keys set expires_at = $3
       where id = $1 and escuela_id = $2 and revoked_at is null and deleted_at is null
       returning ${KEY_COLUMNS}`,
      [id, VS_BILLING_SCHOOL.id, expiresAt]
    );
    await client.query(
      `insert into public.vs_facturacion_api_events
       (escuela_id, key_id, actor_id, accion, expires_at_before, expires_at_after)
       values ($1, $2, $3, 'vigencia_editada', $4, $5)`,
      [VS_BILLING_SCHOOL.id, id, actorId, previous.rows[0].expires_at, expiresAt]
    );
    return result.rows[0];
  });
}

export async function deleteConnectionKey(id: string, actorId: string) {
  await transaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `update public.vs_facturacion_api_keys
       set deleted_at = now(), revoked_at = coalesce(revoked_at, now())
       where id = $1 and escuela_id = $2 and deleted_at is null returning id`,
      [id, VS_BILLING_SCHOOL.id]
    );
    if (!result.rows.length) return;
    await client.query(
      `insert into public.vs_facturacion_api_events (escuela_id, key_id, actor_id, accion)
       values ($1, $2, $3, 'conexion_eliminada')`,
      [VS_BILLING_SCHOOL.id, id, actorId]
    );
  });
}

export async function authenticateConnectionToken(
  authorization: string | null
): Promise<string | null> {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!TOKEN_PATTERN.test(token)) return null;
  const result = await getServerDbPool().query<{ id: string }>(
    `update public.vs_facturacion_api_keys k set last_used_at = now()
     from public.escuelas e, public.perfiles p
     where k.token_hash = $1 and k.escuela_id = $2 and k.revoked_at is null
       and k.deleted_at is null and (k.expires_at is null or k.expires_at > now())
       and e.id = k.escuela_id
       and regexp_replace(e.cif, '[.[:space:]]', '', 'g') in ($3, $3 || '-0')
       and p.id = k.created_by and p.activo = true
       and (p.rol = 'super_admin' or (p.rol = 'admin_escuela' and p.escuela_id = k.escuela_id))
     returning k.id`,
    [hashConnectionToken(token), VS_BILLING_SCHOOL.id, VS_BILLING_SCHOOL.nit]
  );
  return result.rows[0]?.id ?? null;
}

type StudentRow = {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  tipo_documento: string | null;
  email: string | null;
};

// Lista explicita: nunca consultar matriculas, cursos, valores, pagos ni credenciales.
const EXPORT_QUERY = `select a.id, a.nombre, a.apellidos, a.dni, a.tipo_documento, a.email
  from public.alumnos a where a.escuela_id = $1`;

function toExport(row: StudentRow): BillingStudent {
  return {
    schema_version: 1,
    source: "condusoft",
    source_reference: `condusoft:alumno:${row.id}`,
    alumno: {
      id: row.id,
      nombre: row.nombre,
      apellidos: row.apellidos,
      nombre_completo: `${row.nombre} ${row.apellidos}`.trim(),
      tipo_documento: row.tipo_documento,
      documento: row.dni,
      email: row.email,
    },
  };
}

export async function searchBillingStudents(search: string, after: string | null) {
  const escaped = search.replace(/[\\%_]/g, "\\$&");
  const result = await getServerDbPool().query<StudentRow>(
    `${EXPORT_QUERY} and ($3::uuid is null or a.id > $3)
     and (a.dni = $2 or concat_ws(' ', a.nombre, a.apellidos) ilike $4)
     order by a.id limit 21`,
    [VS_BILLING_SCHOOL.id, search, after, `%${escaped}%`]
  );
  return {
    data: result.rows.slice(0, 20).map(toExport),
    next_cursor: result.rows.length > 20 ? result.rows[19].id : null,
  };
}

export async function getBillingStudent(id: string) {
  const row = (
    await getServerDbPool().query<StudentRow>(`${EXPORT_QUERY} and a.id = $2`, [
      VS_BILLING_SCHOOL.id,
      id,
    ])
  ).rows[0];
  return row ? toExport(row) : null;
}
