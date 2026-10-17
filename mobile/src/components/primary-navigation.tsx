import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { palette, spacing } from "@/lib/theme";
import type { PrimaryNavDestination, PrimaryNavDestinationId } from "@/lib/types";

export function PrimaryNavigation({
  destinations,
  activeDestination,
  onSelect,
}: {
  destinations: PrimaryNavDestination[];
  activeDestination: PrimaryNavDestinationId;
  onSelect: (destinationId: PrimaryNavDestinationId) => void;
}) {
  return (
    <View style={styles.wrapper}>
      {destinations.map((destination) => {
        const active = destination.id === activeDestination;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={destination.label}
            accessibilityState={{ selected: active }}
            key={destination.id}
            onPress={() => onSelect(destination.id)}
            style={({ pressed }) => [
              styles.item,
              active && styles.itemActive,
              pressed && { backgroundColor: palette.surfaceMuted },
            ]}
          >
            <AppIcon
              name={destination.icon}
              color={active ? palette.primary : palette.textSoft}
              size={22}
              strokeWidth={active ? 2 : 1.7}
            />
            <Text style={[styles.label, active ? styles.labelActive : null]}>
              {destination.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSoft,
    paddingHorizontal: spacing.nav,
    paddingTop: 8,
    paddingBottom: 10,
  },
  item: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  itemActive: {
    backgroundColor: palette.primarySoft,
  },
  label: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "500",
  },
  labelActive: {
    color: palette.primaryHover,
    fontWeight: "600",
  },
});
