import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { Panel } from "@/components/primitives";
import { palette } from "@/lib/theme";

export function RoleQuickActions({
  actions,
}: {
  actions: Array<{
    id: string;
    label: string;
    description: string;
    icon: string;
    onPress: () => void;
  }>;
}) {
  if (actions.length === 0) return null;

  return (
    <Panel title="Accesos rápidos">
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.card,
              pressed && { backgroundColor: palette.primarySoft },
            ]}
          >
            <View style={styles.iconWrap}>
              <AppIcon name={action.icon} color={palette.primary} size={18} />
            </View>
            <Text style={styles.label}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    flexBasis: "45%",
    flexGrow: 1,
    minWidth: 0,
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 16,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primarySoft,
  },
  label: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "500",
  },
});
