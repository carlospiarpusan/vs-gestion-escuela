export type SpreadsheetCell = string | number | boolean | Date | null | undefined;

export type SpreadsheetSheet = {
  name: string;
  headers: string[];
  rows: SpreadsheetCell[][];
};

const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function normalizeSheetName(name: string) {
  const sanitized = name.replace(/[\\/?*[\]:]/g, " ").trim();
  return sanitized.slice(0, 31) || "Hoja";
}

function toDisplayValue(value: SpreadsheetCell) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return "";
  return value;
}

function estimateColumnWidth(header: string, rows: SpreadsheetCell[][], index: number) {
  const widestCell = rows.reduce((max, row) => {
    const value = row[index];
    const text = String(toDisplayValue(value) ?? "");
    return Math.max(max, text.length);
  }, header.length);

  return Math.min(Math.max(widestCell + 2, 12), 36);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let column = "";
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - remainder - 1) / 26);
  }

  return column;
}

function normalizeWorkbookFilename(filename: string, bookType: "xls" | "xlsx") {
  const legacyExtension = bookType === "xls" ? /\.xls$/i : /\.xlsx$/i;
  return filename.replace(legacyExtension, "").replace(/\.(?:xls|xlsx)$/i, "") + ".xlsx";
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildCellXml(value: SpreadsheetCell, rowIndex: number, columnIndex: number) {
  const cellRef = `${columnName(columnIndex)}${rowIndex}`;
  const displayValue = toDisplayValue(value);

  if (displayValue === "") return `<c r="${cellRef}"/>`;

  if (typeof displayValue === "number" && Number.isFinite(displayValue)) {
    return `<c r="${cellRef}"><v>${displayValue}</v></c>`;
  }

  if (typeof displayValue === "boolean") {
    return `<c r="${cellRef}" t="b"><v>${displayValue ? 1 : 0}</v></c>`;
  }

  return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(String(displayValue))}</t></is></c>`;
}

function buildWorksheetXml(sheet: SpreadsheetSheet) {
  const rows = [
    sheet.headers,
    ...sheet.rows.map((row) =>
      sheet.headers.map((_, columnIndex) => (columnIndex < row.length ? row[columnIndex] : ""))
    ),
  ];

  const cols = sheet.headers
    .map((header, index) => {
      const width = estimateColumnWidth(header, sheet.rows, index);
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");

  const sheetData = rows
    .map((row, rowIndex) => {
      const excelRowIndex = rowIndex + 1;
      const cells = row.map((cell, columnIndex) => buildCellXml(cell, excelRowIndex, columnIndex));
      return `<row r="${excelRowIndex}">${cells.join("")}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><cols>${cols}</cols><sheetData>${sheetData}</sheetData></worksheet>`;
}

function buildWorkbookXml(sheets: SpreadsheetSheet[]) {
  const sheetEntries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(normalizeSheetName(sheet.name || `Hoja ${index + 1}`))}" sheetId="${
          index + 1
        }" r:id="rId${index + 1}"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`;
}

function buildWorkbookRelationshipsXml(sheets: SpreadsheetSheet[]) {
  const sheetRelationships = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${
          index + 1
        }.xml"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRelationships}</Relationships>`;
}

function buildRootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

function buildContentTypesXml(sheets: SpreadsheetSheet[]) {
  const sheetOverrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetOverrides}</Types>`;
}

export function downloadCsv(filename: string, headers: string[], rows: SpreadsheetCell[][]) {
  const delimiter = ";";
  const escapeCell = (value: SpreadsheetCell) =>
    `"${String(toDisplayValue(value)).replace(/"/g, '""')}"`;

  const csv = [
    headers.map(escapeCell).join(delimiter),
    ...rows.map((row) => row.map(escapeCell).join(delimiter)),
  ].join("\n");

  downloadBlob(filename, new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
}

export async function downloadSpreadsheetWorkbook(
  filename: string,
  sheets: SpreadsheetSheet[],
  options?: { bookType?: "xls" | "xlsx" }
) {
  const validSheets = sheets.filter((sheet) => sheet.headers.length > 0);
  if (validSheets.length === 0) return;

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", buildContentTypesXml(validSheets));
  zip.folder("_rels")?.file(".rels", buildRootRelationshipsXml());
  zip.folder("xl")?.file("workbook.xml", buildWorkbookXml(validSheets));
  zip
    .folder("xl")
    ?.folder("_rels")
    ?.file("workbook.xml.rels", buildWorkbookRelationshipsXml(validSheets));

  const worksheets = zip.folder("xl")?.folder("worksheets");
  validSheets.forEach((sheet, index) => {
    worksheets?.file(`sheet${index + 1}.xml`, buildWorksheetXml(sheet));
  });

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  downloadBlob(
    normalizeWorkbookFilename(filename, options?.bookType || "xlsx"),
    new Blob([blob], { type: XLSX_MIME_TYPE })
  );
}
