import { expect, it, vi } from "vitest";
import { alumnoSchema, alumnoEditSchema } from "./schemas";
import { emptyForm } from "./constants";
vi.mock("@/lib/supabase", () => ({ createClient: vi.fn() }));

const complete = {
  ...emptyForm,
  nombre: "Ana",
  apellidos: "Prueba",
  dni: "12345678",
  telefono: "3001234567",
  lugar_expedicion_documento: "Ipiales",
  email: "ana@example.com",
  fecha_nacimiento: "2000-01-15",
  fecha_inscripcion: "2026-09-01",
  sexo: "F",
  categorias: ["B1"],
  consentimiento_datos: true,
};

it.each([
  "email",
  "fecha_nacimiento",
  "sexo",
  "fecha_inscripcion",
  "nombre",
  "apellidos",
  "dni",
  "telefono",
  "lugar_expedicion_documento",
])("el registro exige %s", (field) => {
  expect(alumnoSchema.safeParse({ ...complete, [field]: "" }).success).toBe(false);
});
it("exige categorías y categoría ANSV del combo, sin seleccionar arbitrariamente", () => {
  expect(alumnoSchema.safeParse({ ...complete, categorias: [] }).success).toBe(false);
  expect(alumnoSchema.safeParse({ ...complete, categorias: ["A2", "B1"] }).success).toBe(false);
  expect(
    alumnoSchema.safeParse({ ...complete, categorias: ["A2", "B1"], ansv_categoria: "B1" }).success
  ).toBe(true);
});
it("rechaza el nacimiento de seis años y exige autorización explícita", () => {
  expect(alumnoSchema.safeParse({ ...complete, fecha_nacimiento: "2019-11-20" }).success).toBe(
    false
  );
  expect(alumnoSchema.safeParse({ ...complete, consentimiento_datos: false }).success).toBe(false);
  expect(alumnoSchema.safeParse(complete).success).toBe(true);
});
it.each(["aptitud_conductor", "practica_adicional"])(
  "mantiene los requisitos de servicio sin exigir ANSV: %s",
  (tipo_registro) => {
    const service = { ...complete, tipo_registro, fecha_nacimiento: "", sexo: "" };
    expect(alumnoSchema.safeParse(service).success).toBe(true);
    expect(alumnoSchema.safeParse({ ...service, fecha_inscripcion: "" }).success).toBe(false);
  }
);
it("no impone retroactivamente los requisitos de alta a las fichas históricas", () => {
  expect(
    alumnoEditSchema.safeParse({
      ...complete,
      email: "",
      telefono: "",
      lugar_expedicion_documento: "",
      fecha_nacimiento: "",
      fecha_inscripcion: "",
    }).success
  ).toBe(true);
});
