import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  normalizeText,
  parseJsonBody,
} from "@/lib/api-auth";
import { getAuditedRolesForCapabilityAction } from "@/lib/role-capabilities";
import {
  buildManualCaleQuestionCode,
  normalizeCaleQuestionPrompt,
  type CaleBankQuestionRow,
} from "@/lib/cale-admin";
import { CALE_BANK_SOURCE } from "@/lib/cale";

const EDITOR_ROLES = getAuditedRolesForCapabilityAction("exams", "configure");

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
  questionId: string,
  details: Record<string, unknown>
) {
  await supabaseAdmin.from("actividad_log").insert({
    escuela_id: perfil.escuela_id,
    sede_id: perfil.sede_id,
    user_id: perfil.id,
    accion: "editar_pregunta_cale",
    tabla: "preguntas_examen",
    registro_id: questionId,
    detalles: details,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ questionId: string }> }
) {
  const authz = await authorizeApiRequest(EDITOR_ROLES);
  if (!authz.ok) return authz.response;

  const parsedBody = await parseJsonBody(request, questionSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const { questionId } = await context.params;
  if (!questionId) {
    return NextResponse.json({ error: "Pregunta inválida." }, { status: 400 });
  }

  const payload = normalizeQuestionPayload(parsedBody.data);
  if (payload.respuesta_correcta === "d" && !payload.opcion_d) {
    return NextResponse.json(
      { error: "La opción D es obligatoria si la respuesta correcta es D." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = buildSupabaseAdminClient();

    const [{ data: existing, error: existingError }, { data: category, error: categoryError }] =
      await Promise.all([
        supabaseAdmin
          .from("preguntas_examen")
          .select("id")
          .eq("id", questionId)
          .eq("fuente", CALE_BANK_SOURCE)
          .maybeSingle(),
        supabaseAdmin
          .from("categorias_examen")
          .select("id, nombre")
          .eq("id", payload.categoria_id)
          .eq("fuente", CALE_BANK_SOURCE)
          .maybeSingle(),
      ]);
    if (existingError) throw existingError;
    if (categoryError) throw categoryError;

    if (!existing) {
      return NextResponse.json(
        { error: "La pregunta ya no existe dentro del banco CALE activo." },
        { status: 404 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "La categoría seleccionada no pertenece al banco CALE activo." },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("preguntas_examen")
      .update({
        ...payload,
        updated_by: authz.perfil.id,
      })
      .eq("id", questionId)
      .eq("fuente", CALE_BANK_SOURCE)
      .select("*")
      .single();
    if (updateError) throw updateError;

    await logActivity(supabaseAdmin, authz.perfil, questionId, {
      categoria_id: payload.categoria_id,
      codigo_externo: payload.codigo_externo,
      activa: payload.activa,
    });

    return NextResponse.json({
      question: {
        ...(updated as CaleBankQuestionRow),
        categoria_nombre: category.nombre,
      },
    });
  } catch (error) {
    console.error("[API CALE admin questions PATCH] Error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la pregunta del banco CALE." },
      { status: 500 }
    );
  }
}
