const fs = require("fs");
const path = require("path");

const DEFAULT_JSON_PATH = "/Users/carlos/Downloads/preguntas_cale_v3_humano.json";
const MAX_ROWS = 100;
const VARIANT_PATTERN = /\s*\(variante\s+\d+\)\s*$/i;
const PLACEHOLDER_PATTERN = /\bincorrecta\b/i;

const FIXTURES = [
  {
    match: /^¿Qué pasa cuando vas muy rápido en curva\?/i,
    pregunta: "¿Qué pasa cuando vas muy rápido en curva?",
    opcion_a: "El vehículo responde con mayor estabilidad",
    opcion_b: "Te sales del carril",
    opcion_c: "La distancia de frenado se reduce",
    opcion_d: "Las llantas se adhieren mejor a la vía",
    respuesta_correcta: "B",
  },
  {
    match: /^¿Cuánta distancia dejas entre carros en autopista\?/i,
    pregunta: "¿Cuánta distancia dejas entre carros en autopista?",
    opcion_a: "Medio segundo de separación",
    opcion_b: "2 segundos mínimo",
    opcion_c: "Solo la longitud de un carro",
    opcion_d: "La que te permita ver las luces del otro carro",
    respuesta_correcta: "B",
  },
  {
    match: /^¿Cada cuánto debes descansar en viaje largo\?/i,
    pregunta: "¿Cada cuánto debes descansar en viaje largo?",
    opcion_a: "Solo cuando ya sientas sueño",
    opcion_b: "Cada 2 horas",
    opcion_c: "Cada 6 horas",
    opcion_d: "Al terminar el recorrido",
    respuesta_correcta: "B",
  },
  {
    match: /^¿Cuánto alcohol en sangre es permitido\?/i,
    pregunta: "¿Cuánto alcohol en sangre es permitido?",
    opcion_a: "Una copa si manejas despacio",
    opcion_b: "0 grados para principiantes",
    opcion_c: "Depende de tu tolerancia al alcohol",
    opcion_d: "Se permite si no sales a carretera",
    respuesta_correcta: "B",
  },
  {
    match: /^¿Se puede usar celular manejando\?/i,
    pregunta: "¿Se puede usar celular manejando?",
    opcion_a: "Sí, si la llamada es corta",
    opcion_b: "No, ni con manos libres",
    opcion_c: "Sí, cuando no hay tráfico",
    opcion_d: "Sí, solo en vías rectas",
    respuesta_correcta: "B",
  },
];

function normalizeQuestion(value) {
  return String(value || "").replace(VARIANT_PATTERN, "").trim();
}

function isContaminated(row) {
  return ["opcion_a", "opcion_b", "opcion_c", "opcion_d"].some((key) =>
    PLACEHOLDER_PATTERN.test(String(row[key] || ""))
  );
}

function findFixture(question) {
  return FIXTURES.find((fixture) => fixture.match.test(question)) || null;
}

function main() {
  const jsonPath = process.argv[2] || DEFAULT_JSON_PATH;
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`No existe el archivo JSON: ${jsonPath}`);
  }

  const backupPath = `${jsonPath}.bak-primeras-100`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(jsonPath, backupPath);
  }

  const rows = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!Array.isArray(rows)) {
    throw new Error("El JSON no tiene formato de arreglo.");
  }

  let fixedCount = 0;
  let skippedCount = 0;

  for (let index = 0; index < Math.min(MAX_ROWS, rows.length); index += 1) {
    const row = rows[index];
    const normalizedQuestion = normalizeQuestion(row.pregunta);
    const fixture = findFixture(normalizedQuestion);
    const contaminated = isContaminated(row) || normalizedQuestion !== row.pregunta;

    if (!fixture || !contaminated) {
      skippedCount += 1;
      continue;
    }

    row.pregunta = fixture.pregunta;
    row.opcion_a = fixture.opcion_a;
    row.opcion_b = fixture.opcion_b;
    row.opcion_c = fixture.opcion_c;
    row.opcion_d = fixture.opcion_d;
    row.respuesta_correcta = fixture.respuesta_correcta;
    fixedCount += 1;
  }

  fs.writeFileSync(jsonPath, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        file: jsonPath,
        backup: backupPath,
        reviewedRows: Math.min(MAX_ROWS, rows.length),
        fixedCount,
        skippedCount,
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
