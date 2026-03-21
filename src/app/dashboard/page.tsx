"use client";

import AdminDashboardHome from "@/components/dashboard/home/AdminDashboardHome";
import AlumnoDashboardHome from "@/components/dashboard/home/AlumnoDashboardHome";
import SuperAdminDashboardHome from "@/components/dashboard/home/SuperAdminDashboardHome";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { perfil } = useAuth();

  if (perfil?.rol === "super_admin") {
    return <SuperAdminDashboardHome />;
  }

  if (perfil?.rol === "alumno") {
    return <AlumnoDashboardHome />;
  }

  return <AdminDashboardHome />;
}
