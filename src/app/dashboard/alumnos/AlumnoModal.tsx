"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  BookOpen,
  CalendarDays,
  DollarSign,
  FileText,
  GraduationCap,
  MapPin,
  ReceiptText,
  UserRound,
} from "lucide-react";
import Modal from "@/components/dashboard/Modal";
import { DEPARTAMENTOS_COLOMBIA } from "@/lib/colombia";
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
}

const selectClass = "apple-select";
const textareaClass = "apple-textarea";

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[#0071e3]/10 text-[#0071e3] dark:bg-[#0071e3]/15 dark:text-[#69a9ff]">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#66707a] dark:text-[#aeb6bf]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
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
}: AlumnoModalProps) {
  const tramitadorListId = "alumno-tramitador-options";
  const isRegularForm = !isAptitudForm && !isPracticeForm;
  const valorTotal = parseFloat(String(form.valor_total)) || 0;
  const pagoInicial = parseFloat(String(form.abono)) || 0;
  const saldoPendiente = Math.max(valorTotal - pagoInicial, 0);
  const selectedCategorias = form.categorias.filter(Boolean);
  const lockedRegularContractNumber =
    isRegularForm && !editingHasMultipleMatriculas
      ? editingMatricula?.numero_contrato || null
      : null;
  const {
    preview: contractPreview,
    loading: loadingContractPreview,
    error: contractPreviewError,
    hasCategorias,
  } = useContractPreview({
    enabled: modalOpen && isRegularForm && !editingHasMultipleMatriculas,
    categorias: selectedCategorias,
    lockedNumber: lockedRegularContractNumber,
  });
  const regularCategories = categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS;
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
  const effectiveReferenceLabel = isRegularForm
    ? editingHasMultipleMatriculas
      ? "Gestionado por matrícula"
      : lockedRegularContractNumber || contractPreview?.nextNumber || "Se generará automáticamente"
    : form.numero_contrato || "Se genera si la dejas vacía";

  return (
    <Modal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      title={title}
      maxWidth="max-w-5xl"
      mobilePresentation="fullscreen"
    >
      <div className="space-y-5">
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
          <div className="rounded-[18px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[#66707a] dark:text-[#aeb6bf]">
            Cargando categorías y sugerencias del formulario...
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
          <div className="space-y-5">
            <Section
              title="Identidad del registro"
              description="Datos principales del alumno o del servicio para que el expediente quede completo y ordenado."
              icon={<UserRound size={18} />}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                    className={inputClass}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label className={labelClass}>Apellidos *</label>
                  <input
                    type="text"
                    value={form.apellidos}
                    onChange={(event) => setForm({ ...form, apellidos: event.target.value })}
                    className={inputClass}
                    placeholder="Apellidos"
                  />
                </div>
                <div>
                  <label className={labelClass}>Número de documento *</label>
                  <input
                    type="text"
                    value={form.dni}
                    onChange={(event) => setForm({ ...form, dni: event.target.value })}
                    className={inputClass}
                    placeholder="Número de documento"
                  />
                </div>
                <div>
                  <label className={labelClass}>Tipo de documento *</label>
                  <select
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
                  <label className={labelClass}>Teléfono *</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(event) => setForm({ ...form, telefono: event.target.value })}
                    className={inputClass}
                    placeholder="Teléfono principal"
                  />
                </div>
                <div>
                  <label className={labelClass}>Correo</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    className={inputClass}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Lugar de expedición *</label>
                  <input
                    type="text"
                    value={form.lugar_expedicion_documento}
                    onChange={(event) =>
                      setForm({ ...form, lugar_expedicion_documento: event.target.value })
                    }
                    className={inputClass}
                    placeholder="Ciudad de expedición"
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={form.fecha_nacimiento}
                    onChange={(event) => setForm({ ...form, fecha_nacimiento: event.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Ubicación y contacto"
              description="Información de residencia para completar la ficha y facilitar seguimiento administrativo."
              icon={<MapPin size={18} />}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>Dirección</label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(event) => setForm({ ...form, direccion: event.target.value })}
                    className={inputClass}
                    placeholder="Dirección principal"
                  />
                </div>
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={(event) => setForm({ ...form, ciudad: event.target.value })}
                    className={inputClass}
                    placeholder="Ciudad"
                  />
                </div>
                <div>
                  <label className={labelClass}>Departamento</label>
                  <select
                    value={form.departamento}
                    onChange={(event) => setForm({ ...form, departamento: event.target.value })}
                    className={selectClass}
                  >
                    <option value="">Selecciona un departamento</option>
                    {DEPARTAMENTOS_COLOMBIA.map((departamento) => (
                      <option key={departamento} value={departamento}>
                        {departamento}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            <Section
              title="Tipo de registro"
              description="Define si es un alumno regular, una práctica adicional o un proceso de aptitud."
              icon={<GraduationCap size={18} />}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Tipo de registro</label>
                  <select
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
                  {editing ? (
                    <p className="mt-2 text-xs text-[#66707a] dark:text-[#aeb6bf]">
                      El tipo se fija al crear el registro para proteger el historial.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className={labelClass}>
                    {isAptitudForm
                      ? "Convenio / empresa"
                      : isPracticeForm
                        ? "Servicio / origen"
                        : "Estado"}
                  </label>
                  {isAptitudForm || isPracticeForm ? (
                    <input
                      type="text"
                      value={form.empresa_convenio}
                      onChange={(event) =>
                        setForm({ ...form, empresa_convenio: event.target.value })
                      }
                      className={inputClass}
                      placeholder={isAptitudForm ? "Supertaxis" : "Práctica adicional"}
                    />
                  ) : (
                    <select
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

            {editingHasMultipleMatriculas ? (
              <Section
                title="Matrículas del alumno"
                description="Este alumno tiene varias matrículas. Aquí se actualizan datos personales y estado general; los contratos viven por matrícula."
                icon={<ReceiptText size={18} />}
              >
                <div className="space-y-3">
                  {editing?.matriculas.map((matricula) => (
                    <div
                      key={matricula.id}
                      className="rounded-[18px] border border-[var(--surface-border)] bg-[var(--surface-strong)] px-4 py-3"
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
                        </div>
                        <span className="text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
                          {matricula.valor_total
                            ? `$${Number(matricula.valor_total).toLocaleString("es-CO")}`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className={labelClass}>Estado general</label>
                    <select
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
                  </div>
                </div>
              </Section>
            ) : isAptitudForm ? (
              <>
                <Section
                  title="Detalle del proceso"
                  description="Registra la categoría evaluada, la referencia interna y el valor del servicio."
                  icon={<ReceiptText size={18} />}
                >
                  <div>
                    <label className={labelClass}>Categoría evaluada *</label>
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

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Referencia interna</label>
                      <input
                        type="text"
                        value={form.numero_contrato}
                        onChange={(event) =>
                          setForm({ ...form, numero_contrato: event.target.value })
                        }
                        className={inputClass}
                        placeholder="Se genera si la dejas vacía"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha del proceso</label>
                      <input
                        type="date"
                        value={form.fecha_inscripcion}
                        onChange={(event) =>
                          setForm({ ...form, fecha_inscripcion: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Estado</label>
                      <select
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
                    </div>
                    <div>
                      <label className={labelClass}>Valor del servicio</label>
                      <input
                        type="number"
                        min="0"
                        value={form.valor_total}
                        onChange={(event) => setForm({ ...form, valor_total: event.target.value })}
                        className={inputClass}
                        placeholder="120000"
                      />
                    </div>
                  </div>
                </Section>

                <Section
                  title="Resultados del examen"
                  description="Registra las calificaciones y fechas de las pruebas teórica y práctica."
                  icon={<FileText size={18} />}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Calificación teórica</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={form.nota_examen_teorico}
                        onChange={(event) =>
                          setForm({ ...form, nota_examen_teorico: event.target.value })
                        }
                        className={inputClass}
                        placeholder="0 - 100"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha examen teórico</label>
                      <input
                        type="date"
                        value={form.fecha_examen_teorico}
                        onChange={(event) =>
                          setForm({ ...form, fecha_examen_teorico: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Calificación práctica</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={form.nota_examen_practico}
                        onChange={(event) =>
                          setForm({ ...form, nota_examen_practico: event.target.value })
                        }
                        className={inputClass}
                        placeholder="0 - 100"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha examen práctico</label>
                      <input
                        type="date"
                        value={form.fecha_examen_practico}
                        onChange={(event) =>
                          setForm({ ...form, fecha_examen_practico: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </Section>
              </>
            ) : isPracticeForm ? (
              <Section
                title="Detalle del servicio"
                description="Usa este registro para personas o alumnos que compran horas prácticas fuera del curso principal."
                icon={<ReceiptText size={18} />}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Referencia interna</label>
                    <input
                      type="text"
                      value={form.numero_contrato}
                      onChange={(event) =>
                        setForm({ ...form, numero_contrato: event.target.value })
                      }
                      className={inputClass}
                      placeholder="Se genera si la dejas vacía"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha del servicio</label>
                    <input
                      type="date"
                      value={form.fecha_inscripcion}
                      onChange={(event) =>
                        setForm({ ...form, fecha_inscripcion: event.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Estado</label>
                    <select
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
                  </div>
                  <div>
                    <label className={labelClass}>Valor del servicio</label>
                    <input
                      type="number"
                      min="0"
                      value={form.valor_total}
                      onChange={(event) => setForm({ ...form, valor_total: event.target.value })}
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="mt-4 rounded-[18px] border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                  No crea matrícula ni exige categoría. Sirve para horas prácticas adicionales o
                  servicios puntuales.
                </div>
              </Section>
            ) : (
              <>
                <Section
                  title="Matrícula y contrato"
                  description="Configura las categorías del curso, el contrato y la base económica de la matrícula."
                  icon={<ReceiptText size={18} />}
                >
                  <div>
                    <label className={labelClass}>
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

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>N° contrato automático</label>
                      <input
                        type="text"
                        value={lockedRegularContractNumber || contractPreview?.nextNumber || ""}
                        readOnly
                        className={inputClass}
                        placeholder={
                          !hasCategorias
                            ? "Selecciona categorías"
                            : loadingContractPreview
                              ? "Calculando..."
                              : "Se asigna al guardar"
                        }
                      />
                      <p className="mt-2 text-xs text-[#66707a] dark:text-[#aeb6bf]">
                        {lockedRegularContractNumber
                          ? "Este contrato ya quedó asignado a la matrícula activa."
                          : loadingContractPreview
                            ? "Consultando el siguiente consecutivo disponible..."
                            : contractPreview
                              ? `Formato final: ${contractPreview.nextNumber}. Solo se usa ${contractPreview.prefix} y el consecutivo siguiente.`
                              : contractPreviewError
                                ? "No pudimos previsualizar el contrato. El número definitivo se reserva automáticamente al guardar."
                                : "El número definitivo se reserva automáticamente al guardar la matrícula como MOT, CAR o COM más el consecutivo."}
                      </p>
                    </div>
                    <div>
                      <label className={labelClass}>Fecha de inscripción</label>
                      <input
                        type="date"
                        value={form.fecha_inscripcion}
                        onChange={(event) =>
                          setForm({ ...form, fecha_inscripcion: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Estado</label>
                      <select
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
                    </div>
                    <div>
                      <label className={labelClass}>Valor total del curso</label>
                      <input
                        type="number"
                        min="0"
                        value={form.valor_total}
                        onChange={(event) => setForm({ ...form, valor_total: event.target.value })}
                        className={inputClass}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </Section>

                <Section
                  title="Tramitador"
                  description="Si el alumno tiene tramitador, deja el costo y el tercero listos para que finanzas los consolide correctamente."
                  icon={<DollarSign size={18} />}
                >
                  <label className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-[var(--surface-border)] bg-[var(--surface-strong)] px-4 py-3 select-none">
                    <div
                      className={`relative h-6 w-10 rounded-full transition-colors ${
                        form.tiene_tramitador ? "bg-[#0071e3]" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                      onClick={() => setForm({ ...form, tiene_tramitador: !form.tiene_tramitador })}
                    >
                      <div
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          form.tiene_tramitador ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
                        Tiene tramitador
                      </p>
                      <p className="text-xs text-[#66707a] dark:text-[#aeb6bf]">
                        El costo se registra automáticamente en gastos cuando corresponda.
                      </p>
                    </div>
                  </label>

                  {form.tiene_tramitador ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className={labelClass}>Nombre del tramitador</label>
                        <input
                          type="text"
                          list={tramitadorOptions.length > 0 ? tramitadorListId : undefined}
                          value={form.tramitador_nombre}
                          onChange={(event) =>
                            setForm({ ...form, tramitador_nombre: event.target.value })
                          }
                          className={inputClass}
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
                        <label className={labelClass}>
                          Valor{" "}
                          {editingMatricula && (editingMatricula.tramitador_valor ?? 0) > 0
                            ? "(ajuste sobre el anterior)"
                            : "(va a gastos)"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={form.tramitador_valor}
                          onChange={(event) =>
                            setForm({ ...form, tramitador_valor: event.target.value })
                          }
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ) : null}
                </Section>
              </>
            )}

            <Section
              title={
                editing
                  ? "Observaciones"
                  : isAptitudForm || isPracticeForm
                    ? "Pago inicial"
                    : "Abono inicial"
              }
              description={
                editing
                  ? "Añade notas internas útiles para seguimiento, coordinación o contexto operativo."
                  : isAptitudForm || isPracticeForm
                    ? "Puedes registrar el pago inicial del servicio al crear el registro."
                    : "Puedes dejar el primer abono registrado desde el momento de la matrícula."
              }
              icon={editing ? <FileText size={18} /> : <CalendarDays size={18} />}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={editing ? "md:col-span-2" : ""}>
                  <label className={labelClass}>Notas</label>
                  <textarea
                    value={form.notas}
                    onChange={(event) => setForm({ ...form, notas: event.target.value })}
                    rows={4}
                    className={textareaClass}
                    placeholder="Observaciones relevantes del expediente"
                  />
                </div>

                {!editing ? (
                  <>
                    <div>
                      <label className={labelClass}>
                        {isAptitudForm || isPracticeForm ? "Monto del pago" : "Monto del abono"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.abono}
                        onChange={(event) => setForm({ ...form, abono: event.target.value })}
                        className={inputClass}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Método de pago</label>
                      <select
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
                  </>
                ) : null}
              </div>
            </Section>
          </div>

          <aside className="space-y-5">
            <section className="apple-panel sticky top-0 px-5 py-5">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#7b8591] uppercase">
                Resumen del registro
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-[18px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[#7b8591] uppercase">
                    Tipo
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
                    {tiposRegistroAlumno.find((tipo) => tipo.value === form.tipo_registro)?.label}
                  </p>
                  <p className="mt-2 text-sm text-[#66707a] dark:text-[#aeb6bf]">
                    {selectedCategorias.length > 0
                      ? selectedCategorias.join(", ")
                      : isPracticeForm
                        ? "Sin categorías requeridas"
                        : "Aún no hay categorías seleccionadas"}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[var(--surface-border)] bg-[var(--surface-strong)] p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[#7b8591] uppercase">
                    {isRegularForm ? "Contrato" : "Referencia"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
                    {effectiveReferenceLabel}
                  </p>
                  <p className="mt-2 text-sm text-[#66707a] dark:text-[#aeb6bf]">
                    {isRegularForm
                      ? editingHasMultipleMatriculas
                        ? "Las matrículas adicionales administran su propio contrato."
                        : "El número definitivo se toma desde la matrícula guardada."
                      : `Fecha base: ${form.fecha_inscripcion || "Sin fecha definida"}`}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[var(--surface-border)] bg-[var(--surface-strong)] p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[#7b8591] uppercase">
                    Resumen económico
                  </p>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#66707a] dark:text-[#aeb6bf]">Valor total</span>
                      <span className="font-semibold text-[#111214] dark:text-[#f5f5f7]">
                        ${valorTotal.toLocaleString("es-CO")}
                      </span>
                    </div>
                    {!editing ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[#66707a] dark:text-[#aeb6bf]">
                            {isAptitudForm || isPracticeForm ? "Pago inicial" : "Abono inicial"}
                          </span>
                          <span className="font-semibold text-[#111214] dark:text-[#f5f5f7]">
                            ${pagoInicial.toLocaleString("es-CO")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[#66707a] dark:text-[#aeb6bf]">
                            Saldo pendiente
                          </span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            ${saldoPendiente.toLocaleString("es-CO")}
                          </span>
                        </div>
                      </>
                    ) : null}
                    {form.tiene_tramitador && form.tramitador_nombre ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#66707a] dark:text-[#aeb6bf]">Tramitador</span>
                        <span className="font-semibold text-[#111214] dark:text-[#f5f5f7]">
                          {form.tramitador_nombre}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {!editingHasMultipleMatriculas && !isAptitudForm && !isPracticeForm ? (
                  <div className="rounded-[18px] border border-[#0071e3]/20 bg-[#0071e3]/6 p-4 text-sm text-[#005bb5] dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#6cb6ff]">
                    {editing
                      ? "La ficha personal se actualiza siempre; el valor del curso vive en la matrícula cuando existe una sola."
                      : "Al crear el alumno regular se genera también su primera matrícula."}
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>

        <div className="sticky bottom-0 z-10 -mx-5 border-t border-[var(--surface-border)] bg-[color:var(--surface-strong)]/94 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-7 sm:px-7">
          {!editing && (
            <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 select-none">
              <input
                type="checkbox"
                checked={form.consentimiento_datos}
                onChange={(e) => setForm({ ...form, consentimiento_datos: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0071e3] accent-[#0071e3]"
              />
              <span className="text-xs leading-5 text-[#66707a] dark:text-[#aeb6bf]">
                Autorizo el tratamiento de mis datos personales conforme a la{" "}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#0071e3] underline dark:text-[#69a9ff]"
                >
                  Politica de privacidad
                </a>{" "}
                y la Ley 1581 de 2012 de proteccion de datos personales.
              </span>
            </label>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="apple-button-secondary text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!editing && !form.consentimiento_datos)}
              className="apple-button-primary text-sm disabled:opacity-50"
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
