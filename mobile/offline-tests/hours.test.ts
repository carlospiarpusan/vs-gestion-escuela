import { expect, it } from "vitest";
import {
  bogotaToday,
  hoursPeriodBounds,
  hoursPeriodFromInput,
  shiftHoursPeriod,
  summarizeWorkHours,
} from "../src/lib/hours";

it("inicia el periodo segun Bogota y no cambia la fecha con el huso del dispositivo", () => {
  expect(bogotaToday(new Date("2026-10-01T02:00:00Z"))).toBe("2026-09-30");
  expect(bogotaToday(new Date("2026-10-01T05:00:00Z"))).toBe("2026-10-01");
});
it.each([
  ["day", "2024-02-29", "2024-02-29", "2024-03-01"],
  ["month", "2024-02", "2024-02-01", "2024-03-01"],
  ["month", "2026-12", "2026-12-01", "2027-01-01"],
  ["year", "2026", "2026-01-01", "2027-01-01"],
] as const)(
  "calcula los limites inclusivo/exclusivo del periodo %s",
  (mode, input, from, until) => {
    expect(hoursPeriodBounds(hoursPeriodFromInput(mode, input))).toEqual({ from, until });
  }
);
it.each(["2026-02-29", "2026-02-30", "2026-13-01", "2026-00-01", "2026-1-1", "1899-01-01"])(
  "rechaza una fecha invalida %s",
  (input) => expect(() => hoursPeriodFromInput("day", input)).toThrow()
);
it("avanza periodos sin el salto de enero 31 a marzo", () => {
  expect(shiftHoursPeriod({ mode: "month", date: "2026-01-31" }, 1)).toEqual({
    mode: "month",
    date: "2026-02-01",
  });
  expect(shiftHoursPeriod({ mode: "day", date: "2024-03-01" }, -1).date).toBe("2024-02-29");
});
it("suma horas registradas y cuenta dias trabajados sin redondeos flotantes", () => {
  const row = { id: "h", instructor_id: "i" };
  expect(
    summarizeWorkHours([
      { ...row, fecha: "2026-10-01", horas: "7.5" },
      { ...row, fecha: "2026-10-02", horas: 8 },
      { ...row, fecha: "2026-10-03", horas: 0 },
      { ...row, fecha: "2026-10-02", horas: 0.1 },
      { ...row, fecha: "2026-10-04", horas: 0.2 },
    ])
  ).toEqual({ hours: 15.8, days: 3, records: 5 });
  expect(() => summarizeWorkHours([{ ...row, fecha: "2026-10-01", horas: "unknown" }])).toThrow();
});
