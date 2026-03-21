import { describe, expect, it } from "vitest";
import {
  createEmptyAdminDashboardSummary,
  getDashboardMonthRange,
  getDashboardToday,
} from "@/lib/dashboard-admin-summary";

describe("dashboard-admin-summary", () => {
  it("calcula hoy con la zona horaria del dashboard", () => {
    expect(getDashboardToday(new Date("2026-03-19T02:30:00.000Z"))).toBe("2026-03-18");
    expect(getDashboardToday(new Date("2026-03-19T18:30:00.000Z"))).toBe("2026-03-19");
  });

  it("resuelve rangos mensuales incluso al cruzar de año", () => {
    const previous = getDashboardMonthRange(-1, new Date("2026-01-15T12:00:00.000Z"));
    const current = getDashboardMonthRange(0, new Date("2026-01-15T12:00:00.000Z"));

    expect(previous.start).toBe("2025-12-01");
    expect(previous.end).toBe("2026-01-01");
    expect(current.start).toBe("2026-01-01");
    expect(current.end).toBe("2026-02-01");
  });

  it("crea un snapshot vacío consistente para el dashboard", () => {
    expect(createEmptyAdminDashboardSummary()).toEqual({
      stats: {
        alumnos: 0,
        cursosNuevosMes: 0,
        clasesHoy: 0,
        examenesPendientes: 0,
        ingresosMes: 0,
        lineasMesMoto: 0,
        lineasMesCarro: 0,
        lineasMesCombos: 0,
        lineasMesSinCategoria: 0,
        practicaAdicionalMes: 0,
        evaluacionesAptitudMes: 0,
      },
      comparisonStats: {
        cursosNuevosMes: 0,
        ingresosMes: 0,
        practicaAdicionalMes: 0,
        evaluacionesAptitudMes: 0,
      },
      dailyIngresos: [],
    });
  });
});
