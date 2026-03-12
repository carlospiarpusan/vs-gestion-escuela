/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

const manifest = require("../data/cale/manifest.js");

function parseArgs(argv) {
  const options = {
    from: null,
    to: null,
    out: null,
    completedOnly: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--all") {
      options.completedOnly = false;
      continue;
    }

    if (arg === "--from") {
      options.from = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === "--to") {
      options.to = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === "--out") {
      options.out = argv[index + 1] || null;
      index += 1;
    }
  }

  return options;
}

function lotNumber(id) {
  const match = String(id || "").match(/lote-(\d+)/);
  return match ? Number(match[1]) : null;
}

function shouldIncludeLot(lot, options) {
  if (options.completedOnly && lot.estado !== "completo") {
    return false;
  }

  const numericId = lotNumber(lot.id);

  if (options.from && numericId !== null && numericId < lotNumber(options.from)) {
    return false;
  }

  if (options.to && numericId !== null && numericId > lotNumber(options.to)) {
    return false;
  }

  return true;
}

function loadLot(lotId) {
  const absolutePath = path.resolve(__dirname, "../data/cale/lotes", `${lotId}.js`);
  delete require.cache[absolutePath];
  return require(absolutePath);
}

function buildDefaultOutputPath(selectedLots) {
  const first = selectedLots[0]?.id || "lote-00";
  const last = selectedLots[selectedLots.length - 1]?.id || first;

  return path.resolve(__dirname, "../data/cale/exports", `cale-editorial-${first}-a-${last}.json`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const selectedLots = manifest.lotes.filter((lot) => shouldIncludeLot(lot, options));

  if (selectedLots.length === 0) {
    throw new Error("No se encontraron lotes para exportar con los filtros indicados.");
  }

  const payloadLots = selectedLots.map((lotMeta) => {
    const lot = loadLot(lotMeta.id);
    return {
      id: lot.lote || lotMeta.id,
      version: lot.version || 1,
      descripcion: lot.descripcion || "",
      estado: lotMeta.estado,
      preguntas: lot.items,
    };
  });

  const totalPreguntas = payloadLots.reduce((sum, lot) => sum + lot.preguntas.length, 0);
  const outputPath = options.out
    ? path.resolve(process.cwd(), options.out)
    : buildDefaultOutputPath(selectedLots);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const payload = {
    banco: manifest.banco,
    exportado_en: new Date().toISOString(),
    lotes_exportados: payloadLots.length,
    total_preguntas: totalPreguntas,
    rango: {
      desde: payloadLots[0].id,
      hasta: payloadLots[payloadLots.length - 1].id,
    },
    distribucion_por_lote: manifest.distribucion_por_lote,
    lotes: payloadLots,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        out: outputPath,
        lotes: payloadLots.length,
        preguntas: totalPreguntas,
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
