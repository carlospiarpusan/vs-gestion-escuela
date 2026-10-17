import { useState, type PropsWithChildren, type ReactNode } from "react";
import {
  type PressableProps,
  type TextInputProps,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, spacing, typography } from "@/lib/theme";

export function AppScreen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView>
  ) : (
    <View style={styles.scrollContent}>{children}</View>
  );

  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

export function Panel({
  children,
  title,
  subtitle,
  trailing,
}: PropsWithChildren<{
  title?: string;
  subtitle?: string;
  trailing?: ReactNode;
}>) {
  return (
    <View style={styles.panel}>
      {(title || subtitle || trailing) && (
        <View style={styles.panelHeader}>
          <View style={styles.panelHeading}>
            {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
            {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
          </View>
          {trailing}
        </View>
      )}
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  disabled,
  style,
  ...pressableProps
}: PressableProps & {
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      {...pressableProps}
      style={(state) => [
        styles.primaryButton,
        state.pressed && styles.pressedPrimary,
        disabled && styles.disabledButton,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  disabled,
  style,
  ...pressableProps
}: PressableProps & {
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      {...pressableProps}
      style={(state) => [
        styles.secondaryButton,
        state.pressed && styles.pressedSecondary,
        disabled && styles.disabledButton,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Text style={styles.secondaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  secureTextEntry,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  trailing,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric";
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  autoComplete?: TextInputProps["autoComplete"];
  trailing?: ReactNode;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          underlineColorAndroid="transparent"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            focused && styles.inputFocused,
            multiline ? styles.multilineInput : null,
            trailing ? styles.inputWithTrailing : null,
          ]}
        />
        {trailing ? <View style={styles.inputTrailing}>{trailing}</View> : null}
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Tag({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneStyle =
    tone === "success"
      ? styles.tagSuccess
      : tone === "warning"
        ? styles.tagWarning
        : tone === "danger"
          ? styles.tagDanger
          : styles.tagDefault;

  return (
    <View style={[styles.tag, toneStyle]}>
      <Text style={styles.tagLabel}>{label}</Text>
    </View>
  );
}

export function StatGrid({
  items,
}: {
  items: Array<{
    id: string;
    label: string;
    value: string;
    tone?: "default" | "success" | "warning" | "danger";
  }>;
}) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.statGrid}>
      {items.map((item) => (
        <View
          key={item.id}
          style={[styles.statCard, width < 480 && item.value.length > 7 && { flexBasis: "100%" }]}
        >
          <Text style={styles.statLabel}>{item.label}</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={[
              styles.statValue,
              item.value.length > 12 && { fontSize: 22 },
              item.tone === "success"
                ? styles.statValueSuccess
                : item.tone === "warning"
                  ? styles.statValueWarning
                  : item.tone === "danger"
                    ? styles.statValueDanger
                    : null,
            ]}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    flexGrow: 1,
    padding: spacing.page,
    gap: spacing.section,
  },
  panel: {
    paddingBottom: spacing.card,
    gap: 16,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  panelHeading: {
    flex: 1,
    gap: 4,
  },
  panelTitle: {
    ...typography.section,
    color: palette.text,
  },
  panelSubtitle: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: 8,
    minHeight: 48,
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 8,
    minHeight: 48,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "600",
  },
  pressedPrimary: { backgroundColor: palette.primaryHover },
  pressedSecondary: { backgroundColor: palette.surfaceMuted },
  disabledButton: {
    opacity: 0.5,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    ...typography.label,
    color: palette.text,
  },
  fieldHint: { ...typography.label, color: palette.textMuted },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    color: palette.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 48,
  },
  inputFocused: { borderColor: palette.primary },
  inputContainer: {
    position: "relative",
  },
  inputWithTrailing: {
    paddingRight: 56,
    minHeight: 48,
  },
  inputTrailing: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagDefault: {
    backgroundColor: palette.surfaceStrong,
  },
  tagSuccess: {
    backgroundColor: palette.successSoft,
  },
  tagWarning: {
    backgroundColor: palette.warningSoft,
  },
  tagDanger: {
    backgroundColor: palette.dangerSoft,
  },
  tagLabel: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "500",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "45%",
    minWidth: 0,
    flexGrow: 1,
    borderRadius: 8,
    backgroundColor: palette.surfaceMuted,
    padding: 16,
    gap: 10,
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  statValue: {
    color: palette.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
  },
  statValueSuccess: {
    color: palette.success,
  },
  statValueWarning: {
    color: palette.warning,
  },
  statValueDanger: {
    color: palette.danger,
  },
  emptyState: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 16,
    gap: 6,
  },
  emptyStateTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyStateDescription: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
