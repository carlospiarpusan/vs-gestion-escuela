import { redirect } from "next/navigation";
import AdminDashboardHome from "@/components/dashboard/home/AdminDashboardHome";
import AlumnoDashboardHome from "@/components/dashboard/home/AlumnoDashboardHome";
import SuperAdminDashboardHome from "@/components/dashboard/home/SuperAdminDashboardHome";
import { getDashboardInitialAuthState } from "@/lib/dashboard-auth-server";
import { getInitialAdminDashboardSummary } from "@/lib/dashboard-admin-summary-server";
import type { AdminDashboardInitialSummary } from "@/lib/dashboard-admin-summary";

export default async function DashboardPage() {
  const initialState = await getDashboardInitialAuthState();
  if (!initialState) redirect("/login");
  const { perfil } = initialState;

  if (perfil?.rol === "super_admin") {
    return <SuperAdminDashboardHome />;
  }

  if (perfil?.rol === "alumno") {
    return <AlumnoDashboardHome />;
  }

  let initialSummary: AdminDashboardInitialSummary | null = null;
  if (
    perfil.escuela_id &&
    initialState.user.app_metadata?.debe_cambiar_password !== true &&
    initialState.subscriptionAccess?.status !== "suspended"
  ) {
    try {
      initialSummary = await getInitialAdminDashboardSummary(perfil, perfil.escuela_id);
    } catch {
      // Keep the existing client retry/error state if the summary is unavailable.
      console.error("dashboard.initial-summary.failed");
    }
  }
  return <AdminDashboardHome initialSummary={initialSummary} />;
}
