"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  detectDeviceVariantFromUserAgent,
  DEVICE_VARIANT_OVERRIDE_COOKIE,
  FORCE_DESKTOP_QUERY_PARAM,
  FORCE_MOBILE_QUERY_PARAM,
  isTruthyOverrideValue,
  normalizeDeviceVariant,
  type DeviceVariant,
} from "@/lib/device-variant";

const DeviceVariantContext = createContext<DeviceVariant>("desktop");

function readCookieOverride() {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${DEVICE_VARIANT_OVERRIDE_COOKIE}=`));

  if (!cookie) return null;
  return normalizeDeviceVariant(cookie.split("=").slice(1).join("="));
}

function applyClientOverrideFromQuery() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  if (params.has(FORCE_DESKTOP_QUERY_PARAM)) {
    const value = params.get(FORCE_DESKTOP_QUERY_PARAM);
    const variant = isTruthyOverrideValue(value) ? "desktop" : null;
    if (variant) {
      document.cookie = `${DEVICE_VARIANT_OVERRIDE_COOKIE}=${variant}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    } else {
      document.cookie = `${DEVICE_VARIANT_OVERRIDE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    }
    params.delete(FORCE_DESKTOP_QUERY_PARAM);
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
    return variant;
  }

  if (params.has(FORCE_MOBILE_QUERY_PARAM)) {
    const value = params.get(FORCE_MOBILE_QUERY_PARAM);
    const variant = isTruthyOverrideValue(value) ? "mobile" : null;
    if (variant) {
      document.cookie = `${DEVICE_VARIANT_OVERRIDE_COOKIE}=${variant}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    } else {
      document.cookie = `${DEVICE_VARIANT_OVERRIDE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    }
    params.delete(FORCE_MOBILE_QUERY_PARAM);
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
    return variant;
  }

  return null;
}

export function DeviceVariantProvider({
  children,
  initialVariant,
}: {
  children: React.ReactNode;
  initialVariant?: DeviceVariant;
}) {
  const [variant, setVariant] = useState<DeviceVariant>(initialVariant || "desktop");

  useEffect(() => {
    const queryOverride = applyClientOverrideFromQuery();
    const cookieOverride = readCookieOverride();
    const nextVariant =
      queryOverride ||
      cookieOverride ||
      detectDeviceVariantFromUserAgent(window.navigator.userAgent, null);

    if (nextVariant === (initialVariant || "desktop")) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      setVariant(nextVariant);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [initialVariant]);

  useEffect(() => {
    document.documentElement.setAttribute("data-device-variant", variant);
    document.body.setAttribute("data-device-variant", variant);
  }, [variant]);

  return (
    <DeviceVariantContext.Provider value={variant}>
      {children}
    </DeviceVariantContext.Provider>
  );
}

export function useDeviceVariant() {
  return useContext(DeviceVariantContext);
}

export function useIsMobileVariant() {
  return useDeviceVariant() === "mobile";
}
