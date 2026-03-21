export type SpreadsheetCell = string | number | boolean | Date | null | undefined;

export type SpreadsheetSheet = {
  name: string;
  headers: string[];
  rows: SpreadsheetCell[][];
};

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

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: SpreadsheetCell[][]
) {
  const delimiter = ";";
  const escapeCell = (value: SpreadsheetCell) =>
    `"${String(toDisplayValue(value)).replace(/"/g, '""')}"`;

  const csv = [
    headers.map(escapeCell).join(delimiter),
    ...rows.map((row) => row.map(escapeCell).join(delimiter)),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadSpreadsheetWorkbook(
  filename: string,
  sheets: SpreadsheetSheet[],
  options?: { bookType?: "xls" | "xlsx" }
) {
  const { utils, writeFile } = await import("xlsx");
  const workbook = utils.book_new();
  const validSheets = sheets.filter((sheet) => sheet.headers.length > 0);
  if (validSheets.length === 0) return;

  validSheets.forEach((sheet, index) => {
    const worksheet = utils.aoa_to_sheet([
      sheet.headers.map((header) => toDisplayValue(header)),
      ...sheet.rows.map((row) => row.map((cell) => toDisplayValue(cell))),
    ]);

    worksheet["!cols"] = sheet.headers.map((header, columnIndex) => ({
      wch: estimateColumnWidth(header, sheet.rows, columnIndex),
    }));

    utils.book_append_sheet(
      workbook,
      worksheet,
      normalizeSheetName(sheet.name || `Hoja ${index + 1}`)
    );
  });

  writeFile(workbook, filename, {
    bookType: options?.bookType || "xls",
    compression: true,
  });
}
