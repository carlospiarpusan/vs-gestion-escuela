import { expect, it } from "vitest";
import { filterVercelEvent } from "./vercel-observability";

it("keeps analytics on public pages and strips private query parameters", () => {
  expect(
    filterVercelEvent(
      { url: "https://condusoft.co/registro?email=private@example.com#token" },
      "analytics"
    )
  ).toEqual({ url: "https://condusoft.co/registro" });
  for (const path of [
    "/dashboard",
    "/dashboard/alumnos",
    "/billing/pagar",
    "/print/contrato/id",
    "/api/auth/callback",
  ]) {
    expect(filterVercelEvent({ url: `https://condusoft.co${path}` }, "analytics")).toBeNull();
  }
});

it("permits sampled performance on the dashboard but excludes documents and callbacks", () => {
  expect(
    filterVercelEvent(
      { url: "https://condusoft.co/dashboard/alumnos?q=12345", type: "vital" },
      "speed"
    )
  ).toEqual({ url: "https://condusoft.co/dashboard/alumnos", type: "vital" });
  expect(filterVercelEvent({ url: "https://condusoft.co/print/recibo/id" }, "speed")).toBeNull();
  expect(filterVercelEvent({ url: "invalid-url" }, "speed")).toBeNull();
});
