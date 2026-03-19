export const DASHBOARD_SCHOOL_COOKIE = "dashboard_school_id";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DashboardSchoolOption = {
  id: string;
  nombre: string;
};

export function readCookieValue(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== cookieName) continue;
    const value = rawValue.join("=").trim();
    return value ? decodeURIComponent(value) : null;
  }

  return null;
}

export function normalizeUuid(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function getDashboardSchoolIdFromRequest(request: Request) {
  return normalizeUuid(readCookieValue(request.headers.get("cookie"), DASHBOARD_SCHOOL_COOKIE));
}
