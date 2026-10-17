import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text } from "react-native";
import { AppScreen, Field, Panel, PrimaryButton, SecondaryButton } from "@/components/primitives";
import { PublicLegalLinks } from "@/components/public-legal-links";
import { registerSchoolAccount } from "@/lib/data";
import { palette } from "@/lib/theme";
import { useApp } from "@/context/app-context";

export default function RegisterScreen() {
  const { session, ready } = useApp();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [escuela, setEscuela] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (ready && session) {
    return <Redirect href="/(protected)/dashboard" />;
  }

  return (
    <AppScreen>
      <Panel title="Crear cuenta">
        <Field
          label="Nombre completo"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Tu nombre"
        />
        <Field
          label="Correo"
          value={email}
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
        />
        <Field
          label="Nombre de la autoescuela"
          value={escuela}
          onChangeText={setEscuela}
          placeholder="Mi Autoescuela"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Crear una contraseña"
          hint="Mínimo 8 caracteres, una mayúscula y un número."
          secureTextEntry
        />
        {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
        <PrimaryButton
          label={loading ? "Creando..." : "Crear cuenta"}
          disabled={loading}
          onPress={async () => {
            setLoading(true);
            setError("");
            try {
              await registerSchoolAccount({ nombre, email, escuela, password });
              router.replace("/login");
            } catch (nextError) {
              setError(
                nextError instanceof Error ? nextError.message : "No se pudo registrar la cuenta."
              );
            } finally {
              setLoading(false);
            }
          }}
        />
        <SecondaryButton label="Volver al inicio" onPress={() => router.replace("/")} />
        <PublicLegalLinks />
      </Panel>
    </AppScreen>
  );
}
