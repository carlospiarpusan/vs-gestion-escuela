import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { AppScreen, Field, Panel, PrimaryButton, SecondaryButton } from "@/components/primitives";
import { PublicLegalLinks } from "@/components/public-legal-links";
import { signInWithIdentifier } from "@/lib/data";
import { palette } from "@/lib/theme";
import { useApp } from "@/context/app-context";

export default function LoginScreen() {
  const { session, ready } = useApp();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (ready && session) {
    return <Redirect href="/(protected)/dashboard" />;
  }

  return (
    <AppScreen>
      <Text style={styles.brand}>
        Condu<Text style={styles.brandAccent}>Soft</Text>
      </Text>
      <Panel title="Iniciar sesión">
        <Field
          label="Correo o cédula"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="correo@escuela.com o 12345678"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Tu contraseña"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onPress={() => setShowPassword((visible) => !visible)}
              style={styles.visibilityButton}
            >
              {showPassword ? (
                <EyeOff size={20} color={palette.textMuted} />
              ) : (
                <Eye size={20} color={palette.textMuted} />
              )}
            </Pressable>
          }
        />
        {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
        <PrimaryButton
          label={loading ? "Entrando..." : "Entrar"}
          disabled={loading}
          onPress={async () => {
            setLoading(true);
            setError("");
            try {
              await signInWithIdentifier(identifier, password);
              router.replace("/(protected)/dashboard");
            } catch (nextError) {
              setError(
                nextError instanceof Error ? nextError.message : "No se pudo iniciar sesión."
              );
            } finally {
              setLoading(false);
            }
          }}
        />
        <SecondaryButton label="Crear cuenta" onPress={() => router.push("/registro")} />
        <PublicLegalLinks />
      </Panel>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 8,
    letterSpacing: 0,
  },
  brandAccent: { color: palette.primary },
  visibilityButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
