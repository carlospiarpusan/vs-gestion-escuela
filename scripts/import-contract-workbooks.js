const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

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

function isDuplicateContractError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("matriculas_alumno_contrato_unique") ||
    (message.includes("duplicate key value") && message.includes("numero_contrato"))
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

function inferWorkbookMeta(filePath) {
  const base = path.basename(filePath).toLowerCase();
  const yearMatch = base.match(/20\d{2}/);
  if (!yearMatch) {
    throw new Error(`No se pudo inferir el año desde ${filePath}`);
  }

  let sourceType = null;
  if (base.includes("combo")) sourceType = "combos";
  else if (base.includes("moto")) sourceType = "moto";
  else if (base.includes("carro")) sourceType = "carro";

  if (!sourceType) {
    throw new Error(`No se pudo inferir el tipo de contrato desde ${filePath}`);
  }

  return {
    year: yearMatch[0],
    sourceType,
    filePath,
    fileName: path.basename(filePath),
  };
}

function readContractWorkbook(meta) {
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

def as_number(value):
    if value in (None, ""):
        return None
    if isinstance(value, str):
        text = value.strip().replace(".", "").replace(",", "")
        if not text:
            return None
        try:
            return float(text)
        except ValueError:
            return None
    return float(value)

def as_label(value):
    if value in (None, ""):
        return None
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()

workbook_path = sys.argv[1]
source_type = sys.argv[2]
wb = openpyxl.load_workbook(workbook_path, data_only=True)
rows_out = []

for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 4:
        continue

    header_index = None
    for idx, row in enumerate(rows[:6]):
        normalized = [(str(value).strip().lower() if value is not None else "") for value in row]
        joined = " | ".join(normalized)
        if "fecha" in joined and "valor total" in joined and "abono 1" in joined:
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
    categoria_idx = find_index("cat.")
    if categoria_idx is None:
        categoria_idx = find_index("cat")
    alumno_idx = find_index("alumno(a)", "alumno")
    contrato_idx = find_index("contrato")
    cedula_idx = find_index("cedula", "cédula")
    valor_total_idx = find_index("valor total")
    tramitador_idx = find_index("tramitador")
    precio_tramitador_idx = find_index("p. tramitador", "precio tramitador")
    saldo_idx = find_index("saldo")
    abono_indexes = [find_index(f"abono {index}") for index in range(1, 6)]

    if None in (fecha_idx, categoria_idx, alumno_idx, contrato_idx, cedula_idx, valor_total_idx):
        continue

    factura_indexes = [
        index for index, header in enumerate(normalized_headers)
        if ("fact" in header or "fac" in header) and "contrato" not in header
    ]

    for row_index, row in enumerate(rows[header_index + 1:], start=header_index + 2):
        if not any(value not in (None, "") for value in row):
            continue

        fecha = parse_date(row[fecha_idx] if fecha_idx < len(row) else None)
        categoria = clean_text(row[categoria_idx] if categoria_idx < len(row) else None)
        alumno = clean_text(row[alumno_idx] if alumno_idx < len(row) else None)
        contrato = as_label(row[contrato_idx] if contrato_idx < len(row) else None)
        cedula = as_label(row[cedula_idx] if cedula_idx < len(row) else None)
        valor_total = as_number(row[valor_total_idx] if valor_total_idx < len(row) else None)

        if not fecha or not categoria or not alumno or not contrato or not cedula or valor_total is None:
            continue

        abonos = []
        for index, abono_idx in enumerate(abono_indexes, start=1):
            if abono_idx is None or abono_idx >= len(row):
                continue
            monto = as_number(row[abono_idx])
            if monto in (None, 0):
                continue
            abonos.append({"indice": index, "monto": monto})

        facturas = {}
        for factura_idx in factura_indexes:
            if factura_idx >= len(row):
                continue
            label = headers[factura_idx] or f"Factura {factura_idx + 1}"
            value = as_label(row[factura_idx])
            if value:
                facturas[label] = value

        tramitador_raw = row[tramitador_idx] if tramitador_idx is not None and tramitador_idx < len(row) else None
        precio_tramitador_raw = row[precio_tramitador_idx] if precio_tramitador_idx is not None and precio_tramitador_idx < len(row) else None

        # Algunos archivos históricos traen el nombre del tramitador corrido a la columna
        # de valor y el monto del tramitador en la columna anterior.
        if isinstance(precio_tramitador_raw, str) and as_number(precio_tramitador_raw) is None:
            if as_number(tramitador_raw) is not None:
                tramitador = clean_text(precio_tramitador_raw)
                precio_tramitador = as_number(tramitador_raw)
            else:
                tramitador = clean_text(tramitador_raw)
                precio_tramitador = None
        else:
            tramitador = clean_text(tramitador_raw)
            precio_tramitador = as_number(precio_tramitador_raw)

        rows_out.append({
            "file_name": workbook_path.split("/")[-1],
            "sheet": ws.title,
            "source_row": row_index,
            "source_type": source_type,
            "fecha": fecha,
            "categoria": categoria,
            "alumno": alumno,
            "contrato": contrato,
            "cedula": cedula,
            "valor_total": valor_total,
            "tramitador": tramitador,
            "precio_tramitador": precio_tramitador,
            "abonos": abonos,
            "saldo": as_number(row[saldo_idx] if saldo_idx is not None and saldo_idx < len(row) else None),
            "facturas": facturas,
        })

print(json.dumps(rows_out, ensure_ascii=False))
`;

  const raw = execFileSync("python3", ["-c", pyScript, meta.filePath, meta.sourceType], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) {
    throw new Error(`No se pudo leer ${meta.fileName}`);
  }
  return rows.map((row) => ({ ...row, year: meta.year }));
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

function makeHistoricalContract(year, sourceType, originalContract) {
  const prefixBySource = {
    carro: `${year}-CAR`,
    moto: `${year}-MOT`,
    combos: `${year}-COM`,
  };
  const normalized = normalizeStringOrNumber(originalContract);
  if (!normalized) return null;
  return `${prefixBySource[sourceType] || `${year}-LEG`}-${normalized}`;
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

function addAlumnoToNameMap(map, alumno) {
  const key = nameKey(`${alumno.nombre || ""} ${alumno.apellidos || ""}`);
  if (!key) return;
  const existing = map.get(key) ?? [];
  if (!existing.some((item) => item.id === alumno.id)) {
    existing.push(alumno);
  }
  map.set(key, existing);
}

async function ensureAlumno({
  supabaseAdmin,
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

  let alumno = alumnosByDni.get(normalizedDni);
  if (!alumno) {
    const { nombre, apellidos } = splitFullName(fullName);
    const insertRes = await withRetry(`crear alumno ${normalizedDni}`, () =>
      supabaseAdmin
        .from("alumnos")
        .insert({
          user_id: ACTOR_USER_ID,
          escuela_id: ESCUELA_ID,
          sede_id: SEDE_ID,
          tipo_registro: "regular",
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
          notas: notes ? `${notes}|sin_login_individual` : "sin_login_individual",
          valor_total: valorTotal ?? null,
          ciudad: null,
          departamento: null,
          empresa_convenio: null,
          nota_examen_teorico: null,
          fecha_examen_teorico: null,
          nota_examen_practico: null,
          fecha_examen_practico: null,
          tiene_tramitador: Boolean(tramitadorNombre),
          tramitador_nombre: tramitadorNombre || null,
          tramitador_valor: tramitadorValor || null,
        })
        .select("id, user_id, dni, nombre, apellidos, telefono, email, direccion, tipo_permiso, numero_contrato")
        .single()
    );

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
    const updateRes = await withRetry(`actualizar alumno ${normalizedDni}`, () =>
      supabaseAdmin
        .from("alumnos")
        .update(updatePayload)
        .eq("id", alumno.id)
        .select("id, user_id, dni, nombre, apellidos, telefono, email, direccion, tipo_permiso, numero_contrato")
        .single()
    );

    if (updateRes.error || !updateRes.data) {
      throw new Error(`No se pudo actualizar el alumno ${fullName}: ${updateRes.error?.message || "sin detalle"}`);
    }

    alumno = updateRes.data;
    alumnosByDni.set(normalizedDni, alumno);
    addAlumnoToNameMap(alumnosByName, alumno);
  }

  return alumno;
}

async function insertMatriculaWithRecovery({
  supabaseAdmin,
  payload,
  selectFields,
}) {
  const insertRes = await withRetry(`crear matrícula ${payload.numero_contrato}`, () =>
    supabaseAdmin
      .from("matriculas_alumno")
      .insert(payload)
      .select(selectFields)
      .single()
  ).catch(async (error) => {
    if (!isDuplicateContractError(error)) {
      throw error;
    }

    const existingRes = await withRetry(`recuperar matrícula ${payload.numero_contrato}`, () =>
      supabaseAdmin
        .from("matriculas_alumno")
        .select(`${selectFields}, notas`)
        .eq("numero_contrato", payload.numero_contrato)
        .maybeSingle()
    );

    if (existingRes.error) {
      throw existingRes.error;
    }

    if (!existingRes.data) {
      throw error;
    }

    if (existingRes.data.notas !== payload.notas) {
      throw error;
    }

    return { data: existingRes.data, error: null };
  });

  if (insertRes.error || !insertRes.data) {
    throw new Error(`No se pudo crear la matrícula ${payload.numero_contrato}: ${insertRes.error?.message || "sin detalle"}`);
  }

  return insertRes.data;
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  const filePaths = process.argv.slice(2);
  if (filePaths.length === 0) {
    throw new Error("Debes enviar uno o más archivos de contratos.");
  }
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`No existe el archivo: ${filePath}`);
    }
  }

  const metas = filePaths.map(inferWorkbookMeta);
  const years = Array.from(new Set(metas.map((meta) => meta.year))).sort();

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const year of years) {
    const sourcePrefix = `IMPORT_CONTRACT_${year}`;
    const deleteGastosRes = await withRetry(`limpiar gastos ${year}`, () =>
      supabaseAdmin
        .from("gastos")
        .delete()
        .eq("escuela_id", ESCUELA_ID)
        .like("notas", `${sourcePrefix}|%`)
    );
    if (deleteGastosRes.error) {
      throw new Error(`No se pudieron limpiar gastos importados previos de ${year}: ${deleteGastosRes.error.message}`);
    }

    const deleteIngresosRes = await withRetry(`limpiar ingresos ${year}`, () =>
      supabaseAdmin
        .from("ingresos")
        .delete()
        .eq("escuela_id", ESCUELA_ID)
        .like("notas", `${sourcePrefix}|%`)
    );
    if (deleteIngresosRes.error) {
      throw new Error(`No se pudieron limpiar ingresos importados previos de ${year}: ${deleteIngresosRes.error.message}`);
    }

    const deleteMatriculasRes = await withRetry(`limpiar matrículas ${year}`, () =>
      supabaseAdmin
        .from("matriculas_alumno")
        .delete()
        .eq("escuela_id", ESCUELA_ID)
        .like("notas", `${sourcePrefix}|%`)
    );
    if (deleteMatriculasRes.error) {
      throw new Error(`No se pudieron limpiar matrículas importadas previas de ${year}: ${deleteMatriculasRes.error.message}`);
    }
  }

  const [alumnosRes, matriculasRes] = await Promise.all([
    withRetry("leer alumnos", () =>
      supabaseAdmin
        .from("alumnos")
        .select("id, user_id, dni, nombre, apellidos, telefono, email, direccion, tipo_permiso, numero_contrato, tipo_registro")
        .eq("escuela_id", ESCUELA_ID)
    ),
    withRetry("leer matrículas", () =>
      supabaseAdmin
        .from("matriculas_alumno")
        .select("id, escuela_id, alumno_id, numero_contrato")
        .eq("escuela_id", ESCUELA_ID)
    ),
  ]);

  if (alumnosRes.error) throw alumnosRes.error;
  if (matriculasRes.error) throw matriculasRes.error;

  const regularAlumnos = (alumnosRes.data ?? []).filter((alumno) => alumno.tipo_registro === "regular");
  const alumnosByDni = new Map(regularAlumnos.filter((alumno) => alumno.dni).map((alumno) => [alumno.dni, alumno]));
  const alumnosByName = new Map();
  for (const alumno of regularAlumnos) {
    addAlumnoToNameMap(alumnosByName, alumno);
  }
  const matriculasByContrato = new Map(
    (matriculasRes.data ?? [])
      .filter((matricula) => matricula.numero_contrato)
      .map((matricula) => [`${matricula.escuela_id}:${matricula.numero_contrato}`, matricula])
  );

  const summary = {
    files: {},
    auth_created: 0,
    auth_reused: 0,
    alumnos_created: 0,
    alumnos_reused: 0,
    matriculas_created: 0,
    ingresos_created: 0,
    gastos_created: 0,
    name_mismatches: [],
    contract_discrepancies: [],
  };

  const contractOccurrences = new Map();
  const ingresosPayload = [];
  const gastosPayload = [];

  for (const meta of metas) {
    const rows = readContractWorkbook(meta);
    summary.files[meta.fileName] = { source_rows: rows.length, matriculas: 0, ingresos: 0 };
    const sourcePrefix = `IMPORT_CONTRACT_${meta.year}`;

    for (const row of rows) {
      const fullName = normalizeText(row.alumno);
      const dni = normalizeStringOrNumber(row.cedula);
      const fecha = normalizeStringOrNumber(row.fecha);
      const categoria = normalizeCategoriaValue(row.categoria);
      const originalContract = normalizeStringOrNumber(row.contrato);
      const baseNumeroContrato = makeHistoricalContract(meta.year, meta.sourceType, originalContract);
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
        throw new Error(`Fila inválida en ${meta.fileName}/${row.sheet}/${row.source_row}`);
      }

      const occurrenceKey = `${meta.year}:${meta.sourceType}:${baseNumeroContrato}`;
      const occurrence = (contractOccurrences.get(occurrenceKey) || 0) + 1;
      contractOccurrences.set(occurrenceKey, occurrence);
      const numeroContrato = occurrence === 1 ? baseNumeroContrato : `${baseNumeroContrato}-${String(occurrence).padStart(2, "0")}`;

      if (Math.abs((valorTotal || 0) - totalAbonos - saldo) > 1) {
        summary.contract_discrepancies.push({
          archivo: meta.fileName,
          alumno: fullName,
          dni,
          source: meta.sourceType,
          original_contract: originalContract,
          valor_total: valorTotal,
          total_abonos: totalAbonos,
          saldo,
        });
      }

      const alumno = await ensureAlumno({
        supabaseAdmin,
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
        notes: `${sourcePrefix}|${meta.sourceType}|contrato_original_${originalContract}`,
        summary,
      });

      const contractKey = `${ESCUELA_ID}:${numeroContrato}`;
      if (matriculasByContrato.has(contractKey)) {
        throw new Error(`La matrícula histórica ${numeroContrato} ya existía después de la limpieza previa.`);
      }

      const matriculaNotas = `${sourcePrefix}|${meta.sourceType}|contrato_original_${originalContract}|hoja_${row.sheet}|fila_${row.source_row}`;
      const matricula = await insertMatriculaWithRecovery({
        supabaseAdmin,
        payload: {
          escuela_id: ESCUELA_ID,
          sede_id: SEDE_ID,
          alumno_id: alumno.id,
          created_by: ACTOR_USER_ID,
          numero_contrato: numeroContrato,
          categorias,
          valor_total: valorTotal,
          fecha_inscripcion: fecha,
          estado: "activo",
          notas: matriculaNotas,
          tiene_tramitador: Boolean(tramitadorOk),
          tramitador_nombre: tramitadorOk,
          tramitador_valor: tramitadorValor || null,
        },
        selectFields: "id, escuela_id, alumno_id, numero_contrato",
      });

      matriculasByContrato.set(contractKey, matricula);
      summary.matriculas_created += 1;
      summary.files[meta.fileName].matriculas += 1;

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
          medio_especifico: `Importado desde ${meta.fileName}; método de pago no especificado en el archivo`,
          numero_factura: numeroFactura,
          fecha,
          estado: "cobrado",
          notas: `${sourcePrefix}|${meta.sourceType}|${numeroContrato}|contrato_original_${originalContract}|fila_${row.source_row}|abono_${abono.indice}`,
        });
        summary.files[meta.fileName].ingresos += 1;
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
          fecha,
          recurrente: false,
          notas: `${sourcePrefix}|${meta.sourceType}|${numeroContrato}|contrato_original_${originalContract}|fila_${row.source_row}|tramitador`,
        });
      }
    }
  }

  if (ingresosPayload.length > 0) {
    for (const part of chunk(ingresosPayload, 200)) {
      const insertIngresosRes = await withRetry("crear bloque de ingresos", () =>
        supabaseAdmin.from("ingresos").insert(part)
      );
      if (insertIngresosRes.error) {
        throw new Error(`No se pudieron crear ingresos importados: ${insertIngresosRes.error.message}`);
      }
    }
    summary.ingresos_created = ingresosPayload.length;
  }

  if (gastosPayload.length > 0) {
    for (const part of chunk(gastosPayload, 200)) {
      const insertGastosRes = await withRetry("crear bloque de gastos", () =>
        supabaseAdmin.from("gastos").insert(part)
      );
      if (insertGastosRes.error) {
        throw new Error(`No se pudieron crear gastos importados: ${insertGastosRes.error.message}`);
      }
    }
    summary.gastos_created = gastosPayload.length;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
