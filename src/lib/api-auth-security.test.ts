// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAllowedOrigin, authorizeApiRequest } from "./api-auth";

const mockAuth = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockAuth.getUser,
    },
    from: mockAuth.from,
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
  }),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

describe("api-auth security controls", () => {
  describe("isAllowedOrigin", () => {
    it("allows requests when origin header is absent (same-origin, curl, mobile native)", () => {
      expect(isAllowedOrigin(null, "example.com")).toBe(true);
      expect(isAllowedOrigin("", "example.com")).toBe(true);
    });

    it("allows matching origins with same host and port", () => {
      expect(isAllowedOrigin("http://localhost:3000", "localhost:3000")).toBe(true);
      expect(isAllowedOrigin("https://condusoft.co", "condusoft.co")).toBe(true);
      expect(isAllowedOrigin("https://app.escuela.com", "app.escuela.com:443")).toBe(true);
    });

    it("handles multiple forwarded hosts", () => {
      expect(isAllowedOrigin("https://condusoft.co", "condusoft.co, proxy.internal")).toBe(true);
    });

    it("rejects untrusted third-party origins (anti-CSRF)", () => {
      expect(isAllowedOrigin("https://malicious-attacker.com", "condusoft.co")).toBe(false);
      expect(isAllowedOrigin("http://evil.local", "localhost:3000")).toBe(false);
    });
  });

  describe("authorizeApiRequest security checks", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("rejects cross-site requests via Sec-Fetch-Site", async () => {
      const request = new Request("https://condusoft.co/api/sedes", {
        method: "POST",
        headers: {
          "sec-fetch-site": "cross-site",
          origin: "https://evil.com",
        },
      });

      const result = await authorizeApiRequest(["super_admin"], request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
      }
    });

    it("rejects mutative requests with foreign Origin header", async () => {
      const request = new Request("https://condusoft.co/api/sedes", {
        method: "POST",
        headers: {
          host: "condusoft.co",
          origin: "https://evil-attacker.com",
        },
      });

      const result = await authorizeApiRequest(["super_admin"], request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
      }
    });

    it("enforces debe_cambiar_password on server API requests", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-with-temp-pass",
            user_metadata: { debe_cambiar_password: true },
          },
        },
        error: null,
      });

      const request = new Request("https://condusoft.co/api/alumnos", {
        method: "GET",
      });

      const result = await authorizeApiRequest(["alumno"], request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        const data = await result.response.json();
        expect(data.code).toBe("MUST_CHANGE_PASSWORD");
      }
    });

    it("permits requests when allowMustChangePassword is explicitly set", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-with-temp-pass",
            user_metadata: { debe_cambiar_password: true },
          },
        },
        error: null,
      });

      mockAuth.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "user-with-temp-pass",
                rol: "alumno",
                escuela_id: "escuela-1",
                sede_id: "sede-1",
                activo: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const request = new Request("https://condusoft.co/api/alumnos", {
        method: "GET",
      });

      const result = await authorizeApiRequest(["alumno"], {
        request,
        allowMustChangePassword: true,
      });
      expect(result.ok).toBe(true);
    });
  });
});
