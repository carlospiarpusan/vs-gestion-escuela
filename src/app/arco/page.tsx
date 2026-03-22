import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/site-metadata";
import ArcoForm from "./ArcoForm";

export const metadata: Metadata = buildPublicMetadata({
  title: "Derechos ARCO - Proteccion de datos",
  description:
    "Ejerce tus derechos de Acceso, Rectificacion, Cancelacion u Oposicion sobre tus datos personales conforme a la Ley 1581 de 2012.",
  path: "/arco",
  keywords: ["derechos arco colombia", "habeas data", "proteccion datos personales", "ley 1581"],
});

export default function ArcoPage() {
  return <ArcoForm />;
}
