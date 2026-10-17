const MAX_DATE_FORMATTERS = 32;
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

// Cache formatter configuration only, never dates or account data.
export function getDateTimeFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify([
    locale,
    Object.entries(options).sort(([left], [right]) => left.localeCompare(right)),
  ]);
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, formatter);
    if (dateFormatters.size > MAX_DATE_FORMATTERS) {
      dateFormatters.delete(dateFormatters.keys().next().value!);
    }
  }
  return formatter;
}

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCop(value: number) {
  return copFormatter.format(value);
}
