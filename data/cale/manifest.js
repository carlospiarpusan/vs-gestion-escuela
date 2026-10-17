/* eslint-disable @typescript-eslint/no-require-imports */

const { LOT_TARGET_COUNTS } = require("./schema");

const TOTAL_LOTES = 5;

module.exports = {
  banco: "cale_editorial",
  total_preguntas_objetivo: 500,
  tamano_lote: 100,
  total_lotes: TOTAL_LOTES,
  distribucion_por_lote: LOT_TARGET_COUNTS,
  lotes: Array.from({ length: TOTAL_LOTES }, (_, index) => ({
    id: `lote-${String(index + 1).padStart(2, "0")}`,
    objetivo_preguntas: 100,
    distribucion: LOT_TARGET_COUNTS,
    estado: "completo",
  })),
};
