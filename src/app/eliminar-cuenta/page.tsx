import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/site-metadata";
import ArcoForm from "../arco/ArcoForm";

export const metadata: Metadata = buildPublicMetadata({
  title: "Eliminar cuenta y datos",
  description:
    "Solicita la eliminacion de tu cuenta de ConduSoft y de los datos personales asociados a la app.",
  path: "/eliminar-cuenta",
  keywords: [
    "eliminar cuenta ConduSoft",
    "eliminacion de datos ConduSoft",
    "borrar cuenta app ConduSoft",
    "solicitud eliminacion cuenta",
  ],
});

export default function EliminarCuentaPage() {
  return (
    <ArcoForm
      initialTipo="cancelacion"
      badge="Eliminacion de cuenta"
      title="Eliminar cuenta y datos de ConduSoft"
      description="Usa este formulario para solicitar la eliminacion de tu cuenta de la app ConduSoft y de los datos personales asociados. Si algun dato debe conservarse por obligaciones legales, regulatorias, seguridad o soporte contractual, te informaremos el motivo y el periodo de retencion aplicable."
    />
  );
}
