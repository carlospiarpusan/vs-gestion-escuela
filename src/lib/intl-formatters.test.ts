import { describe, expect, it } from "vitest";
import { formatCop, getDateTimeFormatter } from "./intl-formatters";

describe("reusable Intl formatters", () => {
  it("reuses equivalent configurations even when option order changes", () => {
    const first = getDateTimeFormatter("es-CO", { year: "numeric", timeZone: "UTC" });
    expect(getDateTimeFormatter("es-CO", { timeZone: "UTC", year: "numeric" })).toBe(first);
    expect(getDateTimeFormatter("en-US", { timeZone: "UTC", year: "numeric" })).not.toBe(first);
    expect(getDateTimeFormatter("es-CO", { timeZone: "America/Bogota", year: "numeric" })).not.toBe(
      first
    );
  });

  it("retains native output for dates, custom options and Colombian amounts", () => {
    const date = new Date("2026-09-01T02:30:00Z");
    const options: Intl.DateTimeFormatOptions = { timeZone: "America/Bogota", dateStyle: "full" };
    expect(getDateTimeFormatter("es-CO", options).format(date)).toBe(
      new Intl.DateTimeFormat("es-CO", options).format(date)
    );
    const native = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
    for (const amount of [0, -0, 1000, -1500.25, 1000000000, NaN, Infinity]) {
      expect(formatCop(amount)).toBe(native.format(amount));
    }
  });

  it("does not change options and does not retain an unbounded set of formatters", () => {
    const options = { timeZone: "UTC", year: "numeric" as const };
    const original = getDateTimeFormatter("es-CO", options);
    for (let offset = 0; offset < 40; offset += 1) {
      getDateTimeFormatter("es-CO", {
        ...options,
        timeZone: `Etc/GMT${offset % 2 ? "+" : "-"}${Math.floor(offset / 2) % 12}`,
        month: offset < 24 ? "long" : "short",
      });
    }
    expect(options).toEqual({ timeZone: "UTC", year: "numeric" });
    expect(getDateTimeFormatter("es-CO", options)).not.toBe(original);
  });
});
