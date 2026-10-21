// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), summary: vi.fn() }));
vi.mock("@/lib/dashboard-auth-server", () => ({ getDashboardInitialAuthState: mock.auth }));
vi.mock("@/lib/dashboard-admin-summary-server", () => ({
  getInitialAdminDashboardSummary: mock.summary,
}));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirect-login");
  },
}));
vi.mock("@/components/dashboard/home/AdminDashboardHome", () => ({ default: () => null }));
vi.mock("@/components/dashboard/home/AlumnoDashboardHome", () => ({ default: () => null }));
vi.mock("@/components/dashboard/home/SuperAdminDashboardHome", () => ({ default: () => null }));
import DashboardPage from "./page";
import {
  createEmptyAdminDashboardSummary,
  buildDashboardSummaryCacheKey,
} from "@/lib/dashboard-admin-summary";

const profile = {
  id: "actor",
  rol: "admin_sede",
  escuela_id: "school",
  sede_id: "branch",
  activo: true,
};
const state = () => ({ user: { id: "actor", app_metadata: {} }, perfil: profile });
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue(state());
  mock.summary.mockResolvedValue({
    key: buildDashboardSummaryCacheKey("admin", profile),
    data: createEmptyAdminDashboardSummary(),
    expiresAt: Date.now() + 120000,
  });
});

it("embeds the summary from the verified profile with the exact client scope key", async () => {
  const element = await DashboardPage();
  expect(mock.summary).toHaveBeenCalledWith(profile, "school");
  expect(element.props.initialSummary.key).toBe(buildDashboardSummaryCacheKey("admin", profile));
  expect(element.props.initialSummary.data).toEqual(createEmptyAdminDashboardSummary());
});

it("does not serialize financial data for a session requiring a password change", async () => {
  mock.auth.mockResolvedValue({
    ...state(),
    user: { app_metadata: { debe_cambiar_password: true } },
  });
  expect((await DashboardPage()).props.initialSummary).toBeNull();
  expect(mock.summary).not.toHaveBeenCalled();
});

it("does not preload financial data for a suspended school", async () => {
  mock.auth.mockResolvedValue({ ...state(), subscriptionAccess: { status: "suspended" } });
  expect((await DashboardPage()).props.initialSummary).toBeNull();
  expect(mock.summary).not.toHaveBeenCalled();
});

it("does not load an administrative summary for students or superadmins", async () => {
  for (const rol of ["alumno", "super_admin"]) {
    mock.auth.mockResolvedValue({ ...state(), perfil: { ...profile, rol } });
    await DashboardPage();
  }
  expect(mock.summary).not.toHaveBeenCalled();
});

it("rejects a revoked session before starting financial reads", async () => {
  mock.auth.mockResolvedValue(null);
  await expect(DashboardPage()).rejects.toThrow("redirect-login");
  expect(mock.summary).not.toHaveBeenCalled();
});
