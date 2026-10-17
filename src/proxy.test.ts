// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getClaims, getUser } = vi.hoisted(() => ({ getClaims: vi.fn(), getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims, getUser } }),
}));
import { proxy } from "./proxy";

function request(path: string, withCookie = true) {
  return new NextRequest(`https://condusoft.co${path}`, {
    headers: withCookie ? { cookie: "sb-test-auth-token=test" } : {},
  });
}

describe("dashboard session proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null });
    getUser.mockResolvedValue({ data: { user: { id: "user-id" } }, error: null });
  });

  it("redirects anonymous dashboard requests without calling auth", async () => {
    const response = await proxy(request("/dashboard", false));
    expect(response.headers.get("location")).toBe("https://condusoft.co/login");
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("verifies the signature before passing dashboard requests to the protected layout", async () => {
    const response = await proxy(request("/dashboard/alumnos"));
    expect(response.headers.get("location")).toBeNull();
    expect(getClaims).toHaveBeenCalledOnce();
    expect(getUser).not.toHaveBeenCalled();
    expect(response.headers.get("server-timing")).toContain("supabase_auth");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it.each([
    { data: null, error: { message: "Invalid JWT" } },
    { data: { claims: {} }, error: null },
    { data: { claims: { sub: "user-id" } }, error: { message: "Expired JWT" } },
  ])("rejects invalid or expired claims", async (result) => {
    getClaims.mockResolvedValue(result);
    const response = await proxy(request("/dashboard"));
    expect(response.headers.get("location")).toBe("https://condusoft.co/login");
  });

  it("checks revocation on login to avoid a redirect loop for signed-out users", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "Revoked session" } });
    const response = await proxy(request("/login"));
    expect(getUser).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an authenticated login to the dashboard", async () => {
    const response = await proxy(request("/login"));
    expect(response.headers.get("location")).toBe("https://condusoft.co/dashboard");
  });
});
