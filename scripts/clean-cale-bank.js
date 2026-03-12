const fs = require("fs");

const DEFAULT_JSON_PATH = "/Users/carlos/Downloads/preguntas_cale_v3_humano.json";
const VARIANT_PATTERN = /\s*\(variante\s+\d+\)\s*$/i;

const FIXTURES = [
  {
    match: /^¿Qué pasa cuando vas muy rápido en curva\?/i,
    pregunta: "¿Qué pasa cuando vas muy rápido en curva?",
    opcion_a: "El vehículo responde con mayor estabilidad",
    opcion_b: "Te sales del carril",
    opcion_c: "La distancia de frenado se reduce",
    opcion_d: "Las llantas se adhieren mejor a la vía",
    respuesta_correcta: "B",
    explicacion:
      "Al entrar muy rápido a una curva disminuye la adherencia y aumenta el riesgo de perder el control o salirte del carril.",
    fundamento_legal: "Ley 769/2002 - Seguridad vial preventiva ANSV",
    dificultad: "Media",
  },
  {
    match: /^¿Cuánta distancia dejas entre carros en autopista\?/i,
    pregunta: "¿Cuánta distancia dejas entre carros en autopista?",
    opcion_a: "Medio segundo de separación",
    opcion_b: "2 segundos mínimo",
    opcion_c: "Solo la longitud de un carro",
    opcion_d: "La misma distancia que en tráfico detenido",
    respuesta_correcta: "B",
    explicacion:
      "La regla mínima de seguridad es conservar al menos dos segundos de distancia, y aumentarla si llueve o la visibilidad es mala.",
    fundamento_legal: "Ley 769/2002 - Distancia de seguridad y conducción preventiva",
    dificultad: "Media",
  },
  {
    match: /^¿Cada cuánto debes descansar en viaje largo\?/i,
    pregunta: "¿Cada cuánto debes descansar en viaje largo?",
    opcion_a: "Solo cuando ya tengas mucho sueño",
    opcion_b: "Cada 2 horas",
    opcion_c: "Cada 6 horas",
    opcion_d: "Únicamente al llegar al destino",
    respuesta_correcta: "B",
    explicacion:
      "Hacer pausas cada dos horas ayuda a reducir la fatiga, mantener la atención y prevenir siniestros por microsueño.",
    fundamento_legal: "Ley 769/2002 - Seguridad vial preventiva ANSV",
    dificultad: "Media",
  },
  {
    match: /^¿Cuánto alcohol en sangre es permitido\?/i,
    pregunta: "Si eres conductor principiante, ¿cuánto alcohol en sangre es permitido?",
    opcion_a: "Hasta una copa si conduces despacio",
    opcion_b: "0 grados para principiantes",
    opcion_c: "Depende del tiempo que lleves conduciendo",
    opcion_d: "Solo está prohibido en carretera",
    respuesta_correcta: "B",
    explicacion:
      "Para conductores principiantes la tolerancia es cero. Cualquier consumo afecta el tiempo de reacción y aumenta el riesgo de un siniestro.",
    fundamento_legal: "Ley 1696/2013 - Tolerancia cero para conductores noveles",
    dificultad: "Media",
  },
  {
    match: /^¿Se puede usar celular manejando\?/i,
    pregunta: "¿Cuál es la recomendación más segura sobre el uso del celular al conducir?",
    opcion_a: "Sí, si la llamada es corta",
    opcion_b: "No, ni con manos libres",
    opcion_c: "Sí, cuando no hay tráfico",
    opcion_d: "Sí, solo en vías rectas",
    respuesta_correcta: "B",
    explicacion:
      "La recomendación más segura es no usar el celular al conducir. Aunque algunas normas permiten accesorios manos libres, la distracción sigue aumentando el riesgo.",
    fundamento_legal: "Ley 769/2002 Art. 131 C.38 - Recomendación ANSV",
    dificultad: "Media",
  },
  {
    match: /^¿Qué dice la ley sobre velocidad urbana\?/i,
    pregunta: "¿Qué dice la ley sobre velocidad urbana?",
    opcion_a: "En vías urbanas nunca se puede superar 30 km/h",
    opcion_b: "La autoridad fija el límite y en ningún caso podrá superar 60 km/h",
    opcion_c: "En ciudad se puede circular hasta 80 km/h sin señalización",
    opcion_d: "Ese límite solo aplica a vehículos de servicio público",
    respuesta_correcta: "B",
    explicacion:
      "El artículo 106 señala que en vías urbanas y carreteras municipales el límite lo fija la autoridad de tránsito competente y no puede sobrepasar 60 km/h.",
    fundamento_legal: "Ley 769/2002 Art. 106",
    dificultad: "Media",
  },
  {
    match: /^¿Qué dice la ley sobre zonas escolares\?/i,
    pregunta: "¿Qué dice la ley sobre zonas escolares?",
    opcion_a: "La velocidad máxima es 50 km/h",
    opcion_b: "La velocidad en zonas escolares y residenciales será hasta de 30 km/h",
    opcion_c: "Solo los buses escolares deben bajar la velocidad",
    opcion_d: "La norma no fija un límite especial en esas zonas",
    respuesta_correcta: "B",
    explicacion:
      "El artículo 106 establece expresamente que en zonas escolares y residenciales la velocidad será hasta de treinta kilómetros por hora.",
    fundamento_legal: "Ley 769/2002 Art. 106",
    dificultad: "Media",
  },
  {
    match: /^¿Qué dice la ley sobre semáforos\?/i,
    pregunta: "¿Qué dice la ley sobre semáforos?",
    opcion_a: "Puedes seguir si el amarillo está por terminar",
    opcion_b: "Debes detenerte ante luz roja o amarilla y también ante rojo intermitente",
    opcion_c: "Solo estás obligado a detenerte con luz roja fija",
    opcion_d: "El amarillo autoriza acelerar para cruzar antes del cambio",
    respuesta_correcta: "B",
    explicacion:
      "La infracción D.4 sanciona no detenerse ante luz roja o amarilla de semáforo, señal de PARE o semáforo intermitente en rojo.",
    fundamento_legal: "Ley 769/2002 Art. 131 D.4",
    dificultad: "Media",
  },
  {
    match: /^¿Qué dice la ley sobre cebras\?/i,
    pregunta: "¿Qué dice la ley sobre las cebras peatonales?",
    opcion_a: "Los peatones deben esperar siempre a que no haya vehículos",
    opcion_b: "Debes respetar el paso de peatones y darles prelación en las franjas establecidas",
    opcion_c: "Solo debes parar si un agente de tránsito lo ordena",
    opcion_d: "Las cebras son solo una advertencia sin obligación de detenerse",
    respuesta_correcta: "B",
    explicacion:
      "La infracción C.32 sanciona no respetar el paso de peatones que cruzan en sitio permitido o no darles prelación en las franjas establecidas.",
    fundamento_legal: "Ley 769/2002 Art. 131 C.32",
    dificultad: "Media",
  },
  {
    match: /^¿Qué dice la ley sobre multas\?/i,
    pregunta: "¿Qué dice la ley sobre multas de tránsito?",
    opcion_a: "Solo hay multa cuando ocurre un accidente",
    opcion_b: "Las infracciones se sancionan con multa según el tipo de falta",
    opcion_c: "Las multas solo aplican a transporte público",
    opcion_d: "Las multas solo existen si el conductor acepta la infracción",
    respuesta_correcta: "B",
    explicacion:
      "El artículo 131 clasifica las infracciones y establece multas según la conducta cometida y su gravedad.",
    fundamento_legal: "Ley 769/2002 Art. 131",
    dificultad: "Media",
  },
];

function normalizeQuestion(value) {
  return String(value || "").replace(VARIANT_PATTERN, "").trim();
}

function findFixture(question) {
  return FIXTURES.find((fixture) => fixture.match.test(question)) || null;
}

function parseLimitArg(limitValue, totalRows) {
  if (!limitValue) return totalRows;
  const parsed = Number(limitValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return totalRows;
  return Math.min(totalRows, Math.floor(parsed));
}

function main() {
  const jsonPath = process.argv[2] || DEFAULT_JSON_PATH;
  const limit = parseLimitArg(process.argv[3], Number.MAX_SAFE_INTEGER);

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`No existe el archivo JSON: ${jsonPath}`);
  }

  const rows = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!Array.isArray(rows)) {
    throw new Error("El JSON no tiene formato de arreglo.");
  }

  const effectiveLimit = parseLimitArg(process.argv[3], rows.length);
  const backupPath = `${jsonPath}.bak-limpieza-global`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(jsonPath, backupPath);
  }

  const summary = {};
  let fixedCount = 0;

  for (let index = 0; index < effectiveLimit; index += 1) {
    const row = rows[index];
    const normalizedQuestion = normalizeQuestion(row.pregunta);
    const fixture = findFixture(normalizedQuestion);
    if (!fixture) continue;

    row.pregunta = fixture.pregunta;
    row.opcion_a = fixture.opcion_a;
    row.opcion_b = fixture.opcion_b;
    row.opcion_c = fixture.opcion_c;
    row.opcion_d = fixture.opcion_d;
    row.respuesta_correcta = fixture.respuesta_correcta;
    row.explicacion = fixture.explicacion;
    row.fundamento_legal = fixture.fundamento_legal;
    row.dificultad = fixture.dificultad;

    summary[fixture.pregunta] = (summary[fixture.pregunta] || 0) + 1;
    fixedCount += 1;
  }

  fs.writeFileSync(jsonPath, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        file: jsonPath,
        backup: backupPath,
        reviewedRows: effectiveLimit,
        fixedCount,
        summary,
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
