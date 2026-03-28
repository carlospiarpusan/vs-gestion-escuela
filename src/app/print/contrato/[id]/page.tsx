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
      sede:sedes(nombre, direccion, email, telefono, escuela:escuelas(nombre, cif, telefono, direccion))
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
  const sedeDireccion = m.sede?.direccion || escuela?.direccion || "";
  const sedeTelefono = m.sede?.telefono || escuela?.telefono || "";

  const headerBlock = (
    <div className="border-b-2 border-gray-300 pb-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest uppercase">{escuelaNombre}</h1>
          <p className="text-[10px] text-gray-500">NIT: {escuelaNit}</p>
          <p className="text-[10px] text-gray-500">
            {sedeDireccion} · Tel: {sedeTelefono}
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

          <div className="flex-1 space-y-6 pt-5">
            {/* Title */}
            <div className="rounded-md bg-gray-100 px-4 py-2 text-center print:border-y print:bg-transparent">
              <h2 className="text-base font-bold tracking-widest uppercase">
                Contrato de Prestación de Servicios
              </h2>
              <p className="text-sm text-gray-600">
                Nº de Contrato: <strong>{contratoNum}</strong>
              </p>
            </div>

            {/* Section 1: Student Data */}
            <div className="space-y-3">
              <h3 className="border-b pb-1 text-sm font-bold">1. Datos del Alumno (Contratante)</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-gray-500">Nombre Completo:</span>
                  <strong>
                    {alumno.nombre} {alumno.apellidos}
                  </strong>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Cédula / NIT:</span>
                  <strong>{alumno.dni}</strong>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Teléfono:</span>
                  <strong>{alumno.telefono}</strong>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Email:</span>
                  <strong>{alumno.email || "No registrado"}</strong>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs text-gray-500">Dirección:</span>
                  <strong>{alumno.direccion || "No registrada"}</strong>
                </div>
              </div>
            </div>

            {/* Section 2: Service Details */}
            <div className="space-y-3">
              <h3 className="border-b pb-1 text-sm font-bold">2. Detalles del Servicio</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-gray-500">Fecha de Inscripción:</span>
                  <strong>{m.fecha_inscripcion}</strong>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Sede Asignada:</span>
                  <strong>{m.sede?.nombre}</strong>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs text-gray-500">Categorías Inscritas:</span>
                  <strong>{m.categorias?.join(", ")}</strong>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs text-gray-500">Valor Total Estimado:</span>
                  <strong>${Number(m.valor_total || 0).toLocaleString("es-CO")} COP</strong>
                </div>
              </div>
            </div>

            {/* Section 3: Clauses */}
            <div className="space-y-4 text-justify text-xs">
              <h3 className="border-b pb-1 text-left text-sm font-bold">
                3. Condiciones del Servicio
              </h3>
              <p>
                <strong>PRIMERA. OBJETO:</strong> La escuela se compromete a impartir al alumno la
                enseñanza y capacitación necesaria para la obtención del respectivo permiso de
                conducción, según las categorías estipuladas.
              </p>
              <p>
                <strong>SEGUNDA. PRECIO Y FORMA DE PAGO:</strong> El alumno se compromete a abonar
                las tarifas vigentes acordadas para el paquete seleccionado. El incumplimiento de
                los pagos suspenderá de forma inmediata el servicio teórico y práctico.
              </p>
              <p>
                <strong>TERCERA. AUSENCIAS Y CANCELACIONES:</strong> La inasistencia a clases
                prácticas sin notificación previa de 24 horas implicará la pérdida de la clase
                correspondiente.
              </p>
              <p>
                <strong>CUARTA. VIGENCIA:</strong> El presente contrato inicia con la fecha de
                inscripción y termina al culminar los servicios de manera satisfactoria.
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

          <div className="flex-1 space-y-8 pt-6">
            {/* Acceptance text */}
            <div className="space-y-4 text-justify text-sm leading-relaxed">
              <p>
                Las partes declaran que han leído y comprendido cada una de las cláusulas del
                presente contrato y lo suscriben en señal de aceptación.
              </p>
              <p>
                Para constancia, se firma en la fecha <strong>{currentDate}</strong>.
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-10 pt-16">
              <div className="text-center">
                <div className="mx-auto mb-2 w-3/4 border-b border-black" />
                <p className="text-sm font-bold uppercase">
                  {alumno.nombre} {alumno.apellidos}
                </p>
                <p className="text-xs text-gray-500">CC. {alumno.dni}</p>
                <p className="mt-1 text-xs text-gray-500">El Alumno</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 w-3/4 border-b border-black" />
                <p className="text-sm font-bold uppercase">{escuelaNombre}</p>
                <p className="text-xs text-gray-500">NIT. {escuelaNit}</p>
                <p className="mt-1 text-xs text-gray-500">La Escuela</p>
              </div>
            </div>
          </div>

          {footerPage2}
        </div>
      </div>
    </>
  );
}
