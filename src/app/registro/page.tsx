import type { Metadata } from "next";
import RegisterPageClient from "@/components/public/RegisterPageClient";
import { buildPublicMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Crear cuenta",
  description:
    "Crea tu cuenta en Condusoft y configura tu autoescuela en Colombia con alumnos, sedes, agenda, finanzas y flota desde una sola plataforma.",
  path: "/registro",
  keywords: [
    "crear cuenta condusoft",
    "software para autoescuelas registro",
    "plataforma para escuelas de conducción en Colombia",
  ],
});

export default function RegistroPage() {
  return <RegisterPageClient />;
}
