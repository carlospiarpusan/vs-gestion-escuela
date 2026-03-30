import { describe, expect, it } from "vitest";
import { buildParams, createDefaultFilters, parseSection } from "./constants";

describe("informes constants", () => {
  it("redirige la seccion analitica antigua al resumen ejecutivo", () => {
    expect(parseSection("analitica")).toBe("resumen");
    expect(parseSection("estudiantes")).toBe("estudiantes");
  });

  it("mantiene includes de estudiantes solo cuando se necesita detalle", () => {
    const filters = createDefaultFilters();

    expect(buildParams(filters, "resumen").get("include")).not.toContain("students");
    expect(buildParams(filters, "estudiantes").get("include")).toBe("options,students");
  });

  it("pide un resumen ejecutivo fino en pantalla y agrega serie diaria solo al exportar", () => {
    const filters = createDefaultFilters();
    const screenInclude = buildParams(filters, "resumen").get("include") || "";
    const exportInclude = buildParams(filters, "resumen", "export").get("include") || "";

    expect(screenInclude).toContain("breakdown_income_lines");
    expect(screenInclude).toContain("series_monthly");
    expect(screenInclude).not.toContain("breakdown,");
    expect(screenInclude).not.toContain("series_daily");

    expect(exportInclude).toContain("series_daily");
    expect(exportInclude).toContain("contracts_oldest_pending");
  });

  it("abre informes con corte anual por defecto", () => {
    expect(createDefaultFilters().month).toBe("all");
  });
});
