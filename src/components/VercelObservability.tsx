"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  filterVercelEvent,
  isPublicAnalyticsPath,
  isPerformanceInsightsPath,
} from "@/lib/vercel-observability";

export default function VercelObservability() {
  const pathname = usePathname();
  return (
    <>
      {isPublicAnalyticsPath(pathname) ? (
        <Analytics beforeSend={(event) => filterVercelEvent(event, "analytics")} />
      ) : null}
      {isPerformanceInsightsPath(pathname) ? (
        <SpeedInsights sampleRate={0.1} beforeSend={(event) => filterVercelEvent(event, "speed")} />
      ) : null}
    </>
  );
}
