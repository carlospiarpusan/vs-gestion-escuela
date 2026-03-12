const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_XLSX_PATH = "/Users/carlos/Documents/2025/Practica adicional 2025.xlsx";
const ESCUELA_ID = process.env.IMPORT_ESCUELA_ID || "a5320c4a-3bf6-4da5-b365-da17d7001d4f";
const SEDE_ID = process.env.IMPORT_SEDE_ID || "eeb0cfe9-a2b3-4d54-8199-66fca310e9bf";
const ACTOR_USER_ID = process.env.IMPORT_USER_ID || "0840c179-b432-4f1a-afe2-6174e5cf33af";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("520") ||
    message.includes("522") ||
    message.includes("524") ||
    message.includes("bad gateway") ||
    message.includes("gateway") ||
    message.includes("unknown error") ||
    message.includes("fetch failed") ||
    message.includes("etimedout") ||
    message.includes("econnreset")
  );
}

async function withRetry(label, fn, attempts = 8) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await fn();
      if (result?.error && shouldRetry(result.error)) {
        throw result.error;
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) {
        throw error;
      }
      await sleep(1000 * attempt);
      console.warn(`Reintentando ${label} (${attempt + 1}/${attempts})...`);
    }
  }
  throw lastError;
}

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

function readWorkbookRows(workbookPath) {
  const pyScript = `
import json
import sys
from datetime import datetime, date

import openpyxl

def parse_date(value):
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d"):
            try:
                return datetime.strptime(text, fmt).date().isoformat()
            except ValueError:
                pass
    return None

def as_number(value):
    if value in (None, ""):
        return 0
    if isinstance(value, str):
        text = value.strip().replace(".", "").replace(",", "")
        if not text:
            return 0
        return float(text)
    return float(value)

def clean_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
rows_out = []

for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 5:
        continue

    header_index = None
    for idx, row in enumerate(rows[:8]):
        normalized = [(str(value).strip().lower() if value is not None else "") for value in row]
        joined = " | ".join(normalized)
        if "fecha" in joined and "alumno" in joined and "valor total" in joined:
            header_index = idx
            break

    if header_index is None:
        continue

    headers = [str(value).strip() if value is not None else "" for value in rows[header_index]]
    normalized_headers = [header.lower() for header in headers]

    def find_index(*fragments):
        for index, header in enumerate(normalized_headers):
            if any(fragment in header for fragment in fragments):
                return index
        return None

    fecha_idx = find_index("fecha")
    alumno_idx = find_index("alumno")
    cedula_idx = find_index("cedula", "cédula")
    celular_idx = find_index("celular")
    horas_idx = find_index("n. horas", "n horas")
    valor_hora_idx = find_index("valor hora")
    valor_total_idx = find_index("valor total")
    abono_1_idx = find_index("abono 1")
    abono_2_idx = find_index("abono 2")
    saldo_idx = find_index("saldo pendiente")

    if alumno_idx is None or fecha_idx is None or valor_total_idx is None:
        continue

    for row_index, row in enumerate(rows[header_index + 1:], start=header_index + 2):
        if not any(value not in (None, "") for value in row):
            continue

        alumno = clean_text(row[alumno_idx] if alumno_idx < len(row) else None)
        fecha = parse_date(row[fecha_idx] if fecha_idx < len(row) else None)
        if not alumno or not fecha:
            continue

        rows_out.append({
            "sheet": ws.title,
            "source_row": row_index,
            "fecha": fecha,
            "alumno": alumno,
            "cedula": clean_text(row[cedula_idx] if cedula_idx is not None and cedula_idx < len(row) else None),
            "celular": clean_text(row[celular_idx] if celular_idx is not None and celular_idx < len(row) else None),
            "horas": as_number(row[horas_idx] if horas_idx is not None and horas_idx < len(row) else None),
            "valor_hora": as_number(row[valor_hora_idx] if valor_hora_idx is not None and valor_hora_idx < len(row) else None),
            "valor_total": as_number(row[valor_total_idx] if valor_total_idx is not None and valor_total_idx < len(row) else None),
            "abono_1": as_number(row[abono_1_idx] if abono_1_idx is not None and abono_1_idx < len(row) else None),
            "abono_2": as_number(row[abono_2_idx] if abono_2_idx is not None and abono_2_idx < len(row) else None),
            "saldo_pendiente": as_number(row[saldo_idx] if saldo_idx is not None and saldo_idx < len(row) else None),
        })

print(json.dumps(rows_out, ensure_ascii=False))
`;

  const stdout = execFileSync("python3", ["-c", pyScript, workbookPath], {
    cwd: __dirname,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  const rows = JSON.parse(stdout);
  if (!Array.isArray(rows)) {
    throw new Error("No se pudo leer el workbook de práctica adicional.");
  }
  return rows;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D+/g, "").trim();
}

function normalizeDni(value) {
  return String(value || "").replace(/\D+/g, "").trim();
}

function splitFullName(fullName) {
  const tokens = normalizeText(fullName).split(" ").filter(Boolean);
  if (tokens.length === 0) return { nombre: "Alumno", apellidos: "Sin apellido" };
  if (tokens.length === 1) return { nombre: tokens[0], apellidos: "Sin apellido" };
  if (tokens.length === 2) return { nombre: tokens[0], apellidos: tokens[1] };
  return {
    nombre: tokens.slice(0, 2).join(" "),
    apellidos: tokens.slice(2).join(" "),
  };
}

function inferYearFromPath(filePath) {
  const match = String(filePath).match(/20\d{2}/);
  if (!match) {
    throw new Error(`No se pudo inferir el año desde el archivo: ${filePath}`);
  }
  return match[0];
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function addToMap(map, key, value) {
  if (!key) return;
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("es-CO");
}

function buildMedioEspecifico(row, workbookPath) {
  const parts = [`Importado desde ${path.basename(workbookPath)}`];
  if (row.horas > 0) parts.push(`${Number(row.horas)} h`);
  if (row.valor_hora > 0) parts.push(`valor hora $${formatMoney(row.valor_hora)}`);
  const phone = normalizePhone(row.celular);
  if (phone) parts.push(`celular ${phone}`);
  return parts.join(" · ");
}

function buildConcepto(row) {
  const horasLabel = row.horas > 0 ? ` (${Number(row.horas)} h)` : "";
  return `Práctica adicional${horasLabel} — ${normalizeText(row.alumno)}`;
}

function buildPracticeMatchKey(row) {
  const dni = normalizeDni(row.cedula);
  const phone = normalizePhone(row.celular);
  const name = normalizeKey(row.alumno);
  if (dni) return `dni:${dni}`;
  if (phone) return `phone:${phone}`;
  return `name:${name}`;
}

function resolveExistingAlumno(row, alumnosByDni, alumnosByPhone, alumnosByName) {
  const dni = normalizeDni(row.cedula);
  const phone = normalizePhone(row.celular);
  const name = normalizeKey(row.alumno);

  if (dni) {
    const matches = alumnosByDni.get(dni) ?? [];
    if (matches.length === 1) return { alumno: matches[0], matchedBy: "dni" };
    if (matches.length > 1) {
      const byName = matches.filter((candidate) => normalizeKey(`${candidate.nombre} ${candidate.apellidos}`) === name);
      if (byName.length === 1) return { alumno: byName[0], matchedBy: "dni+nombre" };
    }
  }

  if (phone) {
    const matches = alumnosByPhone.get(phone) ?? [];
    if (matches.length === 1) return { alumno: matches[0], matchedBy: "telefono" };
    if (matches.length > 1) {
      const byName = matches.filter((candidate) => normalizeKey(`${candidate.nombre} ${candidate.apellidos}`) === name);
      if (byName.length === 1) return { alumno: byName[0], matchedBy: "telefono+nombre" };
    }
  }

  const byName = alumnosByName.get(name) ?? [];
  if (byName.length === 1) return { alumno: byName[0], matchedBy: "nombre" };

  return { alumno: null, matchedBy: null };
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  const workbookPath = process.argv[2] || DEFAULT_XLSX_PATH;
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`No existe el archivo: ${workbookPath}`);
  }

  const importYear = inferYearFromPath(workbookPath);
  const sourcePrefix = `IMPORT_PRACTICA_ADICIONAL_${importYear}`;
  const recordPrefix = `PRA-${importYear}-`;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = readWorkbookRows(workbookPath);
  if (rows.length === 0) {
    throw new Error("El workbook no contiene filas válidas para importar.");
  }

  const deleteIngresosRes = await withRetry("limpiar ingresos de práctica", () =>
    supabaseAdmin
      .from("ingresos")
      .delete()
      .eq("escuela_id", ESCUELA_ID)
      .like("notas", `${sourcePrefix}|%`)
  );
  if (deleteIngresosRes.error) {
    throw new Error(`No se pudieron limpiar ingresos importados previos: ${deleteIngresosRes.error.message}`);
  }

  const deleteAlumnosRes = await withRetry("limpiar alumnos de práctica", () =>
    supabaseAdmin
      .from("alumnos")
      .delete()
      .eq("escuela_id", ESCUELA_ID)
      .eq("tipo_registro", "practica_adicional")
      .like("numero_contrato", `${recordPrefix}%`)
  );
  if (deleteAlumnosRes.error) {
    throw new Error(`No se pudieron limpiar registros de práctica previos: ${deleteAlumnosRes.error.message}`);
  }

  const alumnosRes = await withRetry("leer alumnos para práctica adicional", () =>
    supabaseAdmin
      .from("alumnos")
      .select("id, nombre, apellidos, telefono, dni, tipo_registro")
      .eq("escuela_id", ESCUELA_ID)
  );
  if (alumnosRes.error) {
    throw new Error(`No se pudieron leer alumnos: ${alumnosRes.error.message}`);
  }

  const alumnos = (alumnosRes.data ?? []).filter((alumno) => alumno.tipo_registro === "regular");
  const alumnosByDni = new Map();
  const alumnosByPhone = new Map();
  const alumnosByName = new Map();

  for (const alumno of alumnos) {
    addToMap(alumnosByDni, normalizeDni(alumno.dni), alumno);
    addToMap(alumnosByPhone, normalizePhone(alumno.telefono), alumno);
    addToMap(alumnosByName, normalizeKey(`${alumno.nombre} ${alumno.apellidos}`), alumno);
  }

  const practiceParticipants = new Map();
  const rowAssignments = [];
  const summary = {
    source_rows: rows.length,
    linked_existing_by_dni: 0,
    linked_existing_by_dni_and_name: 0,
    linked_existing_by_phone: 0,
    linked_existing_by_phone_and_name: 0,
    linked_existing_by_name: 0,
    practica_alumnos_created: 0,
    cobrado_rows: 0,
    pendiente_rows: 0,
    total_cobrado: 0,
    total_pendiente: 0,
    negative_balance_rows: [],
  };

  rows.forEach((row, index) => {
    const existing = resolveExistingAlumno(row, alumnosByDni, alumnosByPhone, alumnosByName);
    if (existing.matchedBy === "dni") summary.linked_existing_by_dni += 1;
    else if (existing.matchedBy === "dni+nombre") summary.linked_existing_by_dni_and_name += 1;
    else if (existing.matchedBy === "telefono") summary.linked_existing_by_phone += 1;
    else if (existing.matchedBy === "telefono+nombre") summary.linked_existing_by_phone_and_name += 1;
    else if (existing.matchedBy === "nombre") summary.linked_existing_by_name += 1;

    let alumnoId = existing.alumno?.id || null;

    if (!alumnoId) {
      const participantKey = buildPracticeMatchKey(row);
      let participant = practiceParticipants.get(participantKey);

      if (!participant) {
        const participantIndex = practiceParticipants.size + 1;
        const reference = `${recordPrefix}${String(participantIndex).padStart(4, "0")}`;
        const fullName = normalizeText(row.alumno);
        const { nombre, apellidos } = splitFullName(fullName);
        participant = {
          id: crypto.randomUUID(),
          reference,
          nombre,
          apellidos,
          dni: normalizeDni(row.cedula) || `PRA-${importYear}-SIN-CEDULA-${String(participantIndex).padStart(4, "0")}`,
          telefono: normalizePhone(row.celular) || "",
          fecha_inscripcion: row.fecha,
          valor_total: 0,
          notas: `${sourcePrefix}|registro_${reference}`,
        };
        practiceParticipants.set(participantKey, participant);
      }

      participant.valor_total += Number(row.valor_total || 0);
      if (!participant.fecha_inscripcion || row.fecha < participant.fecha_inscripcion) {
        participant.fecha_inscripcion = row.fecha;
      }
      alumnoId = participant.id;
    }

    rowAssignments.push({ row, alumnoId, ref: `${recordPrefix}ROW-${String(index + 1).padStart(4, "0")}` });
  });

  const alumnosPayload = Array.from(practiceParticipants.values()).map((participant) => ({
    id: participant.id,
    escuela_id: ESCUELA_ID,
    sede_id: SEDE_ID,
    user_id: ACTOR_USER_ID,
    tipo_registro: "practica_adicional",
    numero_contrato: participant.reference,
    nombre: participant.nombre,
    apellidos: participant.apellidos,
    dni: participant.dni,
    email: null,
    telefono: participant.telefono,
    fecha_nacimiento: null,
    direccion: null,
    tipo_permiso: "B",
    categorias: [],
    estado: "activo",
    fecha_inscripcion: participant.fecha_inscripcion,
    notas: participant.notas,
    valor_total: participant.valor_total || null,
    ciudad: null,
    departamento: null,
    empresa_convenio: "Práctica adicional",
    nota_examen_teorico: null,
    fecha_examen_teorico: null,
    nota_examen_practico: null,
    fecha_examen_practico: null,
    tiene_tramitador: false,
    tramitador_nombre: null,
    tramitador_valor: null,
  }));

  if (alumnosPayload.length > 0) {
    for (const part of chunk(alumnosPayload, 200)) {
      const insertRes = await withRetry("crear bloque de alumnos de práctica", () =>
        supabaseAdmin.from("alumnos").insert(part)
      );
      if (insertRes.error) {
        throw new Error(`No se pudieron crear alumnos de práctica adicional: ${insertRes.error.message}`);
      }
    }
  }
  summary.practica_alumnos_created = alumnosPayload.length;

  const ingresosPayload = [];

  for (const assignment of rowAssignments) {
    const { row, alumnoId, ref } = assignment;
    const basePayload = {
      escuela_id: ESCUELA_ID,
      sede_id: SEDE_ID,
      user_id: ACTOR_USER_ID,
      alumno_id: alumnoId,
      matricula_id: null,
      categoria: "clase_suelta",
      concepto: buildConcepto(row),
      metodo_pago: "otro",
      medio_especifico: buildMedioEspecifico(row, workbookPath),
      numero_factura: ref,
      fecha: row.fecha,
    };

    const abonos = [
      { indice: 1, monto: Number(row.abono_1 || 0) },
      { indice: 2, monto: Number(row.abono_2 || 0) },
    ].filter((item) => item.monto > 0);

    for (const abono of abonos) {
      ingresosPayload.push({
        ...basePayload,
        monto: abono.monto,
        estado: "cobrado",
        notas: `${sourcePrefix}|${row.sheet}|fila_${row.source_row}|${ref}|abono_${abono.indice}`,
      });
      summary.cobrado_rows += 1;
      summary.total_cobrado += abono.monto;
    }

    const saldo = Number(row.saldo_pendiente || 0);
    if (saldo > 0) {
      ingresosPayload.push({
        ...basePayload,
        monto: saldo,
        estado: "pendiente",
        notas: `${sourcePrefix}|${row.sheet}|fila_${row.source_row}|${ref}|saldo_pendiente`,
      });
      summary.pendiente_rows += 1;
      summary.total_pendiente += saldo;
    } else if (saldo < 0) {
      summary.negative_balance_rows.push({
        ref,
        alumno: normalizeText(row.alumno),
        saldo,
        hoja: row.sheet,
        fila: row.source_row,
      });
    }
  }

  for (const part of chunk(ingresosPayload, 200)) {
    const insertRes = await withRetry("crear bloque de ingresos de práctica", () =>
      supabaseAdmin.from("ingresos").insert(part)
    );
    if (insertRes.error) {
      throw new Error(`No se pudieron crear ingresos de práctica adicional: ${insertRes.error.message}`);
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
