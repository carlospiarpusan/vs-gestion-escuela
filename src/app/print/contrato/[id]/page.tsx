import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";

async function getSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  const cookieStore = await cookies();
  return createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
}

export default async function PrintContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matriculaId } = await params;
  const supabase = await getSupabase();

  const { data: matricula, error } = await supabase
    .from("matriculas_alumno")
    .select(
      `
      *,
      alumno:alumnos(nombre, apellidos, dni, telefono, direccion, email),
      sede:sedes(nombre, direccion, correo, linea_whatsapp, escuela:escuelas(nombre, cif))
    `
    )
    .eq("id", matriculaId)
    .single();

  if (error || !matricula) {
    return notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = matricula as any;
  const alumno = m.alumno;
  const escuela = m.sede?.escuela;

  const currentDate = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const contratoNum = m.numero_contrato || m.id.slice(0, 8).toUpperCase();
  const escuelaNombre = escuela?.nombre || "AUTOESCUELA";
  const escuelaNit = escuela?.cif || "000000000-0";
  const sedeDireccion = m.sede?.direccion || "";
  const sedeWhatsApp = m.sede?.linea_whatsapp || "";

  const headerBlock = (
    <div className="border-b-2 border-gray-300 pb-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest uppercase">{escuelaNombre}</h1>
          <p className="text-[10px] text-gray-500">NIT: {escuelaNit}</p>
          <p className="text-[10px] text-gray-500">
            {sedeDireccion} · WhatsApp: {sedeWhatsApp}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-600 uppercase">
            Contrato de Prestación de Servicios
          </p>
          <p className="text-xs text-gray-500">
            Nº <strong>{contratoNum}</strong>
          </p>
        </div>
      </div>
    </div>
  );

  const footerPage1 = (
    <div className="border-t border-gray-300 pt-2">
      <div className="flex items-center justify-between text-[9px] text-gray-400">
        <span>
          {escuelaNombre} · NIT {escuelaNit}
        </span>
        <span>Contrato Nº {contratoNum}</span>
        <span>Página 1 de 2</span>
      </div>
    </div>
  );

  const footerPage2 = (
    <div className="border-t border-gray-300 pt-2">
      <div className="flex items-center justify-between text-[9px] text-gray-400">
        <span>
          {escuelaNombre} · NIT {escuelaNit}
        </span>
        <span>Contrato Nº {contratoNum}</span>
        <span>Página 2 de 2</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter;
                margin: 1.5cm 1.8cm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
              .print-page {
                page-break-after: always;
                page-break-inside: avoid;
              }
              .print-page:last-child {
                page-break-after: auto;
              }
            }
          `,
        }}
      />

      <div className="mx-auto min-h-screen max-w-[216mm] bg-white font-sans text-[#1d1d1f] antialiased">
        {/* Toolbar - hidden when printing */}
        <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white px-10 py-4">
          <h1 className="text-2xl font-semibold">Previsualización de Contrato</h1>
          <PrintButton />
        </div>

        {/* ═══════════════════════════════════════════════════════════
            PÁGINA 1
        ═══════════════════════════════════════════════════════════ */}
        <div className="print-page flex min-h-[279mm] flex-col px-10 py-6 print:min-h-0 print:px-0 print:py-0">
          {headerBlock}

          <div className="flex-1 space-y-5 pt-5">
            {/* Title */}
            <div className="rounded-md bg-gray-100 px-4 py-2 text-center print:border-y print:bg-transparent">
              <h2 className="text-base font-bold tracking-widest uppercase">
                Contrato de Prestación de Servicios de Enseñanza Automovilística
              </h2>
            </div>

            {/* Intro */}
            <p className="text-justify text-xs leading-relaxed">
              Entre <strong>{escuelaNombre}</strong>, identificada con NIT{" "}
              <strong>{escuelaNit}</strong>, con domicilio en {sedeDireccion}, en adelante{" "}
              <strong>LA ESCUELA</strong>, y{" "}
              <strong>
                {alumno.nombre} {alumno.apellidos}
              </strong>
              , identificado(a) con cédula de ciudadanía Nº <strong>{alumno.dni}</strong>, con
              domicilio en <strong>{alumno.direccion || "___________________________"}</strong>,
              teléfono <strong>{alumno.telefono}</strong>, en adelante <strong>EL ALUMNO</strong>,
              se celebra el presente contrato de prestación de servicios, el cual se rige por las
              siguientes cláusulas:
            </p>

            {/* Section 1: Student Data */}
            <div className="space-y-3">
              <h3 className="border-b pb-1 text-sm font-bold">1. Datos del Alumno (Contratante)</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] text-gray-500">Nombre Completo:</span>
                  <strong>
                    {alumno.nombre} {alumno.apellidos}
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500">Cédula / NIT:</span>
                  <strong>{alumno.dni}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500">Teléfono:</span>
                  <strong>{alumno.telefono}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500">Email:</span>
                  <strong>{alumno.email || "No registrado"}</strong>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] text-gray-500">Dirección:</span>
                  <strong>{alumno.direccion || "No registrada"}</strong>
                </div>
              </div>
            </div>

            {/* Section 2: Service Details */}
            <div className="space-y-3">
              <h3 className="border-b pb-1 text-sm font-bold">2. Detalles del Servicio</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] text-gray-500">Fecha de Inscripción:</span>
                  <strong>{m.fecha_inscripcion}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500">Sede Asignada:</span>
                  <strong>{m.sede?.nombre}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500">Categorías Inscritas:</span>
                  <strong>{m.categorias?.join(", ")}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500">Valor Total Estimado:</span>
                  <strong>${Number(m.valor_total || 0).toLocaleString("es-CO")} COP</strong>
                </div>
              </div>
            </div>

            {/* Section 3: Clauses (Page 1) */}
            <div className="space-y-3 text-justify text-xs leading-relaxed">
              <h3 className="border-b pb-1 text-left text-sm font-bold">
                3. Condiciones del Servicio
              </h3>
              <p>
                <strong>PRIMERA. OBJETO:</strong> LA ESCUELA se compromete a impartir a EL ALUMNO la
                enseñanza teórica y práctica necesaria para la obtención del permiso de conducción
                en las categorías estipuladas, de conformidad con las normas de tránsito y
                transporte vigentes en la República de Colombia.
              </p>
              <p>
                <strong>SEGUNDA. PRECIO Y FORMA DE PAGO:</strong> EL ALUMNO se compromete a pagar la
                suma total de{" "}
                <strong>${Number(m.valor_total || 0).toLocaleString("es-CO")} COP</strong> por
                concepto de los servicios contratados. El incumplimiento en los pagos acordados
                facultará a LA ESCUELA para suspender inmediatamente la prestación de los servicios
                teóricos y prácticos, sin que ello genere responsabilidad alguna para LA ESCUELA.
              </p>
              <p>
                <strong>TERCERA. OBLIGACIONES DE LA ESCUELA:</strong> LA ESCUELA se obliga a: a)
                Proveer los instructores debidamente certificados; b) Suministrar los vehículos
                adecuados para las prácticas; c) Impartir el número de horas de enseñanza exigidas
                por la normativa vigente; d) Expedir los certificados correspondientes una vez
                cumplido el programa.
              </p>
              <p>
                <strong>CUARTA. OBLIGACIONES DEL ALUMNO:</strong> EL ALUMNO se obliga a: a) Asistir
                puntualmente a las clases programadas; b) Cumplir con el reglamento interno de LA
                ESCUELA; c) Presentarse en condiciones aptas para la conducción (sin efectos de
                alcohol, sustancias psicoactivas o fatiga extrema); d) Portar los documentos de
                identificación requeridos.
              </p>
              <p>
                <strong>QUINTA. AUSENCIAS Y CANCELACIONES:</strong> La inasistencia a clases
                prácticas sin notificación previa de al menos 24 horas implicará la pérdida de la
                clase correspondiente. LA ESCUELA no estará obligada a reprogramar clases perdidas
                por causa imputable a EL ALUMNO.
              </p>
            </div>
          </div>

          {footerPage1}
        </div>

        {/* Separator for screen preview */}
        <div className="no-print mx-10 border-t-4 border-dashed border-gray-300" />

        {/* ═══════════════════════════════════════════════════════════
            PÁGINA 2
        ═══════════════════════════════════════════════════════════ */}
        <div className="print-page flex min-h-[279mm] flex-col px-10 py-6 print:min-h-0 print:px-0 print:py-0">
          {headerBlock}

          <div className="flex-1 space-y-5 pt-5">
            {/* Continuation of clauses */}
            <div className="space-y-3 text-justify text-xs leading-relaxed">
              <h3 className="border-b pb-1 text-left text-sm font-bold">
                3. Condiciones del Servicio (continuación)
              </h3>
              <p>
                <strong>SEXTA. VIGENCIA:</strong> El presente contrato inicia en la fecha de
                inscripción y permanecerá vigente hasta la culminación satisfactoria de todos los
                servicios contratados o hasta que se configure alguna de las causales de terminación
                aquí previstas.
              </p>
              <p>
                <strong>SÉPTIMA. TERMINACIÓN ANTICIPADA:</strong> El contrato podrá darse por
                terminado anticipadamente por: a) Mutuo acuerdo entre las partes; b) Incumplimiento
                de las obligaciones de cualquiera de las partes; c) Solicitud unilateral de EL
                ALUMNO, caso en el cual no habrá devolución de los pagos realizados salvo acuerdo
                expreso.
              </p>
              <p>
                <strong>OCTAVA. RESPONSABILIDAD:</strong> LA ESCUELA no será responsable por daños o
                perjuicios causados por EL ALUMNO a terceros durante las prácticas de conducción,
                cuando estos se deriven de la inobservancia de las instrucciones del instructor. LA
                ESCUELA cuenta con las pólizas de seguro exigidas por la normatividad vigente.
              </p>
              <p>
                <strong>NOVENA. PROTECCIÓN DE DATOS:</strong> En cumplimiento de la Ley 1581 de 2012
                y sus decretos reglamentarios, EL ALUMNO autoriza a LA ESCUELA para el tratamiento
                de sus datos personales con fines académicos, administrativos y de comunicación
                institucional. EL ALUMNO podrá ejercer sus derechos de acceso, rectificación,
                cancelación y oposición (ARCO) mediante comunicación escrita dirigida a LA ESCUELA.
              </p>
              <p>
                <strong>DÉCIMA. RESOLUCIÓN DE CONFLICTOS:</strong> Las diferencias que surjan con
                ocasión del presente contrato serán resueltas de manera directa entre las partes. En
                caso de no llegar a un acuerdo, se acudirá a los mecanismos alternativos de solución
                de conflictos previstos en la ley colombiana.
              </p>
              <p>
                <strong>DÉCIMA PRIMERA. ACEPTACIÓN:</strong> Las partes declaran que han leído y
                comprendido cada una de las cláusulas del presente contrato y lo suscriben en señal
                de aceptación.
              </p>
            </div>

            {/* Date */}
            <p className="text-xs">
              Para constancia, se firma en la ciudad de{" "}
              {sedeDireccion.split(",").pop()?.trim() || "_______________"}, a los{" "}
              <strong>{currentDate}</strong>.
            </p>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-10 pt-14">
              <div className="text-center">
                <div className="mx-auto mb-2 w-3/4 border-b border-black" />
                <p className="text-xs font-bold uppercase">
                  {alumno.nombre} {alumno.apellidos}
                </p>
                <p className="text-[10px] text-gray-500">C.C. {alumno.dni}</p>
                <p className="mt-1 text-[10px] font-medium text-gray-500">EL ALUMNO</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 w-3/4 border-b border-black" />
                <p className="text-xs font-bold uppercase">{escuelaNombre}</p>
                <p className="text-[10px] text-gray-500">NIT. {escuelaNit}</p>
                <p className="mt-1 text-[10px] font-medium text-gray-500">LA ESCUELA</p>
              </div>
            </div>

            {/* Fingerprints area */}
            <div className="grid grid-cols-2 gap-10 pt-6">
              <div className="flex flex-col items-center">
                <div className="h-20 w-16 rounded border border-gray-300" />
                <p className="mt-1 text-[9px] text-gray-400">Huella EL ALUMNO</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-20 w-16 rounded border border-gray-300" />
                <p className="mt-1 text-[9px] text-gray-400">Huella LA ESCUELA</p>
              </div>
            </div>
          </div>

          {footerPage2}
        </div>
      </div>
    </>
  );
}
