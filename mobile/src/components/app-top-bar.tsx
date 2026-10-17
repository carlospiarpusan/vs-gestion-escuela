import { Pressable, StyleSheet, Text, View } from "react-native";
import { Tag } from "@/components/primitives";
import { AppIcon } from "@/components/app-icon";
import { palette, typography } from "@/lib/theme";

export function AppTopBar({
  title,
  roleLabel,
  isOnline,
  pendingCount,
  syncing,
  onAccount,
}: {
  title: string;
  roleLabel: string;
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  onAccount: () => void;
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.headerCard}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mi cuenta"
            onPress={onAccount}
            style={styles.primaryButton}
          >
            <AppIcon name="user" size={22} color={palette.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.role}>{roleLabel}</Text>
        <View style={styles.connection}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? palette.success : palette.warning },
            ]}
          />
          <Text style={styles.role}>{isOnline ? "En línea" : "Sin conexión"}</Text>
        </View>
        {pendingCount > 0 ? (
          <Tag
            label={pendingCount > 0 ? `${pendingCount} pendientes` : "Sin pendientes"}
            tone={pendingCount > 0 ? "warning" : "success"}
          />
        ) : null}
        {syncing ? <Tag label="Sincronizando" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  title: {
    ...typography.title,
    color: palette.text,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryButton: {
    borderRadius: 8,
    width: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
  },
  role: { ...typography.label, color: palette.textMuted },
  connection: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
});
