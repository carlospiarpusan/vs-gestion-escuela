import { redirect } from "next/navigation";

export default function BitacoraRedirectPage() {
  redirect("/dashboard/vehiculos?tab=bitacora");
}
