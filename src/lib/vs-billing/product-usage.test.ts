import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  billingProductUsageKey,
  readBillingProductUsage,
  rememberBillingProducts,
  createBillingProductSearch,
} from "./product-usage";

const user = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const first = "20000000-0000-4000-8000-000000000001";
const second = "20000000-0000-4000-8000-000000000002";
const request = "30000000-0000-4000-8000-000000000001";
beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

it("cuenta cada producto una vez por revision y conserva el uso al volver a abrir", () => {
  const usage = rememberBillingProducts(
    user,
    request,
    [first, first, second],
    readBillingProductUsage(user)
  );
  expect(usage.products).toEqual({ [first]: 1, [second]: 1 });
  expect(readBillingProductUsage(user)).toEqual(usage);
  expect(rememberBillingProducts(user, request, [first], usage)).toEqual(usage);
  expect(rememberBillingProducts(user, other, [second], usage).products[second]).toBe(2);
});
it("lee los cambios de otra instancia antes de incrementar", () => {
  const original = readBillingProductUsage(user);
  rememberBillingProducts(user, request, [first], original);
  expect(rememberBillingProducts(user, other, [first], original).products[first]).toBe(2);
});
it("separa preferencias por usuario y no guarda nada sin identificacion valida", () => {
  rememberBillingProducts(user, request, [first], readBillingProductUsage(user));
  expect(readBillingProductUsage(other).products).toEqual({});
  expect(billingProductUsageKey(other)).not.toBe(billingProductUsageKey(user));
  for (const identity of [null, undefined, "", "alumno@example.com"])
    expect(
      rememberBillingProducts(identity, request, [first], readBillingProductUsage(identity))
        .products
    ).toEqual({});
  expect(localStorage.length).toBe(1);
});
it.each([
  "not json",
  '{"version":2}',
  JSON.stringify({ version: 1, products: { [first]: -2 }, requests: [] }),
  JSON.stringify({ version: 1, products: { dangerous: 8 }, requests: [] }),
  "x".repeat(512001),
])("ignora preferencias corruptas o demasiado grandes", (raw) => {
  localStorage.setItem(billingProductUsageKey(user)!, raw);
  expect(readBillingProductUsage(user).products).toEqual({});
});
it("no bloquea las revisiones si el almacenamiento falla", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage unavailable");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota exceeded");
  });
  const initial = readBillingProductUsage(user);
  const used = rememberBillingProducts(user, request, [first], initial);
  expect(used.products[first]).toBe(1);
  expect(rememberBillingProducts(user, other, [first], used).products[first]).toBe(2);
});
it("solo guarda identificadores y frecuencia, nunca clientes ni importes", () => {
  rememberBillingProducts(
    user,
    request,
    [first, "invalid", "__proto__"],
    readBillingProductUsage(user)
  );
  const data = JSON.parse(localStorage.getItem(billingProductUsageKey(user)!)!);
  expect(data).toEqual({ version: 1, products: { [first]: 1 }, requests: [request] });
});
it("ordena por disponibilidad y frecuencia sin alterar el catalogo ni los empates", () => {
  const products = [
    { id: first, name: "Curso A", code: "C-1", available: true, price: 100 },
    { id: second, name: "Curso B", code: "C-2", available: true, price: 0 },
    { id: other, name: "Curso no disponible", code: "C-3", available: false, price: 999 },
  ];
  const usage = {
    version: 1 as const,
    products: { [first]: 1, [second]: 5, [other]: 50 },
    requests: [],
  };
  const search = createBillingProductSearch(products, usage);
  expect(search("CURSO").map((p) => p.id)).toEqual([second, first, other]);
  expect(search(" c- ").map((p) => p.id)).toEqual([second, first, other]);
  expect(search("c-1")).toEqual([products[0]]);
  expect(search("missing")).toEqual([]);
  expect(createBillingProductSearch(products, readBillingProductUsage(user))("")).toEqual(products);
  expect(products[0].id).toBe(first);
  expect(products[1].price).toBe(0);
});

it("normaliza el catalogo una vez y no vuelve a leer etiquetas por cada busqueda", () => {
  let labelReads = 0;
  const products = Array.from({ length: 1000 }, (_, index) => ({
    id: String(index),
    get name() {
      labelReads += 1;
      return `Servicio ${index}`;
    },
    code: `SP-${index}`,
    available: true,
  }));
  const search = createBillingProductSearch(products, readBillingProductUsage(user));
  expect(labelReads).toBe(1000);
  for (const query of ["s", "se", "ser", "SP-9", "missing", ""]) search(query);
  expect(labelReads).toBe(1000);
  expect(search(" SP-999 ").map((product) => product.id)).toEqual(["999"]);
});

it("conserva los resultados del algoritmo anterior en catalogos grandes y empates", () => {
  const products = Object.freeze(
    Array.from({ length: 2000 }, (_, index) =>
      Object.freeze({
        id: String(index),
        name: `${index % 2 ? "Práctica" : "ANSV"} Servicio ${index % 17}`,
        code: `P-${index}`,
        available: index % 5 !== 0,
        price: index % 3 ? 1000 : 0,
      })
    )
  );
  const usage = {
    version: 1 as const,
    products: Object.fromEntries(products.map((product, index) => [product.id, index % 11])),
    requests: [],
  };
  const search = createBillingProductSearch(products, usage);
  for (const query of ["", "  ", "SERVICIO", "PRÁCTICA", "practica", " p-12 ", "ANSV", "missing"]) {
    const normalized = query.trim().toLocaleLowerCase("es");
    const previous = products
      .filter((product) =>
        `${product.name} ${product.code}`.toLocaleLowerCase("es").includes(normalized)
      )
      .sort(
        (a, b) =>
          Number(b.available) - Number(a.available) ||
          (usage.products[b.id] ?? 0) - (usage.products[a.id] ?? 0)
      );
    expect(search(query)).toEqual(previous);
  }
});

it("reconstruye el orden con uso nuevo sin compartir preferencias entre usuarios", () => {
  const products = [
    { id: first, name: "ANSV", code: "A", available: true },
    { id: second, name: "Curso", code: "C", available: true },
  ];
  const original = createBillingProductSearch(products, readBillingProductUsage(user));
  const used = rememberBillingProducts(user, request, [second], readBillingProductUsage(user));
  expect(createBillingProductSearch(products, used)("").map((product) => product.id)).toEqual([
    second,
    first,
  ]);
  expect(original("")).toEqual(products);
  expect(createBillingProductSearch(products, readBillingProductUsage(other))("")).toEqual(
    products
  );
  expect(
    createBillingProductSearch(
      [...products, { id: other, name: "Nuevo", code: "N", available: true }],
      used
    )("nuevo")
  ).toHaveLength(1);
});
