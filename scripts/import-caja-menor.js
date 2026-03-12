const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_XLSX_PATH = "/Users/carlos/Documents/Caja Menor 2025.xlsx";
const ESCUELA_ID = process.env.IMPORT_ESCUELA_ID || "a5320c4a-3bf6-4da5-b365-da17d7001d4f";
const SEDE_ID = process.env.IMPORT_SEDE_ID || "eeb0cfe9-a2b3-4d54-8199-66fca310e9bf";
const ACTOR_USER_ID = process.env.IMPORT_USER_ID || "0840c179-b432-4f1a-afe2-6174e5cf33af";
const SOURCE_PREFIX = "IMPORT_CAJA_MENOR_2025_2026";

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

def clean_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
rows_out = []

for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 4:
        continue

    header_index = None
    for idx, row in enumerate(rows[:8]):
        normalized = [(str(value).strip().lower() if value is not None else "") for value in row]
        if "fecha" in normalized and "concepto" in normalized and "gastos" in normalized:
            header_index = idx
            break

    if header_index is None:
        continue

    for row_index, row in enumerate(rows[header_index + 1:], start=header_index + 2):
        if not any(value not in (None, "") for value in row):
            continue

        fecha = parse_date(row[0] if len(row) > 0 else None)
        concepto = clean_text(row[1] if len(row) > 1 else None)
        ingreso = as_number(row[2] if len(row) > 2 else None)
        gasto = as_number(row[3] if len(row) > 3 else None)
        saldo = as_number(row[4] if len(row) > 4 else None)

        rows_out.append({
            "sheet": ws.title,
            "source_row": row_index,
            "fecha": fecha,
            "concepto": concepto,
            "ingreso": ingreso,
            "gasto": gasto,
            "saldo": saldo,
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
    throw new Error("No se pudo leer el workbook de caja menor.");
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
  return normalizeText(value).toUpperCase();
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function inferProveedor(conceptoKey) {
  if (conceptoKey.includes("CEDENAR")) return "Cedenar";
  if (conceptoKey.includes("EMPOOBANDO")) return "Empoobando";
  if (conceptoKey.includes("UNIMOS")) return "Unimos";
  if (conceptoKey.includes("RADIO VIVA")) return "Radio Viva";
  if (conceptoKey.includes("TROPICANA")) return "Tropicana";
  if (conceptoKey.includes("FACEBOOK")) return "Facebook";
  if (conceptoKey.includes("VIGILANCIA LA CASTELLANA")) return "Vigilancia La Castellana";
  if (conceptoKey.includes("SRA ESPERANZA")) return "Sra Esperanza";
  if (conceptoKey.includes("DESENGUAYABE")) return "Desenguayabe";
  return null;
}

function inferRecurrente(categoria, conceptoKey) {
  if (["alquiler", "servicios", "nominas", "marketing", "seguros"].includes(categoria)) return true;
  return (
    conceptoKey.includes("BOTELLON") ||
    conceptoKey.includes("RADIO VIVA") ||
    conceptoKey.includes("TROPICANA") ||
    conceptoKey.includes("CEDENAR") ||
    conceptoKey.includes("EMPOOBANDO") ||
    conceptoKey.includes("UNIMOS") ||
    conceptoKey.includes("SRA ESPERANZA")
  );
}

function classifyExpense(concepto) {
  const key = normalizeKey(concepto);

  if (!key) {
    return { categoria: "otros", razon: "sin concepto" };
  }

  if (
    key.includes("TRAMITADOR") ||
    key.includes("TRAMITE") ||
    key.includes("TRAMITES") ||
    key.includes("GESTION DOCUMENTAL") ||
    key.includes("GESTION DE LICENCIA")
  ) {
    return { categoria: "tramitador", razon: "pago de tramitador o gestion documental" };
  }

  if (
    key.includes("FACEBOOK") ||
    key.includes("RADIO VIVA") ||
    key.includes("TROPICANA") ||
    key.includes("EMISORA") ||
    key.includes("PUBLICIDAD") ||
    key.includes("DEPORTIVO NEWS") ||
    key.includes("TARJETAS DE PRESENTACION") ||
    key.includes("LLAVEROS") ||
    key.includes("LAVEROS") ||
    key.includes("CHALECOS")
  ) {
    return { categoria: "marketing", razon: "publicidad o material promocional" };
  }

  if (
    key.includes("BANDERINES ENSENANZA") ||
    key.includes("BANDERINES ENSEÑANZA") ||
    key.includes("CONTACTOS DE EMERGANCIA") ||
    key.includes("CERTIFICADOS")
  ) {
    return { categoria: "material_didactico", razon: "material pedagogico o de senalizacion interna" };
  }

  if (
    key.includes("CEDENAR") ||
    key.includes("EMPOOBANDO") ||
    key.includes("UNIMOS") ||
    key.includes("VIGILANCIA") ||
    key.includes("ENCOMIENDA") ||
    key.includes("GRUA") ||
    key.includes("PAQUETE") ||
    key.includes("ENVIO") ||
    key.includes("SIM CARD") ||
    key.includes("RECARGAS ")
  ) {
    return { categoria: "servicios", razon: "servicio publico o tercerizado" };
  }

  if (
    key.includes("SRA ESPERANZA") ||
    key.includes("AUX")
  ) {
    return { categoria: "nominas", razon: "apoyo de personal o auxiliar" };
  }

  if (
    key.includes("SOAT")
  ) {
    return { categoria: "seguros", razon: "poliza o seguro vehicular" };
  }

  if (
    key.includes("MATRICULA MERCANTIL") ||
    key.includes("RETEFUENTE") ||
    key.includes("INDUSTRIA Y COMERCIO")
  ) {
    return { categoria: "impuestos", razon: "obligacion fiscal o registral" };
  }

  if (
    key.includes("PARQUEADERO")
  ) {
    return { categoria: "alquiler", razon: "uso de espacio o estacionamiento" };
  }

  if (
    key.includes("GASOLINA")
  ) {
    return { categoria: "combustible", razon: "combustible vehicular" };
  }

  if (
    key.includes("CAMBIO DE ACEITE") ||
    key.includes("ACEITE ") ||
    key.includes("ACEITE,") ||
    key.includes("ACEITE Y") ||
    key.includes("FILTRO") ||
    key.includes("TECNOMECANICA") ||
    key.includes("TECNICO MECANICA") ||
    key.includes("REVISION TECNICO MECANICA") ||
    key.includes("REVISION TECNICO") ||
    key.includes("RECARGA EXTINTOR") ||
    key.includes("EXTINTOR") ||
    key.includes("LLANTA") ||
    key.includes("LLANTAS") ||
    key.includes("RODAMIENTO") ||
    key.includes("AXIAL") ||
    key.includes("TERMOSTATO") ||
    key.includes("TAPON DE CARTER") ||
    key.includes("BATERIA") ||
    key.includes("ACIDO DE BATERIA") ||
    key.includes("PURGADA") ||
    key.includes("ESCANEADA") ||
    key.includes("PULIMENTO") ||
    key.includes("LIJA") ||
    key.includes("MASILLA") ||
    key.includes("PLUMILLAS") ||
    key.includes("BALINERAS") ||
    key.includes("AMORTIGUADOR") ||
    key.includes("AMORTIGUADORES") ||
    key.includes("GUARDAPOLVO") ||
    key.includes("RODAMIENTOS") ||
    key.includes("BOMBILLO") ||
    key.includes("BOMBILLOS") ||
    key.includes("LAVA MOTOS") ||
    key.includes("BOTIQUIN") ||
    key.includes("MANTENIMIENTO ") ||
    key.includes("MOTOVENTILADOR") ||
    key.includes("PASTILLA") ||
    key.includes("PASTILLAS") ||
    key.includes("ALINEACION") ||
    key.includes("SIMONIZ")
  ) {
    return { categoria: "mantenimiento_vehiculo", razon: "mantenimiento preventivo o dotacion vehicular" };
  }

  if (
    key.includes("ARREGLO") ||
    key.includes("AJUSTE") ||
    key.includes("REVISION") ||
    key.includes("MANO DE OBRA") ||
    key.includes("REPARACION") ||
    key.includes("REPARACION") ||
    key.includes("CAMBIO ") ||
    key.includes("CAMBIO DE ") ||
    key.includes("BAJADA") ||
    key.includes("MONTADA") ||
    key.includes("SINCRONIZADA") ||
    key.includes("EMBRAGUE") ||
    key.includes("CDI") ||
    key.includes("BOBINA") ||
    key.includes("BENDIX") ||
    key.includes("BUJES") ||
    key.includes("BUJIAS") ||
    key.includes("CORREA") ||
    key.includes("TENSOR") ||
    key.includes("BOMBA DE FRENO") ||
    key.includes("BOMBA DE ACEITE") ||
    key.includes("PORTA CATALINA") ||
    key.includes("ALTERNADOR") ||
    key.includes("MOTOR DE ARRANQUE") ||
    key.includes("SWICHE") ||
    key.includes("ELEVAVIDRIO") ||
    key.includes("VULCANIZADA") ||
    key.includes("PARCHE") ||
    key.includes("RETEN") ||
    key.includes("GUAYA") ||
    key.includes("AMPOLLETA") ||
    key.includes("CARCASA LLAVE") ||
    key.includes("CRUCETA DE DIRECCION") ||
    key.includes("LUCES DE REMOLQUE") ||
    key.includes("BATERIA CONTROL") ||
    key.includes("TAPIZADO") ||
    key.includes("CERRADURA") ||
    key.includes("ELEVA VIDRIO") ||
    key.includes("LAVAMANOS") ||
    key.includes("ORQUILLA") ||
    key.includes("RADIADOR") ||
    key.includes("RADIO VIVA") // ignored above
  ) {
    return { categoria: "reparaciones", razon: "reparacion correctiva o mano de obra" };
  }

  if (
    key.includes("FOLDER") ||
    key.includes("RESMA") ||
    key.includes("PAPEL") ||
    key.includes("MARCADOR") ||
    key.includes("TINTA") ||
    key.includes("LEGAJADOR") ||
    key.includes("CAJA PARA ARCHIVO") ||
    key.includes("AGENDA")
  ) {
    return { categoria: "suministros", razon: "papeleria y apoyo operativo" };
  }

  if (
    key.includes("BOTELLON") ||
    key.includes("AGUA") ||
    key.includes("GALLETAS") ||
    key.includes("CHOCOSTOP") ||
    key.includes("AROMATICA") ||
    key.includes("AROMATEL") ||
    key.includes("CAFE") ||
    key.includes("AZUCAR") ||
    key.includes("DETERGENTE") ||
    key.includes("LIMPIADOR") ||
    key.includes("LIMPIDO") ||
    key.includes("PAPEL HIGIENICO") ||
    key.includes("PAPEL INSTITUCIONAL") ||
    key.includes("TRAPEADOR") ||
    key.includes("ESPONJA") ||
    key.includes("AMBIENTADOR") ||
    key.includes("FUNDA") ||
    key.includes("SOBRE ") ||
    key.includes("SOBRES") ||
    key.includes("AZ ") ||
    key.includes("LAPICEROS") ||
    key.includes("RECIBERAS") ||
    key.includes("RODACHINES") ||
    key.includes("DISPENSADOR") ||
    key.includes("VENTILADOR") ||
    key.includes("ALFOMBRA") ||
    key.includes("GLIFOSOL") ||
    key.includes("CHORIZO") ||
    key.includes("AREPA") ||
    key.includes("PAPA") ||
    key.includes("GALLETA CUBIERTA") ||
    key.includes("POSTOBON") ||
    key.includes("ROSA") ||
    key.includes("SALCHICHA") ||
    key.includes("GASEOSA") ||
    key.includes("GUANTES") ||
    key.includes("BOLSAS PARA LA BASURA") ||
    key.includes("VASO COLERO") ||
    key.includes("MEZCLADOR PLASTICO") ||
    key.includes("IBUPROFENO") ||
    key.includes("REFRIGERIO")
  ) {
    return { categoria: "suministros", razon: "consumo interno, aseo u oficina" };
  }

  if (
    key.includes("COMPARENDO") ||
    key.includes("CURSO COMPARENDO")
  ) {
    return { categoria: "impuestos", razon: "pago regulatorio o sancion" };
  }

  if (
    key.includes("DESENGUAYABE")
  ) {
    return { categoria: "suministros", razon: "refrigerio o consumo interno" };
  }

  if (
    key.includes("RECORRIDO") ||
    key.includes("TRANSPORTE")
  ) {
    return { categoria: "servicios", razon: "traslado o servicio operativo" };
  }

  if (
    key.includes("WILSON IPIAL") ||
    key.includes("EDWIN GASOLINA")
  ) {
    return { categoria: "otros", razon: "gasto operativo no estandarizado" };
  }

  return { categoria: "otros", razon: "sin regla especifica" };
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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = readWorkbookRows(workbookPath);
  if (rows.length === 0) {
    throw new Error("El workbook no contiene filas válidas.");
  }

  const expenseRows = rows.filter((row) => {
    const concepto = normalizeKey(row.concepto);
    return row.fecha && row.gasto && row.gasto > 0 && concepto && !concepto.startsWith("SALDO ");
  });

  const deleteRes = await withRetry("limpiar gastos importados de caja menor", () =>
    supabaseAdmin
      .from("gastos")
      .delete()
      .eq("escuela_id", ESCUELA_ID)
      .like("notas", `${SOURCE_PREFIX}|%`)
  );
  if (deleteRes.error) {
    throw new Error(`No se pudieron limpiar los gastos importados previos: ${deleteRes.error.message}`);
  }

  const gastosPayload = [];
  const summary = {
    source_rows: rows.length,
    expense_rows: expenseRows.length,
    total_gastos: 0,
    ignored_ingresos_y_saldos: rows.length - expenseRows.length,
    by_categoria: {},
    by_sheet: {},
    uncategorized_examples: [],
  };

  for (const row of expenseRows) {
    const classified = classifyExpense(row.concepto);
    const conceptoKey = normalizeKey(row.concepto);
    const monto = Number(row.gasto);
    summary.total_gastos += monto;
    summary.by_categoria[classified.categoria] = (summary.by_categoria[classified.categoria] || 0) + 1;
    summary.by_sheet[row.sheet] = (summary.by_sheet[row.sheet] || 0) + 1;

    if (classified.categoria === "otros" && summary.uncategorized_examples.length < 20) {
      summary.uncategorized_examples.push({
        fecha: row.fecha,
        concepto: row.concepto,
        monto,
        hoja: row.sheet,
        razon: classified.razon,
      });
    }

    gastosPayload.push({
      escuela_id: ESCUELA_ID,
      sede_id: SEDE_ID,
      user_id: ACTOR_USER_ID,
      categoria: classified.categoria,
      concepto: row.concepto,
      monto,
      metodo_pago: "efectivo",
      proveedor: inferProveedor(conceptoKey),
      numero_factura: `${SOURCE_PREFIX}-${row.fecha}-${String(row.source_row).padStart(4, "0")}`,
      fecha: row.fecha,
      recurrente: inferRecurrente(classified.categoria, conceptoKey),
      notas: `${SOURCE_PREFIX}|${row.sheet}|fila_${row.source_row}|${classified.razon}`,
    });
  }

  for (const part of chunk(gastosPayload, 200)) {
    const insertRes = await withRetry("crear bloque de gastos de caja menor", () =>
      supabaseAdmin.from("gastos").insert(part)
    );
    if (insertRes.error) {
      throw new Error(`No se pudieron crear gastos de caja menor: ${insertRes.error.message}`);
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
