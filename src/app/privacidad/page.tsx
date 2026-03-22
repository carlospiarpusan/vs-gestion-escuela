import type { Metadata } from "next";
import LegalDocumentShell from "@/components/public/LegalDocumentShell";
import { buildPublicMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Política de privacidad",
  description:
    "Conoce cómo Condusoft trata la información operativa y de usuarios de autoescuelas y escuelas de conducción en Colombia.",
  path: "/privacidad",
  keywords: [
    "política de privacidad condusoft",
    "datos software para autoescuelas",
    "privacidad escuelas de conducción",
  ],
});

export default function PrivacidadPage() {
  return (
    <LegalDocumentShell
      badge="Ley 1581 de 2012"
      title="Politica de tratamiento de datos personales"
      description="Condusoft, en calidad de encargado del tratamiento, utiliza la informacion suministrada por las escuelas de conduccion (responsables del tratamiento) y sus usuarios para operar la plataforma, autenticar accesos, organizar la operacion diaria y generar reportes internos."
      principles={[
        {
          title: "Legalidad",
          description:
            "El tratamiento de datos se realiza conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y demas normas aplicables.",
        },
        {
          title: "Finalidad",
          description:
            "Los datos se usan exclusivamente para operar el servicio y no para finalidades ajenas a la gestion de la escuela.",
        },
        {
          title: "Libertad",
          description:
            "El tratamiento requiere consentimiento previo, expreso e informado del titular de los datos.",
        },
        {
          title: "Seguridad",
          description:
            "Se implementan medidas tecnicas y organizativas para proteger los datos contra acceso no autorizado.",
        },
      ]}
    >
      <section>
        <h2 className="text-foreground text-lg font-semibold">Responsable y encargado</h2>
        <p className="mt-2">
          <strong>Responsable del tratamiento:</strong> Cada escuela de conduccion que utiliza la
          plataforma es responsable de los datos personales de sus alumnos, instructores y
          administrativos.
        </p>
        <p className="mt-2">
          <strong>Encargado del tratamiento:</strong> Condusoft actua como encargado, procesando los
          datos por cuenta y bajo instrucciones de cada escuela.
        </p>
      </section>

      <section>
        <h2 className="text-foreground text-lg font-semibold">Que datos tratamos</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Datos de identificacion: nombre, apellidos, cedula</li>
          <li>Datos de contacto: telefono, correo electronico, direccion</li>
          <li>Datos academicos: categorias de licencia, examenes, calificaciones</li>
          <li>Datos financieros: pagos, abonos, metodos de pago</li>
          <li>Datos laborales: licencia de conduccion, especialidades (instructores)</li>
          <li>Datos de acceso: credenciales de usuario, ultimo acceso, rol</li>
        </ul>
      </section>

      <section>
        <h2 className="text-foreground text-lg font-semibold">Finalidades del tratamiento</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Autenticacion y control de acceso a la plataforma</li>
          <li>Gestion academica: matriculas, clases, examenes y certificaciones</li>
          <li>Gestion financiera: facturacion, cartera y reportes contables</li>
          <li>Gestion operativa: programacion de vehiculos, horas de instruccion</li>
          <li>Comunicaciones operativas sobre el servicio contratado</li>
          <li>Cumplimiento de obligaciones legales y regulatorias</li>
        </ul>
      </section>

      <section>
        <h2 className="text-foreground text-lg font-semibold">Derechos del titular (ARCO)</h2>
        <p className="mt-2">
          Como titular de datos personales, la Ley 1581 de 2012 te otorga los siguientes derechos:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Acceso:</strong> Conocer que datos tuyos estan siendo tratados
          </li>
          <li>
            <strong>Rectificacion:</strong> Solicitar la correccion de datos incorrectos o
            incompletos
          </li>
          <li>
            <strong>Cancelacion:</strong> Solicitar la eliminacion de tus datos cuando no exista
            obligacion legal de conservarlos
          </li>
          <li>
            <strong>Oposicion:</strong> Oponerte al tratamiento de tus datos para fines especificos
          </li>
        </ul>
        <p className="mt-3">
          Para ejercer estos derechos, utiliza nuestro{" "}
          <a href="/arco" className="font-medium text-[#0071e3] underline dark:text-[#69a9ff]">
            formulario de solicitud ARCO
          </a>
          . El plazo maximo de respuesta es de 15 dias habiles.
        </p>
      </section>

      <section>
        <h2 className="text-foreground text-lg font-semibold">Medidas de seguridad</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Aislamiento de datos por escuela (Row Level Security)</li>
          <li>Control de acceso basado en roles (6 niveles)</li>
          <li>Cifrado de credenciales sensibles (AES-256-GCM)</li>
          <li>Politicas de contrasena segura</li>
          <li>Trazabilidad de modificaciones (audit trail)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-foreground text-lg font-semibold">Retencion de datos</h2>
        <p className="mt-2">
          Los datos personales se conservan mientras exista una relacion activa entre la escuela y
          la plataforma. Al cancelar el servicio, los datos se mantienen por un periodo de 6 meses
          para respaldo y cumplimiento regulatorio, tras lo cual se eliminan de forma segura.
        </p>
      </section>

      <section>
        <h2 className="text-foreground text-lg font-semibold">Autoridad de control</h2>
        <p className="mt-2">
          Si consideras que tus derechos no han sido atendidos, puedes presentar una queja ante la
          Superintendencia de Industria y Comercio (SIC) a traves de{" "}
          <a
            href="https://www.sic.gov.co"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#0071e3] underline dark:text-[#69a9ff]"
          >
            www.sic.gov.co
          </a>
          .
        </p>
      </section>
    </LegalDocumentShell>
  );
}
