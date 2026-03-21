import type { Metadata } from "next";
import LegalDocumentShell from "@/components/public/LegalDocumentShell";
import { buildPublicMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Términos y condiciones",
  description:
    "Consulta los términos básicos de uso de AutoEscuela Pro para autoescuelas y escuelas de conducción en Colombia.",
  path: "/terminos",
  keywords: [
    "términos autoescuela pro",
    "condiciones software para autoescuelas",
    "términos escuelas de conducción",
  ],
});

export default function TerminosPage() {
  return (
    <LegalDocumentShell
      badge="Términos y condiciones"
      title="Uso básico de la plataforma"
      description="AutoEscuela Pro es una herramienta de apoyo operativo para escuelas de conducción. El uso de la plataforma implica la responsabilidad de custodiar usuarios, contraseñas y la información registrada dentro del sistema."
      principles={[
        {
          title: "Acceso responsable",
          description: "Las cuentas deben asignarse únicamente a personal autorizado y con trazabilidad.",
        },
        {
          title: "Datos bajo control",
          description: "La escuela conserva la responsabilidad sobre la calidad, vigencia y legalidad de la información cargada.",
        },
        {
          title: "Servicio continuo",
          description: "Se busca mantener continuidad operativa, sin desconocer mantenimientos o dependencias de terceros.",
        },
      ]}
    >
      <section>
        <h2 className="text-lg font-semibold text-foreground">Acceso y cuentas</h2>
        <p className="mt-2">
          Cada institución debe asignar accesos únicamente a personal autorizado y mantener sus
          credenciales actualizadas.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Responsabilidad de la escuela</h2>
        <p className="mt-2">
          La escuela es responsable de la calidad, veracidad y legalidad de los datos cargados en
          alumnos, pagos, agenda, flota y demás módulos.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Disponibilidad del servicio</h2>
        <p className="mt-2">
          Se realizarán esfuerzos razonables para mantener la continuidad del servicio y la
          seguridad de la información, sin perjuicio de mantenimientos o fallas de terceros.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
