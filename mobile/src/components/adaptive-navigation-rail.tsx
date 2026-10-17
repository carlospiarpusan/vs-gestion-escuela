import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { palette, spacing } from "@/lib/theme";
import type { PrimaryNavDestination, PrimaryNavDestinationId } from "@/lib/types";

export function AdaptiveNavigationRail({
  destinations,
  activeDestination,
  onSelect,
}: {
  destinations: PrimaryNavDestination[];
  activeDestination: PrimaryNavDestinationId;
  onSelect: (destinationId: PrimaryNavDestinationId) => void;
}) {
  return (
    <View style={styles.rail}>
      {destinations.map((destination) => {
        const active = destination.id === activeDestination;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={destination.label}
            accessibilityState={{ selected: active }}
            key={destination.id}
            onPress={() => onSelect(destination.id)}
            style={[styles.item, active ? styles.itemActive : null]}
          >
            <AppIcon
              name={destination.icon}
              color={active ? palette.primary : palette.textSoft}
              size={20}
              strokeWidth={2.2}
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
  rail: {
    width: 132,
    borderRightWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSoft,
    padding: spacing.nav,
    gap: 8,
    alignSelf: "stretch",
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 8,
  },
  itemActive: {
    backgroundColor: palette.primarySoft,
  },
  label: {
    color: palette.textSoft,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  labelActive: {
    color: palette.primaryHover,
  },
});
