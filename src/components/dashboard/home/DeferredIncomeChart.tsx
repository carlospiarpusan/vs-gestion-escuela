"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { AdminDashboardDailyIngresoPoint } from "@/lib/dashboard-admin-summary";

function ChartPlaceholder() {
  return <div className="h-full w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />;
}

const DashboardIncomeChart = dynamic(() => import("./DashboardIncomeChart"), {
  ssr: false,
  loading: ChartPlaceholder,
});

export default function DeferredIncomeChart({ data }: { data: AdminDashboardDailyIngresoPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialDimension, setInitialDimension] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const showChart = () => {
      const { width, height } = container.getBoundingClientRect();
      setInitialDimension({ width, height });
    };
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(showChart);
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          showChart();
          observer.disconnect();
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full" aria-label="Ingresos diarios del mes">
      {initialDimension ? (
        <DashboardIncomeChart data={data} initialDimension={initialDimension} />
      ) : (
        <ChartPlaceholder />
      )}
    </div>
  );
}
