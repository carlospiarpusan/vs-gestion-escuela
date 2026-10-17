import { StyleSheet, View } from "react-native";
import { ModuleLink } from "./module-link";
import { Panel, SecondaryButton, Tag } from "@/components/primitives";
import { SECTION_LABELS, canUseMobileModule } from "@/lib/modules";
import type { MobileModuleId, ModuleDescriptor, ModuleSectionId, Rol } from "@/lib/types";

export function MoreScreen({
  role,
  modules,
  isOnline,
  pendingCount,
  syncing,
  onOpenModule,
  onAccount,
  onSyncNow,
}: {
  role: Rol;
  modules: ModuleDescriptor[];
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  onOpenModule: (moduleId: MobileModuleId) => void;
  onAccount: () => void;
  onSyncNow: () => Promise<void>;
}) {
  const groupedModules = modules
    .filter((descriptor) => canUseMobileModule(role, descriptor.id))
    .reduce<Record<ModuleSectionId, ModuleDescriptor[]>>(
      (acc, module) => {
        acc[module.section] = acc[module.section] ? [...acc[module.section], module] : [module];
        return acc;
      },
      {
        overview: [],
        operation: [],
        finance: [],
        progress: [],
        activity: [],
        configuration: [],
        platform: [],
      }
    );

  return (
    <View style={styles.wrapper}>
      <Panel>
        <View style={styles.actionRow}>
          <View style={styles.actionItem}>
            <SecondaryButton label="Mi cuenta" onPress={onAccount} />
          </View>
          {pendingCount > 0 ? (
            <View style={styles.actionItem}>
              <SecondaryButton
                label={syncing ? "Sincronizando..." : "Sincronizar ahora"}
                disabled={!isOnline || syncing}
                onPress={() => void onSyncNow()}
              />
            </View>
          ) : null}
        </View>
      </Panel>

      {Object.entries(groupedModules)
        .filter(([, group]) => group.length > 0)
        .map(([section, group]) => (
          <Panel key={section} title={SECTION_LABELS[section as ModuleSectionId]}>
            <View style={styles.groupList}>
              {group.map((module) => (
                <ModuleLink
                  key={module.id}
                  label={module.label}
                  icon={module.icon}
                  onPress={() => onOpenModule(module.id)}
                  trailing={
                    !isOnline && !module.offline ? (
                      <Tag label="Requiere conexion" tone="warning" />
                    ) : undefined
                  }
                />
              ))}
            </View>
          </Panel>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 16,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionItem: {
    flexGrow: 1,
    minWidth: 150,
  },
  groupList: {
    gap: 0,
  },
});
