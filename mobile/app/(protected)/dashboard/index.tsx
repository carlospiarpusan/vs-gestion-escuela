import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdaptiveNavigationRail } from "@/components/adaptive-navigation-rail";
import { ModuleLink } from "@/components/module-link";
import { AppTopBar } from "@/components/app-top-bar";
import { MoreScreen } from "@/components/more-screen";
import { CaleModule } from "@/components/module-screen";
import { EmptyState, Panel, StatGrid } from "@/components/primitives";
import { PrimaryNavigation } from "@/components/primary-navigation";
import { RoleQuickActions } from "@/components/role-quick-actions";
import { HoursScreen } from "@/components/hours-screen";
import { useApp } from "@/context/app-context";
import { useEvent } from "@/hooks/use-event";
import { loadDashboardSummary } from "@/lib/data";
import {
  getDefaultDestinationForRole,
  getModulesForDestination,
  getModulesForMore,
  getRoleNavigationConfig,
  ROLE_LABELS,
  getModuleById,
  canUseMobileModule,
} from "@/lib/modules";
import { palette, spacing } from "@/lib/theme";
import type {
  DashboardSummary,
  MobileModuleId,
  ModuleDescriptor,
  PrimaryNavDestination,
  PrimaryNavDestinationId,
  Perfil,
  Rol,
} from "@/lib/types";

type QuickAction = {
  id: string;
  label: string;
  description: string;
  icon: string;
  onPress: () => void;
};

export default function DashboardHomeScreen() {
  const { width } = useWindowDimensions();
  const { profile, isOnline, pendingCount, syncing, syncNow } = useApp();
  const profileKey = JSON.stringify([
    profile?.id,
    profile?.escuela_id,
    profile?.sede_id,
    profile?.rol,
  ]);
  const [summaryState, setSummaryState] = useState<{
    owner: string;
    data: DashboardSummary | null;
    error: string;
  }>({ owner: "", data: null, error: "" });
  const summary = summaryState.owner === profileKey ? summaryState.data : null;
  const error = summaryState.owner === profileKey ? summaryState.error : "";
  const roleNavigation = getRoleNavigationConfig(profile?.rol);
  const defaultDestination = getDefaultDestinationForRole(profile?.rol);
  const [selectedDestination, setActiveDestination] =
    useState<PrimaryNavDestinationId>(defaultDestination);
  const activeDestination = useMemo(() => {
    if (!roleNavigation) return defaultDestination;
    return roleNavigation.destinations.some((destination) => destination.id === selectedDestination)
      ? selectedDestination
      : roleNavigation.defaultDestination;
  }, [defaultDestination, roleNavigation, selectedDestination]);

  const refreshSummary = useEvent(async () => {
    if (!profile) return;

    try {
      const result = await loadDashboardSummary(profile);
      setSummaryState({ owner: profileKey, data: result, error: "" });
    } catch (nextError) {
      setSummaryState({
        owner: profileKey,
        data: null,
        error: nextError instanceof Error ? nextError.message : "No se pudo cargar el resumen.",
      });
    }
  });

  useEffect(() => {
    if (["home", "progress"].includes(activeDestination)) void refreshSummary();
  }, [activeDestination, profileKey, refreshSummary]);

  if (!profile || !roleNavigation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentOnly}>
          <Panel title="Cargando perfil">
            <EmptyState
              title="Esperando sesión"
              description="En unos segundos se mostrará tu panel móvil."
            />
          </Panel>
        </View>
      </SafeAreaView>
    );
  }

  const activeMeta =
    roleNavigation.destinations.find((destination) => destination.id === activeDestination) ||
    roleNavigation.destinations[0];
  const wide = width >= 920;

  const openModule = (moduleId: MobileModuleId) => {
    router.push(`/(protected)/dashboard/${moduleId}`);
  };

  const quickActions = buildQuickActions({
    role: profile.rol,
    setActiveDestination,
    openModule,
  }).filter((action) => {
    const descriptor = getModuleById(action.id);
    return !descriptor || canUseMobileModule(profile.rol, descriptor.id);
  });

  const moreModules = getModulesForMore(profile.rol);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <AppTopBar
          title={activeMeta.title}
          roleLabel={ROLE_LABELS[profile.rol]}
          isOnline={isOnline}
          pendingCount={pendingCount}
          syncing={syncing}
          onAccount={() => router.push("/(protected)/cuenta")}
        />

        <View style={[styles.main, wide ? styles.mainWide : null]}>
          {wide ? (
            <AdaptiveNavigationRail
              destinations={roleNavigation.destinations}
              activeDestination={activeDestination}
              onSelect={setActiveDestination}
            />
          ) : null}

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderDestinationContent({
              destination: activeMeta,
              role: profile.rol,
              summary,
              error,
              pendingCount,
              quickActions,
              onOpenModule: openModule,
              isOnline,
              syncing,
              onSyncNow: syncNow,
              moreModules,
              profile,
            })}
          </ScrollView>
        </View>
      </View>

      {!wide ? (
        <PrimaryNavigation
          destinations={roleNavigation.destinations}
          activeDestination={activeDestination}
          onSelect={setActiveDestination}
        />
      ) : null}
    </SafeAreaView>
  );
}

function renderDestinationContent({
  destination,
  role,
  summary,
  error,
  pendingCount,
  quickActions,
  onOpenModule,
  isOnline,
  syncing,
  onSyncNow,
  moreModules,
  profile,
}: {
  destination: PrimaryNavDestination;
  role: Rol;
  summary: DashboardSummary | null;
  error: string;
  pendingCount: number;
  quickActions: QuickAction[];
  onOpenModule: (moduleId: MobileModuleId) => void;
  isOnline: boolean;
  syncing: boolean;
  onSyncNow: () => Promise<void>;
  moreModules: ModuleDescriptor[];
  profile: Perfil;
}) {
  if (destination.id === "more") {
    return (
      <MoreScreen
        role={role}
        modules={moreModules}
        isOnline={isOnline}
        pendingCount={pendingCount}
        syncing={syncing}
        onOpenModule={(moduleId) => onOpenModule(moduleId)}
        onAccount={() => router.push("/(protected)/cuenta")}
        onSyncNow={onSyncNow}
      />
    );
  }

  if (destination.id === "activity" && role === "instructor") return <HoursScreen embedded />;

  if (destination.id === "cale" && role === "alumno") {
    return (
      <View style={styles.sectionStack}>
        <CaleModule profile={profile} />
      </View>
    );
  }

  if (destination.id === "progress" && role === "alumno") {
    return (
      <View style={styles.sectionStack}>
        <SummaryPanel summary={summary} error={error} fallbackTitle="Mi resumen" />
      </View>
    );
  }

  if (destination.id === "home") {
    return (
      <View style={styles.sectionStack}>
        <SummaryPanel
          summary={summary}
          error={error}
          fallbackTitle={`Hola, ${profile.nombre.split(" ")[0]}`}
        />
        <RoleQuickActions actions={quickActions} />
      </View>
    );
  }

  return (
    <View style={styles.sectionStack}>
      <ModuleGroupPanel
        modules={getModulesForDestination(role, destination.id)}
        onOpenModule={onOpenModule}
      />
    </View>
  );
}

function SummaryPanel({
  summary,
  error,
  fallbackTitle,
}: {
  summary: DashboardSummary | null;
  error: string;
  fallbackTitle: string;
}) {
  return (
    <Panel title={summary?.headline || fallbackTitle}>
      {summary ? (
        <StatGrid items={summary.stats.filter((stat) => stat.id !== "classes")} />
      ) : (
        <Text style={styles.helperText}>{error || "Cargando resumen..."}</Text>
      )}
    </Panel>
  );
}

function ModuleGroupPanel({
  modules,
  onOpenModule,
}: {
  modules: ModuleDescriptor[];
  onOpenModule: (moduleId: MobileModuleId) => void;
}) {
  return (
    <Panel>
      {modules.length > 0 ? (
        <View style={styles.featureList}>
          {modules.map((module) => (
            <ModuleLink
              key={module.id}
              label={module.label}
              icon={module.icon}
              onPress={() => onOpenModule(module.id)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="Sin accesos prioritarios"
          description="No hay funciones disponibles para tu cuenta."
        />
      )}
    </Panel>
  );
}

type DashboardHomeScreenRole = Rol;

function buildQuickActions({
  role,
  setActiveDestination,
  openModule,
}: {
  role: DashboardHomeScreenRole;
  setActiveDestination: (destinationId: PrimaryNavDestinationId) => void;
  openModule: (moduleId: MobileModuleId) => void;
}) {
  switch (role) {
    case "alumno":
      return [
        {
          id: "continue-cale",
          label: "Continuar CALE",
          description: "Abre el simulacro y concéntrate en practicar sin distracciones.",
          icon: "book",
          onPress: () => setActiveDestination("cale"),
        },
        {
          id: "progress",
          label: "Mi resumen",
          description: "Consulta tus matrículas y actividad.",
          icon: "trending-up",
          onPress: () => setActiveDestination("progress"),
        },
      ];
    case "instructor":
      return [
        {
          id: "hours",
          label: "Horas",
          description: "Consulta tus horas de trabajo registradas.",
          icon: "clock",
          onPress: () => openModule("hours"),
        },
        {
          id: "vehicles",
          label: "Vehículos",
          description: "Consulta la unidad asignada y su disponibilidad.",
          icon: "car",
          onPress: () => openModule("vehicles"),
        },
        {
          id: "logbook",
          label: "Bitácora",
          description: "Mira actividad reciente y novedades operativas.",
          icon: "clipboard",
          onPress: () => openModule("logbook"),
        },
      ];
    case "recepcion":
      return [
        {
          id: "students",
          label: "Crear alumno",
          description: "Entra al módulo de alumnos para registrar y seguir nuevos ingresos.",
          icon: "users",
          onPress: () => setActiveDestination("students"),
        },
        {
          id: "income",
          label: "Registrar cobro",
          description: "Accede al recaudo del día sin pasar por reportes.",
          icon: "banknote",
          onPress: () => openModule("income"),
        },
      ];
    case "administrativo":
    case "admin_sede":
    case "admin_escuela":
      return [
        {
          id: "students",
          label: "Alumnos",
          description: "Abre la operación para altas y seguimiento diario.",
          icon: "users",
          onPress: () => setActiveDestination("operation"),
        },
        {
          id: "income",
          label: "Ingresos",
          description: "Registra recaudo y valida movimientos del día.",
          icon: "banknote",
          onPress: () => setActiveDestination("finance"),
        },
        {
          id: "expenses",
          label: "Gastos",
          description: "Controla egresos y caja sin entrar a reportes pesados.",
          icon: "receipt",
          onPress: () => openModule("expenses"),
        },
      ];
    case "super_admin":
      return [
        {
          id: "schools",
          label: "Escuelas",
          description: "Monitorea la red y entra a la vista central de escuelas.",
          icon: "school",
          onPress: () => setActiveDestination("schools"),
        },
        {
          id: "subscriptions",
          label: "Suscripciones",
          description: "Consulta salud comercial y planes activos.",
          icon: "credit-card",
          onPress: () => openModule("subscriptions"),
        },
        {
          id: "analytics",
          label: "Analíticas",
          description: "Revisa señales globales sin salir del móvil.",
          icon: "bar-chart",
          onPress: () => setActiveDestination("platform"),
        },
        {
          id: "exams",
          label: "CALE maestro",
          description: "Accede al frente central de exámenes y control global.",
          icon: "book",
          onPress: () => openModule("exams"),
        },
      ];
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  shell: {
    flex: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.page,
    gap: spacing.shellGap,
  },
  main: {
    flex: 1,
  },
  mainWide: {
    flexDirection: "row",
    gap: spacing.shellGap,
  },
  scrollContent: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingBottom: 28,
    gap: 16,
  },
  sectionStack: {
    gap: 16,
  },
  contentOnly: {
    flex: 1,
    padding: spacing.page,
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  featureList: {
    gap: 0,
  },
});
