export type ExpenseSearchField =
  | "concepto"
  | "proveedor"
  | "factura"
  | "categoria"
  | "metodo"
  | "fecha"
  | "notas";

export type ExpenseSearchCriteria = {
  freeText: string;
  fields: Record<ExpenseSearchField, string>;
  monto: number | null;
  recurrente: boolean | null;
  fechaRange: {
    from: string;
    to: string;
  } | null;
  hasAdvancedFilters: boolean;
};

export const EXPENSE_ADVANCED_SEARCH_HINT =
  'Usa prefijos como factura:, proveedor:, monto:, categoria:, metodo:, fecha:, notas:, concepto: o recurrente:. Ejemplo: factura:FE-123 proveedor:"Taller ABC" fecha:2025-03 monto:150000 recurrente:si';

const FIELD_ALIASES: Record<string, ExpenseSearchField | "monto" | "recurrente"> = {
  concepto: "concepto",
  conc: "concepto",
  proveedor: "proveedor",
  prov: "proveedor",
  factura: "factura",
  fac: "factura",
  categoria: "categoria",
  cat: "categoria",
  metodo: "metodo",
  medio: "metodo",
  pago: "metodo",
  fecha: "fecha",
  notas: "notas",
  nota: "notas",
  monto: "monto",
  valor: "monto",
  total: "monto",
  recurrente: "recurrente",
  rec: "recurrente",
};

const TOKEN_REGEX = /([^\s:]+):"([^"]*)"|([^\s:]+):(\S+)|"([^"]+)"|(\S+)/g;

function normalizeSearchText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[(),]/g, " ");
}

function parseExpenseAmount(value: string) {
  const raw = value.replace(/[^0-9,.-]/g, "").trim();
  if (!raw || !/\d/.test(raw)) return null;

  const commaCount = (raw.match(/,/g) || []).length;
  const dotCount = (raw.match(/\./g) || []).length;
  let normalized = raw;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = raw.split(thousandSeparator).join("");
    if (decimalSeparator === ",") {
      normalized = normalized.replace(",", ".");
    }
  } else if (commaCount > 0) {
    const decimals = raw.split(",").pop() || "";
    normalized = commaCount === 1 && decimals.length <= 2
      ? raw.replace(",", ".")
      : raw.replace(/,/g, "");
  } else if (dotCount > 0) {
    const decimals = raw.split(".").pop() || "";
    normalized = dotCount === 1 && decimals.length <= 2
      ? raw
      : raw.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanSearch(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["si", "sí", "true", "1", "yes", "y"].includes(normalized)) return true;
  if (["no", "false", "0", "n"].includes(normalized)) return false;
  return null;
}

function appendFieldValue(current: string, next: string) {
  return current ? `${current} ${next}` : next;
}

function buildIsoDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthLastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseExpenseDateRange(value: string) {
  const normalized = value.trim();

  if (/^\d{4}$/.test(normalized)) {
    const year = Number(normalized);
    return {
      from: buildIsoDate(year, 1, 1),
      to: buildIsoDate(year, 12, 31),
    };
  }

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    const [yearText, monthText] = normalized.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (month < 1 || month > 12) return null;
    return {
      from: buildIsoDate(year, month, 1),
      to: buildIsoDate(year, month, getMonthLastDay(year, month)),
    };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [yearText, monthText, dayText] = normalized.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > getMonthLastDay(year, month)) return null;
    const isoDate = buildIsoDate(year, month, day);
    return { from: isoDate, to: isoDate };
  }

  if (/^\d{2}\/\d{4}$/.test(normalized)) {
    const [monthText, yearText] = normalized.split("/");
    const year = Number(yearText);
    const month = Number(monthText);
    if (month < 1 || month > 12) return null;
    return {
      from: buildIsoDate(year, month, 1),
      to: buildIsoDate(year, month, getMonthLastDay(year, month)),
    };
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [dayText, monthText, yearText] = normalized.split("/");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > getMonthLastDay(year, month)) return null;
    const isoDate = buildIsoDate(year, month, day);
    return { from: isoDate, to: isoDate };
  }

  return null;
}

export function parseExpenseSearch(input: string): ExpenseSearchCriteria {
  const criteria: ExpenseSearchCriteria = {
    freeText: "",
    fields: {
      concepto: "",
      proveedor: "",
      factura: "",
      categoria: "",
      metodo: "",
      fecha: "",
      notas: "",
    },
    monto: null,
    recurrente: null,
    fechaRange: null,
    hasAdvancedFilters: false,
  };

  const freeTextTokens: string[] = [];
  const matches = input.matchAll(TOKEN_REGEX);

  for (const match of matches) {
    const fieldToken = match[1] || match[3] || "";
    const rawValue = match[2] || match[4] || match[5] || match[6] || "";
    const value = normalizeSearchText(rawValue);
    if (!value) continue;

    if (!fieldToken) {
      freeTextTokens.push(value);
      continue;
    }

    const normalizedField = FIELD_ALIASES[fieldToken.toLowerCase()];
    if (!normalizedField) {
      freeTextTokens.push(value);
      continue;
    }

    criteria.hasAdvancedFilters = true;

    if (normalizedField === "monto") {
      const parsedAmount = parseExpenseAmount(value);
      if (parsedAmount !== null) {
        criteria.monto = parsedAmount;
      }
      continue;
    }

    if (normalizedField === "recurrente") {
      const parsedBoolean = parseBooleanSearch(value);
      if (parsedBoolean !== null) {
        criteria.recurrente = parsedBoolean;
      }
      continue;
    }

    criteria.fields[normalizedField] = appendFieldValue(criteria.fields[normalizedField], value);
  }

  criteria.freeText = freeTextTokens.join(" ").trim();
  if (criteria.fields.fecha) {
    criteria.fechaRange = parseExpenseDateRange(criteria.fields.fecha);
  }
  return criteria;
}
