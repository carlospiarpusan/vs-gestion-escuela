import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getDashboardInitialAuthState } from "@/lib/dashboard-auth-server";
import { DASHBOARD_SCHOOL_COOKIE } from "@/lib/dashboard-scope";
import { canManageVsBilling } from "@/lib/vs-billing/scope";
import BillingConnectionClient from "./BillingConnectionClient";

export const metadata = {
  title: "Conexion vs-facturacion | ConduSoft",
  robots: { index: false, follow: false },
};

export default async function BillingConnectionPage() {
  const auth = await getDashboardInitialAuthState();
  const schoolId = (await cookies()).get(DASHBOARD_SCHOOL_COOKIE)?.value ?? null;
  if (
    !auth ||
    !canManageVsBilling(process.env.VS_BILLING_API_ENABLED === "true", auth.perfil, schoolId)
  )
    notFound();
  return <BillingConnectionClient />;
}
