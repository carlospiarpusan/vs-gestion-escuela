import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getSinFronterasTemplates, SIN_FRONTERAS_SCHOOL_ID } from "@/lib/contract-template";
import PrintContratoPage from "./page";

const state = vi.hoisted(() => ({
  categories: ["A2"],
  role: "admin_escuela",
  school: "",
  templates: [] as unknown[],
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirect");
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("./PrintButton", () => ({ default: () => <button>Imprimir</button> }));
vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    width,
    height,
    className,
  }: {
    alt: string;
    src: string;
    width: number;
    height: number;
    className: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} width={width} height={height} className={className} />
  ),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "staff" } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "staff",
              rol: state.role,
              escuela_id: state.school,
              sede_id: "sede",
              activo: true,
            },
          }),
        }),
      }),
    }),
  }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: async () => ({ data: state.templates }),
        maybeSingle: async () => ({
          data:
            table === "matriculas_alumno"
              ? {
                  id: "matricula",
                  escuela_id: SIN_FRONTERAS_SCHOOL_ID,
                  sede_id: "sede",
                  alumno_id: "alumno",
                }
              : {
                  nombre_legal_escuela: "Escuela de Conduccion Sin Fronteras",
                  nit_escuela: "901171550",
                },
        }),
        single: async () => ({
          data: {
            id: "matricula",
            numero_contrato: "MOT-9999",
            categorias: state.categories,
            alumno: {
              nombre: "Valeria <Demo>",
              apellidos: "Prueba",
              dni: "000000000",
              tipo_documento: "TI",
              lugar_expedicion_documento: "Ipiales",
              direccion: "Direccion ficticia",
              telefono: "0000000000",
            },
            sede: {
              direccion: "Direccion de prueba",
              escuela: { id: SIN_FRONTERAS_SCHOOL_ID, nombre: "Sin Fronteras" },
            },
          },
        }),
      };
      return chain;
    },
  }),
}));
beforeEach(() => {
  state.categories = ["A2"];
  state.role = "admin_escuela";
  state.school = SIN_FRONTERAS_SCHOOL_ID;
  state.templates = getSinFronterasTemplates();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T02:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it.each([
  ["moto", ["A2"], "motocicleta"],
  ["vehiculo", ["C1"], "vehículo"],
  ["combo", ["A2", "B1"], "motocicleta y vehículo"],
])(
  "imprime el formato %s completo, con datos automaticos y fecha de Bogota",
  async (type, categories, formation) => {
    state.categories = categories as string[];
    const tree = await PrintContratoPage({ params: Promise.resolve({ id: "matricula" }) });
    const { container } = render(tree);
    expect(screen.getAllByAltText("Escuela de Conducción Sin Fronteras")).toHaveLength(2);
    expect(container.querySelectorAll(".print-page")).toHaveLength(2);
    const text = container.textContent ?? "";
    expect(text).toContain(`formación en conducción de ${formation}`);
    expect(text).toContain("Valeria <Demo> Prueba");
    expect(container.querySelector("demo")).toBeNull();
    expect(text).toContain("TI número 000000000 expedido en Ipiales");
    expect(text).toContain("19 de octubre de 2026");
    expect(text).toContain("Ipiales Nariño");
    expect(container.querySelectorAll("footer")).toHaveLength(2);
    expect(container.querySelector("footer")?.textContent).toContain("Direccion de prueba");
    expect(text).toContain("DECIMA TERCERA. Declaración de veracidad");
    expect(text).toContain("sesenta (60) días");
    expect(text).toContain(type === "vehiculo" ? "Tener 18 años" : "Tener 16 años");
    expect(text).not.toContain("{{");
    expect(screen.getByText(/Firma Acudiente/)).toBeTruthy();
    if (process.env.CONTRACT_PREVIEW_OUTPUT) {
      mkdirSync(process.env.CONTRACT_PREVIEW_OUTPUT, { recursive: true });
      writeFileSync(
        `${process.env.CONTRACT_PREVIEW_OUTPUT}/${type}.html`,
        renderToStaticMarkup(tree)
      );
    }
  }
);
it("rechaza imprimir un contrato de otra escuela", async () => {
  state.school = "otra-escuela";
  await expect(PrintContratoPage({ params: Promise.resolve({ id: "matricula" }) })).rejects.toThrow(
    "not-found"
  );
});
it("no permite imprimir contratos a alumnos ni instructores", async () => {
  state.role = "instructor";
  await expect(PrintContratoPage({ params: Promise.resolve({ id: "matricula" }) })).rejects.toThrow(
    "not-found"
  );
});
