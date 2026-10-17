import { describe, expect, it } from "vitest";
import {
  buildQueryParts,
  getCurrentMonthRange,
  parseDateInput,
  parseInteger,
} from "./query-builder";
import type { QueryFilters } from "./types";

const baseFilters: QueryFilters = {
  alumnoId: null,
  ingresoCategoria: null,
  ingresoEstado: null,
  ingresoMetodo: null,
  ingresoView: null,
  gastoCategoria: null,
  gastoContraparte: null,
  gastoEstado: null,
  gastoMetodo: null,
  gastoView: null,
  recurrenteOnly: false,
};

describe("accounting contracts query builder", () => {
  it("mantiene el mes de Bogotá antes de medianoche aunque UTC cambie de mes", () => {
    expect(getCurrentMonthRange(new Date("2026-11-01T02:00:00Z"))).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });
  it("conserva defaults de paginación cuando no hay filtro", () => {
    expect(parseInteger(null, 20, 10, 100)).toBe(20);
    expect(parseInteger("", 20, 10, 100)).toBe(20);
    expect(parseInteger("25", 20, 10, 100)).toBe(25);
  });
  it("un filtro de fecha imposible no llega como fecha inválida a SQL", () => {
    expect(parseDateInput("2026-02-31", "2026-10-01")).toBe("2026-10-01");
    expect(parseDateInput("2024-02-29", "2026-10-01")).toBe("2024-02-29");
  });
  it("keeps aptitud standalone obligations when the income category is examen_aptitud", () => {
    const parts = buildQueryParts({
      scope: { escuelaId: "8a3c1b41-2b59-48ff-8d67-6a4413d6f2aa", sedeId: null },
      from: "2026-01-01",
      to: "2026-12-31",
      search: "",
      filters: {
        ...baseFilters,
        ingresoCategoria: "examen_aptitud",
      },
    });

    expect(parts.filteredObligationsCte).toContain("a.tipo_registro = 'aptitud_conductor'");
    expect(parts.filteredObligationsCte).toContain("i2.categoria =");
    expect(parts.filteredObligationsCte).toContain("i2.matricula_id IS NULL");
    expect(parts.filteredObligationsCte).toContain("FROM filtered_ingresos fi");
    expect(parts.filteredObligationsCte).toContain("fi.alumno_id IS NULL");
  });

  it("keeps exam standalone obligations when the income view is examenes", () => {
    const parts = buildQueryParts({
      scope: { escuelaId: "8a3c1b41-2b59-48ff-8d67-6a4413d6f2aa", sedeId: null },
      from: "2026-01-01",
      to: "2026-12-31",
      search: "",
      filters: {
        ...baseFilters,
        ingresoView: "examenes",
      },
    });

    expect(parts.filteredObligationsCte).toContain("a.tipo_registro = 'aptitud_conductor'");
    expect(parts.filteredObligationsCte).toContain("i2.categoria IN");
    expect(parts.filteredObligationsCte).toContain("EXISTS (");
  });
});
