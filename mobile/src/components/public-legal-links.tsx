import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { palette } from "@/lib/theme";

const legalLinks = [
  { label: "Política de privacidad", url: "https://condusoft.co/privacidad" },
  { label: "Términos y condiciones", url: "https://condusoft.co/terminos" },
];

const accountDeletionLink = {
  label: "Eliminar cuenta y datos",
  url: "https://condusoft.co/eliminar-cuenta",
};

export function PublicLegalLinks({
  includeAccountDeletion = false,
}: {
  includeAccountDeletion?: boolean;
}) {
  const [error, setError] = useState("");
  const links = includeAccountDeletion ? [...legalLinks, accountDeletionLink] : legalLinks;

  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16 }}>
        {links.map(({ label, url }) => (
          <Pressable
            key={url}
            accessibilityRole="link"
            accessibilityLabel={label}
            accessibilityHint="Se abre en el navegador."
            hitSlop={4}
            style={{ minHeight: 48, justifyContent: "center" }}
            onPress={async () => {
              setError("");
              try {
                await Linking.openURL(url);
              } catch {
                setError(
                  `No se pudo abrir el enlace. Intenta de nuevo o visita ${url} en tu navegador.`
                );
              }
            }}
          >
            <Text
              style={{ color: palette.textMuted, fontSize: 12, textDecorationLine: "underline" }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ color: palette.danger }}
        >
          {error}
        </Text>
      ) : null}
    </>
  );
}
