import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SCHOOL_COOKIE,
  getDashboardSchoolIdFromRequest,
  normalizeUuid,
  readCookieValue,
} from "@/lib/dashboard-scope";

describe("dashboard-scope", () => {
  it("normaliza UUIDs válidos y rechaza valores inválidos", () => {
    expect(normalizeUuid("a5320c4a-3bf6-4da5-b365-da17d7001d4f")).toBe(
      "a5320c4a-3bf6-4da5-b365-da17d7001d4f"
    );
    expect(normalizeUuid(" undefined ")).toBeNull();
    expect(normalizeUuid("")).toBeNull();
    expect(normalizeUuid(null)).toBeNull();
  });

  it("lee el cookie solicitado sin tocar otros cookies", () => {
    const header = "foo=bar; dashboard_school_id=a5320c4a-3bf6-4da5-b365-da17d7001d4f; hello=world";
    expect(readCookieValue(header, DASHBOARD_SCHOOL_COOKIE)).toBe(
      "a5320c4a-3bf6-4da5-b365-da17d7001d4f"
    );
  });

  it("ignora cookies de escuela inválidos en requests", () => {
    const validRequest = new Request("https://example.com", {
      headers: {
        cookie: `${DASHBOARD_SCHOOL_COOKIE}=a5320c4a-3bf6-4da5-b365-da17d7001d4f`,
      },
    });
    const invalidRequest = new Request("https://example.com", {
      headers: {
        cookie: `${DASHBOARD_SCHOOL_COOKIE}=undefined`,
      },
    });

    expect(getDashboardSchoolIdFromRequest(validRequest)).toBe(
      "a5320c4a-3bf6-4da5-b365-da17d7001d4f"
    );
    expect(getDashboardSchoolIdFromRequest(invalidRequest)).toBeNull();
  });
});
