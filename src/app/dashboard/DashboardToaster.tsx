"use client";

import { Toaster } from "sonner";
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";

export default function DashboardToaster() {
  const isMobile = useIsMobileVariant();

  return <Toaster position={isMobile ? "top-center" : "top-right"} richColors />;
}
