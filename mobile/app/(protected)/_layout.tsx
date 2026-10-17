import { Redirect, Stack, usePathname } from "expo-router";
import { useApp } from "@/context/app-context";

export default function ProtectedLayout() {
  const pathname = usePathname();
  const { ready, session, subscriptionAccess } = useApp();

  if (!ready) return null;
  if (!session) return <Redirect href="/login" />;
  if (subscriptionAccess?.status === "suspended" && pathname !== "/(protected)/cuenta") {
    return <Redirect href="/(protected)/cuenta" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
