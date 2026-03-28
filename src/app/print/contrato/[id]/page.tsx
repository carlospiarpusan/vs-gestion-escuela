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
      alumno:alumnos(nombre, apellidos, dni, tipo_documento, telefono, direccion, email),
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
  const alumnoNombre = `${alumno.nombre} ${alumno.apellidos}`;
  const categorias = m.categorias?.join(", ") || "___";
  const esTI = alumno.tipo_documento === "TI";

  const headerBlock = (
    <div className="border-b-2 border-gray-300 pb-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-widest uppercase">{escuelaNombre}</h1>
          <p className="text-[9px] text-gray-500">NIT: {escuelaNit}</p>
          <p className="text-[9px] text-gray-500">
            {sedeDireccion} · Tel: {sedeTelefono}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-gray-600 uppercase">
            Contrato de Formación en Conducción
          </p>
          <p className="text-[10px] text-gray-500">
            Nº <strong>{contratoNum}</strong>
          </p>
        </div>
      </div>
    </div>
  );

  const footerPage1 = (
    <div className="border-t border-gray-300 pt-1">
      <div className="flex items-center justify-between text-[8px] text-gray-400">
        <span>
          {escuelaNombre} · NIT {escuelaNit}
        </span>
        <span>Contrato Nº {contratoNum}</span>
        <span>Página 1 de 2</span>
      </div>
    </div>
  );

  const footerPage2 = (
    <div className="border-t border-gray-300 pt-1">
      <div className="flex items-center justify-between text-[8px] text-gray-400">
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
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: letter; margin: 1.2cm 1.5cm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              .print-page { page-break-after: always; page-break-inside: avoid; }
              .print-page:last-child { page-break-after: auto; }
            }
          `,
        }}
      />

      <div className="mx-auto min-h-screen max-w-[216mm] bg-white font-sans text-[#1d1d1f] antialiased">
        {/* Toolbar */}
        <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white px-10 py-4">
          <h1 className="text-2xl font-semibold">Previsualización de Contrato</h1>
          <PrintButton />
        </div>

        {/* ══════════ PÁGINA 1 ══════════ */}
        <div className="print-page flex min-h-[279mm] flex-col px-10 py-4 print:min-h-0 print:px-0 print:py-0">
          {headerBlock}

          <div className="flex-1 pt-3 text-justify text-[9px] leading-[13px]">
            {/* Intro */}
            <p>
              El CEA <strong>{escuelaNombre.toUpperCase()}</strong> cumpliendo los requisitos
              legales establecidos por el Decreto 1079 de 2015, la Resolución 3245 de 2009 y demás
              normas complementarias expedidas por el Ministerio de Transporte, Ministerio de
              Educación, quien en adelante se llamará el CEA, y el(la) señor(a){" "}
              <strong>{alumnoNombre}</strong> con CC número <strong>{alumno.dni}</strong> con
              dirección o lugar de residencia:{" "}
              <strong>{alumno.direccion || "________________________"}</strong>, Celular:{" "}
              <strong>{alumno.telefono}</strong>, quien en adelante se llamará EL ESTUDIANTE,
              celebran el presente contrato de formación en conducción para la categoría{" "}
              <strong>{categorias}</strong> que se regirá por las siguientes cláusulas:
            </p>

            <p className="mt-2">
              <strong>PRIMERA. Objeto:</strong> El CEA ofrecerá al Estudiante el servicio de
              formación en conducción acorde al PEI, comprometiéndose en dictar la capacitación
              teórico – práctica conforme a la normatividad existente y a la categoría solicitada.
            </p>

            <p className="mt-1">
              <strong>SEGUNDA. Requisitos:</strong> A) Saber leer y escribir. B) Tener 16 años
              cumplidos para el servicio diferente al público. C) Tener 18 años para vehículos de
              servicio público. D) Tener aprobado examen psicométrico con certificado vigente de
              aptitud física, mental y de coordinación motriz para la categoría solicitada antes de
              iniciar la capacitación práctica.
            </p>

            <p className="mt-1">
              <strong>TERCERA. Duración:</strong> Para garantizar la efectividad en el proceso de
              formación y teniendo en cuenta que se trata de un aprendizaje de acciones
              secuenciales, es necesario que el curso sea continuo en el tiempo. En ningún caso la
              intensidad horaria prevista podrá abarcarse en un lapso mayor a tres (3) meses, si
              pasado este plazo el Estudiante no ha terminado el curso de conducción, el CEA no se
              responsabiliza que el estudiante salga de plataforma y no pueda generar la
              certificación por incumplimiento a sus obligaciones.
            </p>

            <p className="mt-1">
              <strong>CUARTA. Forma de pago:</strong> El valor del curso será cancelado directamente
              por el Estudiante en las instalaciones del CEA en el momento del registro de la
              matrícula. Para el inicio de clases prácticas el Estudiante debe haber cancelado el
              70% del valor de la matrícula.
            </p>

            <p className="mt-1">
              <strong>QUINTA. Derechos de los Estudiantes:</strong> Todo Estudiante aspirante a
              realizar el proceso de formación para obtener el certificado de aptitud en conducción
              tiene los siguientes derechos: A) Ser admitido, obtener la formación y conocer el
              resultado del proceso, acorde a la normatividad vigente. B) Obtener protección y
              seguridad sobre toda la información que suministre al CEA durante el proceso salvo
              cuando la ley requiera que dicha información se dé a conocer. C) Realizar su
              capacitación con intérprete propio, en caso de existir limitaciones idiomáticas. D)
              Recibir la formación con instructores idóneos que cuenten con el perfil adecuado para
              desempeñar estas funciones. E) Recibir la formación en instalaciones que estén acorde
              a la normatividad, empleando material didáctico adecuado. F) Recibir la formación
              práctica en vehículos que cumplan con todas las adaptaciones reglamentarias exigidas
              por la normatividad. G) Los aspirantes con limitación física podrán proveer el
              vehículo para acceder a la capacitación práctica, el cual debe contar con los
              mecanismos y medios auxiliares que se requieran para el ejercicio de la conducción. H)
              Recibir la intensidad horaria ofrecida por el CEA, acorde a la normatividad. I) Gozar
              de imparcialidad, objetividad, respeto y buen trato por parte de todo el personal del
              CEA. J) Solicitar con anticipación no menor a veinticuatro (24) horas el aplazamiento
              de una clase práctica, la cual será reprogramada por el CEA, con el fin de no
              entorpecer las labores administrativas. K) Presentar los exámenes en ambientes
              adecuados. L) Obtener el certificado de aptitud en conducción en la categoría
              solicitada una vez haya completado todos los requerimientos exigidos por el CEA, para
              lo cual se enviará la información correspondiente para que quede registrada en la
              Plataforma RUNT y a los parámetros definidos por la normatividad. M) Presentar
              formalmente una queja en caso de inconformidad en la prestación del servicio para que
              el CEA realice su estudio y proceda a resolverla en caso de ser pertinente. N)
              Presentar ante el CEA petición, queja o reclamo, en caso de obtener un resultado
              adverso en el proceso de evaluación, de manera que sea reconsiderada o sea repetida
              acorde a la decisión del CEA. O) Recibir información oportuna en caso de la
              modificación de cualquiera de las condiciones del proceso de formación por parte del
              CEA. P) Gozar de los demás derechos consagrados en el PEI y en el manual de
              convivencia.
            </p>

            <p className="mt-1">
              <strong>SEXTA. Obligaciones de los Estudiantes:</strong> A) Declarar al CEA que toda
              la información suministrada es verdadera y actualizada. B) Asistir al proceso
              acompañado por traductor acorde a la cláusula Quinta, literal C. C) Cuidar, proteger y
              responder por el material didáctico suministrado durante la formación, incluyendo el
              vehículo facilitado por el CEA para las clases prácticas, cumpliendo con lo específico
              para ello en el manual de convivencia. D) Cuidar y proteger los equipos e
              instalaciones del CEA, así como velar por el aseo y el uso racional del agua y la
              energía. E) Cumplir con el manual de convivencia y brindar permanente respeto y buen
              trato al personal del CEA, a los demás compañeros y demás usuarios de la vía. F)
              Informar oportunamente a la dirección de cualquier anomalía o inconveniente a través
              del diligenciamiento y entrega del formato correspondiente. G) Cumplir con la
              programación convenida y presentarse a las clases con una anticipación de mínimo 15
              minutos. El primer 25% de las horas de práctica serán realizadas en el área dispuesta
              para tal fin. La falla a clases que no hayan sido reportadas con la anticipación
              deberá ser reemplazadas en otro horario y el estudiante deberá cancelar el valor
              correspondiente. H) En ningún caso podrá el estudiante llevar acompañante para las
              clases prácticas, salvo en el caso del numeral sexto, literal B o cuando la
              capacitación se imparta en vehículos de las categorías B2, C2, B3 y C3. I) Asistir a
              la formación sin estar bajo la influencia de sustancias psicoactivas o medicamento que
              afecten la capacidad de atención y/o reacción. J) Firmar las planillas de asistencia y
              demás evidencias del proceso de formación realizado. K) Guardar absoluta reserva
              respecto a la metodología y los procedimientos utilizados durante el proceso de
              formación, evaluación y certificación. L) Informar cualquier cambio en las capacidades
              del Estudiante que comprometan la aptitud para conducir. M) Cancelar los valores
              adicionales que sean generados por el incumplimiento a las clases prácticas.
            </p>

            <p className="mt-1">
              <strong>SÉPTIMA. Derechos del CEA:</strong> A) Verificar que la información
              suministrada por el Estudiante sea verdadera. B) Realizar mejoras en el proceso de
              formación, cambios de instructor, de vehículo o de aulas, acorde a las necesidades.
            </p>
          </div>

          {footerPage1}
        </div>

        {/* Separator for screen preview */}
        <div className="no-print mx-10 border-t-4 border-dashed border-gray-300" />

        {/* ══════════ PÁGINA 2 ══════════ */}
        <div className="print-page flex min-h-[279mm] flex-col px-10 py-4 print:min-h-0 print:px-0 print:py-0">
          {headerBlock}

          <div className="flex-1 pt-3 text-justify text-[9px] leading-[13px]">
            <p>
              C) Informar al Estudiante de la suspensión y reprogramación de clases con mínimo doce
              (12) horas de anticipación. D) Realizar el proceso de certificación del Estudiante de
              manera imparcial. E) Suspender y retirar temporalmente del proceso de formación al
              Estudiante que incumpla cualquiera de las normas contenidas en el presente contrato o
              en el manual de convivencia. F) Dar por terminado el presente contrato en caso de que
              el Estudiante incurra en agresión física o verbal a personas en el CEA, por brindar
              información falsa al CEA, por realizar suplantación de personalidad o realizar fraude
              en la evaluación teórica o cualquier otra considerada en el manual de convivencia. G)
              Aprobar, reprobar o aplazar al Estudiante acorde al resultado del proceso de
              certificación y teniendo en cuenta los parámetros exigidos por la normatividad
              existente.
            </p>

            <p className="mt-1">
              <strong>OCTAVA. Obligaciones del CEA:</strong> A) Convenir con el Estudiante los
              horarios para que tome la formación y vigilar su cumplimiento. B) Garantizar
              instructores idóneos, vehículos adecuados y material pedagógico pertinente durante
              todo el proceso de formación. C) Brindar la intensidad y contenido temático acorde a
              la normatividad. D) Garantizar que las instalaciones cumplan con las condiciones para
              la formación. E) Enviar oportuna y completamente a la Plataforma del RUNT, la
              información del Estudiante que haya aprobado la formación impartida por el CEA para su
              debida certificación. F) Atender cualquier reclamación presentada por el Estudiante y
              tomar con celeridad una decisión sobre si aceptar o negar, acorde a la información
              suministrada.
            </p>

            <p className="mt-1">
              <strong>NOVENA. Exclusión de Responsabilidad:</strong> El CEA no asumirá
              responsabilidad alguna por inconvenientes ajenos a los servicios ofrecidos, tales
              como: A) Multas o comparendos que posea el estudiante y que le impidan obtener la
              certificación. B) No utilizar el certificado expedido por el CEA, dentro de los seis
              (6) meses siguientes, plazo al término del cual, el RUNT procede a anularlo. C)
              Vencimiento del certificado de aptitud física, mental y de coordinación motriz, el
              cual tiene una vigencia de ciento ochenta (180) días. D) Peajes. E) Cualquier otra que
              no esté contemplada dentro del presente contrato.
            </p>

            <p className="mt-1">
              <strong>DÉCIMA. Multas.</strong> De acuerdo a los artículos: quinto numeral j y sexto
              en su numeral g, el estudiante se obliga a informar con anticipación de 24 horas el
              cambio de horario o su inasistencia a clase para la correspondiente modificación en el
              horario, el incumplir con lo estipulado ocasionará el cobro de DIEZ MIL PESOS m/cte.
              ($10.000) por hora de clase programada, valor que se podrá cobrar al finalizar el
              curso o sumar al saldo pendiente por pagar; además, sin el pago de las multas
              ocasionadas el CEA no podrá realizar la certificación respectiva (El incumplimiento
              causado por situaciones de fuerza mayor o caso fortuito no serán objeto de multa por
              el CEA).
            </p>

            <p className="mt-1">
              <strong>DÉCIMA PRIMERA. Terminación:</strong> El contrato podrá darse por terminado de
              manera unilateral por parte del CEA en cualquiera de los siguientes casos: A) Por
              incumplimiento de las obligaciones del Estudiante. B) Por cumplirse el plazo máximo
              para realizar el proceso de formación (3 meses). PARÁGRAFO: El plazo máximo que la
              plataforma de inscripción de estudiantes Aulapp permite a cada estudiante es de tres
              (03) meses.
            </p>

            <p className="mt-1">
              <strong>DÉCIMA SEGUNDA. Devolución de Dinero.</strong> El CEA no realizará devolución
              de dinero: a) Por incumplimiento de las obligaciones del Estudiante. b) Una vez se
              realice matricula y/o registro del estudiante en el sistema no habrá devolución del
              pago de PIN. c) Cuando el estudiante realice aportes en dinero, haya comenzado con
              clases teóricas y/o prácticas y no termine el curso no habrá devolución del dinero. d)
              No habrá devolución de aportes entregados una vez cumplido el plazo máximo para
              realizar el proceso de formación (3 meses), tiempo dentro del cual el Estudiante debe
              terminar su formación.
            </p>

            <p className="mt-1">
              <strong>DÉCIMA TERCERA. Declaración de veracidad:</strong> En constancia el Estudiante
              declara conocer y aceptar sus derechos y obligaciones, el manual de convivencia y los
              deberes de las personas certificadas, estipulados en el presente contrato y de asumir
              completamente las consecuencias que ocasione infringirlos. Las partes conocen,
              comprenden y aceptan todas y cada una de las estipulaciones contenidas en el presente
              documento y para constancia firman en {sedeDireccion} a <strong>{currentDate}</strong>
              .
            </p>

            {/* Signatures */}
            <div className="mt-6 grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="mx-auto mt-10 mb-1 w-3/4 border-b border-black" />
                <p className="text-[9px]">Firma Estudiante</p>
                <p className="mt-1 text-[9px] font-bold">{alumnoNombre}</p>
              </div>
              <div />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="mx-auto mt-8 mb-1 w-3/4 border-b border-black" />
                <p className="text-[9px]">Firma CEA {escuelaNombre.toUpperCase()}</p>
              </div>
              {esTI && (
                <div className="text-center">
                  <div className="mx-auto mt-8 mb-1 w-3/4 border-b border-black" />
                  <p className="text-[9px]">Firma Acudiente</p>
                  <p className="text-[9px]">(para menores de edad) C.C. __________________</p>
                </div>
              )}
            </div>

            <p className="mt-2 text-[9px]">Adjuntar fotocopia cédula de ciudadanía</p>
            <p className="text-[9px]">
              Dirección: {alumno.direccion || "________________________"}
            </p>
            <p className="text-[9px]">No. Celular: {alumno.telefono}</p>

            <p className="mt-4 text-[9px] font-bold">
              Consecutivo anual de contrato: {contratoNum}
            </p>
          </div>

          {footerPage2}
        </div>
      </div>
    </>
  );
}
