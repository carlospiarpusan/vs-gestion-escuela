/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const { normalizeQuestionForDedup } = require("../data/cale/schema");

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
  const summary = {
    lotes: [],
    totalPreguntas: 0,
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
