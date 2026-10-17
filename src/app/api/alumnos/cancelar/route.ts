import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  ensureSchoolScope,
  ensureSedeScope,
  parseJsonBody,
} from "@/lib/api-auth";
import { normalizeContractSequencePrefix } from "@/lib/contracts";
import { getContractSchemaCapabilities } from "@/lib/contracts-server";
import {
  buildDashboardCacheTags,
  buildDashboardListCacheTags,
  buildFinanceCacheTags,
} from "@/lib/server-cache-tags";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import { getServerDbPool } from "@/lib/server-db";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];

const cancelAlumnoSchema = z.object({
  alumno_id: z.string().uuid(),
  motivo: z.string().trim().max(500).optional().nullable(),
});

type AlumnoTarget = {
  id: string;
  user_id: string;
  escuela_id: string;
  sede_id: string;
  tipo_registro: string;
  numero_contrato: string | null;
};

type MatriculaTarget = {
  id: string;
  numero_contrato: string | null;
  prefijo_contrato: string | null;
  consecutivo_contrato: number | string | null;
  estado: string;
};

function matriculaHasAssignedContract(matricula: MatriculaTarget) {
  return Boolean(
    matricula.numero_contrato?.trim() ||
    normalizeContractSequencePrefix(matricula.prefijo_contrato) ||
    (matricula.consecutivo_contrato != null && Number(matricula.consecutivo_contrato) > 0)
  );
}

export async function POST(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, cancelAlumnoSchema);
  if (!parsed.ok) return parsed.response;

  const pool = getServerDbPool();
  const alumnoRes = await pool.query<AlumnoTarget>(
    `
      select id, user_id, escuela_id, sede_id, tipo_registro, numero_contrato
      from public.alumnos
      where id = $1
      limit 1
    `,
    [parsed.data.alumno_id]
  );

  const alumno = alumnoRes.rows[0] ?? null;
  if (!alumno) {
    return NextResponse.json({ error: "El alumno ya no existe." }, { status: 404 });
  }

  const schoolScopeError = ensureSchoolScope(authz.perfil, alumno.escuela_id);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  const sedeScopeError = ensureSedeScope(authz.perfil, alumno.sede_id);
  if (sedeScopeError) {
    return NextResponse.json({ error: sedeScopeError }, { status: 403 });
  }

  const contractCapabilities = await getContractSchemaCapabilities(pool);
  const matriculasRes = await pool.query<MatriculaTarget>(
    `
      select
        id,
        numero_contrato,
        ${contractCapabilities.matriculaPrefix ? "prefijo_contrato" : "null::text as prefijo_contrato"},
        ${contractCapabilities.matriculaConsecutive ? "consecutivo_contrato" : "null::bigint as consecutivo_contrato"},
        estado
      from public.matriculas_alumno
      where alumno_id = $1
    `,
    [alumno.id]
  );

  const matriculas = matriculasRes.rows;
  const hasProtectedContract =
    alumno.tipo_registro === "regular" &&
    (Boolean(alumno.numero_contrato?.trim()) || matriculas.some(matriculaHasAssignedContract));

  if (!hasProtectedContract) {
    return NextResponse.json(
      {
        error:
          "Este alumno no tiene un contrato asignado para cancelar. Usa la eliminación normal si necesitas borrar el registro.",
      },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const [perfilRes, linkedStudentsRes] = await Promise.all([
      client.query<{ rol: Rol }>(
        `
          select rol
          from public.perfiles
          where id = $1
          limit 1
        `,
        [alumno.user_id]
      ),
      client.query<{ total: number | string | null }>(
        `
          select count(*)::int as total
          from public.alumnos
          where user_id = $1
        `,
        [alumno.user_id]
      ),
    ]);

    const perfilRol = perfilRes.rows[0]?.rol ?? null;
    const linkedStudents = Number(linkedStudentsRes.rows[0]?.total || 0);
    const ownsDedicatedAlumnoUser = perfilRol === "alumno" && linkedStudents <= 1;

    await client.query(
      `
        update public.matriculas_alumno
        set
          estado = 'cancelado',
          notas = case
            when $3::text is null or $3::text = '' then notas
            when notas is null or btrim(notas) = '' then $3::text
            else notas || E'\\n' || $3::text
          end,
          updated_by = $2,
          updated_at = now()
        where alumno_id = $1
          and estado <> 'cancelado'
      `,
      [
        alumno.id,
        authz.perfil.id,
        parsed.data.motivo?.trim()
          ? `Cancelado por ${authz.perfil.rol}: ${parsed.data.motivo.trim()}`
          : null,
      ]
    );

    await client.query(
      `
        update public.alumnos
        set estado = 'inactivo'
        where id = $1
      `,
      [alumno.id]
    );

    if (ownsDedicatedAlumnoUser) {
      await client.query(
        `
          update public.perfiles
          set activo = false
          where id = $1
        `,
        [alumno.user_id]
      );
    }

    await client.query("COMMIT");

    try {
      const scope = { escuelaId: alumno.escuela_id, sedeId: alumno.sede_id };
      revalidateServerReadCache([
        ...buildDashboardListCacheTags("alumnos", scope),
        ...buildDashboardListCacheTags("cartera", scope),
        ...buildDashboardListCacheTags("contratos", scope),
        ...buildFinanceCacheTags("portfolio", scope),
        ...buildDashboardCacheTags("admin", scope),
      ]);
    } catch {
      // Un fallo de caché después de guardar no debe revertir ni presentar la cancelación como fallida
    }

    return NextResponse.json({
      ok: true,
      mode: "cancelled",
      alumno_id: alumno.id,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo cancelar el alumno.",
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
