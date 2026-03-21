import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  ensureSchoolScope,
  normalizeEmail,
  normalizeText,
  parseJsonBody,
} from "@/lib/api-auth";
import { getAuditedRolesForCapabilityAction } from "@/lib/role-capabilities";
import { getServerDbPool } from "@/lib/server-db";
import type { EstadoSede, Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = getAuditedRolesForCapabilityAction("branches", "create");

const upsertSedeSchema = z.object({
  id: z.string().uuid().optional(),
  escuela_id: z.string().uuid("Escuela inválida."),
  nombre: z.string().trim().min(1).max(200),
  estado: z.enum(["activa", "inactiva"]),
  es_principal: z.boolean().default(false),
  direccion: z.string().trim().max(500).optional().nullable(),
  ciudad: z.string().trim().max(200).optional().nullable(),
  provincia: z.string().trim().max(200).optional().nullable(),
  codigo_postal: z.string().trim().max(40).optional().nullable(),
  telefono: z.string().trim().max(80).optional().nullable(),
  email: z.string().email("Correo inválido.").optional().nullable(),
  horario_apertura: z.string().trim().max(40).optional().nullable(),
  horario_cierre: z.string().trim().max(40).optional().nullable(),
  categorias: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
});

const deleteSedeSchema = z.object({
  id: z.string().uuid(),
});

type ExistingSedeRow = {
  id: string;
  escuela_id: string;
  es_principal: boolean;
};

type CountRow = {
  total: number | string | null;
};

function normalizeOptionalField(value: string | null | undefined) {
  return normalizeText(value);
}

async function loadExistingSede(id: string) {
  const pool = getServerDbPool();
  const result = await pool.query<ExistingSedeRow>(
    `
      select id, escuela_id, es_principal
      from public.sedes
      where id = $1
      limit 1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

async function saveSede(
  authzPerfil: Parameters<typeof ensureSchoolScope>[0],
  data: z.infer<typeof upsertSedeSchema>
) {
  const schoolScopeError = ensureSchoolScope(authzPerfil, data.escuela_id);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  const existing = data.id ? await loadExistingSede(data.id) : null;
  if (data.id && !existing) {
    return NextResponse.json({ error: "La sede ya no existe." }, { status: 404 });
  }

  if (existing) {
    const existingScopeError = ensureSchoolScope(authzPerfil, existing.escuela_id);
    if (existingScopeError) {
      return NextResponse.json({ error: existingScopeError }, { status: 403 });
    }

    if (existing.escuela_id !== data.escuela_id) {
      return NextResponse.json(
        { error: "No se puede mover una sede existente a otra escuela desde este formulario." },
        { status: 400 }
      );
    }
  }

  const pool = getServerDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const schoolRes = await client.query<{ id: string }>(
      `
        update public.escuelas
        set categorias = $2
        where id = $1
        returning id
      `,
      [data.escuela_id, data.categorias]
    );

    if (!schoolRes.rows[0]?.id) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "La escuela seleccionada no existe." }, { status: 400 });
    }

    const countRes = await client.query<CountRow>(
      "select count(*)::int as total from public.sedes where escuela_id = $1",
      [data.escuela_id]
    );
    const totalSedes = Number(countRes.rows[0]?.total || 0);

    const shouldBePrincipal = data.id
      ? existing?.es_principal && !data.es_principal
        ? false
        : data.es_principal
      : data.es_principal || totalSedes === 0;

    if (existing?.es_principal && !shouldBePrincipal) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "No puedes quitar la sede principal sin designar otra primero." },
        { status: 400 }
      );
    }

    if (shouldBePrincipal) {
      await client.query(
        `
          update public.sedes
          set es_principal = false
          where escuela_id = $1
            and es_principal = true
            and ($2::uuid is null or id <> $2::uuid)
        `,
        [data.escuela_id, data.id ?? null]
      );
    }

    const payload: Array<string | boolean | null> = [
      data.escuela_id,
      data.nombre.trim(),
      data.estado as EstadoSede,
      shouldBePrincipal,
      normalizeOptionalField(data.direccion),
      normalizeOptionalField(data.ciudad),
      normalizeOptionalField(data.provincia),
      normalizeOptionalField(data.codigo_postal),
      normalizeOptionalField(data.telefono),
      normalizeEmail(data.email),
      normalizeOptionalField(data.horario_apertura),
      normalizeOptionalField(data.horario_cierre),
    ];

    let savedId = data.id ?? null;

    if (data.id) {
      const updateRes = await client.query<{ id: string }>(
        `
          update public.sedes
          set
            escuela_id = $1,
            nombre = $2,
            estado = $3,
            es_principal = $4,
            direccion = $5,
            ciudad = $6,
            provincia = $7,
            codigo_postal = $8,
            telefono = $9,
            email = $10,
            horario_apertura = $11,
            horario_cierre = $12
          where id = $13
          returning id
        `,
        [...payload, data.id]
      );
      savedId = updateRes.rows[0]?.id ?? null;
    } else {
      const insertRes = await client.query<{ id: string }>(
        `
          insert into public.sedes (
            escuela_id,
            nombre,
            estado,
            es_principal,
            direccion,
            ciudad,
            provincia,
            codigo_postal,
            telefono,
            email,
            horario_apertura,
            horario_cierre
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          returning id
        `,
        payload
      );
      savedId = insertRes.rows[0]?.id ?? null;
    }

    if (!savedId) {
      throw new Error("No se pudo guardar la sede.");
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, id: savedId });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo guardar la sede.",
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, upsertSedeSchema.omit({ id: true }));
  if (!parsed.ok) return parsed.response;

  return saveSede(authz.perfil, parsed.data);
}

export async function PATCH(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, upsertSedeSchema);
  if (!parsed.ok) return parsed.response;

  if (!parsed.data.id) {
    return NextResponse.json({ error: "Debes indicar la sede a actualizar." }, { status: 400 });
  }

  return saveSede(authz.perfil, parsed.data);
}

export async function DELETE(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, deleteSedeSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await loadExistingSede(parsed.data.id);
  if (!existing) {
    return NextResponse.json({ error: "La sede ya no existe." }, { status: 404 });
  }

  const schoolScopeError = ensureSchoolScope(authz.perfil, existing.escuela_id);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  if (existing.es_principal) {
    return NextResponse.json(
      { error: "No puedes eliminar la sede principal. Primero designa otra sede como principal." },
      { status: 400 }
    );
  }

  const pool = getServerDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sedesRes = await client.query<CountRow>(
      "select count(*)::int as total from public.sedes where escuela_id = $1",
      [existing.escuela_id]
    );
    if (Number(sedesRes.rows[0]?.total || 0) <= 1) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "No puedes eliminar la única sede de la escuela." },
        { status: 400 }
      );
    }

    const [alumnosRes, instructoresRes] = await Promise.all([
      client.query<CountRow>(
        "select count(*)::int as total from public.alumnos where sede_id = $1",
        [existing.id]
      ),
      client.query<CountRow>(
        "select count(*)::int as total from public.instructores where sede_id = $1",
        [existing.id]
      ),
    ]);

    const totalAlumnos = Number(alumnosRes.rows[0]?.total || 0);
    const totalInstructores = Number(instructoresRes.rows[0]?.total || 0);

    if (totalAlumnos > 0 || totalInstructores > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `Esta sede tiene ${totalAlumnos} alumno(s) y ${totalInstructores} instructor(es) asignados. Reasígnalos antes de eliminar la sede.`,
        },
        { status: 400 }
      );
    }

    await client.query("delete from public.sedes where id = $1", [existing.id]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo eliminar la sede.",
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
