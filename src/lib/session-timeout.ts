const DEFAULT_IDLE_LOGOUT_MINUTES = 30;
const MIN_IDLE_LOGOUT_MINUTES = 5;
const MAX_IDLE_LOGOUT_MINUTES = 24 * 60;

export const IDLE_LOGOUT_REASON = "inactive";
export const IDLE_LOGOUT_STORAGE_KEY = "auth:idle-logout-deadline";
export const IDLE_LOGOUT_LAST_ACTIVITY_KEY = "auth:last-activity-at";
export const IDLE_LOGOUT_ACTIVITY_THROTTLE_MS = 15_000;

export function normalizeIdleLogoutMinutes(value: string | undefined | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return DEFAULT_IDLE_LOGOUT_MINUTES;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_IDLE_LOGOUT_MINUTES;
  }

  return Math.min(MAX_IDLE_LOGOUT_MINUTES, Math.max(MIN_IDLE_LOGOUT_MINUTES, Math.floor(parsed)));
}

export const IDLE_LOGOUT_MINUTES = normalizeIdleLogoutMinutes(
  process.env.NEXT_PUBLIC_IDLE_LOGOUT_MINUTES
);

export const IDLE_LOGOUT_TIMEOUT_MS = IDLE_LOGOUT_MINUTES * 60_000;

export function getIdleLogoutDeadline(reference = Date.now()) {
  return reference + IDLE_LOGOUT_TIMEOUT_MS;
}

export function buildIdleLogoutHref() {
  return `/login?reason=${IDLE_LOGOUT_REASON}`;
}
