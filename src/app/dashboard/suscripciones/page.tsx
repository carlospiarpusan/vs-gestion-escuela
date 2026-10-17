"use client";

import PageScaffold from "@/components/dashboard/PageScaffold";
import SchoolBillingCenter from "@/components/dashboard/subscriptions/SchoolBillingCenter";
import SuperAdminSubscriptionsCenter from "@/components/dashboard/subscriptions/SuperAdminSubscriptionsCenter";
import { useAuth } from "@/hooks/useAuth";

export default function SuscripcionesPage() {
  const { perfil, loading } = useAuth();

  if (loading) {
    return (
      <PageScaffold
        eyebrow="Facturación"
        title="Suscripciones"
        description="Cargando el centro de facturación y control comercial."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60"
            />
          ))}
        </div>
      </PageScaffold>
    );
  }

  if (perfil?.rol === "admin_escuela") {
    return <SchoolBillingCenter />;
  }

  if (perfil?.rol !== "super_admin") {
    return (
      <PageScaffold
        eyebrow="Facturación"
        title="Suscripciones"
        description="Este apartado concentra el control comercial de la plataforma."
      >
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Solo `super_admin` y `admin_escuela` pueden gestionar suscripciones desde aquí.
        </div>
      </PageScaffold>
    );
  }

  return <SuperAdminSubscriptionsCenter />;
}
