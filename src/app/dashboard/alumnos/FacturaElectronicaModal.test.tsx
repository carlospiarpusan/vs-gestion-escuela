import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import FacturaElectronicaModal from "./FacturaElectronicaModal";
import type { AlumnoRow } from "./constants";
import { getTodayDateString } from "@/lib/date-utils";
import { readBillingProductUsage, rememberBillingProducts } from "@/lib/vs-billing/product-usage";
import * as productSearch from "@/lib/vs-billing/product-usage";
vi.mock("@/components/dashboard/Modal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
}));
vi.mock("@/lib/supabase", () => ({ createClient: vi.fn() }));
const student = "10000000-0000-4000-8000-000000000001",
  contract = "10000000-0000-4000-8000-000000000002",
  second = "10000000-0000-4000-8000-000000000003",
  productId = "10000000-0000-4000-8000-000000000004",
  quoteId = "10000000-0000-4000-8000-000000000005";
const alumno = {
  id: student,
  nombre: "Ana",
  apellidos: "Prueba",
  dni: "12345678",
  tipo_documento: "CC",
  email: "ana@example.com",
  estado: "activo",
  facturado: false,
  matriculas: [
    { id: contract, numero_contrato: "CAR-123", estado: "activo" },
    { id: second, numero_contrato: "CAR-124", estado: "activo" },
  ],
} as AlumnoRow;
const customer = {
  name: "Ana Prueba",
  document: "12345678",
  documentType: "CC",
  email: "ana@example.com",
  fiscal: {
    documentType: "13",
    personType: "2",
    countryCode: "CO",
    departmentCode: "52",
    cityCode: "52356",
    address: "Calle 1 numero 2",
    phone: "3001234567",
    responsibilities: "R-99-PN",
    taxRegime: "ordinario",
    taxScheme: "ZZ",
  },
};
const contact = {
  id: student,
  nombre: alumno.nombre,
  apellidos: alumno.apellidos,
  dni: alumno.dni,
  tipo_documento: alumno.tipo_documento,
  email: alumno.email,
  telefono: "3001234567",
  direccion: "Calle 1 numero 2",
  ciudad: "IPIALES",
  departamento: "Nariño",
  version: "a".repeat(64),
  datos_facturacion: {
    country: "CO",
    cityCode: "52356",
    personType: "2",
    responsibilities: "R-99-PN",
    taxRegime: "ordinario",
    taxScheme: "ZZ",
  },
};
const catalog = {
  schemaVersion: 1,
  issuerNit: "901171550",
  products: [
    {
      id: productId,
      name: "Servicio separado",
      code: "SP",
      price: 100000,
      tax: 0,
      taxTreatment: "excluded",
      available: true,
    },
  ],
  paymentMethods: ["Efectivo"],
  customer,
  customerIssue: null,
};
const quote = {
  schemaVersion: 1,
  issuerNit: "901171550",
  id: quoteId,
  studentId: student,
  expiresAt: new Date(Date.now() + 900000).toISOString(),
  customer,
  sourceStudent: { id: student, ...customer },
  lines: [
    {
      description: "Servicio separado",
      price: 100000,
      quantity: 1000,
      tax: 0,
      taxTreatment: "excluded",
    },
  ],
  totals: { subtotal: 100000, vat: 0, total: 100000 },
  payment: { method: "Efectivo", condition: "contado", dueDate: getTodayDateString() },
  delivery: "email",
};
let invoices: unknown[];
const fetcher = vi.fn();
beforeEach(() => {
  window.localStorage.clear();
  invoices = [];
  fetcher.mockReset();
  fetcher.mockImplementation(async (_url, init) => {
    if (!init?.method) return Response.json({ enabled: true, contact, invoices });
    const body = JSON.parse(init.body);
    if (body.action === "catalog") return Response.json(catalog);
    if (body.action === "quote") return Response.json(quote);
    if (body.action === "emit") {
      invoices = [{ contratoId: contract, requestId: quoteId, status: null }];
      return Response.json({ error: "Respuesta perdida; consulta el estado." }, { status: 503 });
    }
    return Response.json({});
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => vi.unstubAllGlobals());
it("reutiliza el indice al buscar y cambiar cantidades sin modificar precios", async () => {
  const buildSearch = vi.spyOn(productSearch, "createBillingProductSearch");
  try {
    fetcher.mockImplementation(async (_url, init) =>
      Response.json(
        init?.method
          ? { ...catalog, products: [{ ...catalog.products[0], price: 123456 }] }
          : { enabled: true, contact, invoices: [] }
      )
    );
    render(
      <FacturaElectronicaModal
        alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
        onClose={vi.fn()}
      />
    );
    await screen.findByRole("checkbox", { name: "Servicio separado" });
    const initialBuilds = buildSearch.mock.calls.length;
    for (const query of ["s", "se", "SP", "missing", ""])
      fireEvent.change(screen.getByLabelText("Buscar productos"), { target: { value: query } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Servicio separado" }));
    fireEvent.change(screen.getByLabelText("Cantidad de Servicio separado"), {
      target: { value: "3" },
    });
    expect(buildSearch).toHaveBeenCalledTimes(initialBuilds);
    expect(screen.getByLabelText("Cantidad de Servicio separado")).toHaveValue(3);
    expect(
      screen.getByText(
        new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 2,
        })
          .format(1234.56)
          .replace(/\s/g, " "),
        { exact: false }
      )
    ).toBeInTheDocument();
    expect(fetcher.mock.calls.filter((call) => call[1]?.body)).toHaveLength(1);
  } finally {
    buildSearch.mockRestore();
  }
});
it("aprende tras revisar y pone el producto frecuente primero al reabrir y buscar por codigo", async () => {
  const staff = "90000000-0000-4000-8000-000000000001";
  const frequent = { ...catalog.products[0], id: second, name: "Servicio frecuente", code: "SP-2" };
  fetcher.mockImplementation(async (_url, init) => {
    if (!init?.method) return Response.json({ enabled: true, contact, invoices: [] });
    return Response.json(
      JSON.parse(init.body).action === "catalog"
        ? { ...catalog, products: [...catalog.products, frequent] }
        : quote
    );
  });
  const props = {
    alumno: { ...alumno, matriculas: alumno.matriculas.slice(0, 1) },
    onClose: vi.fn(),
    userId: staff,
  };
  const view = render(<FacturaElectronicaModal {...props} />);
  await screen.findByText("Servicio frecuente");
  expect(screen.getAllByRole("checkbox").map((el) => el.getAttribute("aria-label"))).toEqual([
    "Servicio separado",
    "Servicio frecuente",
  ]);
  fireEvent.click(screen.getByRole("checkbox", { name: "Servicio frecuente" }));
  expect(readBillingProductUsage(staff).products).toEqual({});
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText("Revision antes de emitir");
  expect(readBillingProductUsage(staff).products[second]).toBe(1);
  view.unmount();
  render(<FacturaElectronicaModal {...props} />);
  await screen.findByText("Servicio frecuente");
  expect(screen.getAllByRole("checkbox").map((el) => el.getAttribute("aria-label"))).toEqual([
    "Servicio frecuente",
    "Servicio separado",
  ]);
  fireEvent.change(screen.getByLabelText("Buscar productos"), { target: { value: "sp" } });
  expect(screen.getAllByRole("checkbox").map((el) => el.getAttribute("aria-label"))).toEqual([
    "Servicio frecuente",
    "Servicio separado",
  ]);
  fireEvent.change(screen.getByLabelText("Buscar productos"), { target: { value: "SP-2" } });
  expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  expect(screen.getByRole("checkbox", { name: "Servicio frecuente" })).not.toBeChecked();
});
it("no registra intentos fallidos ni selecciones canceladas", async () => {
  const staff = "90000000-0000-4000-8000-000000000001";
  fetcher.mockImplementation(async (_url, init) => {
    if (!init?.method) return Response.json({ enabled: true, contact, invoices: [] });
    return JSON.parse(init.body).action === "catalog"
      ? Response.json(catalog)
      : Response.json({ error: "Revisa la factura" }, { status: 422 });
  });
  render(
    <FacturaElectronicaModal
      userId={staff}
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  fireEvent.click(await screen.findByRole("checkbox", { name: "Servicio separado" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Servicio separado" }));
  expect(readBillingProductUsage(staff).products).toEqual({});
  fireEvent.click(screen.getByRole("checkbox", { name: "Servicio separado" }));
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText("Revisa la factura");
  expect(readBillingProductUsage(staff).products).toEqual({});
});
it("un favorito no disponible sigue deshabilitado y debajo de los disponibles", async () => {
  const staff = "90000000-0000-4000-8000-000000000001";
  const unavailable = {
    ...catalog.products[0],
    id: second,
    name: "No disponible",
    available: false,
  };
  rememberBillingProducts(staff, quoteId, [second], readBillingProductUsage(staff));
  fetcher.mockImplementation(async (_url, init) =>
    init?.method
      ? Response.json({ ...catalog, products: [unavailable, ...catalog.products] })
      : Response.json({ enabled: true, contact, invoices: [] })
  );
  render(
    <FacturaElectronicaModal
      userId={staff}
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  await screen.findByText("No disponible");
  expect(screen.getAllByRole("checkbox").map((el) => el.getAttribute("aria-label"))).toEqual([
    "Servicio separado",
    "No disponible",
  ]);
  expect(screen.getByRole("checkbox", { name: "No disponible" })).toBeDisabled();
});
it("preselecciona Efectivo habilitado y permite cambiarlo antes de revisar", async () => {
  fetcher.mockImplementation(async (_url, init) => {
    if (!init?.method) return Response.json({ enabled: true, contact, invoices: [] });
    return Response.json(
      JSON.parse(init.body).action === "catalog"
        ? { ...catalog, paymentMethods: ["Tarjeta Débito", "Efectivo"] }
        : quote
    );
  });
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  const method = await screen.findByLabelText("Medio de pago");
  expect(method).toHaveValue("Efectivo");
  fireEvent.change(method, { target: { value: "Tarjeta Débito" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Servicio separado" }));
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText("Revision antes de emitir");
  const command = fetcher.mock.calls
    .filter((c) => c[1]?.body)
    .map((c) => JSON.parse(c[1].body))
    .find((c) => c.action === "quote");
  expect(command.payment.method).toBe("Tarjeta Débito");
});
it("no impone Efectivo si FacturaX no lo tiene habilitado", async () => {
  fetcher.mockImplementation(async (_url, init) =>
    init?.method
      ? Response.json({ ...catalog, paymentMethods: ["Tarjeta Débito"] })
      : Response.json({ enabled: true, contact, invoices: [] })
  );
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  expect(await screen.findByLabelText("Medio de pago")).toHaveValue("");
  fireEvent.click(screen.getByRole("checkbox", { name: "Servicio separado" }));
  expect(screen.getByRole("button", { name: "Revisar factura" })).toBeDisabled();
});
it("conserva el municipio y perfil guardados al abrir el editor de facturacion", async () => {
  fetcher.mockImplementation(async () =>
    Response.json({
      enabled: true,
      contact: {
        ...contact,
        ciudad: "MEDELLÍN",
        departamento: "Antioquia",
        datos_facturacion: {
          ...contact.datos_facturacion,
          cityCode: "05001",
          taxRegime: "especial",
          responsibilities: "O-13",
        },
      },
      invoices: [],
    })
  );
  render(<FacturaElectronicaModal alumno={alumno} onClose={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar contacto" }));
  expect(screen.getByLabelText("Departamento")).toHaveValue("Antioquia");
  expect(screen.getByLabelText("Municipio")).toHaveValue("05001");
  expect(screen.getByLabelText("Regimen fiscal")).toHaveValue("especial");
  expect(screen.getByLabelText("Responsabilidad fiscal")).toHaveValue("O-13");
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Regimen fiscal"), { target: { value: "simple" } });
  expect(screen.getByLabelText("Responsabilidad fiscal")).toHaveValue("O-47");
});
it("exige seleccionar un contrato cuando el alumno tiene varios", async () => {
  render(<FacturaElectronicaModal alumno={alumno} onClose={vi.fn()} />);
  await screen.findByLabelText("Contrato");
  expect(screen.getByLabelText("Contrato")).toHaveValue("");
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Contrato"), { target: { value: second } });
  await screen.findByText("Servicio separado");
  const calls = fetcher.mock.calls.map((c) => (c[1]?.body ? JSON.parse(c[1].body) : null));
  expect(calls.find((c) => c?.action === "catalog")).toMatchObject({
    alumnoId: student,
    contratoId: second,
  });
});
it("permite seleccionar ANSV, exige precio variable e IVA y envia solo el precio de esa factura", async () => {
  const variable = {
    ...catalog.products[0],
    name: "ANSV",
    price: 0,
    taxTreatment: "unconfigured",
    available: true,
    priceEditable: true,
    requiresTaxChoice: true,
  };
  fetcher.mockImplementation(async (_url, init) => {
    if (!init?.method) return Response.json({ enabled: true, contact, invoices: [] });
    return Response.json(
      JSON.parse(init.body).action === "catalog" ? { ...catalog, products: [variable] } : quote
    );
  });
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  fireEvent.click(await screen.findByRole("checkbox", { name: "ANSV" }));
  fireEvent.change(screen.getByLabelText("Medio de pago"), { target: { value: "Efectivo" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText(/Ingresa un precio valido para ANSV/);
  fireEvent.change(screen.getByLabelText("Precio de ANSV"), { target: { value: "12345.67" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText(/Selecciona el tratamiento de IVA de ANSV/);
  fireEvent.change(screen.getByLabelText("IVA de ANSV"), { target: { value: "excluded" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText("Revision antes de emitir");
  const commands = fetcher.mock.calls.filter((c) => c[1]?.body).map((c) => JSON.parse(c[1].body));
  expect(commands.filter((c) => c.action === "quote")).toHaveLength(1);
  expect(commands.find((c) => c.action === "quote").items).toEqual([
    { productId, quantity: 1000, unitPrice: 1234567, taxChoice: "excluded" },
  ]);
  expect(variable.price).toBe(0);
});
it("siempre muestra el correo guardado, aunque todavia no se haya seleccionado contrato", async () => {
  fetcher.mockImplementation(async () =>
    Response.json({
      enabled: true,
      contact: { ...contact, email: "actual@example.com" },
      invoices: [],
    })
  );
  render(<FacturaElectronicaModal alumno={alumno} onClose={vi.fn()} />);
  const input = await screen.findByLabelText("Correo electronico del alumno");
  expect(input).toHaveValue("actual@example.com");
  expect(input).toHaveAttribute("readonly");
  expect(screen.queryByRole("button", { name: "Guardar datos" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Contrato")).toHaveValue("");
});
it("mantiene visible el correo en la revision aunque la entrega sea impresa", async () => {
  fetcher.mockImplementation(async (_url, init) => {
    if (!init?.method) return Response.json({ enabled: true, contact, invoices: [] });
    return Response.json(
      JSON.parse(init.body).action === "catalog" ? catalog : { ...quote, delivery: "physical" }
    );
  });
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  fireEvent.click(await screen.findByRole("checkbox", { name: "Servicio separado" }));
  fireEvent.change(screen.getByLabelText("Medio de pago"), { target: { value: "Efectivo" } });
  fireEvent.change(screen.getByLabelText("Entrega"), { target: { value: "physical" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText("Revision antes de emitir");
  expect(screen.getByLabelText("Correo electronico del alumno")).toHaveValue("ana@example.com");
  expect(screen.getByText(/ana@example.com/)).toHaveTextContent("Entrega impresa");
});
it("pide el correo faltante, lo guarda y carga el catalogo con entrega por correo", async () => {
  let savedEmail: string | null = null;
  fetcher.mockImplementation(async (_url, init) => {
    if (!init?.method)
      return Response.json({
        enabled: true,
        contact: { ...contact, email: savedEmail },
        invoices: [],
      });
    const body = JSON.parse(init.body);
    if (body.action === "billing_contact") {
      savedEmail = body.contact.email;
      return Response.json({ contact: { ...contact, ...body.contact, version: "b".repeat(64) } });
    }
    return Response.json(catalog);
  });
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, email: null, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  const input = await screen.findByLabelText("Correo electronico del alumno");
  expect(screen.queryByText("Servicio separado")).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: " ANA@example.com " } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
  await screen.findByText("Servicio separado");
  expect(savedEmail).toBe("ana@example.com");
  expect(screen.getByLabelText("Entrega")).toHaveValue("email");
  expect(screen.getByLabelText("Correo electronico del alumno")).toHaveValue("ana@example.com");
  expect(screen.getByLabelText("Correo electronico del alumno")).toHaveAttribute("readonly");
  const commands = fetcher.mock.calls.filter((c) => c[1]?.body).map((c) => JSON.parse(c[1].body));
  expect(commands[0]).toEqual({
    action: "billing_contact",
    alumnoId: student,
    version: contact.version,
    contact: {
      email: "ana@example.com",
      telefono: contact.telefono,
      direccion: contact.direccion,
      ciudad: contact.ciudad,
      departamento: contact.departamento,
      datos_facturacion: contact.datos_facturacion,
    },
  });
  expect(commands[1].action).toBe("catalog");
});
it("no guarda ni consulta productos si el correo es invalido", async () => {
  fetcher.mockResolvedValue(
    Response.json({ enabled: true, contact: { ...contact, email: null }, invoices: [] })
  );
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, email: null, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  fireEvent.change(await screen.findByLabelText("Correo electronico del alumno"), {
    target: { value: "no-es-correo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
  await screen.findByText(/Completa los campos/);
  expect(fetcher.mock.calls.filter((c) => c[1]?.method)).toHaveLength(0);
});
it("un fallo al guardar conserva el campo y no carga el catalogo", async () => {
  fetcher.mockImplementation(async (_url, init) =>
    init?.method
      ? Response.json({ error: "No se pudo guardar el correo." }, { status: 503 })
      : Response.json({ enabled: true, contact: { ...contact, email: null }, invoices: [] })
  );
  render(<FacturaElectronicaModal alumno={{ ...alumno, email: null }} onClose={vi.fn()} />);
  const input = await screen.findByLabelText("Correo electronico del alumno");
  fireEvent.change(input, { target: { value: "ana@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
  await screen.findByText("No se pudo guardar el correo.");
  expect(input).toHaveValue("ana@example.com");
  expect(screen.queryByText("Servicio separado")).not.toBeInTheDocument();
});
it("mantiene la seleccion y permite quitar y volver a marcar productos en StrictMode", async () => {
  render(
    <StrictMode>
      <FacturaElectronicaModal
        alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
        onClose={vi.fn()}
      />
    </StrictMode>
  );
  await screen.findByText("Servicio separado");
  const checkbox = screen.getByRole("checkbox");
  fireEvent.click(checkbox);
  expect(checkbox).toBeChecked();
  expect(screen.getByLabelText("Cantidad de Servicio separado")).toHaveValue(1);
  fireEvent.click(checkbox);
  expect(checkbox).not.toBeChecked();
  expect(screen.queryByLabelText("Cantidad de Servicio separado")).not.toBeInTheDocument();
  fireEvent.click(checkbox);
  expect(checkbox).toBeChecked();
});
it("muestra primero los productos disponibles y explica los bloqueos sin cambiar sus impuestos", async () => {
  const products = [
    {
      ...catalog.products[0],
      id: second,
      name: "Servicio sin IVA definido",
      taxTreatment: "unconfigured",
      available: false,
    },
    {
      ...catalog.products[0],
      id: quoteId,
      name: "Servicio sin precio",
      price: 0,
      available: false,
    },
    catalog.products[0],
  ];
  fetcher.mockImplementation(async (_url, init) =>
    Response.json(
      init?.method ? { ...catalog, products } : { enabled: true, contact, invoices: [] }
    )
  );
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  await screen.findByText("1 disponibles · 2 pendientes de configurar");
  expect(screen.getAllByRole("checkbox")[0]).toHaveAccessibleName("Servicio separado");
  const available = screen.getByRole("checkbox", { name: "Servicio separado" });
  expect(available).toBeEnabled();
  fireEvent.click(available);
  expect(available).toBeChecked();
  expect(screen.getByLabelText("Cantidad de Servicio separado")).toHaveValue(1);
  const noTax = screen.getByRole("checkbox", { name: "Servicio sin IVA definido" });
  expect(noTax).toBeDisabled();
  expect(noTax).toHaveAccessibleDescription("Falta definir el tratamiento de IVA en FacturaX.");
  expect(screen.getByRole("checkbox", { name: "Servicio sin precio" })).toHaveAccessibleDescription(
    "Falta definir un precio mayor que cero en FacturaX."
  );
  expect(screen.getByRole("link", { name: "Configurar en FacturaX" })).toHaveAttribute(
    "href",
    "https://www.facturax.co"
  );
  expect(products[0].taxTreatment).toBe("unconfigured");
  expect(products[1].price).toBe(0);
});
it("revisa productos, exige confirmación explícita y evita doble clic; el timeout conserva la solicitud", async () => {
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  await screen.findByText("Servicio separado");
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText("Medio de pago"), { target: { value: "Efectivo" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText("Revision antes de emitir");
  expect(screen.getByRole("button", { name: "Emitir en FacturaX" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  const emit = screen.getByRole("button", { name: "Emitir en FacturaX" });
  fireEvent.click(emit);
  fireEvent.click(emit);
  await screen.findByText("Solicitud guardada");
  expect(screen.getByText("Resultado por confirmar")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Emitir en FacturaX" })).not.toBeInTheDocument();
  const commands = fetcher.mock.calls.filter((c) => c[1]?.body).map((c) => JSON.parse(c[1].body));
  expect(commands.filter((c) => c.action === "emit")).toHaveLength(1);
  expect(commands.find((c) => c.action === "quote")).toMatchObject({
    items: [{ productId, quantity: 1000 }],
    contratoId: contract,
  });
  expect(JSON.stringify(commands)).not.toMatch(/valor_total|categorias|matriculas/);
});
it("una cantidad vacía muestra error y no omite un producto marcado", async () => {
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  await screen.findByText("Servicio separado");
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText("Cantidad de Servicio separado"), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText("Medio de pago"), { target: { value: "Efectivo" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByRole("alert");
  expect(
    fetcher.mock.calls.filter((c) => c[1]?.body && JSON.parse(c[1].body).action === "quote")
  ).toHaveLength(0);
});
it("mantiene oculto el envío hasta que DIAN valide la factura", async () => {
  invoices = [
    {
      contratoId: contract,
      requestId: quoteId,
      status: { state: "unknown", number: "ESF1", emailState: null, quote: null },
    },
  ];
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  await screen.findByText("Factura ESF1");
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Enviar al alumno" })).not.toBeInTheDocument()
  );
  expect(screen.getByRole("button", { name: "Consultar estado" })).toBeInTheDocument();
});
it("permite completar todos los campos faltantes y solo entonces cargar productos", async () => {
  const incomplete = {
    ...contact,
    email: null,
    telefono: null,
    direccion: null,
    ciudad: null,
    departamento: null,
    datos_facturacion: null,
  };
  fetcher.mockImplementation(async (_url, init) => {
    if (!init?.method) return Response.json({ enabled: true, contact: incomplete, invoices: [] });
    const command = JSON.parse(init.body);
    return Response.json(
      command.action === "billing_contact"
        ? { contact: { ...contact, ...command.contact, version: "b".repeat(64) } }
        : catalog
    );
  });
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  await screen.findByLabelText("Telefono");
  for (const [label, value] of [
    ["Pais", "CO"],
    ["Departamento", "Nariño"],
    ["Municipio", "52356"],
    ["Tipo de persona", "2"],
    ["Regimen fiscal", "ordinario"],
    ["Responsabilidad fiscal", "R-99-PN"],
    ["Tratamiento tributario", "ZZ"],
  ])
    expect(screen.getByLabelText(label)).toHaveValue(value);
  expect(screen.queryByText("Servicio separado")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Correo electronico del alumno"), {
    target: { value: " ANA@example.com " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
  await screen.findByText(/Completa los campos/);
  expect(fetcher.mock.calls.filter((c) => c[1]?.method)).toHaveLength(0);
  for (const [label, value] of [
    ["Telefono", "3001234567"],
    ["Direccion", "Calle 1 numero 2"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
  await screen.findByText("Servicio separado");
  const commands = fetcher.mock.calls.filter((c) => c[1]?.body).map((c) => JSON.parse(c[1].body));
  expect(commands[0]).toEqual({
    action: "billing_contact",
    alumnoId: student,
    version: contact.version,
    contact: {
      email: "ana@example.com",
      telefono: contact.telefono,
      direccion: contact.direccion,
      ciudad: contact.ciudad,
      departamento: contact.departamento,
      datos_facturacion: contact.datos_facturacion,
    },
  });
  expect(commands[1]).toMatchObject({ action: "catalog", alumnoId: student, contratoId: contract });
  expect(JSON.stringify(commands)).not.toMatch(/valor_total|numero_contrato|categorias|matriculas/);
});
it("el error estructurado de FacturaX abre los campos para corregir", async () => {
  fetcher.mockImplementation(async (_url, init) =>
    init?.method
      ? Response.json(
          {
            error: "Falta telefono",
            code: "INVOICE_DATA_INCOMPLETE",
            issues: [{ field: "student.fiscal.phone", message: "Completa el telefono." }],
          },
          { status: 422 }
        )
      : Response.json({ enabled: true, contact, invoices: [] })
  );
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  expect(await screen.findByLabelText("Telefono")).toHaveValue(contact.telefono);
  expect(screen.getByRole("button", { name: "Guardar datos" })).toBeEnabled();
  expect(screen.getByText(/Completa el telefono\./)).toBeInTheDocument();
});
it("ofrece el editor real de alumno si falta identificacion y no consulta productos", async () => {
  fetcher.mockResolvedValue(
    Response.json({ enabled: true, contact: { ...contact, dni: "" }, invoices: [] })
  );
  const edit = vi.fn();
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onEditStudent={edit}
      onClose={vi.fn()}
    />
  );
  fireEvent.click(await screen.findByRole("button", { name: "Editar identificacion del alumno" }));
  expect(edit).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls.filter((c) => c[1]?.method)).toHaveLength(0);
});
it("una version antigua conserva los datos editados y permite recargar la ficha vigente", async () => {
  let loads = 0;
  fetcher.mockImplementation(async (_url, init) => {
    if (init?.method)
      return Response.json(
        { error: "La ficha cambio. Recarga los datos antes de guardar." },
        { status: 409 }
      );
    loads++;
    return Response.json({
      enabled: true,
      contact:
        loads === 1
          ? { ...contact, direccion: null }
          : { ...contact, email: "actual@example.com", version: "b".repeat(64) },
      invoices: [],
    });
  });
  render(<FacturaElectronicaModal alumno={alumno} onClose={vi.fn()} />);
  const address = await screen.findByLabelText("Direccion");
  fireEvent.change(address, { target: { value: "Calle 2 numero 3" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
  await screen.findByText("La ficha cambio. Recarga los datos antes de guardar.");
  expect(address).toHaveValue("Calle 2 numero 3");
  fireEvent.click(screen.getByRole("button", { name: "Recargar datos" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Correo electronico del alumno")).toHaveValue("actual@example.com")
  );
  expect(screen.queryByRole("button", { name: "Guardar datos" })).not.toBeInTheDocument();
});
it("bloquea emitir una quoted antigua sin perfil fiscal aunque la ficha ya este completa", async () => {
  invoices = [
    {
      contratoId: contract,
      requestId: quoteId,
      status: {
        state: "quoted",
        quote: { ...quote, customer: { ...customer, fiscal: undefined } },
      },
    },
  ];
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  await screen.findByText(/Esta revision no tiene los datos completos/);
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("button", { name: "Emitir en FacturaX" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Descartar preparacion" })).toBeEnabled();
  expect(fetcher.mock.calls.filter((c) => c[1]?.method)).toHaveLength(0);
});
it("muestra que la ficha cambio antes de confirmar una revision anterior", async () => {
  fetcher.mockResolvedValue(
    Response.json({
      enabled: true,
      contact: { ...contact, email: "nuevo@example.com" },
      invoices: [{ contratoId: contract, requestId: quoteId, status: { state: "quoted", quote } }],
    })
  );
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  await screen.findByText(/Los datos del alumno cambiaron/);
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("button", { name: "Emitir en FacturaX" })).toBeDisabled();
});
it("una factura aceptada historica no ofrece emitir otra vez ni descartar una preparacion inexistente", async () => {
  invoices = [
    {
      contratoId: contract,
      requestId: quoteId,
      status: {
        state: "accepted",
        number: "ESF1",
        emailState: "sent",
        quote: { ...quote, sourceStudent: undefined, customer: { ...customer, fiscal: undefined } },
      },
    },
  ];
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  await screen.findByText("Datos de la factura");
  expect(screen.queryByRole("button", { name: "Emitir en FacturaX" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Descartar preparacion" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Esta revision no tiene los datos completos/)).not.toBeInTheDocument();
  expect(screen.getByText("Factura ESF1")).toBeInTheDocument();
});

it("cambia unidades de una en una, respeta limites y conserva la seleccion al buscar", async () => {
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  fireEvent.click(await screen.findByRole("checkbox", { name: "Servicio separado" }));
  const quantity = screen.getByLabelText("Cantidad de Servicio separado");
  const decrease = screen.getByRole("button", { name: "Reducir cantidad de Servicio separado" });
  const increase = screen.getByRole("button", { name: "Aumentar cantidad de Servicio separado" });
  expect(quantity).toHaveAttribute("min", "1");
  expect(quantity).toHaveAttribute("step", "1");
  expect(decrease).toBeDisabled();
  fireEvent.click(increase);
  expect(quantity).toHaveValue(2);
  fireEvent.click(decrease);
  expect(quantity).toHaveValue(1);
  for (const value of ["1.5", "0.001", "1e2", "-1"]) {
    fireEvent.change(quantity, { target: { value } });
    expect(quantity).toHaveValue(1);
  }
  fireEvent.change(quantity, { target: { value: "1000" } });
  expect(increase).toBeDisabled();
  fireEvent.click(decrease);
  expect(quantity).toHaveValue(999);
  fireEvent.change(quantity, { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Buscar productos"), {
    target: { value: "sin resultado" },
  });
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.getByText(/1 seleccionado/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Buscar productos"), { target: { value: "SP" } });
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(screen.getByLabelText("Cantidad de Servicio separado")).toHaveValue(3);
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText("Revision antes de emitir");
  const commands = fetcher.mock.calls
    .filter((call) => call[1]?.body)
    .map((call) => JSON.parse(call[1].body));
  expect(commands.find((command) => command.action === "quote").items).toEqual([
    { productId, quantity: 3000 },
  ]);
});

it.each(["0", "1001"])("no prepara una factura con %s unidades", async (value) => {
  render(
    <FacturaElectronicaModal
      alumno={{ ...alumno, matriculas: alumno.matriculas.slice(0, 1) }}
      onClose={vi.fn()}
    />
  );
  fireEvent.click(await screen.findByRole("checkbox", { name: "Servicio separado" }));
  fireEvent.change(screen.getByLabelText("Cantidad de Servicio separado"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar factura" }));
  await screen.findByText("Revisa las cantidades: solo unidades enteras entre 1 y 1000.");
  expect(
    fetcher.mock.calls.filter(
      (call) => call[1]?.body && JSON.parse(call[1].body).action === "quote"
    )
  ).toHaveLength(0);
});
