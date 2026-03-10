const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

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

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [alumnosRes, ingresosRes, matriculasRes, perfilesRes] = await Promise.all([
    supabaseAdmin.from("alumnos").select(`
      id, escuela_id, sede_id, user_id, numero_contrato, categorias, valor_total,
      fecha_inscripcion, notas, tiene_tramitador, tramitador_nombre, tramitador_valor, created_at
    `),
    supabaseAdmin.from("ingresos").select("id, alumno_id, matricula_id, fecha"),
    supabaseAdmin.from("matriculas_alumno").select("id, escuela_id, alumno_id, numero_contrato"),
    supabaseAdmin
      .from("perfiles")
      .select("id, escuela_id, rol, created_at")
      .in("rol", ["admin_escuela", "admin_sede", "administrativo"]),
  ]);

  if (alumnosRes.error) throw alumnosRes.error;
  if (ingresosRes.error) throw ingresosRes.error;
  if (matriculasRes.error) throw matriculasRes.error;
  if (perfilesRes.error) throw perfilesRes.error;

  const perfilesPorEscuela = new Map();
  for (const perfil of perfilesRes.data ?? []) {
    if (!perfil.escuela_id) continue;
    const list = perfilesPorEscuela.get(perfil.escuela_id) ?? [];
    list.push(perfil);
    perfilesPorEscuela.set(perfil.escuela_id, list);
  }
  for (const list of perfilesPorEscuela.values()) {
    list.sort((a, b) => {
      const score = (rol) => {
        if (rol === "admin_escuela") return 0;
        if (rol === "admin_sede") return 1;
        return 2;
      };
      return score(a.rol) - score(b.rol) || String(a.created_at).localeCompare(String(b.created_at));
    });
  }

  const ingresosPorAlumno = new Map();
  for (const ingreso of ingresosRes.data ?? []) {
    if (!ingreso.alumno_id) continue;
    const list = ingresosPorAlumno.get(ingreso.alumno_id) ?? [];
    list.push(ingreso);
    ingresosPorAlumno.set(ingreso.alumno_id, list);
  }

  const matriculasPorAlumno = new Map();
  for (const matricula of matriculasRes.data ?? []) {
    const list = matriculasPorAlumno.get(matricula.alumno_id) ?? [];
    list.push(matricula);
    matriculasPorAlumno.set(matricula.alumno_id, list);
  }

  const summary = {
    matriculas_created: 0,
    ingresos_linked: 0,
    skipped_with_existing_multiples: 0,
  };

  for (const alumno of alumnosRes.data ?? []) {
    const ingresos = ingresosPorAlumno.get(alumno.id) ?? [];
    const matriculas = matriculasPorAlumno.get(alumno.id) ?? [];
    const hasLegacyData =
      alumno.numero_contrato ||
      (alumno.categorias && alumno.categorias.length > 0) ||
      alumno.valor_total !== null ||
      alumno.fecha_inscripcion ||
      alumno.tiene_tramitador ||
      ingresos.length > 0;

    if (!hasLegacyData) continue;

    if (matriculas.length > 1) {
      summary.skipped_with_existing_multiples += 1;
      continue;
    }

    let matriculaId = matriculas[0]?.id ?? null;

    if (!matriculaId) {
      const fallbackFechaIngreso = ingresos
        .map((ingreso) => normalizeDate(ingreso.fecha))
        .filter(Boolean)
        .sort()[0] ?? null;

      const actor = perfilesPorEscuela.get(alumno.escuela_id)?.[0]?.id ?? null;
      const insertRes = await supabaseAdmin
        .from("matriculas_alumno")
        .insert({
          escuela_id: alumno.escuela_id,
          sede_id: alumno.sede_id,
          alumno_id: alumno.id,
          created_by: actor,
          numero_contrato: alumno.numero_contrato,
          categorias: alumno.categorias ?? [],
          valor_total: alumno.valor_total,
          fecha_inscripcion: alumno.fecha_inscripcion ?? fallbackFechaIngreso ?? normalizeDate(alumno.created_at),
          estado: "activo",
          notas: alumno.notas,
          tiene_tramitador: alumno.tiene_tramitador ?? false,
          tramitador_nombre: alumno.tramitador_nombre,
          tramitador_valor: alumno.tramitador_valor,
        })
        .select("id")
        .single();

      if (insertRes.error || !insertRes.data) {
        throw new Error(`No se pudo crear matrícula para alumno ${alumno.id}: ${insertRes.error?.message || "sin detalle"}`);
      }

      matriculaId = insertRes.data.id;
      summary.matriculas_created += 1;
    }

    const ingresosSinMatricula = ingresos.filter((ingreso) => !ingreso.matricula_id);
    if (ingresosSinMatricula.length > 0) {
      const ids = ingresosSinMatricula.map((ingreso) => ingreso.id);
      const updateRes = await supabaseAdmin
        .from("ingresos")
        .update({ matricula_id: matriculaId })
        .in("id", ids);

      if (updateRes.error) {
        throw new Error(`No se pudieron enlazar ingresos del alumno ${alumno.id}: ${updateRes.error.message}`);
      }

      summary.ingresos_linked += ids.length;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
