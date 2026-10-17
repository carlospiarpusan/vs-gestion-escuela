import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { AppIcon } from "./app-icon";
import { palette, typography } from "@/lib/theme";

export function ModuleLink({
  label,
  icon,
  onPress,
  trailing,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <AppIcon name={icon} size={21} color={palette.primary} strokeWidth={1.8} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {trailing}
      </View>
      <ChevronRight size={18} color={palette.textSoft} strokeWidth={1.7} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  pressed: { backgroundColor: palette.surfaceMuted },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  label: { ...typography.body, color: palette.text, fontWeight: "500" },
});
