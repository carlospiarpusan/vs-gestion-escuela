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

  it("abre informes con corte anual por defecto", () => {
    expect(createDefaultFilters().month).toBe("all");
  });
});
