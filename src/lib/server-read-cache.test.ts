// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cache: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: mocks.cache, revalidateTag: mocks.revalidate }));
import { getServerReadCached, revalidateServerReadCache } from "./server-read-cache";

beforeEach(() => vi.clearAllMocks());

it("deduplicates invalidations and expires financial data before the next read", () => {
  revalidateServerReadCache(["finance:income:school:a", "finance:income:school:a"]);
  const calls = mocks.revalidate.mock.calls;
  expect(calls.filter(([tag]) => tag === "finance:income:school:a")).toHaveLength(1);
  expect(calls).toContainEqual(["finance:income:aggregate", { expire: 0 }]);
  expect(calls.every(([, policy]) => policy.expire === 0)).toBe(true);
  expect(calls.some(([tag]) => ["scope", "finance", "dashboard"].includes(tag))).toBe(false);
});

it("does not reuse entries created before the scoped-tag deployment", async () => {
  mocks.cache.mockImplementation((loader) => loader);
  await getServerReadCached({ key: "existing-key", ttlMs: 120000, loader: async () => 7 });
  expect(mocks.cache.mock.calls[0][1]).toEqual(["school-domain-tags-v2", "existing-key"]);
});
