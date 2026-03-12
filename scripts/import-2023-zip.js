const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_ZIP_PATH = "/Users/carlos/Documents/2023.zip";
const ESCUELA_ID = process.env.IMPORT_ESCUELA_ID || "a5320c4a-3bf6-4da5-b365-da17d7001d4f";
const SEDE_ID = process.env.IMPORT_SEDE_ID || "eeb0cfe9-a2b3-4d54-8199-66fca310e9bf";
const ACTOR_USER_ID = process.env.IMPORT_USER_ID || "0840c179-b432-4f1a-afe2-6174e5cf33af";
const SOURCE_PREFIX = "IMPORT_ZIP_2023";
const DAILY_SOURCE_TAG = `${SOURCE_PREFIX}|DIARIOS`;

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

function readZipPayload(zipPath) {
  const pyScript = `
import json
import os
import sys
import tempfile
import zipfile
from datetime import date, datetime

import openpyxl

def to_iso(value):
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value

def as_float(value):
    if value in (None, ""):
        return None
    if isinstance(value, str) and value.strip() == "":
        return None
    if isinstance(value, str):
        cleaned = value.strip().replace("$", "").replace(",", "").replace(" ", "")
        if cleaned == "":
            return None
        return float(cleaned)
    return float(value)

def first(item, *keys):
    for key in keys:
        if key in item and item[key] not in (None, ""):
            return item[key]
    return None

def find_file(root, filename):
    for current_root, _, files in os.walk(root):
        for current in files:
            if current == filename:
                return os.path.join(current_root, current)
    raise FileNotFoundError(filename)

def parse_contract_workbook(root, filename, source_type, alumno_keys, contrato_keys, cedula_keys, factura_keys, categoria_keys, tramitador_keys, tramitador_valor_keys, abono_prefix="Abono "):
    workbook_path = find_file(root, filename)
    wb = openpyxl.load_workbook(workbook_path, data_only=True)
    rows_out = []

    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 4:
            continue

        headers = rows[2]
        for row_index, row in enumerate(rows[3:], start=4):
            if not any(value not in (None, "") for value in row):
                continue
            item = dict(zip(headers, row))
            alumno = first(item, *alumno_keys)
            if not alumno:
                continue
            if isinstance(alumno, str) and alumno.strip().lower() in ("alumno", "alumno(a)"):
                continue

            abonos = []
            for idx in range(1, 6):
                value = item.get(f"{abono_prefix}{idx}")
                if value in (None, ""):
                    continue
                abonos.append({"indice": idx, "monto": float(value)})

            rows_out.append({
                "source_type": source_type,
                "file_name": filename,
                "sheet": ws.title,
                "source_row": row_index,
                "fecha": to_iso(first(item, "Fecha")),
                "categoria": first(item, *categoria_keys),
                "alumno": alumno,
                "contrato": first(item, *contrato_keys),
                "cedula": first(item, *cedula_keys),
                "valor_total": as_float(first(item, "Valor total", "Valor Total", "Valor total ")),
                "tramitador": first(item, *tramitador_keys),
                "precio_tramitador": as_float(first(item, *tramitador_valor_keys)),
                "abonos": abonos,
                "saldo": as_float(first(item, "Saldo")),
                "facturas": {key: first(item, key) for key in factura_keys},
            })

    return rows_out

def parse_horas(root, filename):
    workbook_path = find_file(root, filename)
    wb = openpyxl.load_workbook(workbook_path, data_only=True)
    rows_out = []

    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 4:
            continue

        header_index = None
        for idx, row in enumerate(rows):
            values = [str(value).strip() if value is not None else "" for value in row]
            if "Alumno" in values and "Abono 1" in values:
                header_index = idx
                break

        if header_index is None:
            continue

        headers = rows[header_index]
        for row_index, row in enumerate(rows[header_index + 1:], start=header_index + 2):
            if not any(value not in (None, "") for value in row):
                continue
            item = dict(zip(headers, row))
            alumno = first(item, "Alumno")
            if not alumno:
                continue
            if isinstance(alumno, str) and alumno.strip().lower() == "alumno":
                continue

            abonos = []
            for idx in range(1, 3):
                value = item.get(f"Abono {idx}")
                if value in (None, ""):
                    continue
                abonos.append({"indice": idx, "monto": float(value)})

            rows_out.append({
                "source_type": "horas",
                "file_name": filename,
                "sheet": ws.title,
                "source_row": row_index,
                "fecha": to_iso(first(item, "Fecha")),
                "alumno": alumno,
                "cedula": first(item, "Cedula", "   Cedula", "cedula"),
                "celular": first(item, "Celular"),
                "horas": as_float(first(item, "N. Horas")),
                "valor_hora": as_float(first(item, "valor hora")),
                "valor_total": as_float(first(item, "Valor Total ", "Valor Total")),
                "abonos": abonos,
                "saldo": as_float(first(item, "Saldo Pendiente")),
            })

    return rows_out

def parse_diarios(root, filename):
    workbook_path = find_file(root, filename)
    wb = openpyxl.load_workbook(workbook_path, data_only=True)
    rows_out = []

    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 5:
            continue

        headers = rows[3]
        for row_index, row in enumerate(rows[4:], start=5):
            if not any(value not in (None, "") for value in row):
                continue
            item = dict(zip(headers, row))
            detalle = first(item, "Detalle")
            if not detalle:
                continue
            if isinstance(detalle, str) and detalle.strip().lower() == "detalle":
                continue

            rows_out.append({
                "source_type": "diarios",
                "file_name": filename,
                "sheet": ws.title,
                "source_row": row_index,
                "fecha": to_iso(first(item, "Fecha")),
                "detalle": detalle,
                "valor": as_float(first(item, "valor ", "Valor", "valor")),
                "forma_pago": first(item, "forma de pago", "Forma de pago"),
                "entrega": first(item, "Entrega"),
                "recibe": first(item, "Recibe"),
            })

    return rows_out

zip_path = sys.argv[1]
temp_root = tempfile.mkdtemp(prefix="import_2023_zip_")
with zipfile.ZipFile(zip_path) as zf:
    zf.extractall(temp_root)

payload = {
    "contracts": [],
    "horas": parse_horas(temp_root, "Horas adicionales.xlsx"),
    "diarios": parse_diarios(temp_root, "Ingresos diarios año 2023.xlsx"),
}

payload["contracts"].extend(parse_contract_workbook(
    temp_root,
    "INGRESOS 2023 CARRO.xlsx",
    "carro",
    ("Alumno(a)", "Alumno"),
    ("Contrato", "N° Contrato"),
    ("Cedula", "cedula"),
    ("N° Fact", "N°fac", "N° Fac"),
    ("Cat.", "Cat"),
    ("Tramitador",),
    ("P. Tramitador",),
))

payload["contracts"].extend(parse_contract_workbook(
    temp_root,
    "INGRESOS 2023 MOTO.xlsx",
    "moto",
    ("Alumno(a)", "Alumno"),
    ("Contrato", "N° Contrato"),
    ("Cedula", "cedula"),
    ("N° Fact", "N°fac", "N° Fac"),
    ("Cat.", "Cat"),
    ("Tramitador",),
    ("P. Tramitador",),
))

payload["contracts"].extend(parse_contract_workbook(
    temp_root,
    "INGRESOS 2023 COMBOS.xlsx",
    "combos",
    ("Alumno(a)", "Alumno"),
    ("Contrato", "N° Contrato"),
    ("Cedula", "cedula"),
    ("Fact. Moto", "Fact. Carro"),
    ("Cat.", "Cat"),
    ("Tramitador",),
    ("P. Tramitador",),
))

print(json.dumps(payload, ensure_ascii=False, default=str))
`;

  const raw = execFileSync("python3", ["-c", pyScript, zipPath], {
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

function isValidIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeDateValue(value, options = {}) {
  const normalized = normalizeStringOrNumber(value);
  const sheetMonth = options.sheet ? getMonthNumberFromSheet(options.sheet) : null;

  if (!normalized) {
    return sheetMonth ? `2023-${sheetMonth}-01` : null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-").map(Number);
    if (isValidIsoDate(year, month, day)) return normalized;
    throw new Error(`Fecha ISO inválida: ${normalized}`);
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(normalized) && sheetMonth) {
    return `2023-${sheetMonth}-01`;
  }

  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dayText, monthText, yearText] = slashMatch;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);

    if (isValidIsoDate(year, month, day)) {
      return `${year}-${monthText.padStart(2, "0")}-${dayText.padStart(2, "0")}`;
    }

    if (sheetMonth && day >= 1 && day <= 31 && isValidIsoDate(year, Number(sheetMonth), day)) {
      return `${year}-${sheetMonth}-${dayText.padStart(2, "0")}`;
    }
  }

  throw new Error(`Fecha no soportada: ${normalized}`);
}

function removeDiacritics(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function nameKey(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return removeDiacritics(normalized).toUpperCase();
}

function splitFullName(fullName) {
  const tokens = normalizeText(fullName)?.split(" ") ?? [];
  if (tokens.length === 0) return { nombre: "Alumno", apellidos: "" };
  if (tokens.length === 1) return { nombre: tokens[0], apellidos: "" };
  if (tokens.length === 2) return { nombre: tokens[0], apellidos: tokens[1] };
  if (tokens.length === 3) return { nombre: tokens.slice(0, 2).join(" "), apellidos: tokens[2] };
  return { nombre: tokens.slice(0, 2).join(" "), apellidos: tokens.slice(2).join(" ") };
}

function chunk(array, size) {
  const parts = [];
  for (let i = 0; i < array.length; i += size) {
    parts.push(array.slice(i, i + size));
  }
  return parts;
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

function normalizeCategoriaValue(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const comboMatch = normalized.match(/^([A-Z0-9]+)\s*-\s*([A-Z0-9]+)$/i);
  if (comboMatch) {
    return `${comboMatch[1].toUpperCase()} y ${comboMatch[2].toUpperCase()}`;
  }
  return normalized.toUpperCase();
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

function makeHistoricalContract(sourceType, originalContract) {
  const prefixBySource = {
    carro: "2023-CAR",
    moto: "2023-MOT",
    combos: "2023-COM",
  };
  const normalized = normalizeStringOrNumber(originalContract);
  if (!normalized) return null;
  return `${prefixBySource[sourceType] || "2023-LEG"}-${normalized}`;
}

function getMonthNumberFromSheet(sheet) {
  const cleaned = removeDiacritics(normalizeText(sheet || "") || "").toLowerCase();
  const byMonth = {
    enero: "01",
    febrero: "02",
    marzo: "03",
    abril: "04",
    mayo: "05",
    junio: "06",
    julio: "07",
    agosto: "08",
    septiembre: "09",
    setiembre: "09",
    octubre: "10",
    noviembre: "11",
    diciembre: "12",
  };

  for (const [name, number] of Object.entries(byMonth)) {
    if (cleaned.includes(name)) return number;
  }

  throw new Error(`No se pudo inferir el mes desde la hoja: ${sheet}`);
}

function resolveHorasFecha(fecha, sheet) {
  return normalizeDateValue(fecha, { sheet });
}

function buildFacturaLabel(row) {
  const facturas = row.facturas || {};
  const labels = [];

  for (const [key, value] of Object.entries(facturas)) {
    const normalized = normalizeStringOrNumber(value);
    if (!normalized) continue;
    if (/moto/i.test(key)) labels.push(`Moto ${normalized}`);
    else if (/carro/i.test(key)) labels.push(`Carro ${normalized}`);
    else labels.push(normalized);
  }

  return labels.length > 0 ? labels.join(" / ") : null;
}

function mapDailyMetodoPago(rawValue) {
  const normalized = removeDiacritics((normalizeText(rawValue) || "").toLowerCase());
  if (!normalized) return "otro";
  if (normalized.includes("efectivo")) return "efectivo";
  if (normalized.includes("datafono")) return "datafono";
  if (normalized.includes("nequi")) return "nequi";
  return "otro";
}

function mapDailyCategoria(rawDetalle) {
  const normalized = removeDiacritics((normalizeText(rawDetalle) || "").toLowerCase());
  if (normalized.includes("matricula")) return "matricula";
  if (normalized.includes("pin")) return "material";
  return "otros";
}

function addAlumnoToNameMap(map, alumno) {
  const key = nameKey(`${alumno.nombre || ""} ${alumno.apellidos || ""}`);
  if (!key) return;
  const existing = map.get(key) ?? [];
  if (!existing.some((item) => item.id === alumno.id)) {
    existing.push(alumno);
  }
  map.set(key, existing);
}

async function ensureUserAndProfile({
  supabaseAdmin,
  usersByEmail,
  perfilesById,
  fullName,
  dni,
  summary,
}) {
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
  return user;
}

async function ensureAlumno({
  supabaseAdmin,
  usersByEmail,
  perfilesById,
  alumnosByDni,
  alumnosByName,
  fullName,
  dni,
  telefono,
  categorias,
  fecha,
  numeroContrato,
  valorTotal,
  tramitadorNombre,
  tramitadorValor,
  notes,
  summary,
}) {
  const normalizedPhone = normalizeStringOrNumber(telefono);
  const normalizedDni = normalizeStringOrNumber(dni);

  if (!normalizedDni) {
    const matches = alumnosByName.get(nameKey(fullName)) ?? [];
    if (matches.length === 1) {
      const alumno = matches[0];
      if (normalizedPhone && (!alumno.telefono || alumno.telefono === "")) {
        const updateRes = await supabaseAdmin
          .from("alumnos")
          .update({ telefono: normalizedPhone })
          .eq("id", alumno.id)
          .select("id, user_id, dni, nombre, apellidos, telefono, email, direccion, tipo_permiso, numero_contrato")
          .single();

        if (updateRes.error || !updateRes.data) {
          throw new Error(`No se pudo actualizar el teléfono de ${fullName}: ${updateRes.error?.message || "sin detalle"}`);
        }

        const updatedAlumno = updateRes.data;
        alumnosByName.set(nameKey(fullName), [updatedAlumno]);
        if (updatedAlumno.dni) alumnosByDni.set(updatedAlumno.dni, updatedAlumno);
        return updatedAlumno;
      }

      summary.alumnos_reused += 1;
      return alumno;
    }

    return null;
  }

  const user = await ensureUserAndProfile({
    supabaseAdmin,
    usersByEmail,
    perfilesById,
    fullName,
    dni: normalizedDni,
    summary,
  });

  let alumno = alumnosByDni.get(normalizedDni);
  if (!alumno) {
    const { nombre, apellidos } = splitFullName(fullName);
    const insertRes = await supabaseAdmin
      .from("alumnos")
      .insert({
        user_id: user.id,
        escuela_id: ESCUELA_ID,
        sede_id: SEDE_ID,
        numero_contrato: numeroContrato || null,
        nombre,
        apellidos,
        dni: normalizedDni,
        email: null,
        telefono: normalizedPhone || "",
        fecha_nacimiento: null,
        direccion: null,
        tipo_permiso: mapTipoPermiso(categorias),
        categorias,
        estado: "activo",
        fecha_inscripcion: fecha,
        notas: notes || null,
        valor_total: valorTotal ?? null,
        ciudad: null,
        departamento: null,
        tiene_tramitador: Boolean(tramitadorNombre),
        tramitador_nombre: tramitadorNombre || null,
        tramitador_valor: tramitadorValor || null,
      })
      .select("id, user_id, dni, nombre, apellidos, telefono, email, direccion, tipo_permiso, numero_contrato")
      .single();

    if (insertRes.error || !insertRes.data) {
      throw new Error(`No se pudo crear el alumno ${fullName}: ${insertRes.error?.message || "sin detalle"}`);
    }

    alumno = insertRes.data;
    alumnosByDni.set(normalizedDni, alumno);
    addAlumnoToNameMap(alumnosByName, alumno);
    summary.alumnos_created += 1;
    return alumno;
  }

  summary.alumnos_reused += 1;
  const existingFullName = normalizeText(`${alumno.nombre} ${alumno.apellidos}`);
  if (existingFullName && existingFullName !== normalizeText(fullName)) {
    summary.name_mismatches.push({
      dni: normalizedDni,
      existing: existingFullName,
      incoming: normalizeText(fullName),
    });
  }

  const updatePayload = {};
  if (normalizedPhone && (!alumno.telefono || alumno.telefono === "")) updatePayload.telefono = normalizedPhone;
  if (numeroContrato && !alumno.numero_contrato) updatePayload.numero_contrato = numeroContrato;

  if (Object.keys(updatePayload).length > 0) {
    const updateRes = await supabaseAdmin
      .from("alumnos")
      .update(updatePayload)
      .eq("id", alumno.id)
      .select("id, user_id, dni, nombre, apellidos, telefono, email, direccion, tipo_permiso, numero_contrato")
      .single();

    if (updateRes.error || !updateRes.data) {
      throw new Error(`No se pudo actualizar el alumno ${fullName}: ${updateRes.error?.message || "sin detalle"}`);
    }

    alumno = updateRes.data;
    alumnosByDni.set(normalizedDni, alumno);
    addAlumnoToNameMap(alumnosByName, alumno);
  }

  return alumno;
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  const zipPath = process.argv[2] || DEFAULT_ZIP_PATH;
  const hoursOnly = process.argv.includes("--hours-only");
  if (!fs.existsSync(zipPath)) {
    throw new Error(`No existe el ZIP: ${zipPath}`);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const payload = readZipPayload(zipPath);
  const contractRows = hoursOnly ? [] : Array.isArray(payload.contracts) ? payload.contracts : [];
  const horasRows = Array.isArray(payload.horas) ? payload.horas : [];
  const diariosRows = hoursOnly ? [] : Array.isArray(payload.diarios) ? payload.diarios : [];

  if (contractRows.length === 0 && horasRows.length === 0 && diariosRows.length === 0) {
    throw new Error("El ZIP no contiene filas válidas para importar.");
  }

  const deleteIngresosQuery = supabaseAdmin
    .from("ingresos")
    .delete()
    .eq("escuela_id", ESCUELA_ID);

  const deleteIngresosRes = await (hoursOnly
    ? deleteIngresosQuery.like("notas", `${SOURCE_PREFIX}|horas|%`)
    : deleteIngresosQuery.like("notas", `${SOURCE_PREFIX}|%`));
  if (deleteIngresosRes.error) {
    throw new Error(`No se pudieron limpiar ingresos importados previos: ${deleteIngresosRes.error.message}`);
  }

  if (!hoursOnly) {
    const deleteGastosRes = await supabaseAdmin
      .from("gastos")
      .delete()
      .eq("escuela_id", ESCUELA_ID)
      .like("notas", `${SOURCE_PREFIX}|%`);
    if (deleteGastosRes.error) {
      throw new Error(`No se pudieron limpiar gastos importados previos: ${deleteGastosRes.error.message}`);
    }

    const deleteMatriculasRes = await supabaseAdmin
      .from("matriculas_alumno")
      .delete()
      .eq("escuela_id", ESCUELA_ID)
      .like("notas", `${SOURCE_PREFIX}|%`);
    if (deleteMatriculasRes.error) {
      throw new Error(`No se pudieron limpiar matrículas importadas previas: ${deleteMatriculasRes.error.message}`);
    }

    const deleteDiariosRes = await supabaseAdmin
      .from("ingresos_diarios_importados")
      .delete()
      .eq("escuela_id", ESCUELA_ID)
      .eq("fuente", DAILY_SOURCE_TAG);
    if (deleteDiariosRes.error) {
      throw new Error(`No se pudieron limpiar ingresos diarios importados previos: ${deleteDiariosRes.error.message}`);
    }
  }

  const [authUsers, perfilesRes, alumnosRes, matriculasRes] = await Promise.all([
    listAllUsers(supabaseAdmin),
    supabaseAdmin.from("perfiles").select("id, email, escuela_id, rol, cedula"),
    supabaseAdmin
      .from("alumnos")
      .select("id, user_id, dni, nombre, apellidos, telefono, email, direccion, tipo_permiso, numero_contrato")
      .eq("escuela_id", ESCUELA_ID),
    supabaseAdmin
      .from("matriculas_alumno")
      .select("id, escuela_id, alumno_id, numero_contrato")
      .eq("escuela_id", ESCUELA_ID),
  ]);

  if (perfilesRes.error) throw perfilesRes.error;
  if (alumnosRes.error) throw alumnosRes.error;
  if (matriculasRes.error) throw matriculasRes.error;

  const usersByEmail = new Map(
    authUsers
      .filter((user) => user.email)
      .map((user) => [String(user.email).toLowerCase(), user])
  );
  const perfilesById = new Map((perfilesRes.data ?? []).map((perfil) => [perfil.id, perfil]));
  const alumnosByDni = new Map((alumnosRes.data ?? []).filter((alumno) => alumno.dni).map((alumno) => [alumno.dni, alumno]));
  const alumnosByName = new Map();
  for (const alumno of alumnosRes.data ?? []) {
    addAlumnoToNameMap(alumnosByName, alumno);
  }
  const matriculasByContrato = new Map(
    (matriculasRes.data ?? [])
      .filter((matricula) => matricula.numero_contrato)
      .map((matricula) => [`${matricula.escuela_id}:${matricula.numero_contrato}`, matricula])
  );

  const summary = {
    source_rows: {
      contracts: contractRows.length,
      horas: horasRows.length,
      diarios: diariosRows.length,
    },
    auth_created: 0,
    auth_reused: 0,
    alumnos_created: 0,
    alumnos_reused: 0,
    matriculas_created: 0,
    ingresos_created: 0,
    gastos_created: 0,
    ingresos_diarios_created: 0,
    hours_without_alumno: 0,
    name_mismatches: [],
    contract_discrepancies: [],
  };

  const ingresosPayload = [];
  const gastosPayload = [];
  const contractOccurrences = new Map();

  for (const row of contractRows) {
    const fullName = normalizeText(row.alumno);
    const dni = normalizeStringOrNumber(row.cedula);
    const fecha = normalizeDateValue(row.fecha, { sheet: row.sheet });
    const categoria = normalizeCategoriaValue(row.categoria);
    const originalContract = normalizeStringOrNumber(row.contrato);
    const baseNumeroContrato = makeHistoricalContract(row.source_type, originalContract);
    const numeroFactura = buildFacturaLabel(row);
    const valorTotal = row.valor_total === null ? null : Number(row.valor_total);
    const tramitadorNombre = normalizeText(row.tramitador);
    const tramitadorOk = tramitadorNombre && tramitadorNombre.toUpperCase() !== "N/A" ? tramitadorNombre : null;
    const tramitadorValor = Number(row.precio_tramitador || 0);
    const saldo = Number(row.saldo || 0);
    const abonos = Array.isArray(row.abonos) ? row.abonos : [];
    const totalAbonos = abonos.reduce((sum, item) => sum + Number(item.monto || 0), 0);
    const categorias = categoria ? [categoria] : [];

    if (!fullName || !dni || !fecha || !categoria || !originalContract || !baseNumeroContrato) {
      throw new Error(`Fila inválida en ${row.file_name}/${row.sheet}/${row.source_row}`);
    }

    const occurrence = (contractOccurrences.get(baseNumeroContrato) || 0) + 1;
    contractOccurrences.set(baseNumeroContrato, occurrence);
    const numeroContrato = occurrence === 1 ? baseNumeroContrato : `${baseNumeroContrato}-${String(occurrence).padStart(2, "0")}`;

    if (Math.abs((valorTotal || 0) - totalAbonos - saldo) > 1) {
      summary.contract_discrepancies.push({
        alumno: fullName,
        dni,
        source: row.source_type,
        original_contract: originalContract,
        valor_total: valorTotal,
        total_abonos: totalAbonos,
        saldo,
      });
    }

    const alumno = await ensureAlumno({
      supabaseAdmin,
      usersByEmail,
      perfilesById,
      alumnosByDni,
      alumnosByName,
      fullName,
      dni,
      telefono: null,
      categorias,
      fecha,
      numeroContrato,
      valorTotal,
      tramitadorNombre: tramitadorOk,
      tramitadorValor,
      notes: `${SOURCE_PREFIX}|${row.source_type}|contrato_original_${originalContract}`,
      summary,
    });

    const contractKey = `${ESCUELA_ID}:${numeroContrato}`;
    if (matriculasByContrato.has(contractKey)) {
      throw new Error(`La matrícula histórica ${numeroContrato} ya existía después de la limpieza previa.`);
    }

    const insertMatriculaRes = await supabaseAdmin
      .from("matriculas_alumno")
      .insert({
        escuela_id: ESCUELA_ID,
        sede_id: SEDE_ID,
        alumno_id: alumno.id,
        created_by: ACTOR_USER_ID,
        numero_contrato: numeroContrato,
        categorias,
        valor_total: valorTotal,
        fecha_inscripcion: fecha,
        estado: "activo",
        notas: `${SOURCE_PREFIX}|${row.source_type}|contrato_original_${originalContract}|hoja_${row.sheet}|fila_${row.source_row}`,
        tiene_tramitador: Boolean(tramitadorOk),
        tramitador_nombre: tramitadorOk,
        tramitador_valor: tramitadorValor || null,
      })
      .select("id, escuela_id, alumno_id, numero_contrato")
      .single();

    if (insertMatriculaRes.error || !insertMatriculaRes.data) {
      throw new Error(`No se pudo crear la matrícula ${numeroContrato}: ${insertMatriculaRes.error?.message || "sin detalle"}`);
    }

    const matricula = insertMatriculaRes.data;
    matriculasByContrato.set(contractKey, matricula);
    summary.matriculas_created += 1;

    for (const abono of abonos.filter((item) => Number(item.monto || 0) > 0)) {
      ingresosPayload.push({
        escuela_id: ESCUELA_ID,
        sede_id: SEDE_ID,
        user_id: ACTOR_USER_ID,
        alumno_id: alumno.id,
        matricula_id: matricula.id,
        categoria: "matricula",
        concepto: abono.indice === 1 ? `Matrícula — ${fullName}` : `Abono ${abono.indice} — ${fullName}`,
        monto: Number(abono.monto),
        metodo_pago: "otro",
        medio_especifico: "Importado desde ZIP 2023; método de pago no especificado en el archivo de contratos",
        numero_factura: numeroFactura,
        fecha,
        estado: "cobrado",
        notas: `${SOURCE_PREFIX}|${row.source_type}|${numeroContrato}|contrato_original_${originalContract}|fila_${row.source_row}|abono_${abono.indice}`,
      });
    }

    if (tramitadorOk && tramitadorValor > 0) {
      gastosPayload.push({
        escuela_id: ESCUELA_ID,
        sede_id: SEDE_ID,
        user_id: ACTOR_USER_ID,
        categoria: "tramitador",
        concepto: `Tramitador — ${fullName}`,
        monto: tramitadorValor,
        metodo_pago: "transferencia",
        proveedor: tramitadorOk,
        numero_factura: null,
        fecha,
        recurrente: false,
        notas: `${SOURCE_PREFIX}|${row.source_type}|${numeroContrato}|contrato_original_${originalContract}|fila_${row.source_row}|tramitador`,
      });
    }
  }

  for (const row of horasRows) {
    const fullName = normalizeText(row.alumno);
    const dni = normalizeStringOrNumber(row.cedula);
    const fecha = resolveHorasFecha(row.fecha, row.sheet);
    const telefono = normalizeStringOrNumber(row.celular);
    const horas = row.horas === null ? null : Number(row.horas);
    const valorHora = row.valor_hora === null ? null : Number(row.valor_hora);
    const abonos = Array.isArray(row.abonos) ? row.abonos : [];
    const valorTotal = row.valor_total === null ? null : Number(row.valor_total);

    if (!fullName || !fecha) {
      throw new Error(`Fila inválida en horas adicionales ${row.sheet}/${row.source_row}`);
    }

    const alumno = await ensureAlumno({
      supabaseAdmin,
      usersByEmail,
      perfilesById,
      alumnosByDni,
      alumnosByName,
      fullName,
      dni,
      telefono,
      categorias: [],
      fecha,
      numeroContrato: null,
      valorTotal,
      tramitadorNombre: null,
      tramitadorValor: null,
      notes: `${SOURCE_PREFIX}|horas|fila_${row.source_row}`,
      summary,
    });

    if (!alumno) {
      summary.hours_without_alumno += 1;
    }

    for (const abono of abonos.filter((item) => Number(item.monto || 0) > 0)) {
      ingresosPayload.push({
        escuela_id: ESCUELA_ID,
        sede_id: SEDE_ID,
        user_id: ACTOR_USER_ID,
        alumno_id: alumno?.id || null,
        matricula_id: null,
        categoria: "clase_suelta",
        concepto: `Horas adicionales${horas ? ` (${horas} h)` : ""} — ${fullName}`,
        monto: Number(abono.monto),
        metodo_pago: "otro",
        medio_especifico: valorHora
          ? `Importado desde ZIP 2023; valor hora reportado: ${valorHora.toLocaleString("es-CO")}`
          : "Importado desde ZIP 2023; método de pago no especificado",
        numero_factura: null,
        fecha,
        estado: "cobrado",
        notas: `${SOURCE_PREFIX}|horas|${normalizeStringOrNumber(dni) || nameKey(fullName)}|fila_${row.source_row}|abono_${abono.indice}|hoja_${row.sheet}`,
      });
    }
  }

  if (ingresosPayload.length > 0) {
    for (const part of chunk(ingresosPayload, 200)) {
      const insertIngresosRes = await supabaseAdmin.from("ingresos").insert(part);
      if (insertIngresosRes.error) {
        throw new Error(`No se pudieron crear ingresos importados: ${insertIngresosRes.error.message}`);
      }
    }
    summary.ingresos_created = ingresosPayload.length;
  }

  if (gastosPayload.length > 0) {
    for (const part of chunk(gastosPayload, 200)) {
      const insertGastosRes = await supabaseAdmin.from("gastos").insert(part);
      if (insertGastosRes.error) {
        throw new Error(`No se pudieron crear gastos importados: ${insertGastosRes.error.message}`);
      }
    }
    summary.gastos_created = gastosPayload.length;
  }

  const diariosPayload = diariosRows.map((row) => {
    const fecha = normalizeDateValue(row.fecha, { sheet: row.sheet });
    if (!fecha) {
      throw new Error(`Fila inválida en ingresos diarios ${row.sheet}/${row.source_row}: falta fecha`);
    }

    const detalle = normalizeText(row.detalle);
    const formaPago = normalizeText(row.forma_pago);
    const entrega = normalizeText(row.entrega);
    const recibe = normalizeText(row.recibe);

    return {
      escuela_id: ESCUELA_ID,
      sede_id: SEDE_ID,
      user_id: ACTOR_USER_ID,
      fuente: DAILY_SOURCE_TAG,
      hoja: normalizeText(row.sheet) || "Sin hoja",
      fecha,
      detalle,
      categoria_sugerida: mapDailyCategoria(detalle),
      valor: Number(row.valor || 0),
      forma_pago: formaPago,
      metodo_pago_sugerido: mapDailyMetodoPago(formaPago),
      entrega,
      recibe,
      source_key: `${DAILY_SOURCE_TAG}|${normalizeText(row.sheet) || "sin_hoja"}|fila_${row.source_row}`,
      notas: `${SOURCE_PREFIX}|diarios|forma_${formaPago || "sin_dato"}|detalle_${removeDiacritics(detalle || "").replace(/[^A-Za-z0-9]+/g, "_")}`,
    };
  });

  if (diariosPayload.length > 0) {
    for (const part of chunk(diariosPayload, 300)) {
      const insertDiariosRes = await supabaseAdmin.from("ingresos_diarios_importados").insert(part);
      if (insertDiariosRes.error) {
        throw new Error(`No se pudieron crear ingresos diarios importados: ${insertDiariosRes.error.message}`);
      }
    }
    summary.ingresos_diarios_created = diariosPayload.length;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
