import type { Metadata } from "next";
import RegisterPageClient from "@/components/public/RegisterPageClient";
import { buildPublicMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Crear cuenta",
  description:
    "Crea tu cuenta en ConduSoft y configura tu autoescuela en Colombia con alumnos, sedes, agenda, finanzas y flota desde una sola plataforma.",
  path: "/registro",
  keywords: [
    "crear cuenta ConduSoft",
    "software para autoescuelas registro",
    "plataforma para escuelas de conducción en Colombia",
  ],
});

export default function RegistroPage() {
  return <RegisterPageClient />;
}
