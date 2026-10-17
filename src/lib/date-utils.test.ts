import { describe, expect, it } from "vitest";
import {
  APP_TIME_ZONE,
  buildDateRangeFromPeriodFilter,
  formatDateOnlyForDisplay,
  getCurrentMonthIndex,
  getCurrentMonthNumber,
  getCurrentYear,
  getDateOnlyDiffInDays,
  getTodayDateString,
  isValidDateOnly,
  parseDateOnlyAsUtc,
} from "@/lib/date-utils";

describe("date-utils", () => {
  it.each(["2026-02-31", "2026-02-29", "2026-04-31", "2026-00-10", "2026-13-01", "0000-01-01"])(
    "rechaza fechas imposibles: %s",
    (value) => {
      expect(isValidDateOnly(value)).toBe(false);
      expect(parseDateOnlyAsUtc(value)).toBeNull();
      expect(formatDateOnlyForDisplay(value)).toBe("—");
    }
  );
  it("acepta año bisiesto y conserva años anteriores a 100", () => {
    expect(isValidDateOnly("2024-02-29")).toBe(true);
    expect(parseDateOnlyAsUtc("0099-01-01")?.getUTCFullYear()).toBe(99);
  });
  it("calcula la fecha actual en America/Bogota sin saltar al siguiente dia por UTC", () => {
    expect(getTodayDateString(new Date("2026-04-01T02:30:00.000Z"), APP_TIME_ZONE)).toBe(
      "2026-03-31"
    );
    expect(getTodayDateString(new Date("2026-04-01T18:30:00.000Z"), APP_TIME_ZONE)).toBe(
      "2026-04-01"
    );
  });

  it("convierte filtros mensuales y anuales en rangos de fechas", () => {
    expect(buildDateRangeFromPeriodFilter("2026-03")).toEqual({
      start: "2026-03-01",
      end: "2026-04-01",
    });
    expect(buildDateRangeFromPeriodFilter("2026")).toEqual({
      start: "2026-01-01",
      end: "2027-01-01",
    });
    expect(buildDateRangeFromPeriodFilter("2026-13")).toBeNull();
    expect(buildDateRangeFromPeriodFilter("0000")).toBeNull();
    expect(buildDateRangeFromPeriodFilter("0000-01")).toBeNull();
    expect(buildDateRangeFromPeriodFilter("marzo-2026")).toBeNull();
  });

  it("deriva año y mes usando America/Bogota", () => {
    const reference = new Date("2026-04-01T02:30:00.000Z");
    expect(getCurrentYear(reference, APP_TIME_ZONE)).toBe(2026);
    expect(getCurrentMonthNumber(reference, APP_TIME_ZONE)).toBe(3);
    expect(getCurrentMonthIndex(reference, APP_TIME_ZONE)).toBe(2);
  });

  it("formatea fechas sin correrlas por la zona del navegador", () => {
    expect(formatDateOnlyForDisplay("2026-09-01")).toMatch(/1.*sept.*2026/i);
    expect(formatDateOnlyForDisplay("2026-03-30T05:00:00.000Z")).toMatch(/30.*mar.*2026/i);
    expect(getDateOnlyDiffInDays("2026-03-31", "2026-03-30")).toBe(1);
  });
});
