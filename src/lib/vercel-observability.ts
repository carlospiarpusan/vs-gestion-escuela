const PUBLIC_ANALYTICS_PATHS = new Set(["/", "/privacidad", "/terminos", "/login", "/registro"]);

export function isPublicAnalyticsPath(pathname: string | null) {
  return pathname !== null && PUBLIC_ANALYTICS_PATHS.has(pathname);
}

export function isPerformanceInsightsPath(pathname: string | null) {
  return (
    isPublicAnalyticsPath(pathname) ||
    pathname === "/dashboard" ||
    pathname?.startsWith("/dashboard/") === true
  );
}

export function filterVercelEvent<T extends { url: string }>(
  event: T,
  kind: "analytics" | "speed"
): T | null {
  try {
    const url = new URL(event.url);
    const isPublic = isPublicAnalyticsPath(url.pathname);
    if (kind === "analytics" ? !isPublic : !isPerformanceInsightsPath(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}
