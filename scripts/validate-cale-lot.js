/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("path");
const {
  ATTITUDE_OPTIONS,
  LOT_TARGET_COUNTS,
  normalizeQuestionForDedup,
} = require("../data/cale/schema");

const PLACEHOLDER_PATTERN = /\b(opcion\s+incorrecta|placeholder|TODO:|\[TODO\])\b/i;
const BROKEN_GRAMMAR_PATTERN =
  /A que ayuda .* (cumple|es importante)|Para que sirve al |\b(debe|es)\?$|\b(riesgoso|importante)\s+por\s+que\?$|Sobre .+, como debe valorar un conductor esta conducta:/i;
const VALID_ANSWERS = new Set(["a", "b", "c", "d"]);
const VALID_ATTITUDE_DIRECTIONS = new Set(["acuerdo", "desacuerdo", "seleccion"]);

function fail(message) {
  throw new Error(message);
}

function loadLot(filePath) {
  const absolutePath = path.resolve(filePath);
  delete require.cache[absolutePath];
  return require(absolutePath);
}

function validateQuestion(item, index, fileLabel) {
  const prefix = `${fileLabel} item ${index + 1}${item?.id ? ` (${item.id})` : ""}`;
  if (!item || typeof item !== "object") fail(`${prefix}: formato inválido.`);
  if (!item.id) fail(`${prefix}: falta id.`);
  if (!item.pregunta) fail(`${prefix}: falta pregunta.`);
  const trimmedQ = String(item.pregunta).trim();
  if (!trimmedQ.endsWith("?") || !trimmedQ.includes("¿")) {
    fail(`${prefix}: la pregunta debe incluir signos de apertura y cierre (¿...?).`);
  }
  if (trimmedQ.length < 25) {
    fail(`${prefix}: la pregunta es demasiado corta (${trimmedQ.length} caracteres).`);
  }
  if (BROKEN_GRAMMAR_PATTERN.test(trimmedQ)) {
    fail(`${prefix}: la pregunta presenta redacción robótica o truncada: "${trimmedQ}".`);
  }
  if (!item.nucleo_nombre) fail(`${prefix}: falta nucleo_nombre.`);
  if (!item.subtema) fail(`${prefix}: falta subtema.`);
  if (!item.hecho_canonico_id) fail(`${prefix}: falta hecho_canonico_id.`);
  if (!item.explicacion || String(item.explicacion).trim().length < 30) {
    fail(`${prefix}: falta explicación detallada.`);
  }
  if (!item.explicacion_respuesta) fail(`${prefix}: falta explicacion_respuesta.`);
  if (!item.fundamento_legal || String(item.fundamento_legal).trim().length < 15) {
    fail(`${prefix}: falta fundamento_legal específico.`);
  }
  if (!item.fuente_ref || !item.fuente_url) fail(`${prefix}: falta trazabilidad de fuente.`);

  const optionValues = [];
  for (const key of ["opcion_a", "opcion_b", "opcion_c", "opcion_d"]) {
    if (!item[key]) fail(`${prefix}: falta ${key}.`);
    if (PLACEHOLDER_PATTERN.test(item[key])) fail(`${prefix}: ${key} contiene placeholder.`);
    optionValues.push(normalizeQuestionForDedup(item[key]));
  }

  if (new Set(optionValues).size !== 4) {
    fail(`${prefix}: las 4 opciones deben ser distintas entre sí.`);
  }

  if (item.tipo_pregunta === "actitudinal") {
    const isOfficialLikert =
      item.opcion_a === ATTITUDE_OPTIONS.a &&
      item.opcion_b === ATTITUDE_OPTIONS.b &&
      item.opcion_c === ATTITUDE_OPTIONS.c &&
      item.opcion_d === ATTITUDE_OPTIONS.d;

    if (item.nucleo_nombre !== "Actitudes") {
      fail(`${prefix}: las actitudinales deben estar en el núcleo Actitudes.`);
    }
    if (item.sentido_clave !== "seleccion" && !isOfficialLikert) {
      fail(`${prefix}: las opciones actitudinales no coinciden con el formato oficial.`);
    }
    if (!VALID_ATTITUDE_DIRECTIONS.has(item.sentido_clave)) {
      fail(`${prefix}: sentido_clave inválido.`);
    }
    if (item.respuesta_correcta !== null) {
      fail(`${prefix}: una pregunta actitudinal no debe tener respuesta_correcta única.`);
    }
    if (!VALID_ANSWERS.has(item.respuesta_recomendada)) {
      fail(`${prefix}: respuesta_recomendada inválida.`);
    }
    if (!item.respuesta_recomendada_texto) {
      fail(`${prefix}: falta respuesta_recomendada_texto.`);
    }
    return;
  }

  if (item.tipo_pregunta !== "conocimiento") {
    fail(`${prefix}: tipo_pregunta inválido.`);
  }

  if (!VALID_ANSWERS.has(item.respuesta_correcta)) {
    fail(`${prefix}: respuesta_correcta inválida.`);
  }
  if (!item.respuesta_correcta_texto) {
    fail(`${prefix}: falta respuesta_correcta_texto.`);
  }
}

function summarize(items) {
  return items.reduce((accumulator, item) => {
    const key =
      item.tipo_pregunta === "actitudinal"
        ? "actitudinal"
        : String(item.nucleo_nombre || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function validateCounts(summary, fileLabel) {
  for (const [key, expected] of Object.entries(LOT_TARGET_COUNTS)) {
    const actual = summary[key] || 0;
    if (actual !== expected) {
      fail(
        `${fileLabel}: conteo inválido para "${key}". Esperado ${expected}, recibido ${actual}.`
      );
    }
  }
}

function validateUniqueness(items, fileLabel) {
  const ids = new Set();
  const stems = new Set();
  const canonicalFacts = new Set();
  const optionSets = new Set();

  for (const item of items) {
    if (ids.has(item.id)) fail(`${fileLabel}: id duplicado ${item.id}.`);
    ids.add(item.id);

    const normalizedStem = normalizeQuestionForDedup(item.pregunta);
    if (stems.has(normalizedStem)) {
      fail(`${fileLabel}: pregunta duplicada o demasiado similar: "${item.pregunta}".`);
    }
    stems.add(normalizedStem);

    if (canonicalFacts.has(item.hecho_canonico_id)) {
      fail(`${fileLabel}: hecho_canonico_id repetido ${item.hecho_canonico_id}.`);
    }
    canonicalFacts.add(item.hecho_canonico_id);

    const isLikert =
      item.opcion_a === ATTITUDE_OPTIONS.a &&
      item.opcion_b === ATTITUDE_OPTIONS.b &&
      item.opcion_c === ATTITUDE_OPTIONS.c &&
      item.opcion_d === ATTITUDE_OPTIONS.d;

    if (!isLikert) {
      const sig = [item.opcion_a, item.opcion_b, item.opcion_c, item.opcion_d]
        .map(normalizeQuestionForDedup)
        .sort()
        .join("|");
      if (optionSets.has(sig)) {
        fail(`${fileLabel}: conjunto de opciones repetido en ${item.id}.`);
      }
      optionSets.add(sig);
    }
  }
}

function validateFile(filePath) {
  const lot = loadLot(filePath);
  const fileLabel = path.basename(filePath);
  if (!lot || typeof lot !== "object" || !Array.isArray(lot.items)) {
    fail(`${fileLabel}: el módulo debe exportar un objeto con items.`);
  }

  if (lot.items.length !== 100) {
    fail(
      `${fileLabel}: cada lote debe contener exactamente 100 preguntas. Tiene ${lot.items.length}.`
    );
  }

  lot.items.forEach((item, index) => validateQuestion(item, index, fileLabel));
  validateUniqueness(lot.items, fileLabel);

  const summary = summarize(lot.items);
  validateCounts(summary, fileLabel);

  return {
    lote: lot.lote || fileLabel,
    total: lot.items.length,
    summary,
  };
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    fail("Debes indicar al menos un archivo de lote.");
  }

  const results = files.map(validateFile);
  console.log(JSON.stringify(results, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
