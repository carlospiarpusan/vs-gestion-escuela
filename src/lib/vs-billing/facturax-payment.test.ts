import { expect, it, vi } from "vitest";
import {
  invoicePaymentDateIssue,
  invoiceCollectionIssues,
  invoiceCollectionChoiceSchema,
  facturaxSelectionSchema,
  facturaxCatalogSchema,
  facturaxStatusSchema,
  invoiceQuotePaymentIssue,
  type FacturaxCatalog,
  type FacturaxQuote,
} from "./facturax-contract";

it.each([
  ["contado", "2026-10-20", null],
  ["contado", "2026-10-19", /contado/],
  ["contado", "2026-10-21", /contado/],
  ["credito", "2026-10-20", null],
  ["credito", "2026-11-20", null],
  ["credito", "2026-10-19", /crédito/],
  ["credito", "2026-02-30", /válida/],
] as const)("valida vencimiento %s %s sin inferir recaudos", (condition, dueDate, issue) => {
  const result = invoicePaymentDateIssue({ method: "Efectivo", condition, dueDate }, "2026-10-20");
  if (issue) expect(result).toMatch(issue);
  else expect(result).toBeNull();
});
it("usa el día de Bogotá incluso cuando UTC ya cambió de fecha", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-21T02:00:00Z"));
  try {
    expect(
      invoicePaymentDateIssue({ method: "Efectivo", condition: "contado", dueDate: "2026-10-20" })
    ).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

const catalog: FacturaxCatalog = {
  schemaVersion: 1,
  issuerNit: "901171550",
  products: [],
  paymentMethods: ["Efectivo", "Transferencia"],
  customer: null,
  customerIssue: null,
  capabilities: { paymentCollection: true, accountingPreflight: true, businessStatus: true },
  collectionAccounts: [
    { code: "110505", name: "Caja" },
    { code: "111005", name: "Banco" },
  ],
  defaultCollectionAccounts: [{ method: "Efectivo", accountCode: "110505" }],
  canConfirmCollections: true,
  accounting: { ready: true, issues: [] },
};
const payment = { method: "Efectivo", condition: "contado" as const, dueDate: "2026-10-20" };
it("conserva capacidades y campos contables sin inventar valores para catálogos antiguos", () => {
  expect(facturaxCatalogSchema.parse(catalog)).toEqual(catalog);
  const legacy = { ...catalog };
  delete legacy.capabilities;
  delete legacy.collectionAccounts;
  delete legacy.defaultCollectionAccounts;
  delete legacy.canConfirmCollections;
  delete legacy.accounting;
  expect(facturaxCatalogSchema.parse(legacy)).toEqual(legacy);
  expect(invoiceCollectionIssues(legacy, payment)).toEqual([]);
  expect(
    invoiceCollectionIssues(legacy, { ...payment, collection: { state: "pending" } })
  ).toHaveLength(1);
});
it("exige elección explícita pero no equipara contado con recibido", () => {
  expect(invoiceCollectionIssues(catalog, payment)[0].field).toBe("payment.collection");
  expect(
    invoiceCollectionIssues(catalog, { ...payment, collection: { state: "pending" } })
  ).toEqual([]);
});
it("solo admite recibido confirmado, sin importes o fechas proporcionados por el cliente", () => {
  expect(
    invoiceCollectionChoiceSchema.safeParse({ state: "received", confirmed: true }).success
  ).toBe(true);
  for (const choice of [
    { state: "received" },
    { state: "received", confirmed: false },
    { state: "received", confirmed: true, amount: 100 },
    { state: "received", confirmed: true, date: "2026-10-20" },
    { state: "pending", confirmed: true },
    { state: "received", confirmed: true, cashAccountCode: "413505" },
  ]) {
    expect(invoiceCollectionChoiceSchema.safeParse(choice).success).toBe(false);
  }
  expect(
    facturaxSelectionSchema.shape.payment.safeParse({
      ...payment,
      condition: "credito",
      collection: { state: "received", confirmed: true },
    }).success
  ).toBe(false);
});
it("no infiere caja para transferencias, admite cuenta explícita y comprueba permiso", () => {
  const received = { state: "received" as const, confirmed: true as const };
  expect(invoiceCollectionIssues(catalog, { ...payment, collection: received })).toEqual([]);
  expect(
    invoiceCollectionIssues(catalog, {
      ...payment,
      method: "Transferencia",
      collection: received,
    })[0].field
  ).toBe("payment.collection.cashAccountCode");
  expect(
    invoiceCollectionIssues(catalog, {
      ...payment,
      method: "Instrumento no definido",
      collection: { ...received, cashAccountCode: "110505" },
    })[0].field
  ).toBe("payment.method");
  expect(
    invoiceCollectionIssues(catalog, {
      ...payment,
      method: "Transferencia",
      collection: { ...received, cashAccountCode: "111005" },
    })
  ).toEqual([]);
  expect(
    invoiceCollectionIssues(
      { ...catalog, canConfirmCollections: false },
      { ...payment, collection: received }
    )[0].field
  ).toBe("payment.collection");
  expect(
    invoiceCollectionIssues(catalog, {
      ...payment,
      collection: { ...received, cashAccountCode: "119999" },
    })[0].field
  ).toBe("payment.collection.cashAccountCode");
});
it("no elige una cuenta cuando hay varias predeterminadas o códigos duplicados", () => {
  const received = {
    ...payment,
    collection: { state: "received" as const, confirmed: true as const },
  };
  expect(
    invoiceCollectionIssues(
      {
        ...catalog,
        defaultCollectionAccounts: [
          ...catalog.defaultCollectionAccounts!,
          { method: "Efectivo", accountCode: "111005" },
        ],
      },
      received
    )
  ).toHaveLength(1);
  expect(
    invoiceCollectionIssues(
      {
        ...catalog,
        collectionAccounts: [...catalog.collectionAccounts!, catalog.collectionAccounts![0]],
      },
      received
    )
  ).toHaveLength(1);
});
it("falla de forma cerrada si anuncia prevalidación pero faltan resultados contables", () => {
  expect(
    invoiceCollectionIssues(
      { ...catalog, accounting: undefined },
      { ...payment, collection: { state: "pending" } }
    )[0].field
  ).toBe("accounting.configuration");
  const issues = [{ field: "accounting.rules", message: "Falta cuenta de ingresos." }];
  expect(
    invoiceCollectionIssues(
      { ...catalog, accounting: { ready: false, issues } },
      { ...payment, collection: { state: "pending" } }
    )
  ).toEqual(issues);
});
it("conserva nulos y distingue DIAN de asiento y cartera en estados", () => {
  const status = {
    schemaVersion: 1,
    issuerNit: "901171550",
    id: "10000000-0000-4000-8000-000000000001",
    studentId: "10000000-0000-4000-8000-000000000002",
    state: "accepted",
    documentId: "10000000-0000-4000-8000-000000000003",
    number: "FE1",
    cufe: "abc",
    emailState: null,
    quote: null,
    business: {
      accounting: { state: "pending", journalReference: null, issue: null },
      collection: { state: "unregistered", balance: null, paid: null, issue: null, receipts: [] },
    },
  };
  expect(facturaxStatusSchema.parse(status)).toEqual(status);
  const legacy: Omit<typeof status, "business"> & { business?: typeof status.business } = {
    ...status,
  };
  delete legacy.business;
  expect(facturaxStatusSchema.parse(legacy)).not.toHaveProperty("business");
});
it("rechaza una revisión que pierde la elección, cambia la cuenta o declara un importe distinto", () => {
  const selected = {
    ...payment,
    collection: { state: "received" as const, confirmed: true as const, cashAccountCode: "111005" },
  };
  const quote = {
    payment: {
      ...selected,
      collection: { ...selected.collection, date: "2026-10-20", amount: 100000 },
    },
    totals: { total: 100000 },
  } as FacturaxQuote;
  expect(invoiceQuotePaymentIssue(quote, selected)).toBeNull();
  expect(invoiceQuotePaymentIssue(quote, payment)).toMatch(/no autorizaste/);
  expect(
    invoiceQuotePaymentIssue(
      { ...quote, payment: { ...payment, collection: { state: "pending" } } },
      selected
    )
  ).toMatch(/no confirmó/);
  expect(
    invoiceQuotePaymentIssue(
      {
        ...quote,
        payment: {
          ...quote.payment,
          collection: {
            ...quote.payment.collection!,
            state: "received",
            confirmed: true,
            cashAccountCode: "110505",
            date: "2026-10-20",
            amount: 100000,
          },
        },
      },
      selected
    )
  ).toMatch(/cuenta receptora/);
  expect(
    invoiceQuotePaymentIssue(
      { ...quote, totals: { subtotal: 200000, vat: 0, total: 200000 } },
      selected
    )
  ).toMatch(/no coincide/);
});
