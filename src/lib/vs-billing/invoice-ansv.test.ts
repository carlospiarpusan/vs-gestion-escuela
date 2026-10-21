import { describe, expect, it } from "vitest";
import { calculateAnsv } from "@/lib/ansv";
import { resolveInvoiceAnsv } from "./invoice-ansv";

const context = {
  fechaNacimiento: "2006-01-01",
  sexo: "M",
  fechaMatricula: "2026-09-01",
  categorias: ["A2"],
};
const today = "2026-10-20";

describe("ANSV para facturas históricas", () => {
  it("calcula sin snapshot usando la fecha de inscripción del contrato", () => {
    expect(resolveInvoiceAnsv(null, context, today)).toMatchObject({
      snapshot: { valorPesos: 8900, edad: 20, vigencia: 2026 },
      issue: null,
    });
    expect(
      resolveInvoiceAnsv(null, { ...context, fechaMatricula: "2025-09-01" }, today).snapshot
    ).toMatchObject({ valorPesos: 8500, vigencia: 2025 });
  });
  it("mantiene el snapshot aunque cambien los datos personales", () => {
    const saved = calculateAnsv(context, today);
    expect(
      resolveInvoiceAnsv(saved, { ...context, sexo: "F", fechaNacimiento: "1986-01-01" }, today)
        .snapshot
    ).toEqual(saved);
  });
  it.each([
    [{ fechaNacimiento: "" }, /nacimiento/],
    [{ sexo: "" }, /sexo/],
    [{ fechaMatricula: "" }, /inscripción/],
    [{ categorias: ["A2", "B1"] }, /categoría/],
  ])("explica los datos faltantes sin inventar importes: %j", (override, issue) => {
    expect(resolveInvoiceAnsv(null, { ...context, ...override }, today)).toEqual({
      snapshot: null,
      issue: expect.stringMatching(issue),
    });
  });
  it("conserva los casos que requieren revisión y permite elegir la principal del combo", () => {
    expect(
      resolveInvoiceAnsv(null, { ...context, fechaMatricula: "2024-09-01" }, today).snapshot
    ).toMatchObject({ status: "review_required", valorPesos: null });
    expect(
      resolveInvoiceAnsv(null, { ...context, categorias: ["A2", "B1"], categoria: "B1" }, today)
        .snapshot
    ).toMatchObject({
      categoria: "B1",
      valorPesos: 8900,
      alternativas: expect.arrayContaining([{ categoria: "A2", valorPesos: 8900 }]),
    });
  });
});
