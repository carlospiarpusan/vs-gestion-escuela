import { afterEach, describe, expect, it, vi } from "vitest";
import { expiryFromBogotaInput, toBogotaDateTimeInput } from "./expiry";

afterEach(() => vi.useRealTimers());
describe("vigencia en hora de Bogota", () => {
  it("convierte UTC a fecha local incluso al cambiar de dia", () => {
    expect(toBogotaDateTimeInput("2026-10-01T03:30:00Z")).toBe("2026-09-30T22:30");
    expect(toBogotaDateTimeInput("2026-10-01T05:00:00Z")).toBe("2026-10-01T00:00");
  });
  it("interpreta la seleccion como UTC-05:00 sin depender del navegador", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
    expect(expiryFromBogotaInput("2026-09-30T22:30")).toBe("2026-10-01T03:30:00.000Z");
  });
  it.each([
    "",
    "2099-02-30T12:00",
    "2099-13-01T12:00",
    "2099-01-01T25:00",
    "2099-01-01T12:00Z",
    "2020-01-01T12:00",
  ])("rechaza fecha invalida o pasada %s", (value) => {
    expect(() => expiryFromBogotaInput(value)).toThrow();
  });
});
