import { redirect } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardClientLayout from "@/app/dashboard/DashboardClientLayout";
import { getDashboardInitialAuthState } from "@/lib/dashboard-auth-server";
import { Toaster } from "sonner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const initialState = await getDashboardInitialAuthState();

  if (!initialState) {
    redirect("/login");
  }

  return (
    <AuthProvider initialState={initialState}>
      <DashboardClientLayout>
        {children}
        <Toaster position="top-right" richColors />
      </DashboardClientLayout>
    </AuthProvider>
  );
}
