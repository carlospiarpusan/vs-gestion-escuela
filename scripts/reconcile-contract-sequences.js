const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnv() {
  for (const filename of [".env.local", ".env"]) {
    const envPath = path.join(__dirname, "..", filename);
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      value = value.replace(/\\n/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function normalizePrefix(raw) {
  const value = raw?.trim()?.toUpperCase?.();
  return value === "MOT" || value === "CAR" || value === "COM" ? value : null;
}

function parseHistoricPrefix(numeroContrato) {
  if (!numeroContrato) return null;
  const match = numeroContrato.trim().match(/^(MOT|CAR|COM)\s*-/i);
  return match ? match[1].toUpperCase() : null;
}

function parseHistoricSequence(numeroContrato) {
  if (!numeroContrato) return null;
  const match = numeroContrato.trim().match(/-\s*(\d+)$/);
  if (!match) return null;
  const sequence = Number.parseInt(match[1], 10);
  return Number.isInteger(sequence) && sequence > 0 ? sequence : null;
}

function extractSequence(row, prefix) {
  const detectedPrefix =
    normalizePrefix(row.prefijo_contrato) ?? parseHistoricPrefix(row.numero_contrato);
  if (detectedPrefix !== prefix) return null;

  const explicit = row.consecutivo_contrato == null ? null : Number(row.consecutivo_contrato);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;

  return parseHistoricSequence(row.numero_contrato);
}

function findNextAvailable(rows, prefix) {
  const occupiedList = [];

  for (const row of rows) {
    const sequence = extractSequence(row, prefix);
    if (sequence) occupiedList.push(sequence);
  }

  occupiedList.sort((a, b) => a - b);
  return (occupiedList.at(-1) || 0) + 1;
}

async function main() {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL.");
  }

  const targetSchoolId = process.env.RECONCILE_ESCUELA_ID || process.argv[2] || null;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const schoolsRes = await client.query(
      `
        select id
        from public.escuelas
        where ($1::uuid is null or id = $1::uuid)
        order by id
      `,
      [targetSchoolId]
    );

    const summary = [];

    for (const school of schoolsRes.rows) {
      const rowsRes = await client.query(
        `
          select numero_contrato, prefijo_contrato, consecutivo_contrato
          from public.matriculas_alumno
          where escuela_id = $1
        `,
        [school.id]
      );

      const nextMot = findNextAvailable(rowsRes.rows, "MOT");
      const nextCar = findNextAvailable(rowsRes.rows, "CAR");
      const nextCom = findNextAvailable(rowsRes.rows, "COM");

      await client.query(
        `
          insert into public.configuracion_contratos_escuela (
            escuela_id,
            nombre_legal_escuela,
            siguiente_consecutivo_mot,
            siguiente_consecutivo_car,
            siguiente_consecutivo_com
          )
          values ($1, '', $2, $3, $4)
          on conflict (escuela_id) do update
          set
            siguiente_consecutivo_mot = excluded.siguiente_consecutivo_mot,
            siguiente_consecutivo_car = excluded.siguiente_consecutivo_car,
            siguiente_consecutivo_com = excluded.siguiente_consecutivo_com,
            updated_at = now()
        `,
        [school.id, nextMot, nextCar, nextCom]
      );

      summary.push({
        escuela_id: school.id,
        siguiente_consecutivo_mot: nextMot,
        siguiente_consecutivo_car: nextCar,
        siguiente_consecutivo_com: nextCom,
      });
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
