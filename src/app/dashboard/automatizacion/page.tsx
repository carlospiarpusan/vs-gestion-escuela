import { redirect } from "next/navigation";

export default function AutomatizacionPage() {
  redirect("/dashboard/gastos?section=facturas");
}
