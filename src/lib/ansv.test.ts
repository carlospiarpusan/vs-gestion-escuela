import { describe, expect, it } from "vitest";
import {
  calculateAnsv,
  calculateEnrollmentAnsv,
  latestAnsvBirthDate,
  isAnsvProduct,
  readAnsvSnapshot,
  getAnsvProductAmount,
} from "./ansv";

const input = {
  fechaNacimiento: "2006-09-01",
  sexo: "M",
  fechaMatricula: "2026-09-01",
  categorias: ["A2"],
};
const calculate = (overrides: Partial<typeof input> = {}) =>
  calculateAnsv({ ...input, ...overrides }, "2026-10-19");

describe("ANSV CEA", () => {
  it("bloquea nuevos contratos con nacimiento que produce menos de 16 años", () => {
    expect(() =>
      calculateEnrollmentAnsv({ ...input, fechaNacimiento: "2019-11-20" }, "2026-10-20")
    ).toThrow(/al menos 16 años/);
    expect(() =>
      calculateEnrollmentAnsv({ ...input, fechaNacimiento: "2010-09-02" }, "2026-10-20")
    ).toThrow(/al menos 16 años/);
    expect(
      calculateEnrollmentAnsv({ ...input, fechaNacimiento: "2010-09-01" }, "2026-10-20").edad
    ).toBe(16);
    expect(calculate({ fechaNacimiento: "2019-11-20" }).status).toBe("review_required");
  });
  it("limita el calendario según la inscripción, incluyendo años bisiestos", () => {
    expect(latestAnsvBirthDate("2026-10-19")).toBe("2010-10-19");
    expect(latestAnsvBirthDate("2024-02-29")).toBe("2008-02-29");
    expect(latestAnsvBirthDate("2116-02-29")).toBe("2100-02-28");
    expect(latestAnsvBirthDate("")).toBeUndefined();
    expect(latestAnsvBirthDate("2026-02-30")).toBeUndefined();
  });
  it("usa UVB 2026 y redondea hacia arriba a cien pesos", () => {
    expect(calculate()).toMatchObject({
      edad: 20,
      vigencia: 2026,
      uvbPesos: 12110,
      coeficienteMilesimas: 731,
      valorPesos: 8900,
    });
    expect(calculate({ sexo: "F" }).valorPesos).toBe(8600);
    expect(calculate({ fechaNacimiento: "1986-01-01" }).valorPesos).toBe(9500);
  });
  it("no usa la edad de hoy ni interpreta la fecha en UTC como el día anterior", () => {
    expect(calculate({ fechaNacimiento: "2000-09-02" })).toMatchObject({
      edad: 25,
      coeficienteMilesimas: 731,
    });
    expect(calculate({ fechaNacimiento: "2000-09-01" })).toMatchObject({
      edad: 26,
      coeficienteMilesimas: 756,
    });
  });
  it.each([25, 26, 35, 36, 50, 51, 65, 66, 80, 82])("respeta el límite etario %i", (age) => {
    const result = calculate({ fechaNacimiento: `${2026 - age}-09-01` });
    expect(result.edad).toBe(age);
    expect(result.status).toBe("calculated");
  });
  it("trata el cumpleaños bisiesto como fecha civil", () => {
    expect(calculate({ fechaNacimiento: "2000-02-29", fechaMatricula: "2026-02-28" }).edad).toBe(
      25
    );
    expect(calculate({ fechaNacimiento: "2000-02-29", fechaMatricula: "2026-03-01" }).edad).toBe(
      26
    );
  });
  it.each(["fechaNacimiento", "sexo", "fechaMatricula"] as const)("exige %s", (field) => {
    expect(() => calculate({ [field]: "" })).toThrow();
  });
  it.each(["2026-02-30", "2027-01-01", "1900-02-29"])(
    "rechaza nacimiento inválido %s",
    (fechaNacimiento) => {
      expect(() => calculate({ fechaNacimiento })).toThrow();
    }
  );
  it("conserva revisión manual para años no verificados y la ambigüedad de 81 años", () => {
    expect(calculate({ fechaMatricula: "2024-09-01" })).toMatchObject({
      status: "review_required",
      valorPesos: null,
    });
    expect(calculate({ fechaNacimiento: "1945-09-01" })).toMatchObject({
      status: "review_required",
      valorPesos: null,
    });
    expect(calculate({ fechaNacimiento: "2011-09-01" })).toMatchObject({
      status: "review_required",
      valorPesos: null,
    });
  });
  it("no suma categorías; exige elegir una para combos", () => {
    expect(() => calculate({ categorias: ["A2", "B1"] })).toThrow(/categoría/);
    const result = calculateAnsv(
      { ...input, categorias: ["A2", "C1"], categoria: "C1" },
      "2026-10-19"
    );
    expect(result).toMatchObject({ categoria: "C1", coeficienteMilesimas: 722, valorPesos: 8800 });
    expect(() => calculateAnsv({ ...input, categoria: "C3" }, "2026-10-19")).toThrow();
  });
  it("RC1 liquida categoría C1 sin cambiar el curso", () => {
    expect(calculate({ categorias: ["RC1"] }).coeficienteMilesimas).toBe(722);
  });
  it.each([
    ["M", "2006-01-01", 8900, 8900],
    ["M", "1986-01-01", 9500, 9400],
    ["F", "2006-01-01", 8600, 8500],
  ])("compara carro y moto el mismo día sin sumar: %s %s", (sexo, birth, moto, carro) => {
    const result = calculateAnsv(
      {
        ...input,
        sexo: String(sexo),
        fechaNacimiento: String(birth),
        categorias: ["A2", "B1"],
        categoria: "A2",
      },
      "2026-10-19"
    );
    expect(result.valorPesos).toBe(moto);
    expect(result.alternativas).toEqual([
      { categoria: "A2", valorPesos: moto },
      { categoria: "B1", valorPesos: carro },
    ]);
  });
  it("no reutiliza la UVB 2026 en el año siguiente", () => {
    expect(
      calculateAnsv({ ...input, fechaMatricula: "2027-01-01" }, "2027-01-01").valorPesos
    ).toBeNull();
    expect(calculate({ fechaMatricula: "2025-09-01" }).uvbPesos).toBe(11552);
  });
  it("identifica solo el código ANSV y no nombres parecidos", () => {
    expect(isAnsvProduct({ code: " ansv " })).toBe(true);
    expect(isAnsvProduct({ code: "ANSV-OTRO" })).toBe(false);
    expect(readAnsvSnapshot(null)).toBeNull();
    expect(readAnsvSnapshot({ ...calculate(), valorPesos: -1 })).toBeNull();
  });
  it("ANSV2 recibe el otro valor del combo incluso si ambos coinciden", () => {
    const combo = calculateAnsv(
      { ...input, fechaNacimiento: "1986-01-01", categorias: ["A2", "B1"], categoria: "B1" },
      "2026-10-19"
    );
    expect(getAnsvProductAmount({ code: "ANSV" }, combo)).toEqual({
      categoria: "B1",
      valorPesos: 9400,
    });
    expect(getAnsvProductAmount({ code: "ANSV2" }, combo)).toEqual({
      categoria: "A2",
      valorPesos: 9500,
    });
    const same = calculateAnsv(
      { ...input, categorias: ["A2", "B1"], categoria: "A2" },
      "2026-10-19"
    );
    expect(getAnsvProductAmount({ code: "ANSV2" }, same)).toEqual({
      categoria: "B1",
      valorPesos: 8900,
    });
  });
  it("no inventa un segundo aporte sin categoría adicional inequívoca", () => {
    expect(getAnsvProductAmount({ code: "ANSV2" }, calculate())).toBeNull();
    expect(
      getAnsvProductAmount({ code: "ANSV2" }, { ...calculate(), alternativas: undefined })
    ).toBeNull();
    expect(
      getAnsvProductAmount(
        { code: "ANSV2" },
        {
          ...calculate(),
          alternativas: [
            { categoria: "A2", valorPesos: 8900 },
            { categoria: "B1", valorPesos: 8900 },
            { categoria: "C1", valorPesos: 8800 },
          ],
        }
      )
    ).toBeNull();
    expect(getAnsvProductAmount({ code: "ANSV22" }, calculate())).toBeNull();
  });
});
