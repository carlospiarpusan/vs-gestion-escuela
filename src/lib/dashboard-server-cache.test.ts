import { describe, expect, it } from "vitest";
import {
  buildDashboardListServerCacheKey,
  isFreshDashboardDataRequested,
} from "@/lib/dashboard-server-cache";

describe("dashboard-server-cache", () => {
  const scope = {
    escuelaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    sedeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  };

  it("genera claves estables aunque cambie el orden de los params", () => {
    const paramsA = new URLSearchParams("page=1&pageSize=10&q=clase");
    const paramsB = new URLSearchParams("q=clase&pageSize=10&page=1");

    expect(
      buildDashboardListServerCacheKey("vehiculos", "user-1", scope, paramsA)
    ).toBe(buildDashboardListServerCacheKey("vehiculos", "user-1", scope, paramsB));
  });

  it("detecta cuando se solicita un fetch fresco", () => {
    expect(isFreshDashboardDataRequested(new URLSearchParams("fresh=1&page=2"))).toBe(true);
    expect(isFreshDashboardDataRequested(new URLSearchParams("page=2"))).toBe(false);
  });
});
