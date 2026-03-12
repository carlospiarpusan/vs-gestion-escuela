const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_XLSX_PATH = "/Users/carlos/Documents/2025/Supertaxis 2025.xlsx";
const ESCUELA_ID = process.env.IMPORT_ESCUELA_ID || "a5320c4a-3bf6-4da5-b365-da17d7001d4f";
const SEDE_ID = process.env.IMPORT_SEDE_ID || "eeb0cfe9-a2b3-4d54-8199-66fca310e9bf";
const ACTOR_USER_ID = process.env.IMPORT_USER_ID || "0840c179-b432-4f1a-afe2-6174e5cf33af";
const EMPRESA_CONVENIO = "Supertaxis";

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

def clean_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None

def clean_number(value):
    if value in (None, ""):
        return None
    if isinstance(value, str):
        text = value.strip().replace(".", "").replace(",", "")
        if not text:
            return None
        return text
    return str(int(value))

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
rows_out = []

for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 4:
        continue

    header_index = None
    for idx, row in enumerate(rows[:6]):
        normalized = [(str(value).strip().lower() if value is not None else "") for value in row]
        joined = " | ".join(normalized)
        if "nombres y apellidos" in normalized and "ingresos" in joined:
            header_index = idx
            break

    if header_index is None:
        continue

    headers = [str(value).strip() if value is not None else "" for value in rows[header_index]]
    normalized_headers = [header.lower() for header in headers]

    def find_index(predicate):
        for idx, header in enumerate(normalized_headers):
            if predicate(header):
                return idx
        return None

    fecha_idx = find_index(lambda header: "fecha" in header)
    nombre_idx = find_index(lambda header: "nombres y apellidos" in header)
    cedula_idx = find_index(lambda header: "cedula" in header or "cédula" in header)
    categoria_idx = find_index(lambda header: "categoria" in header or header == "ct")
    celular_idx = find_index(lambda header: "celular" in header)
    ingreso_idx = find_index(lambda header: "ingresos" in header)

    if nombre_idx is None or fecha_idx is None or categoria_idx is None or ingreso_idx is None:
        continue

    for row_index, row in enumerate(rows[header_index + 1:], start=header_index + 2):
        if not any(value not in (None, "") for value in row):
            continue

        nombre = clean_text(row[nombre_idx] if nombre_idx < len(row) else None)
        fecha = parse_date(row[fecha_idx] if fecha_idx < len(row) else None)
        categoria = clean_text(row[categoria_idx] if categoria_idx < len(row) else None)
        ingreso = row[ingreso_idx] if ingreso_idx < len(row) else None

        if not nombre or not fecha or categoria is None or ingreso in (None, ""):
            continue

        rows_out.append({
            "sheet": ws.title,
            "source_row": row_index,
            "fecha": fecha,
            "nombre_completo": nombre,
            "dni": clean_number(row[cedula_idx] if cedula_idx is not None and cedula_idx < len(row) else None),
            "categoria": categoria.strip(),
            "telefono": clean_number(row[celular_idx] if celular_idx is not None and celular_idx < len(row) else None),
            "ingreso": float(ingreso),
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
    throw new Error("No se pudo leer el contenido del workbook de Supertaxis.");
  }
  return rows;
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferYearFromPath(filePath) {
  const match = String(filePath).match(/20\d{2}/);
  if (!match) {
    throw new Error(`No se pudo inferir el año desde el archivo: ${filePath}`);
  }
  return match[0];
}

function splitFullName(fullName) {
  const normalized = normalizeText(fullName);
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length <= 1) {
    return { nombre: normalized, apellidos: "Sin apellido" };
  }
  if (parts.length === 2) {
    return { nombre: parts[0], apellidos: parts[1] };
  }
  const splitAt = Math.ceil(parts.length / 2);
  return {
    nombre: parts.slice(0, splitAt).join(" "),
    apellidos: parts.slice(splitAt).join(" "),
  };
}

function mapCategoriaToTipoPermiso(categoria) {
  const value = String(categoria || "").toUpperCase();
  if (value.startsWith("AM")) return "AM";
  if (value.startsWith("A1")) return "A1";
  if (value.startsWith("A2")) return "A2";
  if (value.startsWith("A")) return "A";
  if (value.startsWith("C")) return "C";
  if (value.startsWith("D")) return "D";
  return "B";
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
  const sourcePrefix = `IMPORT_SUPERTAXIS_${importYear}`;
  const contractPrefix = `STX-${importYear}-`;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = readWorkbookRows(workbookPath);
  if (rows.length === 0) {
    throw new Error("El workbook no contiene filas válidas para importar.");
  }

  const deleteIngresosRes = await withRetry("limpiar ingresos de aptitud", () =>
    supabaseAdmin
      .from("ingresos")
      .delete()
      .eq("escuela_id", ESCUELA_ID)
      .eq("categoria", "examen_aptitud")
      .like("numero_factura", `${contractPrefix}%`)
  );
  if (deleteIngresosRes.error) {
    throw new Error(`No se pudieron limpiar ingresos importados previos: ${deleteIngresosRes.error.message}`);
  }

  const deleteAlumnosRes = await withRetry("limpiar alumnos de aptitud", () =>
    supabaseAdmin
      .from("alumnos")
      .delete()
      .eq("escuela_id", ESCUELA_ID)
      .eq("tipo_registro", "aptitud_conductor")
      .eq("empresa_convenio", EMPRESA_CONVENIO)
      .like("numero_contrato", `${contractPrefix}%`)
  );
  if (deleteAlumnosRes.error) {
    throw new Error(`No se pudieron limpiar alumnos importados previos: ${deleteAlumnosRes.error.message}`);
  }

  const alumnosPayload = [];
  const ingresosPayload = [];
  const missingDni = [];
  const duplicateDniRows = new Map();

  rows.forEach((row, index) => {
    const reference = `${contractPrefix}${String(index + 1).padStart(4, "0")}`;
    const fullName = normalizeText(row.nombre_completo);
    const { nombre, apellidos } = splitFullName(fullName);
    const categoria = normalizeText(row.categoria).toUpperCase();
    const dni = normalizeText(row.dni) || `SIN-CEDULA-${String(index + 1).padStart(4, "0")}`;
    const telefono = normalizeText(row.telefono);
    const notas = `${sourcePrefix}|${row.sheet}|fila_${row.source_row}|ref_${reference}`;
    const alumnoId = crypto.randomUUID();

    if (!row.dni) {
      missingDni.push(reference);
    }

    if (row.dni) {
      const current = duplicateDniRows.get(String(row.dni)) || 0;
      duplicateDniRows.set(String(row.dni), current + 1);
    }

    alumnosPayload.push({
      id: alumnoId,
      escuela_id: ESCUELA_ID,
      sede_id: SEDE_ID,
      user_id: ACTOR_USER_ID,
      tipo_registro: "aptitud_conductor",
      numero_contrato: reference,
      nombre,
      apellidos,
      dni,
      email: null,
      telefono: telefono || "",
      fecha_nacimiento: null,
      direccion: null,
      tipo_permiso: mapCategoriaToTipoPermiso(categoria),
      categorias: [categoria],
      estado: "activo",
      fecha_inscripcion: row.fecha,
      notas,
      valor_total: Number(row.ingreso),
      ciudad: null,
      departamento: null,
      empresa_convenio: EMPRESA_CONVENIO,
      nota_examen_teorico: null,
      fecha_examen_teorico: null,
      nota_examen_practico: null,
      fecha_examen_practico: null,
      tiene_tramitador: false,
      tramitador_nombre: null,
      tramitador_valor: null,
    });

    ingresosPayload.push({
      escuela_id: ESCUELA_ID,
      sede_id: SEDE_ID,
      user_id: ACTOR_USER_ID,
      alumno_id: alumnoId,
      matricula_id: null,
      categoria: "examen_aptitud",
      concepto: `Examen de aptitud — ${fullName}`,
      monto: Number(row.ingreso),
      metodo_pago: "otro",
      medio_especifico: `Importado desde ${path.basename(workbookPath)}`,
      numero_factura: reference,
      fecha: row.fecha,
      estado: "cobrado",
      notas,
    });
  });

  for (const part of chunk(alumnosPayload, 200)) {
    const insertRes = await withRetry("crear bloque de alumnos de aptitud", () =>
      supabaseAdmin.from("alumnos").insert(part)
    );
    if (insertRes.error) {
      throw new Error(`No se pudieron crear alumnos de aptitud: ${insertRes.error.message}`);
    }
  }

  for (const part of chunk(ingresosPayload, 200)) {
    const insertRes = await withRetry("crear bloque de ingresos de aptitud", () =>
      supabaseAdmin.from("ingresos").insert(part)
    );
    if (insertRes.error) {
      throw new Error(`No se pudieron crear ingresos de aptitud: ${insertRes.error.message}`);
    }
  }

  const duplicatedDni = Array.from(duplicateDniRows.entries()).filter(([, count]) => count > 1);

  console.log(JSON.stringify({
    source_rows: rows.length,
    alumnos_created: alumnosPayload.length,
    ingresos_created: ingresosPayload.length,
    missing_dni_refs: missingDni,
    duplicate_dni_rows: duplicatedDni,
    source: workbookPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
