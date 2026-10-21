import { describe, expect, it } from "vitest";
import {
  buildBroadDashboardInvalidationTags,
  buildBroadFinanceInvalidationTags,
  buildDashboardCacheTags,
  buildDashboardListCacheTags,
  buildFinanceCacheTags,
  buildScopedMutationRevalidationTags,
} from "@/lib/server-cache-tags";

describe("server-cache-tags", () => {
  const scope = {
    escuelaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    sedeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  };

  it("genera tags de finanzas por módulo y alcance", () => {
    expect(buildFinanceCacheTags("income", scope)).toEqual(
      expect.arrayContaining([
        "finance",
        "finance:income",
        "finance:income:school:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "scope:school:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "scope:branch:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ])
    );
  });

  it("genera tags de dashboard por tipo", () => {
    expect(buildDashboardCacheTags("admin", scope)).toEqual(
      expect.arrayContaining(["dashboard", "dashboard:admin"])
    );
    expect(buildDashboardListCacheTags("vehiculos", scope)).toEqual(
      expect.arrayContaining(["dashboard", "dashboard:list:vehiculos"])
    );
    expect(buildDashboardCacheTags("alumno", { userId: "user-1" })).toEqual(
      expect.arrayContaining(["dashboard", "dashboard:alumno", "user:user-1"])
    );
  });

  it("expone invalidación amplia y estable por escuela/sede", () => {
    expect(buildBroadFinanceInvalidationTags(scope)).toEqual([
      "finance:school:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
    expect(buildBroadDashboardInvalidationTags(scope)).toEqual([
      "dashboard:school:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
    expect(
      buildScopedMutationRevalidationTags({
        scope,
        includeFinance: true,
        includeDashboard: true,
      })
    ).toEqual(
      expect.arrayContaining([
        "finance:school:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "dashboard:school:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ])
    );
  });
});
