"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchJsonWithRetry } from "@/lib/retry";
import PageScaffold from "@/components/dashboard/PageScaffold";
import {
  Save,
  FileText,
  Building2,
  FileSignature,
  Variable,
  Eye,
  Pencil,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const inputCls = "apple-input";
const labelCls = "apple-label";

const VARIABLES_DISPONIBLES = [
  { var: "{{NOMBRE_CEA}}", desc: "Nombre legal de la escuela", example: "CEA Condusoft" },
  { var: "{{NIT_CEA}}", desc: "NIT de la escuela", example: "900.123.456-7" },
  { var: "{{DIRECCION_CEA}}", desc: "Direccion legal de la escuela", example: "Cra 10 #20-30" },
  { var: "{{TELEFONO_CEA}}", desc: "Telefono de la escuela", example: "300 123 4567" },
  { var: "{{ALUMNO_NOMBRE}}", desc: "Nombre completo del alumno", example: "Juan Perez Lopez" },
  { var: "{{ALUMNO_DNI}}", desc: "Documento del alumno", example: "1.023.456.789" },
  { var: "{{ALUMNO_DIRECCION}}", desc: "Direccion del alumno", example: "Calle 45 #12-34" },
  { var: "{{ALUMNO_TELEFONO}}", desc: "Telefono del alumno", example: "310 987 6543" },
  { var: "{{CATEGORIAS}}", desc: "Categorias inscritas", example: "B1, A2" },
  { var: "{{FECHA_CONTRATO}}", desc: "Fecha de emision", example: "30 de marzo de 2026" },
  { var: "{{CIUDAD_FIRMA}}", desc: "Ciudad de firma", example: "Bogota" },
  { var: "{{SEDE_DIRECCION}}", desc: "Direccion de la sede", example: "Av. Principal #5-10" },
];

const DEFAULT_PAGE1 = `El CEA {{NOMBRE_CEA}} cumpliendo los requisitos legales establecidos por el Decreto 1079 de 2015, la Resolucion 3245 de 2009 y demas normas complementarias expedidas por el Ministerio de Transporte, Ministerio de Educacion, quien en adelante se llamara el CEA, y el(la) senor(a) {{ALUMNO_NOMBRE}} con CC numero {{ALUMNO_DNI}} con direccion o lugar de residencia: {{ALUMNO_DIRECCION}}, Celular: {{ALUMNO_TELEFONO}}, quien en adelante se llamara EL ESTUDIANTE, celebran el presente contrato de formacion en conduccion para la categoria {{CATEGORIAS}} que se regira por las siguientes clausulas:

PRIMERA. Objeto: El CEA ofrecera al Estudiante el servicio de formacion en conduccion acorde al PEI, comprometiendose en dictar la capacitacion teorico - practica conforme a la normatividad existente y a la categoria solicitada.

SEGUNDA. Requisitos: A) Saber leer y escribir. B) Tener 16 anos cumplidos para el servicio diferente al publico. C) Tener 18 anos para vehiculos de servicio publico. D) Tener aprobado examen psicometrico con certificado vigente de aptitud fisica, mental y de coordinacion motriz para la categoria solicitada antes de iniciar la capacitacion practica.

TERCERA. Duracion: Para garantizar la efectividad en el proceso de formacion y teniendo en cuenta que se trata de un aprendizaje de acciones secuenciales, es necesario que el curso sea continuo en el tiempo. En ningun caso la intensidad horaria prevista podra abarcarse en un lapso mayor a tres (3) meses, si pasado este plazo el Estudiante no ha terminado el curso de conduccion, el CEA no se responsabiliza que el estudiante salga de plataforma y no pueda generar la certificacion por incumplimiento a sus obligaciones.

CUARTA. Forma de pago: El valor del curso sera cancelado directamente por el Estudiante en las instalaciones del CEA en el momento del registro de la matricula. Para el inicio de clases practicas el Estudiante debe haber cancelado el 70% del valor de la matricula.

QUINTA. Derechos de los Estudiantes: Todo Estudiante aspirante a realizar el proceso de formacion para obtener el certificado de aptitud en conduccion tiene los siguientes derechos: A) Ser admitido, obtener la formacion y conocer el resultado del proceso, acorde a la normatividad vigente. B) Obtener proteccion y seguridad sobre toda la informacion que suministre al CEA durante el proceso salvo cuando la ley requiera que dicha informacion se de a conocer. C) Realizar su capacitacion con interprete propio, en caso de existir limitaciones idiomaticas. D) Recibir la formacion con instructores idoneos que cuenten con el perfil adecuado para desempenar estas funciones. E) Recibir la formacion en instalaciones que esten acorde a la normatividad, empleando material didactico adecuado. F) Recibir la formacion practica en vehiculos que cumplan con todas las adaptaciones reglamentarias exigidas por la normatividad. G) Los aspirantes con limitacion fisica podran proveer el vehiculo para acceder a la capacitacion practica, el cual debe contar con los mecanismos y medios auxiliares que se requieran para el ejercicio de la conduccion. H) Recibir la intensidad horaria ofrecida por el CEA, acorde a la normatividad. I) Gozar de imparcialidad, objetividad, respeto y buen trato por parte de todo el personal del CEA. J) Solicitar con anticipacion no menor a veinticuatro (24) horas el aplazamiento de una clase practica, la cual sera reprogramada por el CEA, con el fin de no entorpecer las labores administrativas. K) Presentar los examenes en ambientes adecuados. L) Obtener el certificado de aptitud en conduccion en la categoria solicitada una vez haya completado todos los requerimientos exigidos por el CEA, para lo cual se enviara la informacion correspondiente para que quede registrada en la Plataforma RUNT y a los parametros definidos por la normatividad. M) Presentar formalmente una queja en caso de inconformidad en la prestacion del servicio para que el CEA realice su estudio y proceda a resolverla en caso de ser pertinente. N) Presentar ante el CEA peticion, queja o reclamo, en caso de obtener un resultado adverso en el proceso de evaluacion, de manera que sea reconsiderada o sea repetida acorde a la decision del CEA. O) Recibir informacion oportuna en caso de la modificacion de cualquiera de las condiciones del proceso de formacion por parte del CEA. P) Gozar de los demas derechos consagrados en el PEI y en el manual de convivencia.

SEXTA. Obligaciones de los Estudiantes: A) Declarar al CEA que toda la informacion suministrada es verdadera y actualizada. B) Asistir al proceso acompanado por traductor acorde a la clausula Quinta, literal C. C) Cuidar, proteger y responder por el material didactico suministrado durante la formacion, incluyendo el vehiculo facilitado por el CEA para las clases practicas, cumpliendo con lo especifico para ello en el manual de convivencia. D) Cuidar y proteger los equipos e instalaciones del CEA, asi como velar por el aseo y el uso racional del agua y la energia. E) Cumplir con el manual de convivencia y brindar permanente respeto y buen trato al personal del CEA, a los demas companeros y demas usuarios de la via. F) Informar oportunamente a la direccion de cualquier anomalia o inconveniente a traves del diligenciamiento y entrega del formato correspondiente. G) Cumplir con la programacion convenida y presentarse a las clases con una anticipacion de minimo 15 minutos. El primer 25% de las horas de practica seran realizadas en el area dispuesta para tal fin. La falla a clases que no hayan sido reportadas con la anticipacion debera ser reemplazadas en otro horario y el estudiante debera cancelar el valor correspondiente. H) En ningun caso podra el estudiante llevar acompanante para las clases practicas, salvo en el caso del numeral sexto, literal B o cuando la capacitacion se imparta en vehiculos de las categorias B2, C2, B3 y C3. I) Asistir a la formacion sin estar bajo la influencia de sustancias psicoactivas o medicamento que afecten la capacidad de atencion y/o reaccion. J) Firmar las planillas de asistencia y demas evidencias del proceso de formacion realizado. K) Guardar absoluta reserva respecto a la metodologia y los procedimientos utilizados durante el proceso de formacion, evaluacion y certificacion. L) Informar cualquier cambio en las capacidades del Estudiante que comprometan la aptitud para conducir. M) Cancelar los valores adicionales que sean generados por el incumplimiento a las clases practicas.

SEPTIMA. Derechos del CEA: A) Verificar que la informacion suministrada por el Estudiante sea verdadera. B) Realizar mejoras en el proceso de formacion, cambios de instructor, de vehiculo o de aulas, acorde a las necesidades.`;

const DEFAULT_PAGE2 = `C) Informar al Estudiante de la suspension y reprogramacion de clases con minimo doce (12) horas de anticipacion. D) Realizar el proceso de certificacion del Estudiante de manera imparcial. E) Suspender y retirar temporalmente del proceso de formacion al Estudiante que incumpla cualquiera de las normas contenidas en el presente contrato o en el manual de convivencia. F) Dar por terminado el presente contrato en caso de que el Estudiante incurra en agresion fisica o verbal a personas en el CEA, por brindar informacion falsa al CEA, por realizar suplantacion de personalidad o realizar fraude en la evaluacion teorica o cualquier otra considerada en el manual de convivencia. G) Aprobar, reprobar o aplazar al Estudiante acorde al resultado del proceso de certificacion y teniendo en cuenta los parametros exigidos por la normatividad existente.

OCTAVA. Obligaciones del CEA: A) Convenir con el Estudiante los horarios para que tome la formacion y vigilar su cumplimiento. B) Garantizar instructores idoneos, vehiculos adecuados y material pedagogico pertinente durante todo el proceso de formacion. C) Brindar la intensidad y contenido tematico acorde a la normatividad. D) Garantizar que las instalaciones cumplan con las condiciones para la formacion. E) Enviar oportuna y completamente a la Plataforma del RUNT, la informacion del Estudiante que haya aprobado la formacion impartida por el CEA para su debida certificacion. F) Atender cualquier reclamacion presentada por el Estudiante y tomar con celeridad una decision sobre si aceptar o negar, acorde a la informacion suministrada.

NOVENA. Exclusion de Responsabilidad: El CEA no asumira responsabilidad alguna por inconvenientes ajenos a los servicios ofrecidos, tales como: A) Multas o comparendos que posea el estudiante y que le impidan obtener la certificacion. B) No utilizar el certificado expedido por el CEA, dentro de los seis (6) meses siguientes, plazo al termino del cual, el RUNT procede a anularlo. C) Vencimiento del certificado de aptitud fisica, mental y de coordinacion motriz, el cual tiene una vigencia de ciento ochenta (180) dias. D) Peajes. E) Cualquier otra que no este contemplada dentro del presente contrato.

DECIMA. Multas. De acuerdo a los articulos: quinto numeral j y sexto en su numeral g, el estudiante se obliga a informar con anticipacion de 24 horas el cambio de horario o su inasistencia a clase para la correspondiente modificacion en el horario, el incumplir con lo estipulado ocasionara el cobro de DIEZ MIL PESOS m/cte. ($10.000) por hora de clase programada, valor que se podra cobrar al finalizar el curso o sumar al saldo pendiente por pagar; ademas, sin el pago de las multas ocasionadas el CEA no podra realizar la certificacion respectiva (El incumplimiento causado por situaciones de fuerza mayor o caso fortuito no seran objeto de multa por el CEA).

DECIMA PRIMERA. Terminacion: El contrato podra darse por terminado de manera unilateral por parte del CEA en cualquiera de los siguientes casos: A) Por incumplimiento de las obligaciones del Estudiante. B) Por cumplirse el plazo maximo para realizar el proceso de formacion (3 meses). PARAGRAFO: El plazo maximo que la plataforma de inscripcion de estudiantes Aulapp permite a cada estudiante es de tres (03) meses.

DECIMA SEGUNDA. Devolucion de Dinero. El CEA no realizara devolucion de dinero: a) Por incumplimiento de las obligaciones del Estudiante. b) Una vez se realice matricula y/o registro del estudiante en el sistema no habra devolucion del pago de PIN. c) Cuando el estudiante realice aportes en dinero, haya comenzado con clases teoricas y/o practicas y no termine el curso no habra devolucion del dinero. d) No habra devolucion de aportes entregados una vez cumplido el plazo maximo para realizar el proceso de formacion (3 meses), tiempo dentro del cual el Estudiante debe terminar su formacion.

DECIMA TERCERA. Declaracion de veracidad: En constancia el Estudiante declara conocer y aceptar sus derechos y obligaciones, el manual de convivencia y los deberes de las personas certificadas, estipulados en el presente contrato y de asumir completamente las consecuencias que ocasione infringirlos. Las partes conocen, comprenden y aceptan todas y cada una de las estipulaciones contenidas en el presente documento y para constancia firman en {{SEDE_DIRECCION}} a {{FECHA_CONTRATO}}.`;

type TabId = "encabezado" | "texto" | "pie";
type EditorMode = "editar" | "preview";

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

/* ─── Variable insertion helper ─── */
function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  text: string,
  setter: (fn: (prev: string) => string) => void
) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  setter((prev) => prev.slice(0, start) + text + prev.slice(end));
  // Restore cursor after the inserted text
  requestAnimationFrame(() => {
    el.focus();
    el.selectionStart = el.selectionEnd = start + text.length;
  });
}

/* ─── Preview renderer ─── */
function replaceWithExamples(text: string): string {
  let result = text;
  for (const v of VARIABLES_DISPONIBLES) {
    result = result.replaceAll(v.var, v.example);
  }
  return result;
}

function ContractPreview({ text }: { text: string }) {
  const rendered = replaceWithExamples(text);
  const paragraphs = rendered.split(/\n\n+/);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-[var(--surface-border)] bg-white p-6 shadow-sm dark:bg-[#1a1a1c]">
      {paragraphs.map((p, i) => {
        const trimmed = p.trim();
        if (!trimmed) return null;
        // Detect clause headings (PRIMERA., SEGUNDA., etc.)
        const isClause =
          /^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SEPTIMA|OCTAVA|NOVENA|DECIMA|PARAGRAFO)/i.test(
            trimmed
          );
        return (
          <p
            key={i}
            className={`text-[13px] leading-[1.7] text-[#1d1d1f] dark:text-[#e5e5e7] ${
              i > 0 ? "mt-3" : ""
            } ${isClause ? "font-semibold" : ""}`}
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

/* ─── Variables panel ─── */
function VariablesPanel({
  activeRef,
  activeSetter,
  compact = false,
}: {
  activeRef: React.RefObject<HTMLTextAreaElement | null>;
  activeSetter: (fn: (prev: string) => string) => void;
  compact?: boolean;
}) {
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const handleInsert = (varName: string) => {
    insertAtCursor(activeRef, varName, activeSetter);
  };

  const handleCopy = (varName: string) => {
    void navigator.clipboard.writeText(varName);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {VARIABLES_DISPONIBLES.map((v) => (
          <button
            key={v.var}
            type="button"
            onClick={() => handleInsert(v.var)}
            title={`${v.desc} — Clic para insertar`}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-[11px] text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:border-blue-600 dark:hover:bg-blue-900"
          >
            <Variable size={10} />
            {v.var.replace(/\{\{|\}\}/g, "")}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {VARIABLES_DISPONIBLES.map((v) => (
        <div
          key={v.var}
          className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-muted)]"
        >
          <button
            type="button"
            onClick={() => handleInsert(v.var)}
            className="min-w-0 flex-1 text-left"
            title="Clic para insertar en el editor"
          >
            <code className="block truncate font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              {v.var}
            </code>
            <span className="block truncate text-[10px] text-[var(--gray-500)]">{v.desc}</span>
          </button>
          <button
            type="button"
            onClick={() => handleCopy(v.var)}
            className="shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
            title="Copiar variable"
          >
            {copiedVar === v.var ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <Copy size={12} className="text-[var(--gray-500)]" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Contract text editor section ─── */
function ContractEditorSection({
  pageLabel,
  pageNumber,
  text,
  setText,
  defaultText,
  textareaRef,
  editorMode,
}: {
  pageLabel: string;
  pageNumber: number;
  text: string;
  setText: (val: string) => void;
  defaultText: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  editorMode: EditorMode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  const clauseCount = (text.match(/^[A-ZÁÉÍÓÚ]+\./gm) || []).length;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--surface-border)]">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between bg-[var(--surface-muted)] px-4 py-3 transition-colors hover:bg-[var(--surface-muted-hover,var(--surface-muted))]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {pageNumber}
          </span>
          <div className="text-left">
            <span className="text-foreground text-sm font-semibold">{pageLabel}</span>
            <span className="ml-3 text-[11px] text-[var(--gray-500)]">
              {wordCount} palabras · {charCount} caracteres
              {clauseCount > 0 && ` · ${clauseCount} clausulas`}
            </span>
          </div>
        </div>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {!collapsed && (
        <div className="p-4">
          {editorMode === "editar" ? (
            <textarea
              ref={textareaRef}
              className={`${inputCls} min-h-[420px] resize-y font-mono text-[12px] leading-[1.8] tracking-wide`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck
            />
          ) : (
            <ContractPreview text={text} />
          )}

          {/* Actions */}
          {editorMode === "editar" && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-[var(--gray-500)]">
                Separa las clausulas con una linea en blanco. Las variables se reemplazan al
                imprimir.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "Se restaurara el texto por defecto de esta pagina. Los cambios no guardados se perderan."
                    )
                  ) {
                    setText(defaultText);
                  }
                }}
                className="hover:text-foreground inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--gray-500)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                <RotateCcw size={12} />
                Restaurar por defecto
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */
export default function ContratosPage() {
  const { perfil } = useAuth();

  const [tab, setTab] = useState<TabId>("encabezado");
  const [config, setConfig] = useState<ConfigForm>(emptyConfig);
  const [textoPagina1, setTextoPagina1] = useState(DEFAULT_PAGE1);
  const [textoPagina2, setTextoPagina2] = useState(DEFAULT_PAGE2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("editar");
  const [activePage, setActivePage] = useState<1 | 2>(1);
  const [showVarsPanel, setShowVarsPanel] = useState(true);

  const textarea1Ref = useRef<HTMLTextAreaElement | null>(null);
  const textarea2Ref = useRef<HTMLTextAreaElement | null>(null);

  const activeRef = activePage === 1 ? textarea1Ref : textarea2Ref;
  const activeSetter = activePage === 1 ? setTextoPagina1 : setTextoPagina2;

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
        showToast("Error al cargar configuracion", "err");
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
            titulo: "Contrato estandar",
            html_plantilla: textoPagina1 + "\n---PAGE_BREAK---\n" + textoPagina2,
          },
        ],
      };

      await fetchJsonWithRetry("/api/contratos/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      showToast("Configuracion guardada correctamente");
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
    { id: "pie", label: "Pie de pagina", icon: FileSignature },
  ];

  return (
    <PageScaffold
      eyebrow="Configuracion"
      title="Contrato"
      description="Configura los datos legales, el texto y el pie de pagina del contrato de formacion que se imprime para cada alumno."
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
                    placeholder="CEA Escuela de Conduccion"
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
                  <label className={labelCls}>Direccion legal</label>
                  <input
                    className={inputCls}
                    value={config.direccion_legal_escuela}
                    onChange={(e) => updateConfig("direccion_legal_escuela", e.target.value)}
                    placeholder="Cra 10 # 20-30, Ciudad"
                  />
                </div>
                <div>
                  <label className={labelCls}>Telefono</label>
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
                    placeholder="Bogota"
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
                    <option value="CC">CC - Cedula de ciudadania</option>
                    <option value="CE">CE - Cedula de extranjeria</option>
                    <option value="PAS">PAS - Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Numero de documento</label>
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
                  <label className={labelCls}>Lugar de expedicion</label>
                  <input
                    className={inputCls}
                    value={config.representante_legal_lugar_expedicion}
                    onChange={(e) =>
                      updateConfig("representante_legal_lugar_expedicion", e.target.value)
                    }
                    placeholder="Bogota"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: TEXTO DEL CONTRATO ─── */}
          {tab === "texto" && (
            <div className="space-y-5">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Texto del contrato</h3>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    Edita el contenido de cada pagina. Haz clic en una variable para insertarla en
                    la posicion del cursor.
                  </p>
                </div>

                {/* Editor/Preview toggle */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex overflow-hidden rounded-lg border border-[var(--surface-border)]">
                    <button
                      type="button"
                      onClick={() => setEditorMode("editar")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                        editorMode === "editar"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "hover:text-foreground text-[var(--gray-500)]"
                      }`}
                    >
                      <Pencil size={13} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("preview")}
                      className={`inline-flex items-center gap-1.5 border-l border-[var(--surface-border)] px-3 py-1.5 text-xs font-medium transition-colors ${
                        editorMode === "preview"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "hover:text-foreground text-[var(--gray-500)]"
                      }`}
                    >
                      <Eye size={13} />
                      Vista previa
                    </button>
                  </div>
                </div>
              </div>

              {/* Variables toolbar (compact, always visible in edit mode) */}
              {editorMode === "editar" && (
                <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Variable size={14} className="text-blue-500" />
                      <span className="text-[11px] font-semibold tracking-wider text-[var(--gray-500)] uppercase">
                        Variables — Clic para insertar
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--gray-500)]">
                        Insertando en: Pagina {activePage}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowVarsPanel(!showVarsPanel)}
                        className="hover:text-foreground rounded p-1 text-[var(--gray-500)] transition-colors"
                      >
                        {showVarsPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                  {showVarsPanel && (
                    <VariablesPanel activeRef={activeRef} activeSetter={activeSetter} compact />
                  )}
                </div>
              )}

              {/* Page editors */}
              <div className="space-y-4">
                <div onFocus={() => setActivePage(1)}>
                  <ContractEditorSection
                    pageLabel="Pagina 1 — Clausulas PRIMERA a SEPTIMA"
                    pageNumber={1}
                    text={textoPagina1}
                    setText={setTextoPagina1}
                    defaultText={DEFAULT_PAGE1}
                    textareaRef={textarea1Ref}
                    editorMode={editorMode}
                  />
                </div>

                <div onFocus={() => setActivePage(2)}>
                  <ContractEditorSection
                    pageLabel="Pagina 2 — Clausulas OCTAVA a DECIMA TERCERA"
                    pageNumber={2}
                    text={textoPagina2}
                    setText={setTextoPagina2}
                    defaultText={DEFAULT_PAGE2}
                    textareaRef={textarea2Ref}
                    editorMode={editorMode}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: PIE DE PAGINA ─── */}
          {tab === "pie" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold">Pie de pagina</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Informacion que aparece al final de cada pagina del contrato.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Direccion</label>
                  <input
                    className={inputCls}
                    value={config.pie_direccion}
                    onChange={(e) => updateConfig("pie_direccion", e.target.value)}
                    placeholder="Cra 10 # 20-30, Barrio Centro"
                  />
                </div>
                <div>
                  <label className={labelCls}>Telefonos</label>
                  <input
                    className={inputCls}
                    value={config.pie_telefonos}
                    onChange={(e) => updateConfig("pie_telefonos", e.target.value)}
                    placeholder="300 123 4567 - 601 234 5678"
                  />
                </div>
                <div>
                  <label className={labelCls}>Correo electronico</label>
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
