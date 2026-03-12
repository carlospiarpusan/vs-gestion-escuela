const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");

const DEFAULT_JSON_PATH = path.resolve(__dirname, "../data/cale/exports/cale-editorial-lote-01-a-lote-26.json");
const CALE_SOURCE = "cale_editorial_v1";
const CALE_SOURCE_PREFIX = "cale";
const PLACEHOLDER_OPTION_PATTERN = /\bincorrecta\b/i;
const CATEGORY_ORDER = new Map([
  ["Actitudes", 1],
  ["Movilidad segura y sostenible", 2],
  ["Normas de transito", 3],
  ["Senalizacion vial e infraestructura", 4],
  ["El vehiculo", 5],
]);

function loadEnv() {
  for (const filename of [".env.local", ".env"]) {
    const envPath = path.join(__dirname, "..", filename);
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function chunk(array, size) {
  const parts = [];
  for (let index = 0; index < array.length; index += size) {
    parts.push(array.slice(index, index + size));
  }
  return parts;
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized || null;
}

async function syncQuestionsWithPg(questionPayload) {
  if (!process.env.DATABASE_URL) {
    return false;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    for (const batch of chunk(questionPayload, 200)) {
      const values = [];
      const params = [CALE_SOURCE];

      batch.forEach((row, index) => {
        const base = 2 + index * 11;
        values.push(
          `($${base}::text, $${base + 1}::text, $${base + 2}::text, $${base + 3}::text, $${base + 4}::text, $${base + 5}::text, $${base + 6}::text, $${base + 7}::text, $${base + 8}::text, $${base + 9}::text, $${base + 10}::boolean)`
        );
        params.push(
          row.codigo_externo,
          row.pregunta,
          row.opcion_a,
          row.opcion_b,
          row.opcion_c,
          row.opcion_d,
          row.respuesta_correcta,
          row.explicacion,
          row.fundamento_legal,
          row.dificultad,
          row.activa
        );
      });

      await client.query(
        `
          update public.preguntas_examen as preguntas
          set
            pregunta = payload.pregunta,
            opcion_a = payload.opcion_a,
            opcion_b = payload.opcion_b,
            opcion_c = payload.opcion_c,
            opcion_d = payload.opcion_d,
            respuesta_correcta = payload.respuesta_correcta,
            explicacion = payload.explicacion,
            fundamento_legal = payload.fundamento_legal,
            dificultad = payload.dificultad,
            activa = payload.activa
          from (
            values ${values.join(",\n")}
          ) as payload (
            codigo_externo,
            pregunta,
            opcion_a,
            opcion_b,
            opcion_c,
            opcion_d,
            respuesta_correcta,
            explicacion,
            fundamento_legal,
            dificultad,
            activa
          )
          where preguntas.fuente = $1
            and preguntas.codigo_externo = payload.codigo_externo
        `,
        params
      );
    }

    return true;
  } finally {
    await client.end();
  }
}

function normalizeDifficulty(value) {
  const normalized = normalizeText(value)?.toLowerCase();
  if (normalized === "alta") return "dificil";
  if (normalized === "baja") return "facil";
  return "media";
}

function normalizeAnswer(value) {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized || !["a", "b", "c", "d"].includes(normalized)) {
    throw new Error(`Respuesta correcta inválida: ${value}`);
  }
  return normalized;
}

function buildCategoryDescription(nombre) {
  return `Banco CALE importado para entrenamiento de alumnos: ${nombre}.`;
}

function hasPlaceholderOption(options) {
  return options.some((option) => PLACEHOLDER_OPTION_PATTERN.test(option));
}

function ensureRows(rawRows) {
  if (rawRows && typeof rawRows === "object" && Array.isArray(rawRows.lotes)) {
    const editorialRows = rawRows.lotes.flatMap((lot) => lot.preguntas || []);
    if (editorialRows.length === 0) {
      throw new Error("El export editorial CALE no contiene preguntas.");
    }

    return {
      importableRows: editorialRows.map((row, index) => {
        const codigoExterno = normalizeText(row.id);
        const pregunta = normalizeText(row.pregunta);
        const opcionA = normalizeText(row.opcion_a);
        const opcionB = normalizeText(row.opcion_b);
        const opcionC = normalizeText(row.opcion_c);
        const opcionD = normalizeText(row.opcion_d);
        const categoriaNombre = normalizeText(row.nucleo_nombre);
        const categoriaOrden = CATEGORY_ORDER.get(categoriaNombre) || index + 1;
        const respuesta = normalizeAnswer(row.respuesta_correcta || row.respuesta_recomendada);

        if (!codigoExterno) throw new Error(`Fila editorial ${index + 1}: falta el id externo.`);
        if (!pregunta) throw new Error(`Fila editorial ${index + 1}: falta la pregunta.`);
        if (!opcionA || !opcionB || !opcionC || !opcionD) {
          throw new Error(`Fila editorial ${index + 1}: la pregunta ${codigoExterno} no tiene las 4 opciones completas.`);
        }
        if (!categoriaNombre) throw new Error(`Fila editorial ${index + 1}: falta el núcleo de conocimiento.`);

        return {
          codigo_externo: codigoExterno,
          categoria_nombre: categoriaNombre,
          categoria_orden: categoriaOrden,
          pregunta,
          imagen_url: normalizeText(row.imagen_url),
          opcion_a: opcionA,
          opcion_b: opcionB,
          opcion_c: opcionC,
          opcion_d: opcionD,
          respuesta_correcta: respuesta,
          explicacion: normalizeText(row.explicacion || row.explicacion_respuesta),
          fundamento_legal: normalizeText(row.fundamento_legal),
          dificultad: normalizeDifficulty(row.dificultad),
          activa: row.activa !== false,
        };
      }),
      skippedRows: [],
    };
  }

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error("El archivo JSON no contiene preguntas válidas.");
  }

  const normalizedRows = rawRows.map((row, index) => {
    const codigoExterno = normalizeText(row.id);
    const pregunta = normalizeText(row.pregunta);
    const opcionA = normalizeText(row.opcion_a);
    const opcionB = normalizeText(row.opcion_b);
    const opcionC = normalizeText(row.opcion_c);
    const opcionD = normalizeText(row.opcion_d);
    const categoriaNombre = normalizeText(row.nucleo_nombre);
    const categoriaOrden = Number(row.nucleo_id) || index + 1;

    if (!codigoExterno) throw new Error(`Fila ${index + 1}: falta el id externo.`);
    if (!pregunta) throw new Error(`Fila ${index + 1}: falta la pregunta.`);
    if (!opcionA || !opcionB || !opcionC || !opcionD) {
      throw new Error(`Fila ${index + 1}: la pregunta ${codigoExterno} no tiene las 4 opciones completas.`);
    }
    if (!categoriaNombre) throw new Error(`Fila ${index + 1}: falta el núcleo de conocimiento.`);

    return {
      codigo_externo: codigoExterno,
      categoria_nombre: categoriaNombre,
      categoria_orden: categoriaOrden,
      pregunta,
      imagen_url: normalizeText(row.imagen_url),
      opcion_a: opcionA,
      opcion_b: opcionB,
      opcion_c: opcionC,
      opcion_d: opcionD,
      respuesta_correcta: normalizeAnswer(row.respuesta_correcta),
      explicacion: normalizeText(row.explicacion),
      fundamento_legal: normalizeText(row.fundamento_legal),
      dificultad: normalizeDifficulty(row.dificultad),
      activa: Boolean(row.activo),
    };
  });

  const skippedRows = normalizedRows.filter((row) =>
    hasPlaceholderOption([row.opcion_a, row.opcion_b, row.opcion_c, row.opcion_d])
  );
  const importableRows = normalizedRows.filter((row) =>
    !hasPlaceholderOption([row.opcion_a, row.opcion_b, row.opcion_c, row.opcion_d])
  );

  if (importableRows.length === 0) {
    throw new Error("Todas las preguntas del JSON fueron descartadas por opciones placeholder.");
  }

  return {
    importableRows,
    skippedRows,
  };
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  const jsonPath = process.argv[2] || DEFAULT_JSON_PATH;
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`No existe el archivo JSON: ${jsonPath}`);
  }

  const rawRows = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const { importableRows: rows, skippedRows } = ensureRows(rawRows);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🧹 Eliminando bancos CALE anteriores...`);

  const { error: deleteQuestionsError } = await supabaseAdmin
    .from("preguntas_examen")
    .delete()
    .like("fuente", `${CALE_SOURCE_PREFIX}%`);
  if (deleteQuestionsError) throw deleteQuestionsError;

  const { error: deleteCategoriesError } = await supabaseAdmin
    .from("categorias_examen")
    .delete()
    .like("fuente", `${CALE_SOURCE_PREFIX}%`);
  if (deleteCategoriesError) throw deleteCategoriesError;

  const categoriesByName = new Map();
  for (const row of rows) {
    if (!categoriesByName.has(row.categoria_nombre)) {
      categoriesByName.set(row.categoria_nombre, {
        nombre: row.categoria_nombre,
        descripcion: buildCategoryDescription(row.categoria_nombre),
        tipo_permiso: "comun",
        orden: row.categoria_orden,
        fuente: CALE_SOURCE,
      });
    }
  }

  const categoryPayload = Array.from(categoriesByName.values()).sort((a, b) => a.orden - b.orden);
  const { data: insertedCategories, error: insertCategoriesError } = await supabaseAdmin
    .from("categorias_examen")
    .insert(categoryPayload)
    .select("id, nombre");
  if (insertCategoriesError) throw insertCategoriesError;

  const categoryIds = new Map((insertedCategories || []).map((item) => [item.nombre, item.id]));

  const questionPayload = rows.map((row) => {
    const categoriaId = categoryIds.get(row.categoria_nombre);
    if (!categoriaId) {
      throw new Error(`No se encontró categoría para ${row.categoria_nombre}`);
    }

    return {
      categoria_id: categoriaId,
      pregunta: row.pregunta,
      imagen_url: row.imagen_url,
      opcion_a: row.opcion_a,
      opcion_b: row.opcion_b,
      opcion_c: row.opcion_c,
      opcion_d: row.opcion_d,
      respuesta_correcta: row.respuesta_correcta,
      explicacion: row.explicacion,
      fundamento_legal: row.fundamento_legal,
      tipo_permiso: "comun",
      dificultad: row.dificultad,
      activa: row.activa,
      fuente: CALE_SOURCE,
      codigo_externo: row.codigo_externo,
    };
  });

  console.log(`📚 Importando ${questionPayload.length} preguntas CALE...`);

  for (const [index, batch] of chunk(questionPayload, 200).entries()) {
    const { error } = await supabaseAdmin.from("preguntas_examen").insert(batch);
    if (error) throw error;
    console.log(`   Lote ${index + 1}/${Math.ceil(questionPayload.length / 200)} cargado`);
  }

  const pgSynced = await syncQuestionsWithPg(questionPayload);

  const categoriesCount = categoryPayload.length;
  const activeCount = questionPayload.filter((item) => item.activa).length;
  const withImages = questionPayload.filter((item) => item.imagen_url).length;
  const withLegalBasis = questionPayload.filter((item) => item.fundamento_legal).length;

  console.log("");
  console.log("✅ Banco CALE importado correctamente");
  console.log(`   Fuente: ${CALE_SOURCE}`);
  console.log(`   Categorías: ${categoriesCount}`);
  console.log(`   Preguntas: ${questionPayload.length}`);
  console.log(`   Activas: ${activeCount}`);
  console.log(`   Con imagen: ${withImages}`);
  console.log(`   Con fundamento legal: ${withLegalBasis}`);
  console.log(`   Descartadas por placeholders: ${skippedRows.length}`);
  console.log(`   Sincronizacion PostgreSQL: ${pgSynced ? "si" : "no"}`);
}

main().catch((error) => {
  console.error("❌ Error importando banco CALE:", error.message || error);
  process.exit(1);
});
