"use client";

import { useEffect, useMemo, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { BookOpen, Pencil } from "lucide-react";
import Modal from "@/components/dashboard/Modal";
import AnsvFields from "./AnsvFields";
import { latestAnsvBirthDate } from "@/lib/ansv";
import { getTodayDateString } from "@/lib/date-utils";
import {
  BILLING_DEPARTMENTS,
  BILLING_RESPONSIBILITIES,
  COLOMBIA_MUNICIPALITIES,
} from "@/lib/student-billing-contact";
import type { EstadoAlumno, MetodoPago, TipoRegistroAlumno } from "@/types/database";
import type { AlumnoFormType, AlumnoRow, MatriculaResumen } from "./constants";
import { useContractPreview } from "./useContractPreview";
import {
  CATEGORIAS_APTITUD,
  TODAS_CATEGORIAS,
  estadosAlumno,
  formatEstadoLabel,
  formatMatriculaLabel,
  inputClass,
  labelClass,
  metodosPago,
  orderRegularContractCategories,
  tiposRegistroAlumno,
} from "./constants";

interface AlumnoModalProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  editing: AlumnoRow | null;
  editingHasMultipleMatriculas: boolean;
  editingMatricula: MatriculaResumen | null;
  isAptitudForm: boolean;
  isPracticeForm: boolean;
  form: AlumnoFormType;
  setForm: Dispatch<SetStateAction<AlumnoFormType>>;
  saving: boolean;
  handleSave: () => void;
  toggleCategoria: (cat: string) => void;
  openNewMatricula: (alumno: AlumnoRow) => void;
  catalogsLoading?: boolean;
  categoriasEscuela: string[];
  tramitadorOptions: string[];
  formError?: string;
  openEditMatricula?: (alumno: AlumnoRow, matricula: MatriculaResumen) => void;
}

const compactInput = `${inputClass} !min-h-11 !min-w-0 !rounded-lg !px-3 !py-2 !text-base sm:!min-h-10 sm:!text-sm`;
const compactLabel = `${labelClass} !mb-1 !tracking-normal`;
const selectClass = `${compactInput} apple-select`;
const textareaClass = "apple-textarea !min-h-20 !rounded-lg !px-3 !py-2 !text-base sm:!text-sm";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--surface-border)] pb-4 last:border-0">
      <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{title}</h4>
      {children}
    </section>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3] dark:border-[#69a9ff]/50 dark:bg-[#0071e3]/15 dark:text-[#69a9ff]"
          : "border-[var(--surface-border)] bg-[var(--surface-strong)] text-[#66707a] hover:border-[var(--surface-border-strong)] hover:text-[#111214] dark:text-[#aeb6bf] dark:hover:text-[#f5f5f7]"
      }`}
    >
      {label}
    </button>
  );
}

export default function AlumnoModal({
  modalOpen,
  setModalOpen,
  editing,
  editingHasMultipleMatriculas,
  editingMatricula,
  isAptitudForm,
  isPracticeForm,
  form,
  setForm,
  saving,
  handleSave,
  toggleCategoria,
  openNewMatricula,
  catalogsLoading = false,
  categoriasEscuela,
  tramitadorOptions,
  formError = "",
  openEditMatricula,
}: AlumnoModalProps) {
  const tramitadorListId = "alumno-tramitador-options";
  const isRegularForm = !isAptitudForm && !isPracticeForm;
  const contactRequired = !editing;
  const birthRequired = isRegularForm && (!editing || Boolean(editing.fecha_nacimiento));
  const sexRequired = isRegularForm && (!editing || Boolean(editing.sexo));
  const showMatriculas = editingHasMultipleMatriculas || Boolean(editing && isRegularForm);
  const municipalities = useMemo(
    () =>
      Object.entries(COLOMBIA_MUNICIPALITIES)
        .filter(([, municipality]) => municipality[1] === form.departamento)
        .sort((a, b) => a[1][0].localeCompare(b[1][0], "es")),
    [form.departamento]
  );
  const valorTotal = parseFloat(String(form.valor_total)) || 0;
  const pagoInicial = parseFloat(String(form.abono)) || 0;
  const saldoPendiente = Math.max(valorTotal - pagoInicial, 0);
  const selectedCategorias = form.categorias.filter(Boolean);
  useEffect(() => {
    if (
      selectedCategorias.length > 0 &&
      (!form.ansv_categoria || !selectedCategorias.includes(form.ansv_categoria))
    ) {
      setForm((prev) => ({
        ...prev,
        ansv_categoria: selectedCategorias[0],
      }));
    }
  }, [selectedCategorias, form.ansv_categoria, setForm]);
  const lockedRegularContractNumber =
    isRegularForm && !showMatriculas ? editingMatricula?.numero_contrato || null : null;
  const {
    preview: contractPreview,
    loading: loadingContractPreview,
    hasCategorias,
  } = useContractPreview({
    enabled: modalOpen && isRegularForm && !showMatriculas,
    categorias: selectedCategorias,
    lockedNumber: lockedRegularContractNumber,
  });
  const regularCategories = orderRegularContractCategories(
    categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS
  );
  const title = editing
    ? isAptitudForm
      ? "Editar proceso de aptitud"
      : isPracticeForm
        ? "Editar práctica adicional"
        : "Editar alumno"
    : isAptitudForm
      ? "Nuevo proceso de aptitud"
      : isPracticeForm
        ? "Nueva práctica adicional"
        : "Nuevo alumno";

  const saveLabel = saving
    ? "Guardando..."
    : editing
      ? "Guardar cambios"
      : isAptitudForm
        ? "Crear proceso de aptitud"
        : isPracticeForm
          ? "Crear registro de práctica"
          : "Crear alumno";

  return (
    <Modal
      open={modalOpen}
      onClose={() => {
        if (!saving) setModalOpen(false);
      }}
      title={title}
      maxWidth="max-w-4xl"
      mobilePresentation="fullscreen"
    >
      <form
        aria-label={title}
        aria-busy={saving}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving && (editing || form.consentimiento_datos)) handleSave();
        }}
        className="space-y-4"
      >
        {editing && editing.tipo_registro === "regular" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                openNewMatricula(editing);
              }}
              className="apple-button-secondary text-sm"
            >
              <BookOpen size={16} />
              Nueva matrícula
            </button>
          </div>
        )}

        {catalogsLoading && (
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[#66707a] dark:text-[#aeb6bf]">
            Cargando categorías y sugerencias del formulario...
          </div>
        )}

        <div className="min-w-0">
          <div className="space-y-4">
            <Section title="Registro">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label htmlFor="alumno-tipo-registro" className={compactLabel}>
                    Tipo de registro *
                  </label>
                  <select
                    id="alumno-tipo-registro"
                    required
                    value={form.tipo_registro}
                    onChange={(event) => {
                      const nextType = event.target.value as TipoRegistroAlumno;
                      setForm((prev) => ({
                        ...prev,
                        tipo_registro: nextType,
                        categorias:
                          nextType === "aptitud_conductor"
                            ? prev.categorias.slice(0, 1)
                            : nextType === "practica_adicional"
                              ? []
                              : prev.categorias,
                        empresa_convenio:
                          nextType === "aptitud_conductor"
                            ? prev.empresa_convenio || "Supertaxis"
                            : nextType === "practica_adicional"
                              ? prev.empresa_convenio || "Práctica adicional"
                              : "",
                        numero_contrato: nextType === "regular" ? "" : prev.numero_contrato,
                        tiene_tramitador: nextType === "regular" ? prev.tiene_tramitador : false,
                        tramitador_nombre: nextType === "regular" ? prev.tramitador_nombre : "",
                        tramitador_valor: nextType === "regular" ? prev.tramitador_valor : "",
                      }));
                    }}
                    disabled={Boolean(editing)}
                    className={`${selectClass} ${editing ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    {tiposRegistroAlumno.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="alumno-estado-origen" className={compactLabel}>
                    {isAptitudForm
                      ? "Convenio / empresa"
                      : isPracticeForm
                        ? "Servicio / origen"
                        : "Estado"}
                  </label>
                  {isAptitudForm || isPracticeForm ? (
                    <input
                      id="alumno-estado-origen"
                      type="text"
                      value={form.empresa_convenio}
                      onChange={(event) =>
                        setForm({ ...form, empresa_convenio: event.target.value })
                      }
                      className={compactInput}
                      placeholder={isAptitudForm ? "Supertaxis" : "Práctica adicional"}
                    />
                  ) : (
                    <select
                      id="alumno-estado-origen"
                      value={form.estado}
                      onChange={(event) =>
                        setForm({ ...form, estado: event.target.value as EstadoAlumno })
                      }
                      className={selectClass}
                    >
                      {estadosAlumno.map((estado) => (
                        <option key={estado} value={estado}>
                          {formatEstadoLabel(estado)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Datos del alumno">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                <div>
                  <label htmlFor="alumno-nombre" className={compactLabel}>
                    Nombre *
                  </label>
                  <input
                    id="alumno-nombre"
                    required
                    minLength={editing ? 1 : 2}
                    type="text"
                    value={form.nombre}
                    onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                    className={compactInput}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label htmlFor="alumno-apellidos" className={compactLabel}>
                    Apellidos *
                  </label>
                  <input
                    id="alumno-apellidos"
                    required
                    minLength={editing ? 1 : 2}
                    type="text"
                    value={form.apellidos}
                    onChange={(event) => setForm({ ...form, apellidos: event.target.value })}
                    className={compactInput}
                    placeholder="Apellidos"
                  />
                </div>
                <div>
                  <label htmlFor="alumno-documento" className={compactLabel}>
                    Número de documento *
                  </label>
                  <input
                    id="alumno-documento"
                    required
                    minLength={5}
                    type="text"
                    value={form.dni}
                    onChange={(event) => setForm({ ...form, dni: event.target.value })}
                    className={compactInput}
                    placeholder="Número de documento"
                  />
                </div>
                <div>
                  <label htmlFor="alumno-tipo-documento" className={compactLabel}>
                    Tipo de documento *
                  </label>
                  <select
                    id="alumno-tipo-documento"
                    required
                    value={form.tipo_documento}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        tipo_documento: event.target.value as typeof form.tipo_documento,
                      })
                    }
                    className={selectClass}
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="TI">TI</option>
                    <option value="PAS">PAS</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="alumno-telefono" className={compactLabel}>
                    Teléfono {contactRequired ? "*" : ""}
                  </label>
                  <input
                    id="alumno-telefono"
                    type="tel"
                    autoComplete="tel"
                    required={contactRequired}
                    maxLength={30}
                    value={form.telefono}
                    onChange={(event) => setForm({ ...form, telefono: event.target.value })}
                    className={compactInput}
                    placeholder="Teléfono principal"
                  />
                </div>
                <div>
                  <label htmlFor="alumno-expedicion" className={compactLabel}>
                    Lugar de expedición {contactRequired ? "*" : ""}
                  </label>
                  <input
                    id="alumno-expedicion"
                    required={contactRequired}
                    type="text"
                    value={form.lugar_expedicion_documento}
                    onChange={(event) =>
                      setForm({ ...form, lugar_expedicion_documento: event.target.value })
                    }
                    className={compactInput}
                    placeholder="Ciudad de expedición"
                  />
                </div>
                <div>
                  <label htmlFor="alumno-nacimiento" className={compactLabel}>
                    Fecha de nacimiento {birthRequired ? "*" : ""}
                  </label>
                  <input
                    id="alumno-nacimiento"
                    type="date"
                    required={birthRequired}
                    max={
                      isRegularForm
                        ? latestAnsvBirthDate(
                            editing ? getTodayDateString() : form.fecha_inscripcion
                          )
                        : getTodayDateString()
                    }
                    value={form.fecha_nacimiento}
                    onChange={(event) => setForm({ ...form, fecha_nacimiento: event.target.value })}
                    className={compactInput}
                  />
                </div>
                <div>
                  <label htmlFor="alumno-sexo" className={compactLabel}>
                    Sexo {sexRequired ? "*" : ""}
                  </label>
                  <select
                    id="alumno-sexo"
                    className={selectClass}
                    required={sexRequired}
                    value={form.sexo}
                    onChange={(event) =>
                      setForm({ ...form, sexo: event.target.value as typeof form.sexo })
                    }
                  >
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label htmlFor="alumno-email" className={compactLabel}>
                    Correo electrónico para facturación {contactRequired ? "*" : ""}
                  </label>
                  <input
                    id="alumno-email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required={contactRequired}
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    className={compactInput}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </Section>

            <Section title="Dirección y facturación">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
                <div className="col-span-2">
                  <label htmlFor="alumno-direccion" className={compactLabel}>
                    Dirección {contactRequired ? "*" : ""}
                  </label>
                  <input
                    id="alumno-direccion"
                    type="text"
                    autoComplete="street-address"
                    required={contactRequired}
                    maxLength={200}
                    value={form.direccion}
                    onChange={(event) => setForm({ ...form, direccion: event.target.value })}
                    className={compactInput}
                    placeholder="Dirección principal"
                  />
                </div>
                <div>
                  <label htmlFor="alumno-pais" className={compactLabel}>
                    País {contactRequired ? "*" : ""}
                  </label>
                  <select
                    id="alumno-pais"
                    value={form.pais}
                    required={contactRequired}
                    className={selectClass}
                    onChange={(event) => setForm({ ...form, pais: event.target.value })}
                  >
                    <option value="CO">Colombia</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="alumno-departamento" className={compactLabel}>
                    Departamento {contactRequired ? "*" : ""}
                  </label>
                  <select
                    id="alumno-departamento"
                    required={contactRequired}
                    value={form.departamento}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        departamento: event.target.value,
                        ciudad: "",
                        municipio_codigo: "",
                      })
                    }
                    className={selectClass}
                  >
                    <option value="">Selecciona un departamento</option>
                    {BILLING_DEPARTMENTS.map((departamento) => (
                      <option key={departamento} value={departamento}>
                        {departamento}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="alumno-municipio" className={compactLabel}>
                    Municipio {contactRequired ? "*" : ""}
                  </label>
                  <select
                    id="alumno-municipio"
                    required={contactRequired}
                    value={form.municipio_codigo}
                    disabled={!form.departamento}
                    className={selectClass}
                    onChange={(event) => {
                      const code = event.target.value;
                      setForm({
                        ...form,
                        municipio_codigo: code,
                        ciudad: COLOMBIA_MUNICIPALITIES[code]?.[0] ?? "",
                      });
                    }}
                  >
                    <option value="">
                      {!form.municipio_codigo && form.ciudad
                        ? `${form.ciudad} (sin código)`
                        : "Selecciona un municipio"}
                    </option>
                    {municipalities.map(([code, municipality]) => (
                      <option key={code} value={code}>
                        {municipality[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="alumno-regimen" className={compactLabel}>
                    Régimen fiscal {contactRequired ? "*" : ""}
                  </label>
                  <select
                    id="alumno-regimen"
                    required={contactRequired}
                    value={form.regimen_fiscal}
                    className={selectClass}
                    onChange={(event) => {
                      const regime = event.target.value;
                      setForm((current) => ({
                        ...current,
                        regimen_fiscal: regime,
                        responsabilidad_fiscal:
                          regime === "simple"
                            ? "O-47"
                            : current.responsabilidad_fiscal === "O-47"
                              ? "R-99-PN"
                              : current.responsabilidad_fiscal,
                      }));
                    }}
                  >
                    <option value="">Selecciona según el RUT</option>
                    <option value="ordinario">Régimen ordinario</option>
                    <option value="especial">Régimen tributario especial</option>
                    <option value="simple">Régimen SIMPLE</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label htmlFor="alumno-responsabilidad" className={compactLabel}>
                    Tipo de contribuyente {contactRequired ? "*" : ""}
                  </label>
                  <select
                    id="alumno-responsabilidad"
                    required={contactRequired}
                    value={form.responsabilidad_fiscal}
                    onChange={(event) => {
                      const responsibility = event.target.value;
                      setForm((current) => ({
                        ...current,
                        responsabilidad_fiscal: responsibility,
                        regimen_fiscal:
                          responsibility === "O-47"
                            ? "simple"
                            : current.regimen_fiscal === "simple"
                              ? ""
                              : current.regimen_fiscal,
                      }));
                    }}
                    className={selectClass}
                  >
                    {BILLING_RESPONSIBILITIES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            {showMatriculas ? (
              <Section title="Matrículas del alumno">
                <div className="space-y-3">
                  {editing?.matriculas.map((matricula) => (
                    <div
                      key={matricula.id}
                      className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-strong)] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
                            {formatMatriculaLabel(matricula)}
                          </p>
                          <p className="mt-1 text-xs text-[#66707a] dark:text-[#aeb6bf]">
                            {matricula.fecha_inscripcion || "Sin fecha"} ·{" "}
                            {(matricula.categorias ?? []).join(", ") || "Sin categorías"}
                          </p>
                          <p className="mt-1 text-xs text-[#86868b]">
                            {matricula.estado === "cancelado"
                              ? "Curso cancelado · contrato conservado"
                              : matricula.estado === "cerrado"
                                ? "Curso cerrado"
                                : "Curso activo"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
                          {matricula.valor_total
                            ? `$${Number(matricula.valor_total).toLocaleString("es-CO")}`
                            : "—"}
                        </span>
                        {editing && openEditMatricula && (
                          <button
                            type="button"
                            className="apple-button-secondary text-xs"
                            disabled={saving}
                            aria-label={`Editar matrícula ${matricula.numero_contrato || "sin número"}`}
                            onClick={() => {
                              setModalOpen(false);
                              openEditMatricula(editing, matricula);
                            }}
                          >
                            <Pencil size={14} /> Editar matrícula
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : isAptitudForm ? (
              <>
                <Section title="Detalle del proceso">
                  <div>
                    <label className={compactLabel}>Categoría evaluada *</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.from(new Set([...CATEGORIAS_APTITUD, ...form.categorias])).map(
                        (cat) => (
                          <Chip
                            key={`aptitud-${cat}`}
                            active={form.categorias.includes(cat)}
                            label={cat}
                            onClick={() => toggleCategoria(cat)}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                    <div>
                      <label className={compactLabel}>Referencia interna</label>
                      <input
                        type="text"
                        value={form.numero_contrato}
                        onChange={(event) =>
                          setForm({ ...form, numero_contrato: event.target.value })
                        }
                        className={compactInput}
                        placeholder="Se genera si la dejas vacía"
                      />
                    </div>
                    <div>
                      <label htmlFor="alumno-fecha-proceso" className={compactLabel}>
                        Fecha del proceso {contactRequired ? "*" : ""}
                      </label>
                      <input
                        id="alumno-fecha-proceso"
                        type="date"
                        required={contactRequired}
                        max={getTodayDateString()}
                        value={form.fecha_inscripcion}
                        onChange={(event) =>
                          setForm({ ...form, fecha_inscripcion: event.target.value })
                        }
                        className={compactInput}
                      />
                    </div>

                    <div>
                      <label className={compactLabel}>Valor del servicio</label>
                      <input
                        type="number"
                        min="0"
                        value={form.valor_total}
                        onChange={(event) => setForm({ ...form, valor_total: event.target.value })}
                        className={compactInput}
                        placeholder="120000"
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Resultados del examen">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                    <div>
                      <label className={compactLabel}>Calificación teórica</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={form.nota_examen_teorico}
                        onChange={(event) =>
                          setForm({ ...form, nota_examen_teorico: event.target.value })
                        }
                        className={compactInput}
                        placeholder="0 - 100"
                      />
                    </div>
                    <div>
                      <label className={compactLabel}>Fecha examen teórico</label>
                      <input
                        type="date"
                        value={form.fecha_examen_teorico}
                        onChange={(event) =>
                          setForm({ ...form, fecha_examen_teorico: event.target.value })
                        }
                        className={compactInput}
                      />
                    </div>
                    <div>
                      <label className={compactLabel}>Calificación práctica</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={form.nota_examen_practico}
                        onChange={(event) =>
                          setForm({ ...form, nota_examen_practico: event.target.value })
                        }
                        className={compactInput}
                        placeholder="0 - 100"
                      />
                    </div>
                    <div>
                      <label className={compactLabel}>Fecha examen práctico</label>
                      <input
                        type="date"
                        value={form.fecha_examen_practico}
                        onChange={(event) =>
                          setForm({ ...form, fecha_examen_practico: event.target.value })
                        }
                        className={compactInput}
                      />
                    </div>
                  </div>
                </Section>
              </>
            ) : isPracticeForm ? (
              <Section title="Detalle del servicio">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                  <div>
                    <label className={compactLabel}>Referencia interna</label>
                    <input
                      type="text"
                      value={form.numero_contrato}
                      onChange={(event) =>
                        setForm({ ...form, numero_contrato: event.target.value })
                      }
                      className={compactInput}
                      placeholder="Se genera si la dejas vacía"
                    />
                  </div>
                  <div>
                    <label htmlFor="alumno-fecha-servicio" className={compactLabel}>
                      Fecha del servicio {contactRequired ? "*" : ""}
                    </label>
                    <input
                      id="alumno-fecha-servicio"
                      type="date"
                      required={contactRequired}
                      max={getTodayDateString()}
                      value={form.fecha_inscripcion}
                      onChange={(event) =>
                        setForm({ ...form, fecha_inscripcion: event.target.value })
                      }
                      className={compactInput}
                    />
                  </div>

                  <div>
                    <label className={compactLabel}>Valor del servicio</label>
                    <input
                      type="number"
                      min="0"
                      value={form.valor_total}
                      onChange={(event) => setForm({ ...form, valor_total: event.target.value })}
                      className={compactInput}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                  No crea matrícula ni exige categoría. Sirve para horas prácticas adicionales o
                  servicios puntuales.
                </div>
              </Section>
            ) : (
              <>
                <Section title="Matrícula y contrato">
                  <div>
                    <label className={compactLabel}>
                      Categorías del curso * ({selectedCategorias.length} seleccionada
                      {selectedCategorias.length !== 1 ? "s" : ""})
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {regularCategories.map((cat) => (
                        <Chip
                          key={cat}
                          active={form.categorias.includes(cat)}
                          label={cat}
                          onClick={() => toggleCategoria(cat)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                    <div>
                      <label htmlFor="alumno-contrato" className={compactLabel}>
                        Contrato
                      </label>
                      <input
                        id="alumno-contrato"
                        type="text"
                        value={lockedRegularContractNumber || contractPreview?.nextNumber || ""}
                        readOnly
                        className={compactInput}
                        placeholder={
                          !hasCategorias
                            ? "Selecciona categorías"
                            : loadingContractPreview
                              ? "Calculando..."
                              : "Se asigna al guardar"
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="alumno-inscripcion" className={compactLabel}>
                        Fecha de inscripción *
                      </label>
                      <input
                        id="alumno-inscripcion"
                        type="date"
                        required
                        max={getTodayDateString()}
                        value={form.fecha_inscripcion}
                        onChange={(event) =>
                          setForm({ ...form, fecha_inscripcion: event.target.value })
                        }
                        className={compactInput}
                      />
                    </div>

                    <div>
                      <label htmlFor="alumno-valor-curso" className={compactLabel}>
                        Valor total del curso
                      </label>
                      <input
                        id="alumno-valor-curso"
                        type="number"
                        min="0"
                        value={form.valor_total}
                        onChange={(event) => setForm({ ...form, valor_total: event.target.value })}
                        className={compactInput}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <AnsvFields
                    birth={form.fecha_nacimiento}
                    sex={form.sexo}
                    date={form.fecha_inscripcion}
                    categories={form.categorias}
                    category={form.ansv_categoria}
                    onCategory={(value) => setForm({ ...form, ansv_categoria: value })}
                  />
                </Section>

                <div className="border-b border-[var(--surface-border)] pb-3">
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.tiene_tramitador}
                      onChange={(event) =>
                        setForm({ ...form, tiene_tramitador: event.target.checked })
                      }
                      className="h-4 w-4 accent-[#0071e3]"
                    />
                    Tiene tramitador
                  </label>

                  {form.tiene_tramitador ? (
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                      <div>
                        <label htmlFor="alumno-tramitador" className={compactLabel}>
                          Nombre del tramitador *
                        </label>
                        <input
                          type="text"
                          id="alumno-tramitador"
                          required={form.tiene_tramitador}
                          list={tramitadorOptions.length > 0 ? tramitadorListId : undefined}
                          value={form.tramitador_nombre}
                          onChange={(event) =>
                            setForm({ ...form, tramitador_nombre: event.target.value })
                          }
                          className={compactInput}
                          placeholder="Nombre o agencia"
                        />
                        {tramitadorOptions.length > 0 ? (
                          <datalist id={tramitadorListId}>
                            {tramitadorOptions.map((option) => (
                              <option key={option} value={option} />
                            ))}
                          </datalist>
                        ) : null}
                      </div>
                      <div>
                        <label htmlFor="alumno-valor-tramitador" className={compactLabel}>
                          Valor{" "}
                          {editingMatricula && (editingMatricula.tramitador_valor ?? 0) > 0
                            ? "(ajuste sobre el anterior)"
                            : "(va a gastos)"}
                        </label>
                        <input
                          id="alumno-valor-tramitador"
                          type="number"
                          min="0"
                          value={form.tramitador_valor}
                          onChange={(event) =>
                            setForm({ ...form, tramitador_valor: event.target.value })
                          }
                          className={compactInput}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            <details
              className="border-b border-[var(--surface-border)] pb-3"
              open={form.facturado || undefined}
            >
              <summary className="cursor-pointer py-1 text-sm font-medium">
                Factura externa registrada
              </summary>
              <div className="pt-2">
                <div className="space-y-4">
                  <label className="flex cursor-pointer items-center gap-3 select-none">
                    <input
                      type="checkbox"
                      checked={form.facturado}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          facturado: e.target.checked,
                          ...(e.target.checked ? {} : { numero_factura_electronica: "" }),
                        })
                      }
                      className="h-5 w-5 rounded border-gray-300 text-[#0071e3] accent-[#0071e3]"
                    />
                    <span className="text-foreground text-sm font-medium">
                      Factura electronica emitida
                    </span>
                  </label>

                  {form.facturado && (
                    <div>
                      <label htmlFor="alumno-factura-externa" className={compactLabel}>
                        Numero de factura (opcional)
                      </label>
                      <input
                        id="alumno-factura-externa"
                        className={compactInput}
                        value={form.numero_factura_electronica}
                        onChange={(e) =>
                          setForm({ ...form, numero_factura_electronica: e.target.value })
                        }
                        placeholder="FE-001234"
                      />
                    </div>
                  )}
                </div>
              </div>
            </details>

            <details
              className="border-b border-[var(--surface-border)] pb-3"
              open={Boolean(form.notas) || undefined}
            >
              <summary className="cursor-pointer py-1 text-sm font-medium">Observaciones</summary>
              <div className="pt-2">
                <label htmlFor="alumno-notas" className={compactLabel}>
                  Notas
                </label>
                <textarea
                  id="alumno-notas"
                  value={form.notas}
                  onChange={(event) => setForm({ ...form, notas: event.target.value })}
                  rows={2}
                  className={textareaClass}
                  placeholder="Observaciones relevantes del expediente"
                />
              </div>
            </details>

            {!editing && (
              <Section title={isAptitudForm || isPracticeForm ? "Pago inicial" : "Abono inicial"}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label htmlFor="alumno-abono" className={compactLabel}>
                      {isAptitudForm || isPracticeForm ? "Monto del pago" : "Monto del abono"}
                    </label>
                    <input
                      id="alumno-abono"
                      type="number"
                      min="0"
                      value={form.abono}
                      onChange={(event) => setForm({ ...form, abono: event.target.value })}
                      className={compactInput}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="alumno-metodo-pago" className={compactLabel}>
                      Método de pago
                    </label>
                    <select
                      id="alumno-metodo-pago"
                      value={form.metodo_pago_abono}
                      onChange={(event) =>
                        setForm({ ...form, metodo_pago_abono: event.target.value as MetodoPago })
                      }
                      className={selectClass}
                    >
                      {metodosPago.map((metodo) => (
                        <option key={metodo.value} value={metodo.value}>
                          {metodo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Section>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-5 border-t border-[var(--surface-border)] bg-[var(--surface-strong)] px-5 pt-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:-mx-7 sm:px-7">
          {!editing && (
            <label className="mb-2 flex cursor-pointer items-start gap-2 select-none">
              <input
                type="checkbox"
                checked={form.consentimiento_datos}
                required
                onChange={(e) => setForm({ ...form, consentimiento_datos: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0071e3] accent-[#0071e3]"
              />
              <span className="text-xs leading-5 text-[#66707a] dark:text-[#aeb6bf]">
                Autorizo el tratamiento de datos conforme a la{" "}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#0071e3] underline dark:text-[#69a9ff]"
                >
                  Política de privacidad
                </a>{" "}
                y la Ley 1581 de 2012.
              </span>
            </label>
          )}
          {formError && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {formError}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {!editing && (
              <p className="text-xs text-[var(--gray-500)]">
                Saldo:{" "}
                <strong className="text-[var(--foreground)]">
                  ${saldoPendiente.toLocaleString("es-CO")}
                </strong>
              </p>
            )}
            <div className="ml-auto flex max-w-full items-center justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="apple-button-secondary !min-h-11 !rounded-lg !px-3 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || (!editing && !form.consentimiento_datos)}
                className="apple-button-primary !min-h-11 !rounded-lg !px-3 text-sm disabled:opacity-50"
              >
                {saveLabel}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
