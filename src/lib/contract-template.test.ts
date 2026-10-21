import { expect, it } from "vitest";
import source from "./contract-templates/sin-fronteras.json";
import {
  CONTRACT_PAGE_BREAK,
  getContractAgeRequirement,
  getSinFronterasTemplates,
  replaceContractVariables,
  SIN_FRONTERAS_SCHOOL_ID,
  splitContractTemplate,
  usesSinFronterasForm,
} from "./contract-template";

it("conserva las trece clausulas y los valores del documento aportado", () => {
  expect(source.page1).toHaveLength(7);
  expect(source.page2).toHaveLength(7);
  const text = [...source.page1, ...source.page2].join(" ");
  for (const marker of [
    "PRIMERA. Objeto:",
    "SEGUNDA. Requisitos:",
    "TERCERA. Duración:",
    "CUARTA. Forma de pago:",
    "QUINTA: Derechos",
    "SEXTA. Obligaciones",
    "SÉPTIMA. Derechos",
    "OCTAVA. Obligaciones",
    "NOVENA. Exclusión",
    "DÉCIMA. Multas.",
    "DÉCIMA PRIMERA. Terminación:",
    "DÉCIMA SEGUNDA. Devolución",
    "DECIMA TERCERA. Declaración",
  ])
    expect(text).toContain(marker);
  expect(text).toContain("70%");
  expect(text).toContain("($10.000)");
  expect(text).toContain("sesenta (60) días");
  expect(text).toContain("certificado expedido por el CRC");
  expect(text).toContain("{{ALUMNO_LUGAR_EXPEDICION}}");
  expect(text).toContain("{{FECHA_CONTRATO}}");
  expect(text).not.toContain("Contrato N° 873");
});
it("genera los tres formatos sin fijar un alumno ni una categoria", () => {
  const templates = getSinFronterasTemplates();
  expect(templates.map((p) => p.tipo_plantilla)).toEqual(["moto", "vehiculo", "combo"]);
  for (const template of templates) {
    expect(template.html_plantilla.split(CONTRACT_PAGE_BREAK)).toHaveLength(2);
    expect(template.html_plantilla).toContain("{{CATEGORIAS}}");
    expect(template.html_plantilla).toContain("{{FORMACION_CONDUCCION}}");
    expect(template.html_plantilla).toContain("{{ALUMNO_NOMBRE}}");
    expect(usesSinFronterasForm(SIN_FRONTERAS_SCHOOL_ID, template.titulo)).toBe(true);
  }
  expect(usesSinFronterasForm("otra-escuela", templates[0].titulo)).toBe(false);
  expect(usesSinFronterasForm(SIN_FRONTERAS_SCHOOL_ID, "Contrato anterior")).toBe(false);
});
it.each([
  ["A2", 16],
  ["B1", 16],
  ["C1", 18],
  ["RC1", 18],
  ["C2", 18],
])("adapta la edad de %s al requisito que ya distingue la plataforma", (category, age) => {
  expect(getContractAgeRequirement([category as string])).toContain(String(age));
});
it("solo sustituye variables originales y nunca interpreta datos del alumno", () => {
  expect(
    replaceContractVariables("{{ALUMNO_NOMBRE}} {{NIT_CEA}}", {
      ALUMNO_NOMBRE: "Nombre {{NIT_CEA}}",
      NIT_CEA: "901171550",
    })
  ).toBe("Nombre {{NIT_CEA}} 901171550");
  expect(splitContractTemplate("Pagina unica")).toEqual(["Pagina unica", ""]);
});
