import { expect, it } from "vitest";
import { getStudentInvoiceDefaults } from "./invoice-defaults";
import { calculateAnsv } from "@/lib/ansv";

const products = ["SICOV", "RECAUDO", "ANSV", "ANSV2", "OTRO"].map((code, index) => ({
  id: String(index),
  code,
  name: code,
  price: 100000,
  available: true,
  priceEditable: true,
  tax: 0 as const,
  taxTreatment: "excluded",
}));
it("precarga curso sencillo con una unidad y no selecciona ANSV2 ni otros productos", () => {
  expect(getStudentInvoiceDefaults(products, ["B1"])).toEqual({
    quantities: { 0: "1", 1: "1", 2: "1" },
    issues: [],
  });
});
it("precarga combo con dos SICOV y RECAUDO, un ANSV y un ANSV2", () => {
  expect(getStudentInvoiceDefaults(products, ["A2", "B1"])).toEqual({
    quantities: { 0: "2", 1: "2", 2: "1", 3: "1" },
    issues: [],
  });
});
it("usa solo el código RECAUDO, aunque el nombre sea distinto o haya un código parecido", () => {
  const result = getStudentInvoiceDefaults(
    [
      ...products.map((product) => ({ ...product, name: "Servicio" })),
      { ...products[1], id: "parecido", code: "RECAUDO RUNT", name: "RECAUDO" },
    ],
    ["A2", "B1"]
  );
  expect(result.quantities["1"]).toBe("2");
  expect(result.quantities).not.toHaveProperty("parecido");
  expect(result.issues).toEqual([]);
});
it("normaliza combos históricos y no duplica la cantidad por categorías repetidas", () => {
  expect(getStudentInvoiceDefaults(products, ["A2 Y B1"]).quantities[0]).toBe("2");
  expect(getStudentInvoiceDefaults(products, ["B1", "B1"]).quantities[0]).toBe("1");
});
it("avisa por productos faltantes, deshabilitados o ambiguos y no elige otro por nombre", () => {
  const result = getStudentInvoiceDefaults(
    [
      ...products
        .filter((product) => product.code !== "ANSV2")
        .map((product) => ({ ...product, available: product.code !== "ANSV" })),
      { ...products[0], id: "duplicado" },
      { ...products[3], code: "OTRO2", name: "ANSV2" },
    ],
    ["A2", "B1"]
  );
  expect(result.quantities).toEqual({ 1: "2" });
  expect(result.issues).toHaveLength(3);
});
it("no inventa cantidades sin categorías ni para tres programas", () => {
  expect(getStudentInvoiceDefaults(products, []).quantities).toEqual({});
  expect(getStudentInvoiceDefaults(products, ["A2", "B1", "C1"]).quantities).toEqual({});
});
it("no precarga un precio fijo ANSV distinto al guardado en el contrato", () => {
  const saved = calculateAnsv(
    { fechaNacimiento: "1986-01-01", sexo: "M", fechaMatricula: "2026-09-01", categorias: ["A2"] },
    "2026-10-19"
  );
  const result = getStudentInvoiceDefaults(
    products.map((product) => ({ ...product, priceEditable: false })),
    ["A2"],
    saved
  );
  expect(result.quantities).toEqual({ 0: "1", 1: "1" });
  expect(result.issues[0]).toMatch(/precio fijo de ANSV/);
});
