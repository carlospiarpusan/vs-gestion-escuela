import { redirect } from "next/navigation";
import AdminDashboardHome from "@/components/dashboard/home/AdminDashboardHome";
import AlumnoDashboardHome from "@/components/dashboard/home/AlumnoDashboardHome";
import SuperAdminDashboardHome from "@/components/dashboard/home/SuperAdminDashboardHome";
import { getDashboardInitialAuthState } from "@/lib/dashboard-auth-server";

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

  return <AdminDashboardHome />;
}
