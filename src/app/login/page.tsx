import type { Metadata } from "next";
import LoginPageClient from "@/components/public/LoginPageClient";
import { buildPublicMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Iniciar sesión",
  description:
    "Accede a Condusoft para controlar alumnos, clases, ingresos, cartera, gastos y operación diaria de tu autoescuela en Colombia.",
  path: "/login",
  keywords: [
    "iniciar sesión condusoft",
    "login software para autoescuelas",
    "panel para escuelas de conducción",
  ],
});

export default function LoginPage() {
  return <LoginPageClient />;
}
