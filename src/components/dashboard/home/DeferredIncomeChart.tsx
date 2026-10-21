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
      if (width > 0 && height > 0) {
        setInitialDimension((current) =>
          current?.width === width && current?.height === height ? current : { width, height }
        );
      }
    };
    let resizeObserver: ResizeObserver | undefined;
    const startChart = () => {
      showChart();
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(showChart);
        resizeObserver.observe(container);
      } else {
        window.addEventListener("resize", showChart);
      }
    };
    const cleanup = () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", showChart);
    };
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(startChart);
      return () => {
        window.cancelAnimationFrame(frame);
        cleanup();
      };
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startChart();
          observer.disconnect();
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
      cleanup();
    };
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
