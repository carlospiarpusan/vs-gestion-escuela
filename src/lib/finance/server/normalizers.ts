export function toNumber(value: unknown) {
  return Number(value || 0);
}

export function normalizeDateOnly(value: unknown) {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return parsed.toISOString().slice(0, 10);
}
