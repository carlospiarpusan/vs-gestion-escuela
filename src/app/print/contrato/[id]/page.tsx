import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";

export default async function PrintContratoPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  const matriculaId = params.id;

  const { data: matricula, error } = await supabase
    .from("matriculas_alumno")
    .select(
      `
      *,
      alumno:alumnos(nombre, apellidos, dni, telefono, direccion, email),
      sede:sedes(nombre, direccion, correo, linea_whatsapp, escuela:escuelas(nombre, nit))
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

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-white p-10 text-[#1d1d1f] antialiased">
      {/* Header hidden when printing */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold">Previsualización de Contrato</h1>
        <PrintButton />
      </div>

      {/* Contract Document */}
      <div
        id="print-area"
        className="space-y-8 border-t border-b py-10 font-sans print:border-none print:py-0"
      >
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-widest uppercase">
            {escuela?.nombre || "AUTOESCUELA"}
          </h1>
          <p className="text-sm font-medium text-gray-500">NIT: {escuela?.nit || "000000000-0"}</p>
          <p className="text-sm text-gray-500">
            {m.sede?.direccion} · WhatsApp: {m.sede?.linea_whatsapp}
          </p>
        </div>

        <div className="rounded-lg bg-gray-100 p-3 text-center print:border-y print:bg-transparent">
          <h2 className="text-lg font-semibold tracking-widest uppercase">
            Contrato de Prestación de Servicios
          </h2>
          <p className="text-sm text-gray-600">
            Nº de Contrato: <strong>{m.numero_contrato || m.id.slice(0, 8).toUpperCase()}</strong>
          </p>
        </div>

        {/* Client details */}
        <div className="space-y-4">
          <h3 className="border-b pb-1 text-lg font-semibold">1. Datos del Alumno (Contratante)</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs text-gray-500">Nombre Completo:</span>{" "}
              <strong>
                {alumno.nombre} {alumno.apellidos}
              </strong>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Cédula / NIT:</span>{" "}
              <strong>{alumno.dni}</strong>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Teléfono:</span>{" "}
              <strong>{alumno.telefono}</strong>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Email:</span>{" "}
              <strong>{alumno.email || "No registrado"}</strong>
            </div>
            <div className="col-span-2">
              <span className="block text-xs text-gray-500">Dirección:</span>{" "}
              <strong>{alumno.direccion || "No registrada"}</strong>
            </div>
          </div>
        </div>

        {/* Academic Details */}
        <div className="space-y-4">
          <h3 className="border-b pb-1 text-lg font-semibold">2. Detalles del Servicio</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs text-gray-500">Fecha de Inscripción:</span>{" "}
              <strong>{m.fecha_inscripcion}</strong>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Sede Asignada:</span>{" "}
              <strong>{m.sede?.nombre}</strong>
            </div>
            <div className="col-span-2">
              <span className="block text-xs text-gray-500">Categorías Inscritas:</span>{" "}
              <strong>{m.categorias?.join(", ")}</strong>
            </div>
            <div className="col-span-2">
              <span className="block text-xs text-gray-500">Valor Total Estimado:</span>{" "}
              <strong>${Number(m.valor_total || 0).toLocaleString("es-CO")} COP</strong>
            </div>
          </div>
        </div>

        {/* Clauses */}
        <div className="space-y-4 text-justify text-xs">
          <h3 className="border-b pb-1 text-left text-lg font-semibold">
            3. Condiciones del Servicio
          </h3>
          <p>
            <strong>PRIMERA. OBJETO:</strong> La escuela se compromete a impartir al alumno la
            enseñanza y capacitación necesaria para la obtención del respectivo permiso de
            conducción, según las categorías estipuladas.
          </p>
          <p>
            <strong>SEGUNDA. PRECIO Y FORMA DE PAGO:</strong> El alumno se compromete a abonar las
            tarifas vigentes acordadas para el paquete seleccionado. El incumplimiento de los pagos
            suspenderá de forma inmediata el servicio teórico y práctico.
          </p>
          <p>
            <strong>TERCERA. AUSENCIAS Y CANCELACIONES:</strong> La inasistencia a clases prácticas
            sin notificación previa de 24 horas implicará la pérdida de la clase correspondiente.
          </p>
          <p>
            <strong>CUARTA. VIGENCIA:</strong> El presente contrato inicia con la fecha de
            inscripción y termina al culminar los servicios de manera satisfactoria.
          </p>
          <p>
            Para constancia, se firma en la fecha <strong>{currentDate}</strong>.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-10 pt-20">
          <div className="text-center">
            <div className="mx-auto mb-2 w-3/4 border-b border-black"></div>
            <p className="text-sm font-bold uppercase">
              {alumno.nombre} {alumno.apellidos}
            </p>
            <p className="text-xs text-gray-500">CC. {alumno.dni}</p>
            <p className="mt-1 text-xs text-gray-500">El Alumno</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-2 w-3/4 border-b border-black"></div>
            <p className="text-sm font-bold uppercase">{escuela?.nombre || "AUTOESCUELA"}</p>
            <p className="text-xs text-gray-500">NIT. {escuela?.nit || ""}</p>
            <p className="mt-1 text-xs text-gray-500">La Escuela</p>
          </div>
        </div>
      </div>
    </div>
  );
}
