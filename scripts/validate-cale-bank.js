/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const { ATTITUDE_OPTIONS, normalizeQuestionForDedup } = require("../data/cale/schema");

function fail(message) {
  throw new Error(message);
}

function loadLot(filePath) {
  const absolutePath = path.resolve(filePath);
  delete require.cache[absolutePath];
  return require(absolutePath);
}

function listLotFiles(targetPath) {
  const absolutePath = path.resolve(targetPath);
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return [absolutePath];

  return fs
    .readdirSync(absolutePath)
    .filter((entry) => entry.endsWith(".js"))
    .sort()
    .map((entry) => path.join(absolutePath, entry));
}

function main() {
  const targetPath = process.argv[2] || "data/cale/lotes";
  const files = listLotFiles(targetPath);
  if (files.length === 0) fail("No se encontraron lotes para validar.");

  const seenIds = new Map();
  const seenFacts = new Map();
  const seenQuestions = new Map();
  const seenOptionSets = new Map();
  const byCategory = {};
  const byAnswer = { a: 0, b: 0, c: 0, d: 0 };
  const summary = {
    lotes: [],
    totalPreguntas: 0,
    porNucleo: byCategory,
    distribucionRespuestas: byAnswer,
  };

  for (const file of files) {
    const lot = loadLot(file);
    if (!lot || !Array.isArray(lot.items)) {
      fail(`${path.basename(file)} no exporta items.`);
    }

    summary.lotes.push({
      lote: lot.lote || path.basename(file),
      preguntas: lot.items.length,
    });
    summary.totalPreguntas += lot.items.length;

    for (const item of lot.items) {
      const questionKey = normalizeQuestionForDedup(item.pregunta);

      if (seenIds.has(item.id)) {
        fail(`ID duplicado entre lotes: ${item.id} en ${file} y ${seenIds.get(item.id)}.`);
      }
      seenIds.set(item.id, file);

      if (seenFacts.has(item.hecho_canonico_id)) {
        fail(
          `hecho_canonico_id duplicado entre lotes: ${item.hecho_canonico_id} en ${file} y ${seenFacts.get(
            item.hecho_canonico_id
          )}.`
        );
      }
      seenFacts.set(item.hecho_canonico_id, file);

      if (seenQuestions.has(questionKey)) {
        fail(
          `Pregunta duplicada o demasiado similar entre lotes: "${item.pregunta}" en ${file} y ${seenQuestions.get(
            questionKey
          )}.`
        );
      }
      seenQuestions.set(questionKey, file);

      const isLikert =
        item.opcion_a === ATTITUDE_OPTIONS.a &&
        item.opcion_b === ATTITUDE_OPTIONS.b &&
        item.opcion_c === ATTITUDE_OPTIONS.c &&
        item.opcion_d === ATTITUDE_OPTIONS.d;

      if (!isLikert) {
        const optionSig = [item.opcion_a, item.opcion_b, item.opcion_c, item.opcion_d]
          .map(normalizeQuestionForDedup)
          .sort()
          .join("|");
        if (seenOptionSets.has(optionSig)) {
          fail(
            `Conjunto de opciones duplicado entre lotes en ${item.id} (${path.basename(file)}) y ${seenOptionSets.get(
              optionSig
            )}.`
          );
        }
        seenOptionSets.set(optionSig, `${item.id} (${path.basename(file)})`);
      }

      byCategory[item.nucleo_nombre] = (byCategory[item.nucleo_nombre] || 0) + 1;
      const ans = item.respuesta_correcta || item.respuesta_recomendada;
      if (ans && byAnswer[ans] !== undefined) {
        byAnswer[ans] += 1;
      }
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
