import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AppScreen,
  EmptyState,
  Field,
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatGrid,
  Tag,
} from "@/components/primitives";
import {
  buildOfflinePractice,
  CALE_QUESTION_COUNT,
  evaluateOfflinePractice,
  formatCurrency,
  loadModuleRows,
  queueModuleMutation,
  submitCaleAttempt,
  syncCaleBank,
  withTransition,
} from "@/lib/data";
import { getModuleById, canUseMobileModule, canEditMobileModule } from "@/lib/modules";
import { readEntityRows } from "@/lib/offline";
import { palette } from "@/lib/theme";
import type { MobileModuleId, Perfil } from "@/lib/types";
import { useApp } from "@/context/app-context";
import { useEvent } from "@/hooks/use-event";
import { HoursScreen } from "./hours-screen";
import { bogotaToday } from "@/lib/hours";

type DraftState = Record<string, string>;

function titleForRow(moduleId: MobileModuleId, row: Record<string, unknown>) {
  switch (moduleId) {
    case "students":
      return `${row.nombre ?? ""} ${row.apellidos ?? ""}`.trim() || "Alumno";
    case "classes":
      return `${row.tipo ?? "Clase"} · ${row.fecha ?? ""}`;
    case "income":
      return String(row.concepto ?? "Ingreso");
    case "expenses":
      return String(row.concepto ?? "Gasto");
    case "cash":
      return `${row.metodo_pago ?? "Método"} · ${row.fecha ?? ""}`;
    case "vehicles":
      return `${row.marca ?? ""} ${row.modelo ?? ""}`.trim() || "Vehículo";
    case "hours":
      return `${row.fecha ?? ""} · ${row.hora_inicio ?? ""}-${row.hora_fin ?? ""}`;
    case "instructors":
      return `${row.nombre ?? ""} ${row.apellidos ?? ""}`.trim() || "Instructor";
    case "staff":
      return String(row.nombre ?? "Personal");
    case "branches":
      return String(row.nombre ?? "Sede");
    case "schools":
    case "subscriptions":
      return String(row.nombre ?? "Escuela");
    case "logbook":
      return String(row.accion ?? "Actividad");
    case "exams":
      return `${row.resultado ?? "Pendiente"} · ${row.fecha ?? ""}`;
    default:
      return String(row.id ?? "Registro");
  }
}

function descriptionForRow(moduleId: MobileModuleId, row: Record<string, unknown>) {
  switch (moduleId) {
    case "students":
      return `${row.dni ?? "Sin cédula"} · ${row.telefono ?? "Sin teléfono"} · ${row.estado ?? "Sin estado"}`;
    case "classes":
      return `${String(row.hora_inicio ?? "").slice(0, 5)} - ${String(row.hora_fin ?? "").slice(0, 5)}`;
    case "income":
      return `${formatCurrency(row.monto as number)} · ${row.metodo_pago ?? "Sin método"} · ${row.estado ?? "Sin estado"}`;
    case "expenses":
      return `${formatCurrency(row.monto as number)} · ${row.categoria ?? "Sin categoría"} · ${row.estado_pago ?? "Sin estado"}`;
    case "cash":
      return `${formatCurrency(row.monto as number)} · ${row.estado ?? "Sin estado"}`;
    case "vehicles":
      return `${row.matricula ?? "Sin placa"} · ${row.estado ?? "Sin estado"} · ${row.kilometraje ?? 0} km`;
    case "hours":
      return `${row.estado ?? "Sin estado"} · Instructor ${row.instructor_id ?? "sin asignar"}`;
    case "instructors":
      return `${row.dni ?? "Sin cédula"} · ${row.especialidad ?? "General"} · ${row.estado ?? "Sin estado"}`;
    case "staff":
      return `${row.rol ?? "Sin rol"} · ${row.email ?? "Sin correo"}`;
    case "branches":
      return `${row.ciudad ?? "Sin ciudad"} · ${row.estado ?? "Sin estado"}`;
    case "schools":
    case "subscriptions":
      return `${row.plan ?? "Sin plan"} · ${row.estado ?? "Sin estado"}`;
    case "logbook":
      return `${row.tabla ?? "Sin tabla"} · ${row.created_at ?? ""}`;
    case "exams":
      return `${row.porcentaje ?? 0}% · ${row.total_preguntas ?? 0} preguntas`;
    default:
      return "";
  }
}

function statusTone(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase();
  if (["activo", "pagado", "cobrado", "completada", "aprobado"].includes(normalized)) {
    return "success" as const;
  }
  if (["pendiente", "programada"].includes(normalized)) {
    return "warning" as const;
  }
  if (["inactivo", "anulado", "cancelada", "suspendido"].includes(normalized)) {
    return "danger" as const;
  }
  return "default" as const;
}

function buildDraft(
  moduleId: MobileModuleId,
  profile: Perfil | null,
  row?: Record<string, unknown>
): DraftState {
  switch (moduleId) {
    case "students":
      return {
        id: String(row?.id ?? ""),
        nombre: String(row?.nombre ?? ""),
        apellidos: String(row?.apellidos ?? ""),
        dni: String(row?.dni ?? ""),
        telefono: String(row?.telefono ?? ""),
        email: String(row?.email ?? ""),
        estado: String(row?.estado ?? "activo"),
        escuela_id: String(profile?.escuela_id ?? ""),
        sede_id: String(row?.sede_id ?? profile?.sede_id ?? ""),
      };
    case "classes":
      return {
        id: String(row?.id ?? ""),
        fecha: String(row?.fecha ?? bogotaToday()),
        hora_inicio: String(row?.hora_inicio ?? "08:00"),
        hora_fin: String(row?.hora_fin ?? "09:00"),
        tipo: String(row?.tipo ?? "practica"),
        estado: String(row?.estado ?? "programada"),
        alumno_id: String(row?.alumno_id ?? ""),
        instructor_id: String(row?.instructor_id ?? ""),
        vehiculo_id: String(row?.vehiculo_id ?? ""),
      };
    case "income":
      return {
        id: String(row?.id ?? ""),
        concepto: String(row?.concepto ?? ""),
        monto: String(row?.monto ?? ""),
        fecha: String(row?.fecha ?? bogotaToday()),
        metodo_pago: String(row?.metodo_pago ?? "efectivo"),
        estado: String(row?.estado ?? "cobrado"),
        categoria: String(row?.categoria ?? "otros"),
        alumno_id: String(row?.alumno_id ?? ""),
      };
    case "expenses":
      return {
        id: String(row?.id ?? ""),
        concepto: String(row?.concepto ?? ""),
        monto: String(row?.monto ?? ""),
        fecha: String(row?.fecha ?? bogotaToday()),
        categoria: String(row?.categoria ?? "otros"),
        metodo_pago: String(row?.metodo_pago ?? "transferencia"),
        estado_pago: String(row?.estado_pago ?? "pagado"),
        proveedor: String(row?.proveedor ?? ""),
      };
    default:
      return {};
  }
}

function DailyForm({
  moduleId,
  draft,
  setDraft,
  profile,
  candidates,
}: {
  moduleId: MobileModuleId;
  draft: DraftState;
  setDraft: (next: DraftState) => void;
  profile: Perfil | null;
  candidates: {
    students: Array<Record<string, unknown>>;
    instructors: Array<Record<string, unknown>>;
    vehicles: Array<Record<string, unknown>>;
  };
}) {
  const update = (key: string, value: string) => setDraft({ ...draft, [key]: value });

  return (
    <View style={{ gap: 12 }}>
      {moduleId === "students" ? (
        <>
          <Field
            label="Nombre"
            value={draft.nombre}
            onChangeText={(value) => update("nombre", value)}
          />
          <Field
            label="Apellidos"
            value={draft.apellidos}
            onChangeText={(value) => update("apellidos", value)}
          />
          <Field label="Cédula" value={draft.dni} onChangeText={(value) => update("dni", value)} />
          <Field
            label="Teléfono"
            value={draft.telefono}
            onChangeText={(value) => update("telefono", value)}
          />
          <Field
            label="Correo opcional"
            value={draft.email}
            onChangeText={(value) => update("email", value)}
            keyboardType="email-address"
          />
          <Field
            label="Estado"
            value={draft.estado}
            onChangeText={(value) => update("estado", value)}
          />
          <Text style={styles.helperText}>
            Escuela {profile?.escuela_id || "sin escuela"} · Sede{" "}
            {draft.sede_id || profile?.sede_id || "sin sede"}
          </Text>
        </>
      ) : null}

      {moduleId === "classes" ? (
        <>
          <Field
            label="Fecha"
            value={draft.fecha}
            onChangeText={(value) => update("fecha", value)}
          />
          <View style={styles.inlineFields}>
            <View style={styles.inlineField}>
              <Field
                label="Hora inicio"
                value={draft.hora_inicio}
                onChangeText={(value) => update("hora_inicio", value)}
              />
            </View>
            <View style={styles.inlineField}>
              <Field
                label="Hora fin"
                value={draft.hora_fin}
                onChangeText={(value) => update("hora_fin", value)}
              />
            </View>
          </View>
          <Field label="Tipo" value={draft.tipo} onChangeText={(value) => update("tipo", value)} />
          <Field
            label="Estado"
            value={draft.estado}
            onChangeText={(value) => update("estado", value)}
          />
          <Field
            label="Alumno seleccionado"
            value={draft.alumno_id}
            onChangeText={(value) => update("alumno_id", value)}
            placeholder="Selecciona o pega un ID"
          />
          <CandidateChips
            label="Alumnos recientes"
            items={candidates.students}
            valueKey="id"
            titleKey="nombre"
            secondaryKey="apellidos"
            onSelect={(value) => update("alumno_id", value)}
          />
          <Field
            label="Instructor"
            value={draft.instructor_id}
            onChangeText={(value) => update("instructor_id", value)}
            placeholder="Opcional"
          />
          <CandidateChips
            label="Instructores"
            items={candidates.instructors}
            valueKey="id"
            titleKey="nombre"
            secondaryKey="apellidos"
            onSelect={(value) => update("instructor_id", value)}
          />
          <Field
            label="Vehículo"
            value={draft.vehiculo_id}
            onChangeText={(value) => update("vehiculo_id", value)}
            placeholder="Opcional"
          />
          <CandidateChips
            label="Vehículos"
            items={candidates.vehicles}
            valueKey="id"
            titleKey="marca"
            secondaryKey="modelo"
            onSelect={(value) => update("vehiculo_id", value)}
          />
        </>
      ) : null}

      {moduleId === "income" ? (
        <>
          <Field
            label="Concepto"
            value={draft.concepto}
            onChangeText={(value) => update("concepto", value)}
          />
          <Field
            label="Monto"
            value={draft.monto}
            onChangeText={(value) => update("monto", value)}
            keyboardType="numeric"
          />
          <Field
            label="Fecha"
            value={draft.fecha}
            onChangeText={(value) => update("fecha", value)}
          />
          <Field
            label="Método de pago"
            value={draft.metodo_pago}
            onChangeText={(value) => update("metodo_pago", value)}
          />
          <Field
            label="Estado"
            value={draft.estado}
            onChangeText={(value) => update("estado", value)}
          />
          <Field
            label="Categoría"
            value={draft.categoria}
            onChangeText={(value) => update("categoria", value)}
          />
          <Field
            label="Alumno opcional"
            value={draft.alumno_id}
            onChangeText={(value) => update("alumno_id", value)}
          />
          <CandidateChips
            label="Alumnos recientes"
            items={candidates.students}
            valueKey="id"
            titleKey="nombre"
            secondaryKey="apellidos"
            onSelect={(value) => update("alumno_id", value)}
          />
        </>
      ) : null}

      {moduleId === "expenses" ? (
        <>
          <Field
            label="Concepto"
            value={draft.concepto}
            onChangeText={(value) => update("concepto", value)}
          />
          <Field
            label="Monto"
            value={draft.monto}
            onChangeText={(value) => update("monto", value)}
            keyboardType="numeric"
          />
          <Field
            label="Fecha"
            value={draft.fecha}
            onChangeText={(value) => update("fecha", value)}
          />
          <Field
            label="Categoría"
            value={draft.categoria}
            onChangeText={(value) => update("categoria", value)}
          />
          <Field
            label="Método de pago"
            value={draft.metodo_pago}
            onChangeText={(value) => update("metodo_pago", value)}
          />
          <Field
            label="Estado pago"
            value={draft.estado_pago}
            onChangeText={(value) => update("estado_pago", value)}
          />
          <Field
            label="Proveedor"
            value={draft.proveedor}
            onChangeText={(value) => update("proveedor", value)}
          />
        </>
      ) : null}
    </View>
  );
}

function CandidateChips({
  label,
  items,
  valueKey,
  titleKey,
  secondaryKey,
  onSelect,
}: {
  label: string;
  items: Array<Record<string, unknown>>;
  valueKey: string;
  titleKey: string;
  secondaryKey?: string;
  onSelect: (value: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.helperLabel}>{label}</Text>
      <View style={styles.chipWrap}>
        {items.slice(0, 8).map((item, index) => (
          <Pressable
            key={String(item[valueKey] ?? `${label}-${index}`)}
            onPress={() => onSelect(String(item[valueKey] ?? ""))}
            style={styles.pickChip}
          >
            <Text style={styles.pickChipText}>
              {String(item[titleKey] ?? "")} {secondaryKey ? String(item[secondaryKey] ?? "") : ""}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CashSummary({ rows }: { rows: Array<Record<string, unknown>> }) {
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    const method = String(row.metodo_pago ?? "otro");
    acc[method] = (acc[method] ?? 0) + Number(row.monto ?? 0);
    return acc;
  }, {});

  const stats = Object.entries(totals).map(([key, value]) => ({
    id: key,
    label: key,
    value: formatCurrency(value),
  }));

  return (
    <Panel title="Caja del día">
      {stats.length > 0 ? (
        <StatGrid items={stats} />
      ) : (
        <EmptyState
          title="Sin movimientos hoy"
          description="Cuando se registren ingresos aparecerán aquí."
        />
      )}
    </Panel>
  );
}

export function CaleModule({ profile }: { profile: Perfil }) {
  const { isOnline, syncNow } = useApp();
  const [bankInfo, setBankInfo] = useState("");
  const [loadingBank, setLoadingBank] = useState(false);
  const [preparingPractice, setPreparingPractice] = useState(false);
  const [showBankRecovery, setShowBankRecovery] = useState(false);
  const [questions, setQuestions] = useState<Array<Record<string, unknown>>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    percentage: number;
    correctCount: number;
    total: number;
    approved: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const submissionPending = useRef(false);
  const answeredCount = questions.filter((question) => answers[String(question.id)]).length;
  const completed = questions.length === CALE_QUESTION_COUNT && answeredCount === questions.length;

  const recoverBank = useEvent(async () => {
    if (!isOnline) {
      setBankInfo("Conéctate a internet para recuperar el banco CALE.");
      setShowBankRecovery(true);
      return;
    }

    setLoadingBank(true);
    try {
      const bankResult = await syncCaleBank();
      if (bankResult.updated > 0) {
        setBankInfo(`Banco actualizado: ${bankResult.updated} preguntas (${bankResult.source}).`);
        setShowBankRecovery(false);
      } else {
        setBankInfo("No encontramos preguntas activas para actualizar el banco CALE.");
        setShowBankRecovery(true);
      }
    } catch (error) {
      setBankInfo(error instanceof Error ? error.message : "No se pudo actualizar el banco CALE.");
      setShowBankRecovery(true);
    } finally {
      setLoadingBank(false);
    }
  });

  const preparePractice = useEvent(async () => {
    setPreparingPractice(true);
    try {
      const rows = await buildOfflinePractice(CALE_QUESTION_COUNT);
      if (rows.length !== CALE_QUESTION_COUNT) {
        setQuestions([]);
        setAnswers({});
        setResult(null);
        setStartedAt(null);
        setBankInfo(
          isOnline
            ? "Se necesitan 40 preguntas para el simulacro CALE. Actualiza el banco para continuar."
            : "Se necesitan 40 preguntas para el simulacro CALE. Conéctate para actualizar el banco."
        );
        setShowBankRecovery(true);
        return;
      }

      setQuestions(rows);
      setAnswers({});
      setResult(null);
      setStartedAt(Date.now());
      setShowBankRecovery(false);
      setBankInfo("");
    } catch (error) {
      setQuestions([]);
      setAnswers({});
      setResult(null);
      setStartedAt(null);
      setBankInfo(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos preparar el simulacro. Actualiza el banco CALE para continuar."
      );
      setShowBankRecovery(true);
    } finally {
      setPreparingPractice(false);
    }
  });

  if (profile.rol !== "alumno") {
    return (
      <Panel
        title="Exámenes"
        subtitle="En roles administrativos la app móvil ofrece lectura y seguimiento simplificado."
      >
        <Text style={styles.helperText}>
          La edición del banco CALE y las analíticas profundas permanecen online-first y más cómodas
          en la web.
        </Text>
      </Panel>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <Panel title="Simulacro">
        <PrimaryButton
          label={preparingPractice ? "Preparando..." : "Preparar simulacro"}
          disabled={preparingPractice || loadingBank || submitting}
          onPress={() => void preparePractice()}
        />
        {showBankRecovery ? (
          isOnline ? (
            <Pressable
              disabled={loadingBank}
              onPress={() => void recoverBank()}
              style={styles.subtleLink}
            >
              <Text style={styles.subtleLinkText}>
                {loadingBank ? "Actualizando banco CALE..." : "Actualizar banco CALE"}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.helperText}>
              Conéctate a internet para recuperar el banco CALE.
            </Text>
          )
        ) : null}
        {bankInfo ? <Text style={styles.helperText}>{bankInfo}</Text> : null}
      </Panel>

      {questions.length > 0 ? (
        <Panel
          title="Simulacro listo"
          subtitle={
            isOnline
              ? "Tus respuestas se envían al terminar."
              : "Tus respuestas se encolarán al volver la conexión."
          }
        >
          <Text style={styles.helperText}>
            {answeredCount} de {CALE_QUESTION_COUNT} respondidas. Completa todas las preguntas para
            finalizar y ver los resultados.
          </Text>
          <View style={{ gap: 16 }}>
            {questions.map((question, index) => (
              <View key={String(question.id)} style={styles.questionBlock}>
                <Text style={styles.questionTitle}>
                  {index + 1}. {String(question.pregunta ?? "Pregunta")}
                </Text>
                {(["a", "b", "c", "d"] as const).map((option) => {
                  const rawValue = question[`opcion_${option}`];
                  if (!rawValue) return null;

                  return (
                    <Pressable
                      key={`${question.id}-${option}`}
                      disabled={submitting || result !== null}
                      onPress={() =>
                        setAnswers((current) => ({
                          ...current,
                          [String(question.id)]: option,
                        }))
                      }
                      style={[
                        styles.answerOption,
                        answers[String(question.id)] === option ? styles.answerOptionActive : null,
                      ]}
                    >
                      <Text style={styles.answerOptionLabel}>
                        {option.toUpperCase()}. {String(rawValue)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          <PrimaryButton
            label={
              submitting ? "Guardando..." : result ? "Práctica guardada" : "Finalizar práctica"
            }
            disabled={submitting || result !== null || !completed}
            onPress={async () => {
              if (submissionPending.current || result || !completed) return;
              submissionPending.current = true;
              setSubmitting(true);
              try {
                const offlineResult = await evaluateOfflinePractice(
                  questions.map((question) => String(question.id)),
                  answers
                );
                if (offlineResult.total !== CALE_QUESTION_COUNT) {
                  throw new Error(
                    "El banco CALE cambió. Actualízalo y prepara otro simulacro de 40 preguntas."
                  );
                }
                await submitCaleAttempt({
                  questionIds: questions.map((question) => String(question.id)),
                  answers,
                  elapsedSeconds: startedAt
                    ? Math.max(0, Math.round((Date.now() - startedAt) / 1000))
                    : 0,
                  offline: !isOnline,
                });
                setResult(offlineResult);
                await syncNow();
              } catch (error) {
                setBankInfo(
                  error instanceof Error ? error.message : "No se pudo guardar el intento."
                );
              } finally {
                submissionPending.current = false;
                setSubmitting(false);
              }
            }}
          />
        </Panel>
      ) : null}

      {result ? (
        <Panel title="Resultado local">
          <StatGrid
            items={[
              {
                id: "correct",
                label: "Correctas",
                value: String(result.correctCount),
                tone: "success",
              },
              { id: "total", label: "Total", value: String(result.total) },
              {
                id: "percentage",
                label: "Porcentaje",
                value: `${result.percentage}%`,
                tone: result.approved ? "success" : "warning",
              },
            ]}
          />
          <Tag
            label={result.approved ? "Aprobado" : "Sigue practicando"}
            tone={result.approved ? "success" : "warning"}
          />
        </Panel>
      ) : null}
    </View>
  );
}

export function ModuleScreen({ moduleId }: { moduleId: MobileModuleId }) {
  const { profile } = useApp();
  if (!canUseMobileModule(profile?.rol, moduleId))
    return (
      <AppScreen>
        <Panel title="Acceso no disponible">
          <Text>Esta vista no corresponde a tu cuenta en Android.</Text>
          <SecondaryButton label="Volver" onPress={() => router.back()} />
        </Panel>
      </AppScreen>
    );
  const owner = JSON.stringify([profile?.id, profile?.escuela_id, profile?.sede_id, profile?.rol]);
  return moduleId === "hours" ? (
    <HoursScreen key={owner} />
  ) : (
    <GeneralModuleScreen key={`${owner}:${moduleId}`} moduleId={moduleId} />
  );
}

function GeneralModuleScreen({ moduleId }: { moduleId: MobileModuleId }) {
  const { profile, subscriptionAccess, pendingCount, isOnline, syncNow } = useApp();
  const moduleConfig = getModuleById(moduleId);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [fromCache, setFromCache] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState<DraftState>({});
  const [notice, setNotice] = useState("");
  const refreshRequest = useRef(0);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState("");
  const [candidatesReload, setCandidatesReload] = useState(0);
  const [candidates, setCandidates] = useState<{
    students: Array<Record<string, unknown>>;
    instructors: Array<Record<string, unknown>>;
    vehicles: Array<Record<string, unknown>>;
  }>({
    students: [],
    instructors: [],
    vehicles: [],
  });

  const refresh = useEvent(async () => {
    if (!moduleConfig) return;
    const request = ++refreshRequest.current;
    setLoading(true);
    try {
      const state = await loadModuleRows(moduleConfig.id);
      if (request !== refreshRequest.current) return;
      setNotice("");
      withTransition(() => {
        setRows(state.rows);
        setFromCache(state.fromCache);
      });
    } catch (error) {
      if (request !== refreshRequest.current) return;
      setRows([]);
      setNotice(error instanceof Error ? error.message : "No se pudo cargar el módulo.");
    } finally {
      if (request === refreshRequest.current) setLoading(false);
    }
  });

  useEffect(() => {
    void refresh();
    return () => {
      refreshRequest.current += 1;
    };
  }, [refresh, moduleId]);

  useEffect(() => {
    if (!editorOpen || moduleId !== "income") return;
    let active = true;
    setCandidatesLoading(true);
    setCandidatesError("");
    void readEntityRows<Record<string, unknown>>("students")
      .then((students) => {
        if (active)
          setCandidates({
            students: students.map((row) => row.payload),
            instructors: [],
            vehicles: [],
          });
      })
      .catch(() => {
        if (active) setCandidatesError("No se pudieron cargar los alumnos recientes.");
      })
      .finally(() => {
        if (active) setCandidatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editorOpen, moduleId, candidatesReload]);

  const canEditDaily = useMemo(
    () =>
      profile &&
      canEditMobileModule(profile.rol, moduleId) &&
      subscriptionAccess?.can_write !== false,
    [moduleId, profile, subscriptionAccess?.can_write]
  );

  if (!moduleConfig || !profile) {
    return (
      <AppScreen>
        <Panel title="Módulo no disponible">
          <EmptyState
            title="No encontramos esta vista"
            description="Puede que el rol actual no tenga acceso o que el módulo aún no esté publicado."
          />
        </Panel>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <Panel
        title={moduleConfig.label}
        subtitle={fromCache ? "Datos guardados en este dispositivo" : undefined}
        trailing={
          <Tag label={isOnline ? "En línea" : "Offline"} tone={isOnline ? "success" : "warning"} />
        }
      >
        {pendingCount > 0 ? (
          <Text style={styles.helperText}>Pendientes por sincronizar: {pendingCount}</Text>
        ) : null}
        {subscriptionAccess?.can_write === false ? (
          <Text style={styles.helperText}>
            La escuela está en modo{" "}
            {subscriptionAccess.status === "read_only" ? "solo lectura" : "suspendido"}.
          </Text>
        ) : null}
        <View style={styles.inlineActions}>
          <View style={styles.inlineAction}>
            <PrimaryButton
              label={loading ? "Cargando..." : "Actualizar"}
              disabled={loading}
              onPress={() => void refresh()}
            />
          </View>
          <View style={styles.inlineAction}>
            <SecondaryButton label="Mi cuenta" onPress={() => router.push("/(protected)/cuenta")} />
          </View>
        </View>
      </Panel>

      {moduleConfig.id === "cash" && !loading && !notice ? <CashSummary rows={rows} /> : null}

      {moduleConfig.id === "exams" ? <CaleModule profile={profile} /> : null}

      {moduleConfig.mode === "online-summary" &&
      moduleConfig.id !== "cash" &&
      moduleConfig.id !== "exams" ? (
        <Panel title="Registros" subtitle={loading ? "Cargando..." : ""}>
          {loading ? (
            <ActivityIndicator accessibilityLabel="Cargando registros" color={palette.primary} />
          ) : rows.length > 0 ? (
            rows.map((row, index) => (
              <View key={String(row.id ?? `summary-${index}`)} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{titleForRow(moduleConfig.id, row)}</Text>
                <Text style={styles.rowDescription}>{descriptionForRow(moduleConfig.id, row)}</Text>
                <Tag
                  label={String(row.estado ?? row.resultado ?? row.rol ?? "Sin etiqueta")}
                  tone={statusTone(String(row.estado ?? row.resultado ?? row.rol ?? ""))}
                />
              </View>
            ))
          ) : !notice ? (
            <EmptyState title="Sin registros" description="No hay registros disponibles." />
          ) : null}
        </Panel>
      ) : null}

      {["students", "classes", "income", "expenses"].includes(moduleConfig.id) ? (
        <>
          {canEditDaily ? (
            <Panel title={editingRow ? "Editar registro" : "Nuevo registro"}>
              {!editorOpen ? (
                <PrimaryButton
                  label={
                    moduleId === "students"
                      ? "Crear alumno en web"
                      : `Nuevo ${moduleId === "income" ? "ingreso" : "gasto"}`
                  }
                  onPress={async () => {
                    if (moduleId === "students") {
                      try {
                        await Linking.openURL("https://condusoft.co/dashboard/alumnos");
                      } catch {
                        setNotice("No se pudo abrir ConduSoft web.");
                      }
                      return;
                    }
                    setEditingRow(null);
                    setDraft(buildDraft(moduleConfig.id, profile));
                    setEditorOpen(true);
                  }}
                />
              ) : (
                <>
                  <DailyForm
                    moduleId={moduleConfig.id}
                    draft={draft}
                    setDraft={setDraft}
                    profile={profile}
                    candidates={candidates}
                  />
                  {candidatesLoading && moduleId === "income" ? (
                    <ActivityIndicator
                      accessibilityLabel="Cargando alumnos recientes"
                      color={palette.primary}
                    />
                  ) : candidatesError && moduleId === "income" ? (
                    <>
                      <Text accessibilityRole="alert">{candidatesError}</Text>
                      <SecondaryButton
                        label="Reintentar"
                        onPress={() => setCandidatesReload((value) => value + 1)}
                      />
                    </>
                  ) : null}
                  <View style={styles.inlineActions}>
                    <View style={styles.inlineAction}>
                      <PrimaryButton
                        label={editingRow ? "Guardar cambios" : "Guardar"}
                        onPress={async () => {
                          const type =
                            `${moduleConfig.id}.${editingRow ? "update" : "create"}` as const;
                          await queueModuleMutation(type, draft);
                          setNotice(
                            isOnline
                              ? "Registro guardado y enviado a Supabase."
                              : "Registro guardado localmente. Se sincronizará cuando vuelva la conexión."
                          );
                          setEditorOpen(false);
                          setEditingRow(null);
                          await refresh();
                          if (isOnline) {
                            await syncNow();
                            await refresh();
                          }
                        }}
                      />
                    </View>
                    <View style={styles.inlineAction}>
                      <SecondaryButton
                        label="Cancelar"
                        onPress={() => {
                          setEditorOpen(false);
                          setEditingRow(null);
                        }}
                      />
                    </View>
                  </View>
                </>
              )}
            </Panel>
          ) : null}

          <Panel title="Últimos registros" subtitle={loading ? "Cargando..." : undefined}>
            {loading ? (
              <ActivityIndicator accessibilityLabel="Cargando registros" color={palette.primary} />
            ) : rows.length > 0 ? (
              rows.map((row, index) => (
                <View key={String(row.id ?? `editable-${index}`)} style={styles.rowCard}>
                  <View style={styles.rowHeader}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.rowTitle}>{titleForRow(moduleConfig.id, row)}</Text>
                      <Text style={styles.rowDescription}>
                        {descriptionForRow(moduleConfig.id, row)}
                      </Text>
                    </View>
                    <Tag
                      label={String(
                        row.estado ?? row.estado_pago ?? row.metodo_pago ?? row.tipo ?? "Registro"
                      )}
                      tone={statusTone(String(row.estado ?? row.estado_pago ?? ""))}
                    />
                  </View>
                  {canEditDaily ? (
                    <SecondaryButton
                      label="Editar"
                      onPress={() => {
                        setEditingRow(row);
                        setDraft(buildDraft(moduleConfig.id, profile, row));
                        setEditorOpen(true);
                      }}
                    />
                  ) : null}
                </View>
              ))
            ) : !notice ? (
              <EmptyState title="Sin registros" description="No hay registros disponibles." />
            ) : null}
          </Panel>
        </>
      ) : null}

      {notice ? (
        <Panel>
          <Text accessibilityLiveRegion="polite" style={styles.helperText}>
            {notice}
          </Text>
        </Panel>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  helperText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  helperLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
  inlineActions: {
    flexDirection: "row",
    gap: 10,
  },
  inlineAction: {
    flex: 1,
  },
  inlineFields: {
    flexDirection: "row",
    gap: 10,
  },
  inlineField: {
    flex: 1,
  },
  rowCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 16,
    gap: 10,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rowTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "600",
  },
  rowDescription: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pickChip: {
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    backgroundColor: palette.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pickChipText: {
    color: palette.primaryHover,
    fontSize: 12,
    fontWeight: "700",
  },
  questionBlock: {
    gap: 8,
  },
  questionTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  answerOption: {
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  answerOptionActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  answerOptionLabel: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  subtleLink: {
    alignSelf: "flex-start",
    minHeight: 48,
    justifyContent: "center",
  },
  subtleLinkText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
