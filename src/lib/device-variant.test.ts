import { describe, expect, it } from "vitest";
import {
  detectDeviceVariantFromUserAgent,
  isTruthyOverrideValue,
  normalizeDeviceVariant,
  resolveDeviceVariant,
} from "./device-variant";

describe("device variant helpers", () => {
  it("normalizes cookie overrides defensively", () => {
    expect(normalizeDeviceVariant(" mobile ")).toBe("mobile");
    expect(normalizeDeviceVariant("DESKTOP")).toBe("desktop");
    expect(normalizeDeviceVariant("tablet")).toBeNull();
  });

  it("treats empty override params as enabled and explicit falsey values as disabled", () => {
    expect(isTruthyOverrideValue(null)).toBe(true);
    expect(isTruthyOverrideValue("")).toBe(true);
    expect(isTruthyOverrideValue("1")).toBe(true);
    expect(isTruthyOverrideValue("false")).toBe(false);
    expect(isTruthyOverrideValue("off")).toBe(false);
  });

  it("detects phones as mobile and tablets as desktop", () => {
    expect(
      detectDeviceVariantFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        null
      )
    ).toBe("mobile");

    expect(
      detectDeviceVariantFromUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
        null
      )
    ).toBe("desktop");
  });

  it("prefers explicit cookie override over headers", () => {
    expect(
      resolveDeviceVariant({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        mobileHint: "?1",
        cookieOverride: "desktop",
      })
    ).toBe("desktop");
  });
});
