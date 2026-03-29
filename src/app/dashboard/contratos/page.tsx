"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchJsonWithRetry } from "@/lib/retry";
import PageScaffold from "@/components/dashboard/PageScaffold";
import { Save, FileText, Building2, FileSignature, Info } from "lucide-react";

const inputCls = "apple-input";
const labelCls = "apple-label";

const VARIABLES_DISPONIBLES = [
  { var: "{{NOMBRE_CEA}}", desc: "Nombre legal de la escuela" },
  { var: "{{NIT_CEA}}", desc: "NIT de la escuela" },
  { var: "{{DIRECCION_CEA}}", desc: "Dirección legal de la escuela" },
  { var: "{{TELEFONO_CEA}}", desc: "Teléfono de la escuela" },
  { var: "{{ALUMNO_NOMBRE}}", desc: "Nombre completo del alumno" },
  { var: "{{ALUMNO_DNI}}", desc: "Documento del alumno" },
  { var: "{{ALUMNO_DIRECCION}}", desc: "Dirección del alumno" },
  { var: "{{ALUMNO_TELEFONO}}", desc: "Teléfono del alumno" },
  { var: "{{CATEGORIAS}}", desc: "Categorías inscritas" },
  { var: "{{FECHA_CONTRATO}}", desc: "Fecha de emisión" },
  { var: "{{CIUDAD_FIRMA}}", desc: "Ciudad de firma" },
  { var: "{{SEDE_DIRECCION}}", desc: "Dirección de la sede" },
];

const DEFAULT_PAGE1 = `El CEA {{NOMBRE_CEA}} cumpliendo los requisitos legales establecidos por el Decreto 1079 de 2015, la Resolución 3245 de 2009 y demás normas complementarias expedidas por el Ministerio de Transporte, Ministerio de Educación, quien en adelante se llamará el CEA, y el(la) señor(a) {{ALUMNO_NOMBRE}} con CC número {{ALUMNO_DNI}} con dirección o lugar de residencia: {{ALUMNO_DIRECCION}}, Celular: {{ALUMNO_TELEFONO}}, quien en adelante se llamará EL ESTUDIANTE, celebran el presente contrato de formación en conducción para la categoría {{CATEGORIAS}} que se regirá por las siguientes cláusulas:

PRIMERA. Objeto: El CEA ofrecerá al Estudiante el servicio de formación en conducción acorde al PEI, comprometiéndose en dictar la capacitación teórico – práctica conforme a la normatividad existente y a la categoría solicitada.

SEGUNDA. Requisitos: A) Saber leer y escribir. B) Tener 16 años cumplidos para el servicio diferente al público. C) Tener 18 años para vehículos de servicio público. D) Tener aprobado examen psicométrico con certificado vigente de aptitud física, mental y de coordinación motriz para la categoría solicitada antes de iniciar la capacitación práctica.

TERCERA. Duración: Para garantizar la efectividad en el proceso de formación y teniendo en cuenta que se trata de un aprendizaje de acciones secuenciales, es necesario que el curso sea continuo en el tiempo. En ningún caso la intensidad horaria prevista podrá abarcarse en un lapso mayor a tres (3) meses, si pasado este plazo el Estudiante no ha terminado el curso de conducción, el CEA no se responsabiliza que el estudiante salga de plataforma y no pueda generar la certificación por incumplimiento a sus obligaciones.

CUARTA. Forma de pago: El valor del curso será cancelado directamente por el Estudiante en las instalaciones del CEA en el momento del registro de la matrícula. Para el inicio de clases prácticas el Estudiante debe haber cancelado el 70% del valor de la matrícula.

QUINTA. Derechos de los Estudiantes: Todo Estudiante aspirante a realizar el proceso de formación para obtener el certificado de aptitud en conducción tiene los siguientes derechos: A) Ser admitido, obtener la formación y conocer el resultado del proceso, acorde a la normatividad vigente. B) Obtener protección y seguridad sobre toda la información que suministre al CEA durante el proceso salvo cuando la ley requiera que dicha información se dé a conocer. C) Realizar su capacitación con intérprete propio, en caso de existir limitaciones idiomáticas. D) Recibir la formación con instructores idóneos que cuenten con el perfil adecuado para desempeñar estas funciones. E) Recibir la formación en instalaciones que estén acorde a la normatividad, empleando material didáctico adecuado. F) Recibir la formación práctica en vehículos que cumplan con todas las adaptaciones reglamentarias exigidas por la normatividad. G) Los aspirantes con limitación física podrán proveer el vehículo para acceder a la capacitación práctica, el cual debe contar con los mecanismos y medios auxiliares que se requieran para el ejercicio de la conducción. H) Recibir la intensidad horaria ofrecida por el CEA, acorde a la normatividad. I) Gozar de imparcialidad, objetividad, respeto y buen trato por parte de todo el personal del CEA. J) Solicitar con anticipación no menor a veinticuatro (24) horas el aplazamiento de una clase práctica, la cual será reprogramada por el CEA, con el fin de no entorpecer las labores administrativas. K) Presentar los exámenes en ambientes adecuados. L) Obtener el certificado de aptitud en conducción en la categoría solicitada una vez haya completado todos los requerimientos exigidos por el CEA, para lo cual se enviará la información correspondiente para que quede registrada en la Plataforma RUNT y a los parámetros definidos por la normatividad. M) Presentar formalmente una queja en caso de inconformidad en la prestación del servicio para que el CEA realice su estudio y proceda a resolverla en caso de ser pertinente. N) Presentar ante el CEA petición, queja o reclamo, en caso de obtener un resultado adverso en el proceso de evaluación, de manera que sea reconsiderada o sea repetida acorde a la decisión del CEA. O) Recibir información oportuna en caso de la modificación de cualquiera de las condiciones del proceso de formación por parte del CEA. P) Gozar de los demás derechos consagrados en el PEI y en el manual de convivencia.

SEXTA. Obligaciones de los Estudiantes: A) Declarar al CEA que toda la información suministrada es verdadera y actualizada. B) Asistir al proceso acompañado por traductor acorde a la cláusula Quinta, literal C. C) Cuidar, proteger y responder por el material didáctico suministrado durante la formación, incluyendo el vehículo facilitado por el CEA para las clases prácticas, cumpliendo con lo específico para ello en el manual de convivencia. D) Cuidar y proteger los equipos e instalaciones del CEA, así como velar por el aseo y el uso racional del agua y la energía. E) Cumplir con el manual de convivencia y brindar permanente respeto y buen trato al personal del CEA, a los demás compañeros y demás usuarios de la vía. F) Informar oportunamente a la dirección de cualquier anomalía o inconveniente a través del diligenciamiento y entrega del formato correspondiente. G) Cumplir con la programación convenida y presentarse a las clases con una anticipación de mínimo 15 minutos. El primer 25% de las horas de práctica serán realizadas en el área dispuesta para tal fin. La falla a clases que no hayan sido reportadas con la anticipación deberá ser reemplazadas en otro horario y el estudiante deberá cancelar el valor correspondiente. H) En ningún caso podrá el estudiante llevar acompañante para las clases prácticas, salvo en el caso del numeral sexto, literal B o cuando la capacitación se imparta en vehículos de las categorías B2, C2, B3 y C3. I) Asistir a la formación sin estar bajo la influencia de sustancias psicoactivas o medicamento que afecten la capacidad de atención y/o reacción. J) Firmar las planillas de asistencia y demás evidencias del proceso de formación realizado. K) Guardar absoluta reserva respecto a la metodología y los procedimientos utilizados durante el proceso de formación, evaluación y certificación. L) Informar cualquier cambio en las capacidades del Estudiante que comprometan la aptitud para conducir. M) Cancelar los valores adicionales que sean generados por el incumplimiento a las clases prácticas.

SÉPTIMA. Derechos del CEA: A) Verificar que la información suministrada por el Estudiante sea verdadera. B) Realizar mejoras en el proceso de formación, cambios de instructor, de vehículo o de aulas, acorde a las necesidades.`;

const DEFAULT_PAGE2 = `C) Informar al Estudiante de la suspensión y reprogramación de clases con mínimo doce (12) horas de anticipación. D) Realizar el proceso de certificación del Estudiante de manera imparcial. E) Suspender y retirar temporalmente del proceso de formación al Estudiante que incumpla cualquiera de las normas contenidas en el presente contrato o en el manual de convivencia. F) Dar por terminado el presente contrato en caso de que el Estudiante incurra en agresión física o verbal a personas en el CEA, por brindar información falsa al CEA, por realizar suplantación de personalidad o realizar fraude en la evaluación teórica o cualquier otra considerada en el manual de convivencia. G) Aprobar, reprobar o aplazar al Estudiante acorde al resultado del proceso de certificación y teniendo en cuenta los parámetros exigidos por la normatividad existente.

OCTAVA. Obligaciones del CEA: A) Convenir con el Estudiante los horarios para que tome la formación y vigilar su cumplimiento. B) Garantizar instructores idóneos, vehículos adecuados y material pedagógico pertinente durante todo el proceso de formación. C) Brindar la intensidad y contenido temático acorde a la normatividad. D) Garantizar que las instalaciones cumplan con las condiciones para la formación. E) Enviar oportuna y completamente a la Plataforma del RUNT, la información del Estudiante que haya aprobado la formación impartida por el CEA para su debida certificación. F) Atender cualquier reclamación presentada por el Estudiante y tomar con celeridad una decisión sobre si aceptar o negar, acorde a la información suministrada.

NOVENA. Exclusión de Responsabilidad: El CEA no asumirá responsabilidad alguna por inconvenientes ajenos a los servicios ofrecidos, tales como: A) Multas o comparendos que posea el estudiante y que le impidan obtener la certificación. B) No utilizar el certificado expedido por el CEA, dentro de los seis (6) meses siguientes, plazo al término del cual, el RUNT procede a anularlo. C) Vencimiento del certificado de aptitud física, mental y de coordinación motriz, el cual tiene una vigencia de ciento ochenta (180) días. D) Peajes. E) Cualquier otra que no esté contemplada dentro del presente contrato.

DÉCIMA. Multas. De acuerdo a los artículos: quinto numeral j y sexto en su numeral g, el estudiante se obliga a informar con anticipación de 24 horas el cambio de horario o su inasistencia a clase para la correspondiente modificación en el horario, el incumplir con lo estipulado ocasionará el cobro de DIEZ MIL PESOS m/cte. ($10.000) por hora de clase programada, valor que se podrá cobrar al finalizar el curso o sumar al saldo pendiente por pagar; además, sin el pago de las multas ocasionadas el CEA no podrá realizar la certificación respectiva (El incumplimiento causado por situaciones de fuerza mayor o caso fortuito no serán objeto de multa por el CEA).

DÉCIMA PRIMERA. Terminación: El contrato podrá darse por terminado de manera unilateral por parte del CEA en cualquiera de los siguientes casos: A) Por incumplimiento de las obligaciones del Estudiante. B) Por cumplirse el plazo máximo para realizar el proceso de formación (3 meses). PARÁGRAFO: El plazo máximo que la plataforma de inscripción de estudiantes Aulapp permite a cada estudiante es de tres (03) meses.

DÉCIMA SEGUNDA. Devolución de Dinero. El CEA no realizará devolución de dinero: a) Por incumplimiento de las obligaciones del Estudiante. b) Una vez se realice matricula y/o registro del estudiante en el sistema no habrá devolución del pago de PIN. c) Cuando el estudiante realice aportes en dinero, haya comenzado con clases teóricas y/o prácticas y no termine el curso no habrá devolución del dinero. d) No habrá devolución de aportes entregados una vez cumplido el plazo máximo para realizar el proceso de formación (3 meses), tiempo dentro del cual el Estudiante debe terminar su formación.

DÉCIMA TERCERA. Declaración de veracidad: En constancia el Estudiante declara conocer y aceptar sus derechos y obligaciones, el manual de convivencia y los deberes de las personas certificadas, estipulados en el presente contrato y de asumir completamente las consecuencias que ocasione infringirlos. Las partes conocen, comprenden y aceptan todas y cada una de las estipulaciones contenidas en el presente documento y para constancia firman en {{SEDE_DIRECCION}} a {{FECHA_CONTRATO}}.`;

type TabId = "encabezado" | "texto" | "pie";

interface ConfigForm {
  nombre_legal_escuela: string;
  nit_escuela: string;
  representante_legal_nombre: string;
  representante_legal_tipo_documento: string;
  representante_legal_numero_documento: string;
  representante_legal_lugar_expedicion: string;
  direccion_legal_escuela: string;
  telefono_legal_escuela: string;
  ciudad_firma: string;
  cargo_firmante: string;
  pie_direccion: string;
  pie_telefonos: string;
  pie_correo: string;
}

const emptyConfig: ConfigForm = {
  nombre_legal_escuela: "",
  nit_escuela: "",
  representante_legal_nombre: "",
  representante_legal_tipo_documento: "CC",
  representante_legal_numero_documento: "",
  representante_legal_lugar_expedicion: "",
  direccion_legal_escuela: "",
  telefono_legal_escuela: "",
  ciudad_firma: "",
  cargo_firmante: "Representante legal",
  pie_direccion: "",
  pie_telefonos: "",
  pie_correo: "",
};

export default function ContratosPage() {
  const { perfil } = useAuth();

  const [tab, setTab] = useState<TabId>("encabezado");
  const [config, setConfig] = useState<ConfigForm>(emptyConfig);
  const [textoPagina1, setTextoPagina1] = useState(DEFAULT_PAGE1);
  const [textoPagina2, setTextoPagina2] = useState(DEFAULT_PAGE2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load config
  useEffect(() => {
    if (!perfil) return;
    let cancelled = false;

    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await fetchJsonWithRetry("/api/contratos/configuracion");
        if (cancelled) return;

        if (res.configuracion) {
          const c = res.configuracion;
          setConfig({
            nombre_legal_escuela: c.nombre_legal_escuela || "",
            nit_escuela: c.nit_escuela || "",
            representante_legal_nombre: c.representante_legal_nombre || "",
            representante_legal_tipo_documento: c.representante_legal_tipo_documento || "CC",
            representante_legal_numero_documento: c.representante_legal_numero_documento || "",
            representante_legal_lugar_expedicion: c.representante_legal_lugar_expedicion || "",
            direccion_legal_escuela: c.direccion_legal_escuela || "",
            telefono_legal_escuela: c.telefono_legal_escuela || "",
            ciudad_firma: c.ciudad_firma || "",
            cargo_firmante: c.cargo_firmante || "Representante legal",
            pie_direccion: c.pie_direccion || "",
            pie_telefonos: c.pie_telefonos || "",
            pie_correo: c.pie_correo || "",
          });
        }

        if (res.plantillas?.length) {
          const p = res.plantillas[0];
          if (p.html_plantilla) {
            const parts = p.html_plantilla.split("\n---PAGE_BREAK---\n");
            if (parts.length >= 2) {
              setTextoPagina1(parts[0]);
              setTextoPagina2(parts[1]);
            } else {
              setTextoPagina1(p.html_plantilla);
            }
          }
        }
      } catch {
        showToast("Error al cargar configuración", "err");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [perfil, showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        configuracion: config,
        plantillas: [
          {
            tipo_plantilla: "vehiculo",
            titulo: "Contrato estándar",
            html_plantilla: textoPagina1 + "\n---PAGE_BREAK---\n" + textoPagina2,
          },
        ],
      };

      await fetchJsonWithRetry("/api/contratos/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      showToast("Configuración guardada correctamente");
    } catch {
      showToast("Error al guardar", "err");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof ConfigForm, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof Building2 }[] = [
    { id: "encabezado", label: "Encabezado", icon: Building2 },
    { id: "texto", label: "Texto del contrato", icon: FileText },
    { id: "pie", label: "Pie de página", icon: FileSignature },
  ];

  return (
    <PageScaffold
      eyebrow="Configuración"
      title="Contrato"
      description="Configura los datos legales, el texto y el pie de página del contrato de formación que se imprime para cada alumno."
      actions={
        <button
          onClick={handleSave}
          disabled={saving}
          className="apple-button-primary inline-flex items-center gap-2"
        >
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      }
    >
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="apple-panel overflow-hidden">
        <div className="border-border/50 flex border-b">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-7">
          {/* ─── TAB: ENCABEZADO ─── */}
          {tab === "encabezado" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold">Datos legales de la escuela</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Estos datos se muestran en el encabezado del contrato impreso.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Nombre legal de la escuela</label>
                  <input
                    className={inputCls}
                    value={config.nombre_legal_escuela}
                    onChange={(e) => updateConfig("nombre_legal_escuela", e.target.value)}
                    placeholder="CEA Escuela de Conducción"
                  />
                </div>
                <div>
                  <label className={labelCls}>NIT</label>
                  <input
                    className={inputCls}
                    value={config.nit_escuela}
                    onChange={(e) => updateConfig("nit_escuela", e.target.value)}
                    placeholder="900.123.456-7"
                  />
                </div>
                <div>
                  <label className={labelCls}>Dirección legal</label>
                  <input
                    className={inputCls}
                    value={config.direccion_legal_escuela}
                    onChange={(e) => updateConfig("direccion_legal_escuela", e.target.value)}
                    placeholder="Cra 10 # 20-30, Ciudad"
                  />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input
                    className={inputCls}
                    value={config.telefono_legal_escuela}
                    onChange={(e) => updateConfig("telefono_legal_escuela", e.target.value)}
                    placeholder="3001234567"
                  />
                </div>
                <div>
                  <label className={labelCls}>Ciudad de firma</label>
                  <input
                    className={inputCls}
                    value={config.ciudad_firma}
                    onChange={(e) => updateConfig("ciudad_firma", e.target.value)}
                    placeholder="Bogotá"
                  />
                </div>
                <div>
                  <label className={labelCls}>Cargo del firmante</label>
                  <input
                    className={inputCls}
                    value={config.cargo_firmante}
                    onChange={(e) => updateConfig("cargo_firmante", e.target.value)}
                    placeholder="Representante legal"
                  />
                </div>
              </div>

              <div className="apple-divider" />

              <div>
                <h3 className="text-base font-semibold">Representante legal</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Datos del representante legal que firma el contrato.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Nombre completo</label>
                  <input
                    className={inputCls}
                    value={config.representante_legal_nombre}
                    onChange={(e) => updateConfig("representante_legal_nombre", e.target.value)}
                    placeholder="Nombre del representante"
                  />
                </div>
                <div>
                  <label className={labelCls}>Tipo de documento</label>
                  <select
                    className={inputCls}
                    value={config.representante_legal_tipo_documento}
                    onChange={(e) =>
                      updateConfig("representante_legal_tipo_documento", e.target.value)
                    }
                  >
                    <option value="CC">CC - Cédula de ciudadanía</option>
                    <option value="CE">CE - Cédula de extranjería</option>
                    <option value="PAS">PAS - Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Número de documento</label>
                  <input
                    className={inputCls}
                    value={config.representante_legal_numero_documento}
                    onChange={(e) =>
                      updateConfig("representante_legal_numero_documento", e.target.value)
                    }
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className={labelCls}>Lugar de expedición</label>
                  <input
                    className={inputCls}
                    value={config.representante_legal_lugar_expedicion}
                    onChange={(e) =>
                      updateConfig("representante_legal_lugar_expedicion", e.target.value)
                    }
                    placeholder="Bogotá"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: TEXTO DEL CONTRATO ─── */}
          {tab === "texto" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold">Texto del contrato</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Edita el contenido de las dos páginas del contrato. Separa los párrafos con una
                  línea en blanco. Usa las variables entre llaves dobles para datos dinámicos.
                </p>
              </div>

              {/* Variables reference */}
              <details className="border-border/50 bg-muted/30 rounded-lg border">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium">
                  <Info size={16} className="text-blue-500" />
                  Variables disponibles (clic para expandir)
                </summary>
                <div className="border-border/50 border-t px-4 py-3">
                  <div className="grid gap-1 text-xs sm:grid-cols-2">
                    {VARIABLES_DISPONIBLES.map((v) => (
                      <div key={v.var} className="flex gap-2">
                        <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-blue-600 dark:text-blue-400">
                          {v.var}
                        </code>
                        <span className="text-muted-foreground">{v.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </details>

              <div>
                <label className={labelCls}>Página 1</label>
                <textarea
                  className={`${inputCls} min-h-[400px] font-mono text-xs leading-relaxed`}
                  value={textoPagina1}
                  onChange={(e) => setTextoPagina1(e.target.value)}
                />
              </div>

              <div className="apple-divider" />

              <div>
                <label className={labelCls}>Página 2</label>
                <textarea
                  className={`${inputCls} min-h-[400px] font-mono text-xs leading-relaxed`}
                  value={textoPagina2}
                  onChange={(e) => setTextoPagina2(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ─── TAB: PIE DE PÁGINA ─── */}
          {tab === "pie" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold">Pie de página</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Información que aparece al final de cada página del contrato.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Dirección</label>
                  <input
                    className={inputCls}
                    value={config.pie_direccion}
                    onChange={(e) => updateConfig("pie_direccion", e.target.value)}
                    placeholder="Cra 10 # 20-30, Barrio Centro"
                  />
                </div>
                <div>
                  <label className={labelCls}>Teléfonos</label>
                  <input
                    className={inputCls}
                    value={config.pie_telefonos}
                    onChange={(e) => updateConfig("pie_telefonos", e.target.value)}
                    placeholder="300 123 4567 · 601 234 5678"
                  />
                </div>
                <div>
                  <label className={labelCls}>Correo electrónico</label>
                  <input
                    className={inputCls}
                    value={config.pie_correo}
                    onChange={(e) => updateConfig("pie_correo", e.target.value)}
                    placeholder="info@miescuela.com"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageScaffold>
  );
}
