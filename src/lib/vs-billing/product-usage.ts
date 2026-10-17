import { z } from "zod";
import { VS_BILLING_SCHOOL } from "./scope";

const id = z.uuid();
const usageSchema = z
  .object({
    version: z.literal(1),
    products: z
      .record(id, z.number().int().min(1).max(Number.MAX_SAFE_INTEGER))
      .refine((products) => Object.keys(products).length <= 10000),
    requests: z.array(id).max(500),
  })
  .strict();
export type BillingProductUsage = z.infer<typeof usageSchema>;
const emptyUsage = (): BillingProductUsage => ({ version: 1, products: {}, requests: [] });
export function billingProductUsageKey(userId: string | null | undefined) {
  return id.safeParse(userId).success
    ? `condusoft:facturax-products:v1:${VS_BILLING_SCHOOL.id}:${userId}`
    : null;
}
export function readBillingProductUsage(
  userId: string | null | undefined,
  fallback = emptyUsage()
): BillingProductUsage {
  const key = billingProductUsageKey(userId);
  if (!key) return emptyUsage();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw || raw.length > 512000) return fallback;
    const parsed = usageSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function rememberBillingProducts(
  userId: string | null | undefined,
  requestId: string,
  productIds: string[],
  fallback: BillingProductUsage
): BillingProductUsage {
  const key = billingProductUsageKey(userId);
  if (!key || !id.safeParse(requestId).success) return fallback;
  const current = readBillingProductUsage(userId, fallback);
  if (current.requests.includes(requestId)) return current;
  const products = { ...current.products };
  for (const productId of new Set(productIds.filter((value) => id.safeParse(value).success)))
    products[productId] = Math.min((products[productId] ?? 0) + 1, Number.MAX_SAFE_INTEGER);
  const next: BillingProductUsage = {
    version: 1,
    products: Object.fromEntries(
      Object.entries(products)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10000)
    ),
    requests: [...current.requests, requestId].slice(-500),
  };
  // This preference must never block a review when browser storage is unavailable.
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* Keep the in-memory order. */
  }
  return next;
}

export function createBillingProductSearch<
  T extends { id: string; name: string; code: string; available: boolean },
>(products: readonly T[], usage: BillingProductUsage): (query: string) => T[] {
  const entries = products
    .map((product) => ({
      product,
      searchText: `${product.name} ${product.code}`.toLocaleLowerCase("es"),
    }))
    .sort(
      (a, b) =>
        Number(b.product.available) - Number(a.product.available) ||
        (usage.products[b.product.id] ?? 0) - (usage.products[a.product.id] ?? 0)
    );
  return (query) => {
    const search = query.trim().toLocaleLowerCase("es");
    return entries
      .filter((entry) => entry.searchText.includes(search))
      .map((entry) => entry.product);
  };
}
