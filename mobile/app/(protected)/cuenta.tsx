import { useRef, useState } from "react";
import { router } from "expo-router";
import { Linking, Text } from "react-native";
import { AppScreen, Panel, SecondaryButton, Tag } from "@/components/primitives";
import { PublicLegalLinks } from "@/components/public-legal-links";
import { ROLE_LABELS } from "@/lib/modules";
import { palette, typography } from "@/lib/theme";
import { useApp } from "@/context/app-context";

export default function AccountScreen() {
  const { profile, subscriptionAccess, isOnline, pendingCount, syncing, signOut } = useApp();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const signOutInProgress = useRef(false);

  return (
    <AppScreen>
      <Panel title="Mi cuenta">
        <Text style={{ ...typography.title, color: palette.text }}>
          {profile?.nombre || "Sin perfil"}
        </Text>
        <Text style={{ color: palette.textMuted }}>{profile?.email}</Text>
        <Tag label={profile ? ROLE_LABELS[profile.rol] : "Sin rol"} />
        {subscriptionAccess && ["super_admin", "admin_escuela"].includes(profile?.rol ?? "") ? (
          <Tag
            label={`Suscripción: ${
              subscriptionAccess.status === "trialing"
                ? "Prueba"
                : subscriptionAccess.status === "pending_payment"
                  ? "Pago en validación"
                  : subscriptionAccess.status === "active"
                    ? "Activa"
                    : subscriptionAccess.status === "grace"
                      ? "En gracia"
                      : subscriptionAccess.status === "read_only"
                        ? "Solo lectura"
                        : "Suspendida"
            }`}
          />
        ) : null}
        <Text style={{ color: palette.textMuted }}>{isOnline ? "En línea" : "Sin conexión"}</Text>
        {pendingCount > 0 ? <Tag label={`${pendingCount} pendientes`} tone="warning" /> : null}
        {syncing ? <Tag label="Sincronizando" /> : null}
        <SecondaryButton
          label="Cambiar contraseña"
          onPress={async () => {
            try {
              await Linking.openURL("https://condusoft.co/dashboard/mi-cuenta");
            } catch {
              setSignOutError("No se pudo abrir ConduSoft web.");
            }
          }}
        />
        <SecondaryButton label="Volver" onPress={() => router.back()} />
        <SecondaryButton
          label={signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityState={{ disabled: signingOut, busy: signingOut }}
          onPress={async () => {
            if (signOutInProgress.current) return;
            signOutInProgress.current = true;
            setSigningOut(true);
            setSignOutError("");
            try {
              await signOut();
              router.replace("/login");
            } catch {
              setSignOutError("No se pudo cerrar la sesión. Intenta de nuevo.");
            } finally {
              signOutInProgress.current = false;
              setSigningOut(false);
            }
          }}
        />
        {signOutError ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ color: palette.danger }}
          >
            {signOutError}
          </Text>
        ) : null}
        <PublicLegalLinks includeAccountDeletion />
      </Panel>
    </AppScreen>
  );
}
