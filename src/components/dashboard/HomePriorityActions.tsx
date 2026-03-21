"use client";

import Link from "next/link";
import type { Rol } from "@/types/database";
import {
  type DashboardIconKey,
  getDashboardHomePriorityModules,
  getDashboardArea,
} from "@/lib/dashboard-nav";
import { renderDashboardIcon } from "@/components/dashboard/dashboard-icons";

export type HomePriorityActionItem = {
  id: string;
  label: string;
  href: string;
  description: string;
  areaLabel: string;
  icon: DashboardIconKey;
};

type HomePriorityActionsProps = {
  rol?: Rol | null;
  title?: string;
  description?: string;
  items?: HomePriorityActionItem[];
};

export default function HomePriorityActions({
  rol,
  title = "Acciones prioritarias",
  description = "Accesos directos a los módulos que más pesan en la operación diaria.",
  items,
}: HomePriorityActionsProps) {
  const resolvedItems =
    items ??
    getDashboardHomePriorityModules(rol).map((module) => ({
      id: module.id,
      label: module.label,
      href: module.href,
      description: module.description,
      areaLabel: getDashboardArea(module.area)?.label ?? "Módulo",
      icon: module.icon,
    }));

  if (resolvedItems.length === 0) return null;

  return (
    <section className="apple-panel px-5 py-5 sm:px-6">
      <div className="mb-5">
        <h2 className="text-foreground text-lg font-semibold">{title}</h2>
        <p className="apple-copy mt-1 text-sm leading-6">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {resolvedItems.map((module) => {
          return (
            <Link
              key={module.id}
              href={module.href}
              className="apple-panel-muted group rounded-[22px] px-4 py-4 transition-all hover:border-[color:color-mix(in_srgb,var(--blue-apple)_25%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--blue-apple)_4%,var(--surface-soft))]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-[var(--gray-500)] uppercase">
                    {module.areaLabel}
                  </span>
                  <p className="text-foreground mt-3 text-base font-semibold">{module.label}</p>
                </div>
                <div className="apple-tone-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                  {renderDashboardIcon(module.icon, 18)}
                </div>
              </div>
              <p className="apple-copy mt-3 text-sm leading-6">{module.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
