const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { normalizeContractNumber } = require("./lib/contract-number");

const ESCUELA_ID = process.env.IMPORT_ESCUELA_ID || "a5320c4a-3bf6-4da5-b365-da17d7001d4f";

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
      const value = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function isPlainContract(value) {
  return (
    Boolean(value) &&
    !/^\d{4}-(CAR|MOT|COM)-/.test(value) &&
    !/^(CAR|MOT|COM|APT|PRA)-/.test(value)
  );
}

async function selectAll(supabaseAdmin, table, columns) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(columns)
      .eq("escuela_id", ESCUELA_ID)
      .not("numero_contrato", "is", null)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [matriculas, alumnos] = await Promise.all([
    selectAll(supabaseAdmin, "matriculas_alumno", "id, alumno_id, numero_contrato, categorias"),
    selectAll(supabaseAdmin, "alumnos", "id, numero_contrato, categorias, tipo_registro"),
  ]);
  const alumnosConMatricula = new Set(matriculas.map((item) => item.alumno_id));

  const summary = {
    matriculas_updated: 0,
    alumnos_updated: 0,
    skipped: [],
  };

  for (const matricula of matriculas) {
    if (!isPlainContract(matricula.numero_contrato)) continue;

    const numeroNormalizado = normalizeContractNumber(matricula.numero_contrato, matricula.categorias ?? []);
    if (!numeroNormalizado || numeroNormalizado === matricula.numero_contrato) continue;

    const existingRes = await supabaseAdmin
      .from("matriculas_alumno")
      .select("id, alumno_id, numero_contrato")
      .eq("escuela_id", ESCUELA_ID)
      .eq("numero_contrato", numeroNormalizado)
      .maybeSingle();

    if (existingRes.error) throw existingRes.error;
    if (existingRes.data && existingRes.data.id !== matricula.id) {
      summary.skipped.push({
        scope: "matricula",
        id: matricula.id,
        from: matricula.numero_contrato,
        to: numeroNormalizado,
      });
      continue;
    }

    const updateRes = await supabaseAdmin
      .from("matriculas_alumno")
      .update({ numero_contrato: numeroNormalizado })
      .eq("id", matricula.id);

    if (updateRes.error) throw updateRes.error;
    summary.matriculas_updated += 1;
  }

  for (const alumno of alumnos) {
    if (alumno.tipo_registro !== "regular") continue;
    if (!isPlainContract(alumno.numero_contrato)) continue;
    if (alumnosConMatricula.has(alumno.id)) continue;

    const numeroNormalizado = normalizeContractNumber(alumno.numero_contrato, alumno.categorias ?? []);
    if (!numeroNormalizado || numeroNormalizado === alumno.numero_contrato) continue;

    const updateRes = await supabaseAdmin
      .from("alumnos")
      .update({ numero_contrato: numeroNormalizado })
      .eq("id", alumno.id);

    if (updateRes.error) throw updateRes.error;
    summary.alumnos_updated += 1;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
