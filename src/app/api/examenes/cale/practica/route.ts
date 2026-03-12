import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  buildCaleCategoryTargets,
  buildCaleExamNotes,
  CALE_BANK_SOURCE,
  CALE_EXAM_NOTES_PREFIX,
  CALE_PASSING_PERCENTAGE,
  CALE_RESPONSE_OPTIONS,
  normalizeCaleAnswer,
  type RespuestaCale,
} from "@/lib/cale";

const MAX_QUESTIONS = 40;

const submitSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1).max(MAX_QUESTIONS),
  answers: z.record(z.string(), z.string()).default({}),
  elapsedSeconds: z.number().int().min(0).max(60 * 60 * 3).default(0),
});

type AdminClient = ReturnType<typeof buildSupabaseAdminClient>;

function isNonEmptyString(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRespuestaCale(value: string | null): value is RespuestaCale {
  return value !== null && CALE_RESPONSE_OPTIONS.includes(value as RespuestaCale);
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function takeIdsForBalancedPractice(
  idsByCategory: Map<string, string[]>,
  categoryNamesById: Map<string, string>,
  requestedCount: number
) {
  const selected = [];
  const usedIds = new Set();
  const targets = buildCaleCategoryTargets(requestedCount);

  for (const target of targets) {
    const categoryEntry = Array.from(categoryNamesById.entries()).find(([, name]) => name === target.nombre);
    if (!categoryEntry) continue;

    const [categoryId] = categoryEntry;
    const availableIds = shuffleArray(idsByCategory.get(categoryId) || []);
    const picked = availableIds.slice(0, target.count);
    for (const id of picked) {
      selected.push(id);
      usedIds.add(id);
    }
  }

  if (selected.length >= requestedCount) {
    return selected.slice(0, requestedCount);
  }

  const overflowPool = shuffleArray(
    Array.from(idsByCategory.values()).flat().filter((id) => !usedIds.has(id))
  );

  return selected.concat(overflowPool.slice(0, Math.max(0, requestedCount - selected.length)));
}

async function getAlumnoContext(supabaseAdmin: AdminClient, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("alumnos")
    .select("id, escuela_id, sede_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(["alumno"]);
  if (!authorization.ok) return authorization.response;

  const url = new URL(request.url);
  const requestedCount = Number(url.searchParams.get("count") || 20);
  const categoryId = url.searchParams.get("categoryId");
  const count = Number.isFinite(requestedCount)
    ? Math.max(5, Math.min(MAX_QUESTIONS, Math.floor(requestedCount)))
    : 20;

  try {
    const supabaseAdmin = buildSupabaseAdminClient();

    let idsQuery = supabaseAdmin
      .from("preguntas_examen")
      .select("id, categoria_id")
      .eq("fuente", CALE_BANK_SOURCE)
      .eq("activa", true);

    if (categoryId) idsQuery = idsQuery.eq("categoria_id", categoryId);

    const { data: questionIds, error: idsError } = await idsQuery;
    if (idsError) throw idsError;

    const rawIds = questionIds || [];
    const ids = rawIds.map((item) => item.id);
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No hay preguntas disponibles para esta práctica." },
        { status: 404 }
      );
    }

    let selectedIds = shuffleArray(ids).slice(0, Math.min(count, ids.length));

    if (!categoryId) {
      const categoryIds = Array.from(
        new Set(rawIds.map((item) => item.categoria_id).filter(isNonEmptyString))
      );
      const { data: categories, error: categoriesError } = await supabaseAdmin
        .from("categorias_examen")
        .select("id, nombre")
        .eq("fuente", CALE_BANK_SOURCE)
        .in("id", categoryIds);
      if (categoriesError) throw categoriesError;

      const categoryNamesById = new Map((categories || []).map((item) => [item.id, item.nombre]));
      const idsByCategory = new Map();
      for (const item of rawIds) {
        if (!item.categoria_id) continue;
        const current = idsByCategory.get(item.categoria_id) || [];
        current.push(item.id);
        idsByCategory.set(item.categoria_id, current);
      }

      selectedIds = takeIdsForBalancedPractice(idsByCategory, categoryNamesById, Math.min(count, ids.length));
    }

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("preguntas_examen")
      .select("id, categoria_id, pregunta, imagen_url, opcion_a, opcion_b, opcion_c, opcion_d")
      .in("id", selectedIds);
    if (questionsError) throw questionsError;

    const categoryIds = Array.from(
      new Set((questions || []).map((item) => item.categoria_id).filter(isNonEmptyString))
    );
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("categorias_examen")
      .select("id, nombre")
      .in("id", categoryIds);
    if (categoriesError) throw categoriesError;

    const categoryMap = new Map((categories || []).map((item) => [item.id, item.nombre]));
    const questionMap = new Map((questions || []).map((item) => [item.id, item]));
    const orderedQuestions = selectedIds
      .map((id) => questionMap.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        id: item.id,
        categoria_id: item.categoria_id,
        categoria_nombre: item.categoria_id ? categoryMap.get(item.categoria_id) || "General" : "General",
        pregunta: item.pregunta,
        imagen_url: item.imagen_url,
        opcion_a: item.opcion_a,
        opcion_b: item.opcion_b,
        opcion_c: item.opcion_c,
        opcion_d: item.opcion_d,
      }));

    return NextResponse.json({
      source: CALE_BANK_SOURCE,
      generatedAt: new Date().toISOString(),
      questions: orderedQuestions,
    });
  } catch (error) {
    console.error("[API CALE GET] Error:", error);
    return NextResponse.json(
      { error: "No se pudo preparar la práctica CALE." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(["alumno"]);
  if (!authorization.ok) return authorization.response;

  const parsedBody = await parseJsonBody(request, submitSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const uniqueQuestionIds = Array.from(new Set(parsedBody.data.questionIds));

  try {
    const supabaseAdmin = buildSupabaseAdminClient();
    const alumno = await getAlumnoContext(supabaseAdmin, authorization.perfil.id);

    if (!alumno) {
      return NextResponse.json(
        { error: "No se encontró el perfil del alumno para guardar el intento." },
        { status: 404 }
      );
    }

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("preguntas_examen")
      .select(
        "id, categoria_id, pregunta, imagen_url, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion, fundamento_legal, codigo_externo"
      )
      .eq("fuente", CALE_BANK_SOURCE)
      .eq("activa", true)
      .in("id", uniqueQuestionIds);
    if (questionsError) throw questionsError;

    if (!questions || questions.length !== uniqueQuestionIds.length) {
      return NextResponse.json(
        { error: "El cuestionario enviado ya no coincide con el banco activo." },
        { status: 409 }
      );
    }

    const categoryIds = Array.from(
      new Set(questions.map((item) => item.categoria_id).filter(isNonEmptyString))
    );
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("categorias_examen")
      .select("id, nombre")
      .in("id", categoryIds);
    if (categoriesError) throw categoriesError;

    const categoryMap = new Map((categories || []).map((item) => [item.id, item.nombre]));
    const questionMap = new Map(questions.map((item) => [item.id, item]));

    const orderedResults = uniqueQuestionIds
      .map((id) => questionMap.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((question) => {
        const selectedAnswer = normalizeCaleAnswer(parsedBody.data.answers[question.id]);
        const correctAnswer = normalizeCaleAnswer(question.respuesta_correcta);
        const isCorrect = Boolean(selectedAnswer && correctAnswer && selectedAnswer === correctAnswer);

        return {
          id: question.id,
          categoria_id: question.categoria_id,
          categoria_nombre: question.categoria_id ? categoryMap.get(question.categoria_id) || "General" : "General",
          pregunta: question.pregunta,
          imagen_url: question.imagen_url,
          opcion_a: question.opcion_a,
          opcion_b: question.opcion_b,
          opcion_c: question.opcion_c,
          opcion_d: question.opcion_d,
          selectedAnswer,
          correctAnswer,
          isCorrect,
          explicacion: question.explicacion,
          fundamento_legal: question.fundamento_legal,
          codigo_externo: question.codigo_externo,
        };
      });

    const answeredCount = orderedResults.filter((item) => isRespuestaCale(item.selectedAnswer)).length;
    if (answeredCount === 0) {
      return NextResponse.json(
        { error: "Debes responder al menos una pregunta antes de enviar." },
        { status: 400 }
      );
    }

    const correctCount = orderedResults.filter((item) => item.isCorrect).length;
    const percentage = Math.round((correctCount / orderedResults.length) * 100);
    const result = percentage >= CALE_PASSING_PERCENTAGE ? "aprobado" : "suspendido";
    const submittedAt = new Date();

    const { count: previousAttempts, error: countError } = await supabaseAdmin
      .from("examenes")
      .select("id", { count: "exact", head: true })
      .eq("alumno_id", alumno.id)
      .like("notas", `${CALE_EXAM_NOTES_PREFIX}%`);
    if (countError) throw countError;

    const categoryNames = Array.from(
      new Set(orderedResults.map((item) => item.categoria_nombre).filter(isNonEmptyString))
    );
    const notes = buildCaleExamNotes({
      modulo: "cale_practica",
      source: CALE_BANK_SOURCE,
      questionCount: orderedResults.length,
      correctCount,
      percentage,
      elapsedSeconds: parsedBody.data.elapsedSeconds,
      categoryIds,
      categoryNames,
      submittedAt: submittedAt.toISOString(),
    });

    const { data: exam, error: examError } = await supabaseAdmin
      .from("examenes")
      .insert({
        escuela_id: alumno.escuela_id,
        sede_id: alumno.sede_id,
        user_id: authorization.perfil.id,
        alumno_id: alumno.id,
        tipo: "teorico",
        fecha: submittedAt.toISOString().slice(0, 10),
        hora: submittedAt.toISOString().slice(11, 19),
        resultado: result,
        intentos: (previousAttempts || 0) + 1,
        modulo_origen: "cale_practica",
        fuente_banco: CALE_BANK_SOURCE,
        total_preguntas: orderedResults.length,
        respuestas_correctas: correctCount,
        porcentaje: percentage,
        tiempo_segundos: parsedBody.data.elapsedSeconds,
        notas: notes,
      })
      .select("id")
      .single();
    if (examError) throw examError;

    const detailRows = orderedResults.map((item, index) => ({
      escuela_id: alumno.escuela_id,
      sede_id: alumno.sede_id,
      alumno_id: alumno.id,
      examen_id: exam.id,
      pregunta_id: item.id,
      categoria_id: item.categoria_id,
      categoria_nombre: item.categoria_nombre,
      codigo_externo: item.codigo_externo,
      pregunta_texto: item.pregunta,
      orden_pregunta: index + 1,
    }));

    const { error: detailsError } = await supabaseAdmin
      .from("examenes_cale_preguntas")
      .insert(detailRows);
    if (detailsError) throw detailsError;

    const answerRows = orderedResults
      .map((item, index) => ({
        escuela_id: alumno.escuela_id,
        sede_id: alumno.sede_id,
        alumno_id: alumno.id,
        examen_id: exam.id,
        pregunta_id: item.id,
        orden_pregunta: index + 1,
        respuesta_alumno: item.selectedAnswer,
        respuesta_omitida: !isRespuestaCale(item.selectedAnswer),
        es_correcta: item.isCorrect,
        categoria_nombre: item.categoria_nombre,
        pregunta_texto: item.pregunta,
        imagen_url: item.imagen_url,
        opcion_a: item.opcion_a,
        opcion_b: item.opcion_b,
        opcion_c: item.opcion_c,
        opcion_d: item.opcion_d,
        respuesta_correcta: item.correctAnswer,
        explicacion: item.explicacion,
        fundamento_legal: item.fundamento_legal,
        tiempo_segundos: null,
      }))
      .filter((item) => !item.es_correcta);

    if (answerRows.length > 0) {
      const { error: answersError } = await supabaseAdmin
        .from("respuestas_examen")
        .insert(answerRows);
      if (answersError) throw answersError;
    }

    return NextResponse.json({
      examId: exam.id,
      summary: {
        source: CALE_BANK_SOURCE,
        result,
        passingPercentage: CALE_PASSING_PERCENTAGE,
        questionCount: orderedResults.length,
        answeredCount,
        correctCount,
        incorrectCount: orderedResults.length - correctCount,
        percentage,
        elapsedSeconds: parsedBody.data.elapsedSeconds,
        savedAt: submittedAt.toISOString(),
      },
      results: orderedResults,
    });
  } catch (error) {
    console.error("[API CALE POST] Error:", error);
    return NextResponse.json(
      { error: "No se pudo calificar ni guardar la práctica CALE." },
      { status: 500 }
    );
  }
}
