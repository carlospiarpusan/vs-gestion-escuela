import type { Metadata } from "next";
import LegalDocumentShell from "@/components/public/LegalDocumentShell";
import { buildPublicMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Política de privacidad",
  description:
    "Conoce cómo AutoEscuela Pro trata la información operativa y de usuarios de autoescuelas y escuelas de conducción en Colombia.",
  path: "/privacidad",
  keywords: [
    "política de privacidad autoescuela pro",
    "datos software para autoescuelas",
    "privacidad escuelas de conducción",
  ],
});

export default function PrivacidadPage() {
  return (
    <LegalDocumentShell
      badge="Política de privacidad"
      title="Tratamiento básico de datos"
      description="AutoEscuela Pro utiliza la información suministrada por la escuela y sus usuarios para operar la plataforma, autenticar accesos, organizar la operación diaria y generar reportes internos."
      principles={[
        {
          title: "Uso limitado",
          description: "Los datos se usan para operar el servicio y no para finalidades ajenas a la gestión de la escuela.",
        },
        {
          title: "Responsabilidad compartida",
          description: "La plataforma protege el acceso; la escuela debe custodiar la calidad y legitimidad de lo que registra.",
        },
        {
          title: "Continuidad operativa",
          description: "El tratamiento de datos busca sostener la operación diaria con trazabilidad y acceso controlado.",
        },
      ]}
    >
      <section>
        <h2 className="text-lg font-semibold text-foreground">Qué datos usamos</h2>
        <p className="mt-2">
          Datos de identificación, contacto, operación académica, agenda, pagos, sedes, usuarios
          internos y flota cargados por la escuela.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Para qué los usamos</h2>
        <p className="mt-2">
          Para permitir el acceso a la plataforma, administrar alumnos, clases, finanzas y mantener
          la continuidad del servicio.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Control de la información</h2>
        <p className="mt-2">
          Cada escuela es responsable de la información que registra y de mantener actualizados los
          datos de sus usuarios autorizados.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
