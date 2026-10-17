export type HoursPeriod = { mode: "day" | "month" | "year"; date: string };
export type WorkHoursRow = Record<string, unknown> & {
  id: string;
  fecha: string;
  horas: number | string;
  instructor_id: string;
};
const bogotaDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const workHoursFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

export function bogotaToday(now = new Date()) {
  const parts = bogotaDateFormatter.formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join("-");
}
export function hoursPeriodFromInput(mode: HoursPeriod["mode"], input: string): HoursPeriod {
  const value = input.trim();
  const pattern =
    mode === "day" ? /^\d{4}-\d{2}-\d{2}$/ : mode === "month" ? /^\d{4}-\d{2}$/ : /^\d{4}$/;
  if (!pattern.test(value)) throw new Error("Revisa el periodo seleccionado.");
  const date = mode === "day" ? value : mode === "month" ? `${value}-01` : `${value}-01-01`;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (
    Number(date.slice(0, 4)) < 1900 ||
    Number(date.slice(0, 4)) > 9998 ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new Error("Selecciona una fecha valida.");
  return { mode, date };
}
export function hoursPeriodInput(period: HoursPeriod) {
  return period.date.slice(0, period.mode === "day" ? 10 : period.mode === "month" ? 7 : 4);
}
export function hoursPeriodBounds(period: HoursPeriod) {
  const valid = hoursPeriodFromInput(period.mode, hoursPeriodInput(period));
  const [year, month, day] = valid.date.split("-").map(Number);
  const until = new Date(Date.UTC(year, month - 1, day, 12));
  if (period.mode === "day") until.setUTCDate(until.getUTCDate() + 1);
  if (period.mode === "month") until.setUTCMonth(until.getUTCMonth() + 1);
  if (period.mode === "year") until.setUTCFullYear(until.getUTCFullYear() + 1);
  return { from: valid.date, until: until.toISOString().slice(0, 10) };
}
export function shiftHoursPeriod(period: HoursPeriod, direction: -1 | 1): HoursPeriod {
  const { from } = hoursPeriodBounds(period);
  const date = new Date(`${from}T12:00:00Z`);
  if (period.mode === "day") date.setUTCDate(date.getUTCDate() + direction);
  if (period.mode === "month") date.setUTCMonth(date.getUTCMonth() + direction);
  if (period.mode === "year") date.setUTCFullYear(date.getUTCFullYear() + direction);
  return hoursPeriodFromInput(
    period.mode,
    hoursPeriodInput({ ...period, date: date.toISOString().slice(0, 10) })
  );
}
export function summarizeWorkHours(rows: WorkHoursRow[]) {
  let tenths = 0;
  const days = new Set<string>();
  for (const row of rows) {
    const hours = Number(row.horas);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24)
      throw new Error("Hay un registro de horas no valido. Actualiza la vista.");
    tenths += Math.round(hours * 10);
    if (hours > 0) days.add(row.fecha);
  }
  return { hours: tenths / 10, days: days.size, records: rows.length };
}
export function formatWorkHours(hours: number | string) {
  return workHoursFormatter.format(Number(hours));
}
