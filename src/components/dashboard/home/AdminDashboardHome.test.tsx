import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  buildDashboardSummaryCacheKey,
  createEmptyAdminDashboardSummary,
  type AdminDashboardInitialSummary,
} from "@/lib/dashboard-admin-summary";
import { invalidateDashboardClientCaches } from "@/lib/dashboard-client-cache";
const mock = vi.hoisted(() => ({
  profile: {
    id: "actor",
    nombre: "Ana",
    rol: "admin_sede",
    escuela_id: "school-a",
    sede_id: "branch-a",
  },
  fetch: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ perfil: mock.profile }) }));
vi.mock("@/hooks/useDeviceVariant", () => ({ useIsMobileVariant: () => false }));
vi.mock("@/lib/retry", () => ({ fetchJsonWithRetry: mock.fetch }));
vi.mock("./DeferredIncomeChart", () => ({ default: () => null }));
import AdminDashboardHome from "./AdminDashboardHome";

function seed(): AdminDashboardInitialSummary {
  const data = createEmptyAdminDashboardSummary();
  data.stats.alumnos = 777;
  return {
    key: buildDashboardSummaryCacheKey("admin", mock.profile),
    data,
    expiresAt: Date.now() + 120000,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  invalidateDashboardClientCaches();
  mock.fetch.mockResolvedValue(createEmptyAdminDashboardSummary());
});
afterEach(() => {
  cleanup();
  invalidateDashboardClientCaches();
});

it("renders the initial server summary without a second HTTP request", async () => {
  render(<AdminDashboardHome initialSummary={seed()} />);
  expect(screen.getByText("777")).toBeInTheDocument();
  expect(mock.fetch).not.toHaveBeenCalled();
});

it.each(["expired", "other-school"])("does not hydrate a %s summary", async (kind) => {
  const initial = seed();
  if (kind === "expired") initial.expiresAt = Date.now() - 1;
  else initial.key += ":other-school";
  render(<AdminDashboardHome initialSummary={initial} />);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledOnce());
  expect(screen.queryByText("777")).not.toBeInTheDocument();
});

it("does not resurrect the initial snapshot after a mutation invalidates client data", async () => {
  const initial = seed();
  const view = render(<AdminDashboardHome initialSummary={initial} />);
  expect(mock.fetch).not.toHaveBeenCalled();
  invalidateDashboardClientCaches();
  mock.profile = { ...mock.profile };
  view.rerender(<AdminDashboardHome initialSummary={initial} />);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.queryByText("777")).not.toBeInTheDocument());
});

it("rejects an older RSC snapshot even when browser Back remounts the component", async () => {
  const initial = seed();
  const view = render(<AdminDashboardHome initialSummary={initial} />);
  expect(screen.getByText("777")).toBeInTheDocument();
  view.unmount();
  const clock = vi.spyOn(Date, "now").mockReturnValue(initial.expiresAt - 120000 + 100);
  invalidateDashboardClientCaches();
  clock.mockRestore();
  render(<AdminDashboardHome initialSummary={initial} />);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledOnce());
  expect(screen.queryByText("777")).not.toBeInTheDocument();
});
