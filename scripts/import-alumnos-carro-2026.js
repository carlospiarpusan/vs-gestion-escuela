const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_EXCEL_PATH = "/Users/carlos/Documents/Ingresos 2026 Carro.xlsx";
const ESCUELA_ID = process.env.IMPORT_ESCUELA_ID || "a5320c4a-3bf6-4da5-b365-da17d7001d4f";
const SEDE_ID = process.env.IMPORT_SEDE_ID || "eeb0cfe9-a2b3-4d54-8199-66fca310e9bf";
const ACTOR_USER_ID = process.env.IMPORT_USER_ID || "0840c179-b432-4f1a-afe2-6174e5cf33af";
const SOURCE_TAG = "IMPORT_EXCEL_INGRESOS_2026_CARRO";

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

function readWorkbookRows(excelPath) {
  const pyScript = `
import json
import sys
from datetime import date, datetime
import openpyxl

def to_iso(value):
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
rows_out = []
for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    headers = rows[2]
    for row in rows[3:]:
        if not any(v is not None and v != "" for v in row):
            continue
        item = dict(zip(headers, row))
        if not item.get("Alumno(a)"):
            continue
        abonos = []
        for idx in range(1, 6):
            value = item.get(f"Abono {idx}")
            if value is None or value == "":
                continue
            abonos.append({"indice": idx, "monto": float(value)})
        rows_out.append({
            "sheet": ws.title,
            "fecha": to_iso(item.get("Fecha")),
            "categoria": item.get("Cat."),
            "alumno": item.get("Alumno(a)"),
            "contrato": item.get("Contrato"),
            "numero_factura": item.get("N°fac"),
            "cedula": item.get("Cedula"),
            "valor_total": float(item.get("Valor total")) if item.get("Valor total") not in (None, "") else None,
            "tramitador": item.get("Tramitador"),
            "precio_tramitador": float(item.get("P. Tramitador")) if item.get("P. Tramitador") not in (None, "") else 0,
            "abonos": abonos,
            "saldo": float(item.get("Saldo")) if item.get("Saldo") not in (None, "") else None,
        })

print(json.dumps(rows_out, ensure_ascii=False))
`;

  const raw = execFileSync("python3", ["-c", pyScript, excelPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return JSON.parse(raw);
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || null;
}

function normalizeStringOrNumber(value) {
  const normalized = normalizeText(value);
  return normalized === null ? null : String(normalized);
}

function normalizeDateValue(value) {
  const normalized = normalizeStringOrNumber(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  throw new Error(`Fecha no soportada: ${normalized}`);
}

function splitFullName(fullName) {
  const tokens = normalizeText(fullName)?.split(" ") ?? [];
  if (tokens.length === 0) return { nombre: "Alumno", apellidos: "" };
  if (tokens.length === 1) return { nombre: tokens[0], apellidos: "" };
  if (tokens.length === 2) return { nombre: tokens[0], apellidos: tokens[1] };
  if (tokens.length === 3) {
    return { nombre: tokens.slice(0, 2).join(" "), apellidos: tokens[2] };
  }
  return { nombre: tokens.slice(0, 2).join(" "), apellidos: tokens.slice(2).join(" ") };
}

function mapTipoPermiso(categoria) {
  const cat = normalizeText(categoria)?.toUpperCase() ?? "";
  if (cat.startsWith("AM")) return "AM";
  if (cat.startsWith("A1")) return "A1";
  if (cat.startsWith("A2")) return "A2";
  if (cat.startsWith("A")) return "A";
  if (cat.startsWith("RC") || cat.startsWith("C")) return "C";
  return "B";
}

async function listAllUsers(supabaseAdmin) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
    page += 1;
  }

  return users;
}

function chunk(array, size) {
  const parts = [];
  for (let i = 0; i < array.length; i += size) {
    parts.push(array.slice(i, i + size));
  }
  return parts;
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  const excelPath = process.argv[2] || DEFAULT_EXCEL_PATH;
  if (!fs.existsSync(excelPath)) {
    throw new Error(`No existe el archivo Excel: ${excelPath}`);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = readWorkbookRows(excelPath);
  if (rows.length === 0) {
    throw new Error("El Excel no tiene filas válidas para importar.");
  }

  const [authUsers, perfilesRes, alumnosRes] = await Promise.all([
    listAllUsers(supabaseAdmin),
    supabaseAdmin.from("perfiles").select("id, email, escuela_id, rol, cedula"),
    supabaseAdmin
      .from("alumnos")
      .select("id, user_id, dni")
      .eq("escuela_id", ESCUELA_ID),
  ]);

  if (perfilesRes.error) throw perfilesRes.error;
  if (alumnosRes.error) throw alumnosRes.error;

  const usersByEmail = new Map(
    authUsers
      .filter((user) => user.email)
      .map((user) => [String(user.email).toLowerCase(), user])
  );
  const perfilesById = new Map((perfilesRes.data ?? []).map((perfil) => [perfil.id, perfil]));
  const alumnosByDni = new Map((alumnosRes.data ?? []).map((alumno) => [alumno.dni, alumno]));

  const discrepancies = [];
  const summary = {
    rows: rows.length,
    auth_created: 0,
    auth_reused: 0,
    alumnos_created: 0,
    alumnos_updated: 0,
    ingresos_created: 0,
  };

  for (const row of rows) {
    const fullName = normalizeText(row.alumno);
    const dni = normalizeStringOrNumber(row.cedula);
    const fecha = normalizeDateValue(row.fecha);
    const categoria = normalizeText(row.categoria);
    const numeroFactura = normalizeStringOrNumber(row.numero_factura);
    const numeroContrato = normalizeStringOrNumber(row.contrato);
    const valorTotal = Number(row.valor_total || 0);
    const saldo = Number(row.saldo || 0);
    const abonos = Array.isArray(row.abonos) ? row.abonos : [];
    const totalAbonos = abonos.reduce((sum, item) => sum + Number(item.monto || 0), 0);

    if (!fullName || !dni || !fecha || !categoria) {
      throw new Error(`Fila inválida: faltan nombre, cédula, fecha o categoría (${JSON.stringify(row)})`);
    }

    if (Math.abs(valorTotal - totalAbonos - saldo) > 1) {
      discrepancies.push({
        dni,
        alumno: fullName,
        valorTotal,
        totalAbonos,
        saldo,
      });
    }

    const authEmail = `${dni}@alumno.local`;
    let user = usersByEmail.get(authEmail);

    if (!user) {
      const authRes = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: dni,
        email_confirm: true,
        user_metadata: {
          nombre: fullName,
          rol: "alumno",
          debe_cambiar_password: true,
          debe_completar_perfil: true,
        },
      });

      if (authRes.error || !authRes.data.user) {
        throw new Error(`No se pudo crear auth para ${fullName} (${dni}): ${authRes.error?.message || "sin detalle"}`);
      }

      user = authRes.data.user;
      usersByEmail.set(authEmail, user);
      summary.auth_created += 1;
    } else {
      summary.auth_reused += 1;
    }

    const existingProfile = perfilesById.get(user.id);
    if (existingProfile?.escuela_id && existingProfile.escuela_id !== ESCUELA_ID) {
      throw new Error(`La cédula ${dni} ya está asociada a otra escuela.`);
    }

    const profilePayload = {
      id: user.id,
      escuela_id: ESCUELA_ID,
      sede_id: SEDE_ID,
      nombre: fullName,
      email: authEmail,
      rol: "alumno",
      cedula: dni,
      activo: true,
    };

    const upsertProfileRes = await supabaseAdmin
      .from("perfiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (upsertProfileRes.error) {
      throw new Error(`No se pudo guardar el perfil de ${fullName}: ${upsertProfileRes.error.message}`);
    }

    perfilesById.set(user.id, profilePayload);

    const { nombre, apellidos } = splitFullName(fullName);
    const alumnoPayload = {
      user_id: user.id,
      escuela_id: ESCUELA_ID,
      sede_id: SEDE_ID,
      numero_contrato: numeroContrato,
      nombre,
      apellidos,
      dni,
      email: null,
      telefono: "",
      fecha_nacimiento: null,
      direccion: null,
      tipo_permiso: mapTipoPermiso(categoria),
      categorias: [categoria],
      estado: "activo",
      fecha_inscripcion: fecha,
      notas: null,
      valor_total: valorTotal || null,
      ciudad: null,
      departamento: null,
      tiene_tramitador: false,
      tramitador_nombre: null,
      tramitador_valor: null,
    };

    let alumno = alumnosByDni.get(dni);

    if (alumno) {
      const updateRes = await supabaseAdmin
        .from("alumnos")
        .update(alumnoPayload)
        .eq("id", alumno.id)
        .select("id, user_id, dni")
        .single();

      if (updateRes.error || !updateRes.data) {
        throw new Error(`No se pudo actualizar el alumno ${fullName}: ${updateRes.error?.message || "sin detalle"}`);
      }

      alumno = updateRes.data;
      summary.alumnos_updated += 1;
    } else {
      const insertRes = await supabaseAdmin
        .from("alumnos")
        .insert(alumnoPayload)
        .select("id, user_id, dni")
        .single();

      if (insertRes.error || !insertRes.data) {
        throw new Error(`No se pudo crear el alumno ${fullName}: ${insertRes.error?.message || "sin detalle"}`);
      }

      alumno = insertRes.data;
      summary.alumnos_created += 1;
    }

    alumnosByDni.set(dni, alumno);

    const deleteRes = await supabaseAdmin
      .from("ingresos")
      .delete()
      .eq("alumno_id", alumno.id)
      .like("notas", `${SOURCE_TAG}|%`);

    if (deleteRes.error) {
      throw new Error(`No se pudieron limpiar ingresos importados de ${fullName}: ${deleteRes.error.message}`);
    }

    const ingresosPayload = abonos
      .filter((abono) => Number(abono.monto || 0) > 0)
      .map((abono) => ({
        escuela_id: ESCUELA_ID,
        sede_id: SEDE_ID,
        user_id: ACTOR_USER_ID,
        alumno_id: alumno.id,
        categoria: "matricula",
        concepto: abono.indice === 1 ? `Matrícula — ${fullName}` : `Abono ${abono.indice} — ${fullName}`,
        monto: Number(abono.monto),
        metodo_pago: "otro",
        medio_especifico: "Importado desde Excel; método de pago no especificado",
        numero_factura: numeroFactura,
        fecha,
        estado: "cobrado",
        notas: `${SOURCE_TAG}|${dni}|abono_${abono.indice}|hoja_${row.sheet}`,
      }));

    if (ingresosPayload.length > 0) {
      for (const part of chunk(ingresosPayload, 50)) {
        const insertIngresosRes = await supabaseAdmin.from("ingresos").insert(part);
        if (insertIngresosRes.error) {
          throw new Error(`No se pudieron crear ingresos de ${fullName}: ${insertIngresosRes.error.message}`);
        }
      }
      summary.ingresos_created += ingresosPayload.length;
    }
  }

  console.log(JSON.stringify({ summary, discrepancies }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
