import { getDateTimeFormatter } from "./intl-formatters";

export const APP_TIME_ZONE = "America/Bogota";

export function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function formatDateOnly(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getTimeZoneDateParts(date: Date, timeZone = APP_TIME_ZONE) {
  const formatter = getDateTimeFormatter("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 0);

  return { year, month, day };
}

export function getTodayDateString(now = new Date(), timeZone = APP_TIME_ZONE) {
  const { year, month, day } = getTimeZoneDateParts(now, timeZone);
  return formatDateOnly(year, month, day);
}

export function getTimeZoneTimeString(now = new Date(), timeZone = APP_TIME_ZONE) {
  return getDateTimeFormatter("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

export function getCurrentYear(now = new Date(), timeZone = APP_TIME_ZONE) {
  return getTimeZoneDateParts(now, timeZone).year;
}

export function getCurrentMonthNumber(now = new Date(), timeZone = APP_TIME_ZONE) {
  return getTimeZoneDateParts(now, timeZone).month;
}

export function getCurrentMonthIndex(now = new Date(), timeZone = APP_TIME_ZONE) {
  return Math.max(getCurrentMonthNumber(now, timeZone) - 1, 0);
}

export function getCurrentDayOfMonth(now = new Date(), timeZone = APP_TIME_ZONE) {
  return getTimeZoneDateParts(now, timeZone).day;
}

export function extractDateOnly(value: string | Date | null | undefined) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  const normalized = String(value).trim();
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  return match && isValidDateOnly(match[1]) ? match[1] : null;
}

export function parseDateOnlyAsUtc(value: string | Date | null | undefined) {
  const dateOnly = extractDateOnly(value);
  if (!dateOnly) return null;

  const [yearRaw, monthRaw, dayRaw] = dateOnly.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const parsed = new Date(0);
  parsed.setUTCFullYear(year, month - 1, day);
  parsed.setUTCHours(12, 0, 0, 0);
  return parsed;
}

export function formatDateOnlyForDisplay(
  value: string | Date | null | undefined,
  locale = "es-CO",
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }
) {
  const parsed = parseDateOnlyAsUtc(value);
  if (!parsed) return "—";

  return getDateTimeFormatter(locale, {
    timeZone: "UTC",
    ...options,
  }).format(parsed);
}

export function getDateOnlyDiffInDays(
  target: string | Date | null | undefined,
  base: string | Date | null | undefined
) {
  const targetDate = parseDateOnlyAsUtc(target);
  const baseDate = parseDateOnlyAsUtc(base);
  if (!targetDate || !baseDate) return null;

  return Math.round((targetDate.getTime() - baseDate.getTime()) / 86_400_000);
}

export function buildDateRangeFromPeriodFilter(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [yearRaw, monthRaw] = value.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);

    if (
      !Number.isInteger(year) ||
      year < 1 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return null;
    }

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    return {
      start: formatDateOnly(year, month, 1),
      end: formatDateOnly(nextYear, nextMonth, 1),
    };
  }

  if (/^\d{4}$/.test(value)) {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 1) return null;

    return {
      start: formatDateOnly(year, 1, 1),
      end: formatDateOnly(year + 1, 1, 1),
    };
  }

  return null;
}
