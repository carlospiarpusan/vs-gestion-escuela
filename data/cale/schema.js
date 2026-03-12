const ATTITUDE_OPTIONS = {
  a: "Muy en desacuerdo",
  b: "En desacuerdo",
  c: "De acuerdo",
  d: "Muy de acuerdo",
};

const LOT_TARGET_COUNTS = {
  actitudinal: 30,
  "movilidad segura y sostenible": 25,
  "normas de transito": 15,
  "senalizacion vial e infraestructura": 15,
  "el vehiculo": 15,
};

function getOptionText(answer, options) {
  return options[answer] || null;
}

const SOURCES = {
  RESOLUCION_CALE: {
    ref: "Resolucion 20253040037125 de 2025 y Anexo 60 del Ministerio de Transporte.",
    url: "https://mintransporte.gov.co/info/mintransporte/media/anexos/Cm0eM2qD.pdf",
  },
  MANUAL_ANSV: {
    ref: "Manual de referencia para la conduccion de vehiculos: conceptos basicos para obtener la licencia de conduccion.",
    url: "https://web.mintransporte.gov.co/jspui/bitstream/001/744/1/11%20Manual%20Licencia%20diagramacion%20sep%208-16%20%281%29.pdf",
  },
  LEY_769: {
    ref: "Ley 769 de 2002, Codigo Nacional de Transito Terrestre.",
    url: "https://web.mintransporte.gov.co/jspui/bitstream/001/395/1/LEY%20769%20DE%202002.pdf",
  },
  LEY_1696: {
    ref: "Ley 1696 de 2013 sobre sanciones y tolerancia frente al alcohol y otras sustancias.",
    url: "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=55517",
  },
  MANUAL_SENALIZACION: {
    ref: "Manual de Senalizacion Vial de Colombia, adopcion 2024.",
    url: "https://mintransporte.gov.co/publicaciones/11893/gobierno-nacional-avanza-con-la-socializacion-del-nuevo-manual-de-senalizacion-vial/",
  },
};

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeQuestionForDedup(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPromptText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function embedPhrase(value) {
  const text = cleanPromptText(value);
  if (/^[A-Z][a-z]/.test(text) || /^(El|La|Los|Las|Un|Una|Unos|Unas)\b/.test(text)) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }
  return text;
}

function rewriteWrappedAttitudePrompt(value) {
  const wrappedMatch = cleanPromptText(value).match(
    /^Frente a la siguiente conducta sobre (.+?): "(.+)", cual es la valoracion mas segura del conductor\?$/i
  );

  if (!wrappedMatch) return cleanPromptText(value);

  const [, topic, statement] = wrappedMatch;
  return `Sobre ${topic}, como debe valorar un conductor esta conducta: ${statement}?`;
}

function rewriteColonPrompt(stem) {
  const text = cleanPromptText(stem);
  const rules = [
    [/^(.*), lo mas seguro es$/i, (match, base) => `${base}, que es lo mas seguro?`],
    [/^(.*), lo mas prudente es$/i, (match, base) => `${base}, que es lo mas prudente?`],
    [/^(.*), la respuesta segura es$/i, (match, base) => `${base}, cual es la respuesta segura?`],
    [/^(.*), una respuesta segura es$/i, (match, base) => `${base}, cual es una respuesta segura?`],
    [/^(.*), la respuesta mas segura es$/i, (match, base) => `${base}, cual es la respuesta mas segura?`],
    [/^(.*), la accion segura es$/i, (match, base) => `${base}, cual es la accion segura?`],
    [/^(.*), la accion mas segura es$/i, (match, base) => `${base}, cual es la accion mas segura?`],
    [/^(.*), la decision segura es$/i, (match, base) => `${base}, cual es la decision segura?`],
    [/^(.*), la opcion segura es$/i, (match, base) => `${base}, cual es la opcion segura?`],
    [/^(.*), la conducta segura es$/i, (match, base) => `${base}, cual es la conducta segura?`],
    [/^(.*), una conducta segura es$/i, (match, base) => `${base}, cual es una conducta segura?`],
    [/^(.*), la conducta correcta es$/i, (match, base) => `${base}, cual es la conducta correcta?`],
    [/^(.*), la maniobra segura es$/i, (match, base) => `${base}, cual es la maniobra segura?`],
    [/^(.*), la tecnica segura es$/i, (match, base) => `${base}, cual es la tecnica segura?`],
    [/^(.*), una tecnica segura es$/i, (match, base) => `${base}, cual es una tecnica segura?`],
    [/^(.*), una tecnica prudente es$/i, (match, base) => `${base}, cual es una tecnica prudente?`],
    [/^(.*), la tecnica prudente es$/i, (match, base) => `${base}, cual es la tecnica prudente?`],
    [/^(.*), una practica segura es$/i, (match, base) => `${base}, cual es una practica segura?`],
    [/^(.*), una medida clave es$/i, (match, base) => `${base}, cual es una medida clave?`],
    [/^(.*), una medida prudente es$/i, (match, base) => `${base}, cual es una medida prudente?`],
    [/^(.*), la combinacion mas segura es$/i, (match, base) => `${base}, cual es la combinacion mas segura?`],
    [/^(.*), lo adecuado es$/i, (match, base) => `${base}, que es lo adecuado?`],
    [/^(.*), lo correcto es$/i, (match, base) => `${base}, que es lo correcto?`],
    [/^(.*), lo apropiado es$/i, (match, base) => `${base}, que es lo apropiado?`],
    [/^(.*), lo prudente es$/i, (match, base) => `${base}, que es lo prudente?`],
    [/^(.*), lo seguro es$/i, (match, base) => `${base}, que es lo seguro?`],
    [/^(.*), conviene$/i, (match, base) => `${base}, que conviene hacer?`],
    [/^(.*), el conductor debe$/i, (match, base) => `${base}, que debe hacer el conductor?`],
    [/^(.*) porque$/i, (match, base) => `${base} por que?`],
    [/^(.*) ayuda a$/i, (match, base) => `${base} ayuda a que?`],
    [/^(.*) sirve para$/i, (match, base) => `${base} sirve para que?`],
    [/^(.*) sirven para$/i, (match, base) => `${base} sirven para que?`],
    [/^(.*) aumenta el riesgo principal de$/i, (match, base) => `${base} aumenta el riesgo principal de que?`],
    [/^(.*) incrementa el riesgo de$/i, (match, base) => `${base} incrementa el riesgo de que?`],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }

  return `${text}?`;
}

function normalizeQuestionPrompt(value) {
  let normalized = rewriteWrappedAttitudePrompt(value);
  normalized = cleanPromptText(normalized);

  if (normalized.endsWith(":")) {
    normalized = rewriteColonPrompt(normalized.slice(0, -1));
  }

  if (!normalized.endsWith("?")) {
    normalized = `${normalized}?`;
  }

  const polishRules = [
    [/^A que ayuda principalmente (.+)\?$/i, (match, base) => `A que ayuda principalmente ${embedPhrase(base)}?`],
    [/^A que ayuda (.+)\?$/i, (match, base) => `A que ayuda ${embedPhrase(base)}?`],
    [/^Para que sirve (.+)\?$/i, (match, base) => `Para que sirve ${embedPhrase(base)}?`],
    [/^Para que sirven (.+)\?$/i, (match, base) => `Para que sirven ${embedPhrase(base)}?`],
    [/^Que indica (.+)\?$/i, (match, base) => `Que indica ${embedPhrase(base)}?`],
    [/^Que informa (.+)\?$/i, (match, base) => `Que informa ${embedPhrase(base)}?`],
    [/^Que advierte (.+)\?$/i, (match, base) => `Que advierte ${embedPhrase(base)}?`],
    [/^Que le recuerda al conductor (.+)\?$/i, (match, base) => `Que le recuerda al conductor ${embedPhrase(base)}?`],
    [/^Que le indica al conductor (.+)\?$/i, (match, base) => `Que le indica al conductor ${embedPhrase(base)}?`],
    [/^Que le advierte al conductor (.+)\?$/i, (match, base) => `Que le advierte al conductor ${embedPhrase(base)}?`],
    [/^Que le informa al conductor (.+)\?$/i, (match, base) => `Que le informa al conductor ${embedPhrase(base)}?`],
    [/^Que funcion cumple (.+)\?$/i, (match, base) => `Que funcion cumple ${embedPhrase(base)}?`],
    [/^Que funcion cumplen (.+)\?$/i, (match, base) => `Que funcion cumplen ${embedPhrase(base)}?`],
    [/^A que obliga al conductor (.+)\?$/i, (match, base) => `A que obliga al conductor ${embedPhrase(base)}?`],
    [/^A que expone al conductor (.+)\?$/i, (match, base) => `A que expone al conductor ${embedPhrase(base)}?`],
    [/^Para que orienta al conductor (.+)\?$/i, (match, base) => `Para que orienta al conductor ${embedPhrase(base)}?`],
    [/^Que debe hacer el conductor ante (.+)\?$/i, (match, base) => `Que debe hacer el conductor ante ${embedPhrase(base)}?`],
    [/^Que busca (.+) en el conductor\?$/i, (match, base) => `Que busca ${embedPhrase(base)} en el conductor?`],
    [/^(.*) (indica|indican|significa|refuerza) que el conductor debe\?$/i, (match, base) => `Que debe hacer el conductor ante ${embedPhrase(base)}?`],
    [/^(.*) sirve para que\?$/i, (match, base) => `Para que sirve ${embedPhrase(base)}?`],
    [/^(.*) sirven para que\?$/i, (match, base) => `Para que sirven ${embedPhrase(base)}?`],
    [/^(.*) ayuda a que\?$/i, (match, base) => `A que ayuda ${embedPhrase(base)}?`],
    [/^(.*) ayuda principalmente a\?$/i, (match, base) => `A que ayuda principalmente ${embedPhrase(base)}?`],
    [/^(.*) indica que\?$/i, (match, base) => `Que indica ${embedPhrase(base)}?`],
    [/^(.*) indica un lugar donde\?$/i, (match, base) => `Que indica ${embedPhrase(base)}?`],
    [/^(.*) indica al conductor que\?$/i, (match, base) => `Que le indica al conductor ${embedPhrase(base)}?`],
    [/^(.*) informa que\?$/i, (match, base) => `Que informa ${embedPhrase(base)}?`],
    [/^(.*) informa al conductor que\?$/i, (match, base) => `Que le informa al conductor ${embedPhrase(base)}?`],
    [/^(.*) advierte que\?$/i, (match, base) => `Que advierte ${embedPhrase(base)}?`],
    [/^(.*) advierte al conductor que\?$/i, (match, base) => `Que le advierte al conductor ${embedPhrase(base)}?`],
    [/^(.*) recuerda al conductor que\?$/i, (match, base) => `Que le recuerda al conductor ${embedPhrase(base)}?`],
    [/^(.*) busca que el conductor\?$/i, (match, base) => `Que busca ${embedPhrase(base)} en el conductor?`],
    [/^(.*) cumple la funcion de\?$/i, (match, base) => `Que funcion cumple ${embedPhrase(base)}?`],
    [/^(.*) cumplen la funcion de\?$/i, (match, base) => `Que funcion cumplen ${embedPhrase(base)}?`],
    [/^(.*) obliga al conductor a\?$/i, (match, base) => `A que obliga al conductor ${embedPhrase(base)}?`],
    [/^(.*) expone al conductor a\?$/i, (match, base) => `A que expone al conductor ${embedPhrase(base)}?`],
    [/^(.*) llevar al conductor a\?$/i, (match, base) => `A que debe llevar al conductor ${embedPhrase(base)}?`],
    [/^(.*) orienta al conductor para\?$/i, (match, base) => `Para que orienta al conductor ${embedPhrase(base)}?`],
    [/^(.*) conductor debe entender que\?$/i, (match, base) => `Que debe entender el conductor sobre ${embedPhrase(base)}?`],
    [/^(.*) conductor debe interpretar que\?$/i, (match, base) => `Que debe interpretar el conductor sobre ${embedPhrase(base)}?`],
    [/^(.*) conductor debe considerar que\?$/i, (match, base) => `Que debe considerar el conductor sobre ${embedPhrase(base)}?`],
    [/^(.*) conductor debe asumir que\?$/i, (match, base) => `Que debe asumir el conductor sobre ${embedPhrase(base)}?`],
  ];

  for (const [pattern, replacement] of polishRules) {
    if (pattern.test(normalized)) {
      return normalized.replace(pattern, replacement);
    }
  }

  return normalized;
}

function buildBaseQuestion({
  id,
  lote,
  tipo_pregunta,
  nucleo_nombre,
  subtema,
  hecho_canonico_id,
  pregunta,
  explicacion,
  fundamento_legal,
  source,
  dificultad = "media",
  nivel_cognitivo = "aplicacion",
}) {
  return {
    id,
    lote,
    tipo_pregunta,
    categoria_licencia: "comun",
    nucleo_nombre,
    subtema,
    hecho_canonico_id,
    pregunta: normalizeQuestionPrompt(pregunta),
    explicacion,
    fundamento_legal,
    fuente_ref: source.ref,
    fuente_url: source.url,
    dificultad,
    nivel_cognitivo,
    activa: true,
  };
}

function createAttitudeQuestion({
  id,
  lote,
  subtema,
  hecho_canonico_id,
  pregunta,
  sentido_clave = "acuerdo",
  opcion_a,
  opcion_b,
  opcion_c,
  opcion_d,
  respuesta_recomendada,
  explicacion,
  fundamento_legal,
  source = SOURCES.RESOLUCION_CALE,
  dificultad = "media",
}) {
  const providedOptionCount = [opcion_a, opcion_b, opcion_c, opcion_d].filter(Boolean).length;
  if (providedOptionCount > 0 && providedOptionCount < 4) {
    throw new Error("Las preguntas actitudinales con opciones personalizadas deben definir las cuatro opciones.");
  }

  const opciones =
    providedOptionCount === 4
      ? {
          a: opcion_a,
          b: opcion_b,
          c: opcion_c,
          d: opcion_d,
        }
      : {
          a: ATTITUDE_OPTIONS.a,
          b: ATTITUDE_OPTIONS.b,
          c: ATTITUDE_OPTIONS.c,
          d: ATTITUDE_OPTIONS.d,
        };
  const respuestaRecomendada =
    respuesta_recomendada || (sentido_clave === "desacuerdo" ? "a" : "d");

  return {
    ...buildBaseQuestion({
      id,
      lote,
      tipo_pregunta: "actitudinal",
      nucleo_nombre: "Actitudes",
      subtema,
      hecho_canonico_id,
      pregunta,
      explicacion,
      fundamento_legal,
      source,
      dificultad,
      nivel_cognitivo: "actitud",
    }),
    opcion_a: opciones.a,
    opcion_b: opciones.b,
    opcion_c: opciones.c,
    opcion_d: opciones.d,
    sentido_clave,
    respuesta_correcta: null,
    respuesta_recomendada: respuestaRecomendada,
    respuesta_recomendada_texto: getOptionText(respuestaRecomendada, opciones),
    explicacion_respuesta: explicacion,
  };
}

function createKnowledgeQuestion({
  id,
  lote,
  nucleo_nombre,
  subtema,
  hecho_canonico_id,
  pregunta,
  opcion_a,
  opcion_b,
  opcion_c,
  opcion_d,
  respuesta_correcta,
  explicacion,
  fundamento_legal,
  source = SOURCES.MANUAL_ANSV,
  dificultad = "media",
  nivel_cognitivo = "aplicacion",
}) {
  const opciones = {
    a: opcion_a,
    b: opcion_b,
    c: opcion_c,
    d: opcion_d,
  };

  return {
    ...buildBaseQuestion({
      id,
      lote,
      tipo_pregunta: "conocimiento",
      nucleo_nombre,
      subtema,
      hecho_canonico_id,
      pregunta,
      explicacion,
      fundamento_legal,
      source,
      dificultad,
      nivel_cognitivo,
    }),
    opcion_a,
    opcion_b,
    opcion_c,
    opcion_d,
    respuesta_correcta,
    respuesta_correcta_texto: getOptionText(respuesta_correcta, opciones),
    explicacion_respuesta: explicacion,
  };
}

module.exports = {
  ATTITUDE_OPTIONS,
  LOT_TARGET_COUNTS,
  SOURCES,
  slugify,
  normalizeQuestionForDedup,
  createAttitudeQuestion,
  createKnowledgeQuestion,
};
