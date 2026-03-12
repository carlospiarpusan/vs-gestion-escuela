/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const { SOURCES } = require("../data/cale/schema");

const LOTS_DIR = path.resolve(__dirname, "../data/cale/lotes");

function toAsciiLiteral(value) {
  return JSON.stringify(String(value)).replace(/[^\x20-\x7E]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

function sourceKeyForItem(item) {
  const entries = Object.entries(SOURCES);
  const match = entries.find(
    ([, source]) => source.ref === item.fuente_ref && source.url === item.fuente_url
  );

  if (!match) {
    throw new Error(`No se pudo resolver la fuente del item ${item.id}.`);
  }

  return match[0];
}

function sectionLabel(item) {
  return item.tipo_pregunta === "actitudinal" ? "Actitudes" : item.nucleo_nombre;
}

function buildSectionComment(items, item) {
  const label = sectionLabel(item);
  const count = items.filter((candidate) => sectionLabel(candidate) === label).length;
  return `    // ${label} (${count})`;
}

function serializeItem(item) {
  const functionName = item.tipo_pregunta === "actitudinal" ? "att" : "know";
  const sourceKey = sourceKeyForItem(item);
  const lines = [`    ${functionName}({`];

  const fields = [
    ["id", item.id],
    ["lote", item.lote],
  ];

  if (item.tipo_pregunta === "conocimiento") {
    fields.push(["nucleo_nombre", item.nucleo_nombre]);
  }

  fields.push(
    ["subtema", item.subtema],
    ["hecho_canonico_id", item.hecho_canonico_id],
    ["pregunta", item.pregunta],
    ["sentido_clave", item.tipo_pregunta === "actitudinal" ? item.sentido_clave : undefined],
    ["opcion_a", item.opcion_a],
    ["opcion_b", item.opcion_b],
    ["opcion_c", item.opcion_c],
    ["opcion_d", item.opcion_d],
    [
      item.tipo_pregunta === "actitudinal" ? "respuesta_recomendada" : "respuesta_correcta",
      item.tipo_pregunta === "actitudinal" ? item.respuesta_recomendada : item.respuesta_correcta,
    ],
    ["explicacion", item.explicacion],
    ["fundamento_legal", item.fundamento_legal]
  );

  if (item.tipo_pregunta === "conocimiento" && item.nivel_cognitivo !== "aplicacion") {
    fields.push(["nivel_cognitivo", item.nivel_cognitivo]);
  }

  fields.push(
    ["source", `SOURCES.${sourceKey}`, true],
    ["dificultad", item.dificultad]
  );

  for (const [key, value, raw] of fields) {
    if (value === undefined) continue;
    const serializedValue = raw ? value : toAsciiLiteral(value);
    lines.push(`      ${key}: ${serializedValue},`);
  }

  lines.push("    }),");
  return lines.join("\n");
}

function buildLotFileContent(lot) {
  const lines = [
    "/* eslint-disable @typescript-eslint/no-require-imports */",
    "",
    'const { createAttitudeQuestion: att, createKnowledgeQuestion: know, SOURCES } = require("../schema");',
    "",
    `const LOTE = ${toAsciiLiteral(lot.lote)};`,
    "",
    "module.exports = {",
    "  lote: LOTE,",
    `  version: ${Number(lot.version || 1)},`,
    `  descripcion: ${toAsciiLiteral(lot.descripcion || "")},`,
    "  items: [",
  ];

  let previousSection = null;
  for (const item of lot.items) {
    const currentSection = sectionLabel(item);
    if (currentSection !== previousSection) {
      if (previousSection !== null) lines.push("");
      lines.push(buildSectionComment(lot.items, item));
      previousSection = currentSection;
    }

    lines.push(serializeItem(item));
  }

  lines.push("  ],", "};", "");
  return lines.join("\n");
}

function materializeLot(fileName) {
  const absolutePath = path.join(LOTS_DIR, fileName);
  delete require.cache[absolutePath];
  const lot = require(absolutePath);
  const content = buildLotFileContent(lot);
  fs.writeFileSync(absolutePath, content, "utf8");
}

function main() {
  const files = fs.readdirSync(LOTS_DIR).filter((entry) => entry.endsWith(".js")).sort();
  files.forEach(materializeLot);
  console.log(JSON.stringify({ materialized: files.length, dir: LOTS_DIR }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
