"use client";
import { useAuth } from "@/hooks/useAuth";
import { canManageVsBilling } from "@/lib/vs-billing/scope";
import BillingConnectionWorkspace from "./BillingConnectionWorkspace";

export default function BillingConnectionClient() {
  const { perfil, activeEscuelaId } = useAuth();
  if (!perfil || !canManageVsBilling(true, perfil, activeEscuelaId))
    return <p role="status">Conexion no disponible para la escuela seleccionada.</p>;
  return <BillingConnectionWorkspace key={`${perfil.id}:${activeEscuelaId}`} />;
}
