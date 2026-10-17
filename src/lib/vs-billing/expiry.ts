import { APP_TIME_ZONE } from "@/lib/date-utils";

export function toBogotaDateTimeInput(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function expiryFromBogotaInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Selecciona una fecha y hora validas.");
  // Colombia mantiene UTC-05:00; no usar la zona horaria del navegador.
  const date = new Date(`${value}:00-05:00`);
  if (!Number.isFinite(date.getTime()) || toBogotaDateTimeInput(date.toISOString()) !== value)
    throw new Error("Selecciona una fecha y hora validas.");
  if (date.getTime() <= Date.now()) throw new Error("La vigencia debe ser una fecha futura.");
  return date.toISOString();
}
