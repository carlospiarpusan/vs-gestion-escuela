export type DeviceVariant = "mobile" | "desktop";

export const DEVICE_VARIANT_OVERRIDE_COOKIE = "autoescuela_device_variant";
export const FORCE_MOBILE_QUERY_PARAM = "force_mobile";
export const FORCE_DESKTOP_QUERY_PARAM = "force_desktop";

const MOBILE_HINT = "?1";
const TABLET_USER_AGENT_PATTERN =
  /(ipad|tablet|kindle|silk|playbook|sm-t|lenovo tab|xiaomi pad|nexus 7|nexus 10)/i;
const MOBILE_USER_AGENT_PATTERN =
  /(iphone|ipod|android.+mobile|windows phone|blackberry|iemobile|opera mini|mobile)/i;

export function normalizeDeviceVariant(value: string | null | undefined): DeviceVariant | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "mobile") return "mobile";
  if (normalized === "desktop") return "desktop";
  return null;
}

export function isTruthyOverrideValue(value: string | null) {
  if (value == null) return true;
  return !["0", "false", "off", "no"].includes(value.trim().toLowerCase());
}

export function detectDeviceVariantFromUserAgent(
  userAgent: string | null | undefined,
  mobileHint: string | null | undefined
): DeviceVariant {
  if (mobileHint === MOBILE_HINT) {
    return "mobile";
  }

  if (!userAgent) return "desktop";

  if (TABLET_USER_AGENT_PATTERN.test(userAgent)) {
    return "desktop";
  }

  return MOBILE_USER_AGENT_PATTERN.test(userAgent) ? "mobile" : "desktop";
}

export function resolveDeviceVariant({
  userAgent,
  mobileHint,
  cookieOverride,
}: {
  userAgent: string | null | undefined;
  mobileHint?: string | null | undefined;
  cookieOverride?: string | null | undefined;
}): DeviceVariant {
  const normalizedOverride = normalizeDeviceVariant(cookieOverride);
  if (normalizedOverride) {
    return normalizedOverride;
  }

  return detectDeviceVariantFromUserAgent(userAgent, mobileHint);
}
