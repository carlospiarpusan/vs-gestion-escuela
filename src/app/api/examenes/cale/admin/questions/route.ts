import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  normalizeText,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  getAuditedRolesForCapabilityAction,
  getAuditedRolesForCapabilityModule,
} from "@/lib/role-capabilities";
import {
  buildManualCaleQuestionCode,
  normalizeCaleQuestionPrompt,
  type CaleBankAdminResponse,
  type CaleBankCategorySummary,
  type CaleBankQuestionRow,
} from "@/lib/cale-admin";
import { CALE_BANK_SOURCE } from "@/lib/cale";
import { getServerDbPool } from "@/lib/server-db";
import { parseInteger, toNumber } from "@/lib/api-helpers";

const VIEWER_ROLES = getAuditedRolesForCapabilityModule("exams");
const EDITOR_ROLES = getAuditedRolesForCapabilityAction("exams", "configure");
const PAGE_SIZE_DEFAULT = 12;
const PAGE_SIZE_MAX = 50;

const questionSchema = z.object({
  categoria_id: z.string().uuid(),
  pregunta: z.string().min(10).max(2000),
  imagen_url: z.string().trim().max(2000).optional().default(""),
  opcion_a: z.string().min(1).max(1000),
  opcion_b: z.string().min(1).max(1000),
  opcion_c: z.string().min(1).max(1000),
  opcion_d: z.string().trim().max(1000).optional().default(""),
  respuesta_correcta: z.enum(["a", "b", "c", "d"]),
  explicacion: z.string().min(10).max(5000),
  fundamento_legal: z.string().trim().max(5000).optional().default(""),
  tipo_permiso: z.enum(["AM", "A1", "A2", "A", "B", "C", "D", "comun"]).default("comun"),
  dificultad: z.enum(["facil", "media", "dificil"]).default("media"),
  activa: z.boolean().default(true),
  codigo_externo: z.string().trim().max(120).optional().default(""),
});

function canEditBank(role: string) {
  return EDITOR_ROLES.includes(role as (typeof EDITOR_ROLES)[number]);
}

function normalizeQuestionPayload(input: z.infer<typeof questionSchema>) {
  const pregunta = normalizeCaleQuestionPrompt(input.pregunta);
  const codigoExterno = normalizeText(input.codigo_externo) || buildManualCaleQuestionCode();
  const opcionD = normalizeText(input.opcion_d);

  return {
    categoria_id: input.categoria_id,
    pregunta,
    imagen_url: normalizeText(input.imagen_url),
    opcion_a: input.opcion_a.trim(),
    opcion_b: input.opcion_b.trim(),
    opcion_c: input.opcion_c.trim(),
    opcion_d: opcionD,
    respuesta_correcta: input.respuesta_correcta,
    explicacion: input.explicacion.trim(),
    fundamento_legal: normalizeText(input.fundamento_legal),
    tipo_permiso: input.tipo_permiso,
    dificultad: input.dificultad,
    activa: input.activa,
    codigo_externo: codigoExterno,
  };
}

async function logActivity(
  supabaseAdmin: ReturnType<typeof buildSupabaseAdminClient>,
  perfil: { id: string; escuela_id: string | null; sede_id: string | null },
  action: string,
  questionId: string,
  details: Record<string, unknown>
) {
  await supabaseAdmin.from("actividad_log").insert({
    escuela_id: perfil.escuela_id,
    sede_id: perfil.sede_id,
    user_id: perfil.id,
    accion: action,
    tabla: "preguntas_examen",
    registro_id: questionId,
    detalles: details,
  });
}

export async function GET(request: Request) {
  const authz = await authorizeApiRequest(VIEWER_ROLES);
  if (!authz.ok) return authz.response;

  try {
    const url = new URL(request.url);
    const page = parseInteger(url.searchParams.get("page"), 0, 0, 10_000);
    const pageSize = parseInteger(
      url.searchParams.get("pageSize"),
      PAGE_SIZE_DEFAULT,
      1,
      PAGE_SIZE_MAX
    );
    const search = normalizeText(url.searchParams.get("search")) || "";
    const categoryId = normalizeText(url.searchParams.get("categoryId"));
    const difficulty = normalizeText(url.searchParams.get("difficulty"));
    const includeInactive =
      canEditBank(authz.perfil.rol) && url.searchParams.get("includeInactive") === "true";
    const pool = getServerDbPool();

    const values: string[] = [CALE_BANK_SOURCE];
    const filters = ["q.fuente = $1"];

    if (!includeInactive) {
      filters.push("q.activa = true");
    }

    if (categoryId) {
      values.push(categoryId);
      filters.push(`q.categoria_id = $${values.length}`);
    }

    if (difficulty && ["facil", "media", "dificil"].includes(difficulty)) {
      values.push(difficulty);
      filters.push(`q.dificultad = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      const ref = `$${values.length}`;
      filters.push(`(
        q.pregunta ilike ${ref}
        or coalesce(q.explicacion, '') ilike ${ref}
        or coalesce(q.fundamento_legal, '') ilike ${ref}
        or coalesce(q.codigo_externo, '') ilike ${ref}
      )`);
    }

    const whereClause = filters.join(" and ");
    const offset = page * pageSize;
    const limitRef = `$${values.length + 1}`;
    const offsetRef = `$${values.length + 2}`;

    const statsQuery = `
      select
        count(*)::int as total,
        (count(*) filter (where q.activa = true))::int as active,
        (count(*) filter (where q.activa = false))::int as inactive,
        (count(*) filter (where q.imagen_url is not null and btrim(q.imagen_url) <> ''))::int as with_image,
        (count(*) filter (where q.fundamento_legal is not null and btrim(q.fundamento_legal) <> ''))::int as with_legal_basis,
        (count(*) filter (where q.dificultad = 'facil'))::int as facil,
        (count(*) filter (where q.dificultad = 'media'))::int as media,
        (count(*) filter (where q.dificultad = 'dificil'))::int as dificil,
        max(coalesce(q.updated_at, q.created_at))::text as updated_at
      from public.preguntas_examen q
      where q.fuente = $1
    `;

    const categoriesQuery = `
      select
        c.id::text as id,
        c.nombre,
        c.descripcion,
        c.tipo_permiso,
        c.orden,
        c.fuente,
        count(q.id)::int as question_count,
        (count(q.id) filter (where q.activa = true))::int as active_count
      from public.categorias_examen c
      left join public.preguntas_examen q
        on q.categoria_id = c.id
       and q.fuente = $1
      where c.fuente = $1
      group by c.id, c.nombre, c.descripcion, c.tipo_permiso, c.orden, c.fuente
      order by c.orden asc, c.nombre asc
    `;

    const countQuery = `
      select count(*)::int as total
      from public.preguntas_examen q
      where ${whereClause}
    `;

    const listQuery = `
      select
        q.id::text as id,
        q.categoria_id::text as categoria_id,
        c.nombre as categoria_nombre,
        q.pregunta,
        q.imagen_url,
        q.opcion_a,
        q.opcion_b,
        q.opcion_c,
        q.opcion_d,
        q.respuesta_correcta,
        q.explicacion,
        q.fundamento_legal,
        q.tipo_permiso,
        q.dificultad,
        q.activa,
        q.fuente,
        q.codigo_externo,
        q.created_by::text as created_by,
        q.updated_by::text as updated_by,
        q.updated_at::text as updated_at,
        q.created_at::text as created_at
      from public.preguntas_examen q
      left join public.categorias_examen c on c.id = q.categoria_id
      where ${whereClause}
      order by coalesce(q.updated_at, q.created_at) desc, q.created_at desc
      limit ${limitRef}
      offset ${offsetRef}
    `;

    const [statsRes, categoriesRes, countRes, listRes] = await Promise.all([
      pool.query(statsQuery, [CALE_BANK_SOURCE]),
      pool.query(categoriesQuery, [CALE_BANK_SOURCE]),
      pool.query(countQuery, values),
      pool.query(listQuery, values.concat([String(pageSize), String(offset)])),
    ]);

    const statsRow = statsRes.rows[0];
    const response: CaleBankAdminResponse = {
      stats: {
        total: toNumber(statsRow?.total),
        active: toNumber(statsRow?.active),
        inactive: toNumber(statsRow?.inactive),
        withImage: toNumber(statsRow?.with_image),
        withLegalBasis: toNumber(statsRow?.with_legal_basis),
        facil: toNumber(statsRow?.facil),
        media: toNumber(statsRow?.media),
        dificil: toNumber(statsRow?.dificil),
        updatedAt: statsRow?.updated_at ?? null,
      },
      categories: (
        categoriesRes.rows as Array<{
          id: string;
          nombre: string;
          descripcion: string | null;
          tipo_permiso: string;
          orden: number | string;
          fuente: string;
          question_count: number | string;
          active_count: number | string;
        }>
      ).map<CaleBankCategorySummary>((row) => ({
        id: row.id,
        nombre: row.nombre,
        descripcion: row.descripcion,
        tipo_permiso: row.tipo_permiso as CaleBankCategorySummary["tipo_permiso"],
        orden: toNumber(row.orden),
        fuente: row.fuente,
        created_at: "",
        questionCount: toNumber(row.question_count),
        activeCount: toNumber(row.active_count),
      })),
      questions: (listRes.rows as Array<Record<string, unknown>>).map<CaleBankQuestionRow>(
        (row) => ({
          id: String(row.id),
          categoria_id: row.categoria_id ? String(row.categoria_id) : null,
          categoria_nombre: row.categoria_nombre ? String(row.categoria_nombre) : null,
          pregunta: String(row.pregunta || ""),
          imagen_url: row.imagen_url ? String(row.imagen_url) : null,
          opcion_a: String(row.opcion_a || ""),
          opcion_b: String(row.opcion_b || ""),
          opcion_c: String(row.opcion_c || ""),
          opcion_d: row.opcion_d ? String(row.opcion_d) : null,
          respuesta_correcta: row.respuesta_correcta as CaleBankQuestionRow["respuesta_correcta"],
          explicacion: row.explicacion ? String(row.explicacion) : null,
          fundamento_legal: row.fundamento_legal ? String(row.fundamento_legal) : null,
          tipo_permiso: row.tipo_permiso as CaleBankQuestionRow["tipo_permiso"],
          dificultad: row.dificultad as CaleBankQuestionRow["dificultad"],
          activa: Boolean(row.activa),
          fuente: String(row.fuente || CALE_BANK_SOURCE),
          codigo_externo: row.codigo_externo ? String(row.codigo_externo) : null,
          created_by: row.created_by ? String(row.created_by) : null,
          updated_by: row.updated_by ? String(row.updated_by) : null,
          updated_at: row.updated_at ? String(row.updated_at) : null,
          created_at: String(row.created_at || ""),
        })
      ),
      total: toNumber(countRes.rows[0]?.total),
      page,
      pageSize,
      canEdit: canEditBank(authz.perfil.rol),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API CALE admin questions GET] Error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el banco de preguntas CALE." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authz = await authorizeApiRequest(EDITOR_ROLES);
  if (!authz.ok) return authz.response;

  const parsedBody = await parseJsonBody(request, questionSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const payload = normalizeQuestionPayload(parsedBody.data);

  if (payload.respuesta_correcta === "d" && !payload.opcion_d) {
    return NextResponse.json(
      { error: "La opción D es obligatoria si la respuesta correcta es D." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = buildSupabaseAdminClient();

    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categorias_examen")
      .select("id, nombre")
      .eq("id", payload.categoria_id)
      .eq("fuente", CALE_BANK_SOURCE)
      .maybeSingle();
    if (categoryError) throw categoryError;

    if (!category) {
      return NextResponse.json(
        { error: "La categoría seleccionada no pertenece al banco CALE activo." },
        { status: 400 }
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("preguntas_examen")
      .insert({
        ...payload,
        fuente: CALE_BANK_SOURCE,
        created_by: authz.perfil.id,
        updated_by: authz.perfil.id,
      })
      .select("*")
      .single();
    if (insertError) throw insertError;

    await logActivity(supabaseAdmin, authz.perfil, "crear_pregunta_cale", inserted.id, {
      categoria_id: payload.categoria_id,
      codigo_externo: payload.codigo_externo,
      fuente: CALE_BANK_SOURCE,
    });

    return NextResponse.json({
      question: {
        ...(inserted as CaleBankQuestionRow),
        categoria_nombre: category.nombre,
      },
    });
  } catch (error) {
    console.error("[API CALE admin questions POST] Error:", error);
    return NextResponse.json(
      { error: "No se pudo crear la pregunta del banco CALE." },
      { status: 500 }
    );
  }
}
