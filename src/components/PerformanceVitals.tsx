"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import {
  formatWebVitalValue,
  isMetricOverBudget,
  resolvePerformanceRouteGroup,
  type ReportableWebVital,
} from "@/lib/performance";

declare global {
  interface Window {
    __AUTOESCUELA_LAST_WEB_VITAL__?: {
      routeGroup: string;
      metric: ReportableWebVital;
      overBudget: boolean;
      budget: number | null;
    };
  }
}

export default function PerformanceVitals() {
  const pathname = usePathname();
  const routeGroup = resolvePerformanceRouteGroup(pathname);

  useEffect(() => {
    document.documentElement.dataset.routeGroup = routeGroup;
  }, [routeGroup]);

  useReportWebVitals((metric) => {
    const metricPayload: ReportableWebVital = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    };
    const evaluation = isMetricOverBudget(routeGroup, metricPayload);

    window.__AUTOESCUELA_LAST_WEB_VITAL__ = {
      routeGroup,
      metric: metricPayload,
      overBudget: evaluation.overBudget,
      budget: evaluation.budget,
    };

    window.dispatchEvent(
      new CustomEvent("autoescuela:web-vital", {
        detail: {
          routeGroup,
          metric: metricPayload,
          overBudget: evaluation.overBudget,
          budget: evaluation.budget,
        },
      })
    );

    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const budgetSuffix =
      evaluation.budget === null
        ? ""
        : ` | presupuesto ${metric.name === "CLS" ? evaluation.budget.toFixed(3) : `${evaluation.budget}ms`}`;

    const logger = evaluation.overBudget ? console.warn : console.info;
    logger(
      `[performance] ${routeGroup} ${metric.name}: ${formatWebVitalValue(metricPayload)}${budgetSuffix}`
    );
  });

  return null;
}
