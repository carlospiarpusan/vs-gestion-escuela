import { describe, expect, it } from "vitest";
import { buildQueryParts } from "./query-builder";
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
