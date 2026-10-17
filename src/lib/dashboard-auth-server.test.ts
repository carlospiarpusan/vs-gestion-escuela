// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, maybeSingle } = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
import { getDashboardInitialAuthState } from "./dashboard-auth-server";

describe("dashboard server authentication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a revoked session even when the proxy previously verified its JWT", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "Revoked session" } });
    expect(await getDashboardInitialAuthState()).toBeNull();
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it("rejects an inactive profile", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
    maybeSingle.mockResolvedValue({ data: { id: "test-user", activo: false }, error: null });
    expect(await getDashboardInitialAuthState()).toBeNull();
  });

  it("uses the current user and active profile for the page", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "test-user", email: "test@example.com" } },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: { id: "test-user", activo: true, rol: "alumno", escuela_id: null, sede_id: null },
      error: null,
    });
    const state = await getDashboardInitialAuthState();
    expect(state?.user.id).toBe("test-user");
    expect(state?.perfil.rol).toBe("alumno");
    expect(getUser).toHaveBeenCalledOnce();
  });
});
