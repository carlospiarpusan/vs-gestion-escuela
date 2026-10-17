import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react-native";
import {
  AppScreen,
  EmptyState,
  Panel,
  PrimaryButton,
  SecondaryButton,
  StatGrid,
  Tag,
} from "./primitives";
import { useApp } from "@/context/app-context";
import { loadWorkHours } from "@/lib/data";
import {
  bogotaToday,
  formatWorkHours,
  hoursPeriodFromInput,
  hoursPeriodInput,
  shiftHoursPeriod,
  summarizeWorkHours,
  type HoursPeriod,
  type WorkHoursRow,
} from "@/lib/hours";
import { palette } from "@/lib/theme";

export function HoursScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { profile, isOnline } = useApp();
  const [period, setPeriod] = useState<HoursPeriod>(() => ({ mode: "month", date: bogotaToday() }));
  const [input, setInput] = useState(() => hoursPeriodInput(period));
  const [rows, setRows] = useState<WorkHoursRow[] | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");
  const [inputError, setInputError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [reload, setReload] = useState(0);
  const [limit, setLimit] = useState(31);
  const owner = JSON.stringify([profile?.id, profile?.escuela_id, profile?.sede_id, profile?.rol]);
  const viewKey = `${owner}:${period.mode}:${period.date}:${reload}`;
  const loading = loadedKey !== viewKey;
  useEffect(() => {
    let active = true;
    void loadWorkHours(period)
      .then((result) => {
        if (!active) return;
        summarizeWorkHours(result.rows);
        setRows(result.rows);
        setError("");
        setFromCache(result.fromCache);
      })
      .catch((failure) => {
        if (active) {
          setRows(null);
          setError(
            failure instanceof Error
              ? failure.message
              : "No se pudieron cargar las horas. Actualiza la vista."
          );
        }
      })
      .finally(() => {
        if (active) setLoadedKey(viewKey);
      });
    return () => {
      active = false;
    };
  }, [owner, period, reload, viewKey]);
  const summary = useMemo(
    () => (rows && loadedKey === viewKey ? summarizeWorkHours(rows) : null),
    [rows, loadedKey, viewKey]
  );
  const apply = (next: HoursPeriod) => {
    setPeriod(next);
    setInput(hoursPeriodInput(next));
    setInputError("");
    setLimit(31);
  };
  const navigate = (direction: -1 | 1) => {
    try {
      apply(shiftHoursPeriod(period, direction));
    } catch {
      setInputError("Selecciona un periodo entre 1900 y 9998.");
    }
  };
  const content = (
    <>
      <Panel
        title={embedded ? undefined : profile?.rol === "instructor" ? "Mis horas" : "Horas"}
        trailing={
          embedded ? undefined : (
            <Tag
              label={isOnline ? "En linea" : "Sin conexion"}
              tone={isOnline ? "success" : "warning"}
            />
          )
        }
      >
        <View style={styles.modes} accessibilityRole="tablist">
          {(
            [
              ["day", "D\u00eda"],
              ["month", "Mes"],
              ["year", "A\u00f1o"],
            ] as const
          ).map(([mode, label]) => (
            <Pressable
              key={mode}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === period.mode }}
              onPress={() => apply({ ...period, mode })}
              style={[styles.mode, period.mode === mode && styles.selected]}
            >
              <Text style={period.mode === mode ? styles.selectedText : styles.text}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.text}>
          {period.mode === "day"
            ? "Fecha (AAAA-MM-DD)"
            : period.mode === "month"
              ? "Mes (AAAA-MM)"
              : "A\u00f1o"}
        </Text>
        <View style={styles.period}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Periodo anterior"
            onPress={() => navigate(-1)}
            style={styles.arrow}
          >
            <ChevronLeft size={22} color={palette.text} />
          </Pressable>
          <TextInput
            accessibilityLabel="Periodo"
            value={input}
            onChangeText={setInput}
            keyboardType={period.mode === "year" ? "numeric" : "numbers-and-punctuation"}
            autoCorrect={false}
            underlineColorAndroid="transparent"
            maxLength={10}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Periodo siguiente"
            onPress={() => navigate(1)}
            style={styles.arrow}
          >
            <ChevronRight size={22} color={palette.text} />
          </Pressable>
        </View>
        {inputError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {inputError}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <PrimaryButton
            label="Aplicar filtro"
            style={{ flex: 1 }}
            onPress={() => {
              try {
                apply(hoursPeriodFromInput(period.mode, input));
              } catch (failure) {
                setInputError(failure instanceof Error ? failure.message : "Revisa el periodo.");
              }
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar"
            accessibilityHint="Actualizar las horas del periodo seleccionado."
            accessibilityState={{ disabled: loading, busy: loading }}
            disabled={loading}
            style={({ pressed }) => [
              styles.refresh,
              pressed && { backgroundColor: palette.surfaceMuted },
              loading && { opacity: 0.5 },
            ]}
            onPress={() => setReload((value) => value + 1)}
          >
            <RefreshCw size={20} color={palette.textMuted} strokeWidth={1.8} />
          </Pressable>
        </View>
      </Panel>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Cargando horas" color={palette.primary} />
      ) : error ? (
        <Panel title="No se pudieron cargar las horas">
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        </Panel>
      ) : summary ? (
        <>
          <Panel title={`Resumen ${hoursPeriodInput(period)}`}>
            {fromCache ? <Tag label="Guardado en este dispositivo" tone="warning" /> : null}
            <StatGrid
              items={[
                { id: "hours", label: "Horas trabajadas", value: formatWorkHours(summary.hours) },
                { id: "days", label: "Dias trabajados", value: String(summary.days) },
              ]}
            />
          </Panel>
          <Panel title="Registro diario">
            {rows?.length ? (
              <>
                {rows.slice(0, limit).map((row) => (
                  <View key={row.id} style={styles.row}>
                    <Text style={styles.text}>{row.fecha.split("-").reverse().join("/")}</Text>
                    <Text style={styles.amount}>{formatWorkHours(row.horas)} h</Text>
                  </View>
                ))}
                {rows.length > limit ? (
                  <SecondaryButton
                    label="Ver mas"
                    onPress={() => setLimit((value) => value + 31)}
                  />
                ) : null}
              </>
            ) : (
              <EmptyState
                title="Sin horas registradas"
                description="No hay horas de trabajo registradas para el periodo seleccionado."
              />
            )}
          </Panel>
        </>
      ) : null}
    </>
  );
  return embedded ? <View style={{ gap: 16 }}>{content}</View> : <AppScreen>{content}</AppScreen>;
}
const styles = StyleSheet.create({
  modes: {
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: palette.surfaceMuted,
    padding: 4,
  },
  mode: {
    flex: 1,
    minHeight: 48,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: palette.surface },
  selectedText: { color: palette.primary, fontWeight: "600", fontSize: 14 },
  text: { color: palette.text, fontSize: 14 },
  period: { flexDirection: "row", gap: 8, alignItems: "center" },
  arrow: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    minWidth: 0,
    color: palette.text,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 16,
    minHeight: 48,
    backgroundColor: palette.surface,
  },
  error: { color: palette.danger, fontSize: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  amount: { color: palette.text, fontWeight: "600", fontSize: 16 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  refresh: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
