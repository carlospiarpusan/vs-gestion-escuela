import { Redirect, useLocalSearchParams } from "expo-router";
import { ModuleScreen } from "@/components/module-screen";
import { getModuleById, canUseMobileModule } from "@/lib/modules";
import { useApp } from "@/context/app-context";

export default function DashboardModuleRoute() {
  const params = useLocalSearchParams<{ module: string }>();
  const moduleConfig = getModuleById(params.module);
  const { profile } = useApp();

  if (
    !moduleConfig ||
    moduleConfig.id === "home" ||
    !canUseMobileModule(profile?.rol, moduleConfig.id)
  ) {
    return <Redirect href="/(protected)/dashboard" />;
  }

  return <ModuleScreen moduleId={moduleConfig.id} />;
}
