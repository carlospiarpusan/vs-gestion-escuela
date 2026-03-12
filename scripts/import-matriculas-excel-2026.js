const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const { normalizeContractNumber } = require("./lib/contract-number");

const DEFAULT_EXCEL_PATH = "/Users/carlos/Documents/Ingresos 2026 Moto.xlsx";
const ESCUELA_ID = process.env.IMPORT_ESCUELA_ID || "a5320c4a-3bf6-4da5-b365-da17d7001d4f";
const SEDE_ID = process.env.IMPORT_SEDE_ID || "eeb0cfe9-a2b3-4d54-8199-66fca310e9bf";
const ACTOR_USER_ID = process.env.IMPORT_USER_ID || "0840c179-b432-4f1a-afe2-6174e5cf33af";

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

def first(item, *keys):
    for key in keys:
        if key in item and item[key] not in (None, ""):
            return item[key]
    return None

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
rows_out = []
for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    headers = rows[2]
    for row in rows[3:]:
        if not any(v is not None and v != "" for v in row):
            continue
        item = dict(zip(headers, row))
        alumno = first(item, "Alumno(a)", "Alumno")
        if not alumno:
            continue
        abonos = []
        for idx in range(1, 6):
            value = item.get(f"Abono {idx}")
            if value is None or value == "":
                continue
            abonos.append({"indice": idx, "monto": float(value)})
        rows_out.append({
            "sheet": ws.title,
            "fecha": to_iso(first(item, "Fecha")),
            "categoria": first(item, "Cat.", "Cat"),
            "alumno": alumno,
            "contrato": first(item, "Contrato", "N° Contrato"),
            "numero_factura": first(item, "N°fac", "N°Fac", "N° Fac"),
            "numero_factura_moto": first(item, "N° Fac Moto"),
            "numero_factura_carro": first(item, "N° Fac carro"),
            "cedula": first(item, "Cedula", "cedula"),
            "valor_total": float(first(item, "Valor total")) if first(item, "Valor total") not in (None, "") else None,
            "tramitador": first(item, "Tramitador"),
            "precio_tramitador": float(first(item, "P. Tramitador")) if first(item, "P. Tramitador") not in (None, "") else 0,
            "abonos": abonos,
            "saldo": float(first(item, "Saldo")) if first(item, "Saldo") not in (None, "") else None,
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

function normalizeCategoriaValue(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const comboMatch = normalized.match(/^([A-Z0-9]+)\s*-\s*([A-Z0-9]+)$/i);
  if (comboMatch) {
    return `${comboMatch[1].toUpperCase()} y ${comboMatch[2].toUpperCase()}`;
  }
  return normalized.toUpperCase();
}

function resolveNumeroFactura(row) {
  const values = [];
  const general = normalizeStringOrNumber(row.numero_factura);
  const moto = normalizeStringOrNumber(row.numero_factura_moto);
  const carro = normalizeStringOrNumber(row.numero_factura_carro);

  if (general) values.push(general);
  if (moto) values.push(`Moto ${moto}`);
  if (carro) values.push(`Carro ${carro}`);

  return values.length > 0 ? values.join(" / ") : null;
}

function splitFullName(fullName) {
  const tokens = normalizeText(fullName)?.split(" ") ?? [];
  if (tokens.length === 0) return { nombre: "Alumno", apellidos: "" };
  if (tokens.length === 1) return { nombre: tokens[0], apellidos: "" };
  if (tokens.length === 2) return { nombre: tokens[0], apellidos: tokens[1] };
  if (tokens.length === 3) return { nombre: tokens.slice(0, 2).join(" "), apellidos: tokens[2] };
  return { nombre: tokens.slice(0, 2).join(" "), apellidos: tokens.slice(2).join(" ") };
}

function mapTipoPermiso(categorias) {
  const first = categorias[0] ? String(categorias[0]).toUpperCase() : "";
  if (first.startsWith("AM")) return "AM";
  if (first.startsWith("A1")) return "A1";
  if (first.startsWith("A2")) return "A2";
  if (first.startsWith("A")) return "A";
  if (first.startsWith("RC") || first.startsWith("C")) return "C";
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
  for (let i = 0; i < array.length; i += size) parts.push(array.slice(i, i + size));
  return parts;
}

function makeSourceTag(excelPath) {
  return `IMPORT_EXCEL_${path.basename(excelPath, path.extname(excelPath)).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

const DATE_OVERRIDES_BY_SOURCE = {
  IMPORT_EXCEL_INGRESOS_COMBOS_2026: {
    "622": "2026-01-15",
    "623": "2026-01-15",
    "624": "2026-01-15",
    "625": "2026-01-15",
    "664": "2026-03-04",
  },
};

function resolveFechaImportacion({ sourceTag, numeroContrato, fecha }) {
  const sourceOverrides = DATE_OVERRIDES_BY_SOURCE[sourceTag] || {};
  if (numeroContrato && sourceOverrides[numeroContrato]) {
    return sourceOverrides[numeroContrato];
  }
  return fecha;
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Faltan variables de entorno de Supabase.");

  const excelPath = process.argv[2] || DEFAULT_EXCEL_PATH;
  if (!fs.existsSync(excelPath)) throw new Error(`No existe el archivo Excel: ${excelPath}`);

  const sourceTag = makeSourceTag(excelPath);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = readWorkbookRows(excelPath);
  if (rows.length === 0) throw new Error("El Excel no tiene filas válidas para importar.");

  const [authUsers, perfilesRes, alumnosRes, matriculasRes] = await Promise.all([
    listAllUsers(supabaseAdmin),
    supabaseAdmin.from("perfiles").select("id, email, escuela_id, rol, cedula"),
    supabaseAdmin.from("alumnos").select("id, user_id, dni, nombre, apellidos, telefono, email, direccion, tipo_permiso").eq("escuela_id", ESCUELA_ID),
    supabaseAdmin.from("matriculas_alumno").select("id, escuela_id, alumno_id, numero_contrato").eq("escuela_id", ESCUELA_ID),
  ]);

  if (perfilesRes.error) throw perfilesRes.error;
  if (alumnosRes.error) throw alumnosRes.error;
  if (matriculasRes.error) throw matriculasRes.error;

  const usersByEmail = new Map(
    authUsers.filter((user) => user.email).map((user) => [String(user.email).toLowerCase(), user])
  );
  const perfilesById = new Map((perfilesRes.data ?? []).map((perfil) => [perfil.id, perfil]));
  const alumnosByDni = new Map((alumnosRes.data ?? []).map((alumno) => [alumno.dni, alumno]));
  const matriculasByContrato = new Map(
    (matriculasRes.data ?? [])
      .filter((matricula) => matricula.numero_contrato !== null)
      .map((matricula) => [`${matricula.escuela_id}:${matricula.numero_contrato}`, matricula])
  );

  const summary = {
    rows: rows.length,
    auth_created: 0,
    auth_reused: 0,
    alumnos_created: 0,
    alumnos_reused: 0,
    matriculas_created: 0,
    matriculas_updated: 0,
    ingresos_created: 0,
    name_mismatches: [],
    discrepancies: [],
  };

  for (const row of rows) {
    const fullName = normalizeText(row.alumno);
    const dni = normalizeStringOrNumber(row.cedula);
    const fechaOriginal = normalizeDateValue(row.fecha);
    const categoria = normalizeCategoriaValue(row.categoria);
    const numeroFactura = resolveNumeroFactura(row);
    const numeroContratoRaw = normalizeStringOrNumber(row.contrato);
    const categorias = categoria ? [categoria] : [];
    const numeroContrato = normalizeContractNumber(numeroContratoRaw, categorias);
    const fecha = resolveFechaImportacion({ sourceTag, numeroContrato, fecha: fechaOriginal });
    const valorTotal = row.valor_total === null ? null : Number(row.valor_total);
    const tramitadorNombre = normalizeText(row.tramitador);
    const tramitadorValor = Number(row.precio_tramitador || 0);
    const saldo = Number(row.saldo || 0);
    const abonos = Array.isArray(row.abonos) ? row.abonos : [];
    const totalAbonos = abonos.reduce((sum, item) => sum + Number(item.monto || 0), 0);
    if (!fullName || !dni || !fecha || categorias.length === 0) {
      throw new Error(`Fila inválida: faltan nombre, cédula, fecha o categoría (${JSON.stringify(row)})`);
    }

    if (!numeroContrato) {
      throw new Error(`La fila de ${fullName} no tiene número de contrato; no se puede asegurar idempotencia.`);
    }
    if (Math.abs((valorTotal || 0) - totalAbonos - saldo) > 1) {
      summary.discrepancies.push({ dni, alumno: fullName, valorTotal, totalAbonos, saldo });
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
    const upsertProfileRes = await supabaseAdmin.from("perfiles").upsert(profilePayload, { onConflict: "id" });
    if (upsertProfileRes.error) {
      throw new Error(`No se pudo guardar el perfil de ${fullName}: ${upsertProfileRes.error.message}`);
    }
    perfilesById.set(user.id, profilePayload);

    let alumno = alumnosByDni.get(dni);
    if (!alumno) {
      const { nombre, apellidos } = splitFullName(fullName);
      const insertRes = await supabaseAdmin
        .from("alumnos")
        .insert({
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
          tipo_permiso: mapTipoPermiso(categorias),
          categorias,
          estado: "activo",
          fecha_inscripcion: fecha,
          notas: null,
          valor_total: valorTotal,
          ciudad: null,
          departamento: null,
          tiene_tramitador: tramitadorNombre && tramitadorNombre !== "N/A",
          tramitador_nombre: tramitadorNombre && tramitadorNombre !== "N/A" ? tramitadorNombre : null,
          tramitador_valor: tramitadorValor || null,
        })
        .select("id, user_id, dni, nombre, apellidos, telefono, email, direccion, tipo_permiso")
        .single();

      if (insertRes.error || !insertRes.data) {
        throw new Error(`No se pudo crear el alumno ${fullName}: ${insertRes.error?.message || "sin detalle"}`);
      }
      alumno = insertRes.data;
      alumnosByDni.set(dni, alumno);
      summary.alumnos_created += 1;
    } else {
      summary.alumnos_reused += 1;
      const existingFullName = normalizeText(`${alumno.nombre} ${alumno.apellidos}`);
      if (existingFullName && existingFullName !== fullName) {
        summary.name_mismatches.push({ dni, existing: existingFullName, incoming: fullName });
      }
      if ((!alumno.telefono || !alumno.direccion || !alumno.email) && (alumno.telefono !== "" || alumno.direccion !== null || alumno.email !== null)) {
        // No-op: el Excel no aporta más datos personales para completar.
      }
    }

    const contractKey = `${ESCUELA_ID}:${numeroContrato}`;
    const existingMatricula = matriculasByContrato.get(contractKey);
    if (existingMatricula && existingMatricula.alumno_id !== alumno.id) {
      throw new Error(`El contrato ${numeroContrato} ya existe asociado a otro alumno.`);
    }

    const matriculaPayload = {
      escuela_id: ESCUELA_ID,
      sede_id: SEDE_ID,
      alumno_id: alumno.id,
      created_by: ACTOR_USER_ID,
      numero_contrato: numeroContrato,
      categorias,
      valor_total: valorTotal,
      fecha_inscripcion: fecha,
      estado: "activo",
      notas: null,
      tiene_tramitador: tramitadorNombre && tramitadorNombre !== "N/A",
      tramitador_nombre: tramitadorNombre && tramitadorNombre !== "N/A" ? tramitadorNombre : null,
      tramitador_valor: tramitadorValor || null,
    };

    let matriculaId;
    if (existingMatricula) {
      const updateRes = await supabaseAdmin
        .from("matriculas_alumno")
        .update(matriculaPayload)
        .eq("id", existingMatricula.id)
        .select("id")
        .single();
      if (updateRes.error || !updateRes.data) {
        throw new Error(`No se pudo actualizar la matrícula ${numeroContrato}: ${updateRes.error?.message || "sin detalle"}`);
      }
      matriculaId = updateRes.data.id;
      summary.matriculas_updated += 1;
    } else {
      const insertRes = await supabaseAdmin
        .from("matriculas_alumno")
        .insert(matriculaPayload)
        .select("id, escuela_id, alumno_id, numero_contrato")
        .single();
      if (insertRes.error || !insertRes.data) {
        throw new Error(`No se pudo crear la matrícula ${numeroContrato}: ${insertRes.error?.message || "sin detalle"}`);
      }
      matriculaId = insertRes.data.id;
      matriculasByContrato.set(contractKey, insertRes.data);
      summary.matriculas_created += 1;
    }

    const deleteRes = await supabaseAdmin
      .from("ingresos")
      .delete()
      .eq("matricula_id", matriculaId)
      .like("notas", `${sourceTag}|%`);
    if (deleteRes.error) {
      throw new Error(`No se pudieron limpiar ingresos importados del contrato ${numeroContrato}: ${deleteRes.error.message}`);
    }

    const ingresosPayload = abonos
      .filter((abono) => Number(abono.monto || 0) > 0)
      .map((abono) => ({
        escuela_id: ESCUELA_ID,
        sede_id: SEDE_ID,
        user_id: ACTOR_USER_ID,
        alumno_id: alumno.id,
        matricula_id: matriculaId,
        categoria: "matricula",
        concepto: abono.indice === 1 ? `Matrícula — ${fullName}` : `Abono ${abono.indice} — ${fullName}`,
        monto: Number(abono.monto),
        metodo_pago: "otro",
        medio_especifico: "Importado desde Excel; método de pago no especificado",
        numero_factura: numeroFactura,
        fecha,
        estado: "cobrado",
        notas: `${sourceTag}|${numeroContrato}|${dni}|abono_${abono.indice}|hoja_${row.sheet}`,
      }));

    if (ingresosPayload.length > 0) {
      for (const part of chunk(ingresosPayload, 50)) {
        const insertIngresosRes = await supabaseAdmin.from("ingresos").insert(part);
        if (insertIngresosRes.error) {
          throw new Error(`No se pudieron crear ingresos del contrato ${numeroContrato}: ${insertIngresosRes.error.message}`);
        }
      }
      summary.ingresos_created += ingresosPayload.length;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
