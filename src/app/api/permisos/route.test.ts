// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET, PUT } from "./route";
import { getDefaultCapability } from "@/lib/role-capabilities";
const mock = vi.hoisted(() => ({ authorize: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeApiRequest: mock.authorize }));
beforeEach(() => {
  vi.clearAllMocks();
  mock.authorize.mockResolvedValue({ ok: true, perfil: { rol: "super_admin" } });
});
it("returns the effective matrix instead of persisted unenforced overrides", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.editable).toBe(false);
  expect(data.overrides).toEqual({});
  expect(data.capabilities.admin_sede.hours).toEqual(getDefaultCapability("admin_sede", "hours"));
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("legacy save requests are rejected instead of claiming to change permissions", async () => {
  const response = await PUT();
  expect(response.status).toBe(409);
  expect((await response.json()).error).toContain("consulta");
  expect(mock.authorize).toHaveBeenCalledWith(["super_admin"]);
});
it.each([GET, PUT])("requires an authorized session", async (handler) => {
  mock.authorize.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
  expect((await handler()).status).toBe(401);
});
