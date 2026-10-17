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
    ref: "Resolución 20253040037125 de 2025 y Anexo 60 del Ministerio de Transporte (Lineamientos CALE).",
    url: "https://mintransporte.gov.co/info/mintransporte/media/anexos/Cm0eM2qD.pdf",
  },
  MANUAL_ANSV: {
    ref: "Manual de Referencia para la Conducción de Vehículos — Agencia Nacional de Seguridad Vial (ANSV).",
    url: "https://web.mintransporte.gov.co/jspui/bitstream/001/744/1/11%20Manual%20Licencia%20diagramacion%20sep%208-16%20%281%29.pdf",
  },
  LEY_769: {
    ref: "Ley 769 de 2002 (Código Nacional de Tránsito Terrestre) y reformas vigentes (Ley 2251 de 2022, Ley 1811 de 2016).",
    url: "https://web.mintransporte.gov.co/jspui/bitstream/001/395/1/LEY%20769%20DE%202002.pdf",
  },
  LEY_1696: {
    ref: "Ley 1696 de 2013 — Disposiciones penales y administrativas por conducir bajo el influjo del alcohol u otras sustancias.",
    url: "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=55517",
  },
  MANUAL_SENALIZACION: {
    ref: "Manual de Señalización Vial de Colombia (Resolución 20243040045005 de 2024 del Ministerio de Transporte).",
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
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPromptText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuestionPrompt(value) {
  let normalized = cleanPromptText(value);
  if (!normalized) return normalized;
  if (!normalized.endsWith("?")) {
    normalized = `${normalized.replace(/[.:;!]+$/, "")}?`;
  }
  if (!normalized.includes("¿")) {
    normalized = `¿${normalized}`;
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
    explicacion: cleanPromptText(explicacion),
    fundamento_legal: cleanPromptText(fundamento_legal),
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
  sentido_clave = "seleccion",
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
    throw new Error(
      "Las preguntas actitudinales con opciones personalizadas deben definir las cuatro opciones."
    );
  }

  const opciones =
    providedOptionCount === 4
      ? {
          a: cleanPromptText(opcion_a),
          b: cleanPromptText(opcion_b),
          c: cleanPromptText(opcion_c),
          d: cleanPromptText(opcion_d),
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
    explicacion_respuesta: cleanPromptText(explicacion),
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
    a: cleanPromptText(opcion_a),
    b: cleanPromptText(opcion_b),
    c: cleanPromptText(opcion_c),
    d: cleanPromptText(opcion_d),
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
    opcion_a: opciones.a,
    opcion_b: opciones.b,
    opcion_c: opciones.c,
    opcion_d: opciones.d,
    respuesta_correcta,
    respuesta_correcta_texto: getOptionText(respuesta_correcta, opciones),
    explicacion_respuesta: cleanPromptText(explicacion),
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
