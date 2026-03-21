"use client";

import Link from "next/link";
import type { Rol } from "@/types/database";
import {
  getDashboardHomePriorityModules,
  getDashboardArea,
} from "@/lib/dashboard-nav";
import { renderDashboardIcon } from "@/components/dashboard/dashboard-icons";

type HomePriorityActionsProps = {
  rol?: Rol | null;
  title?: string;
  description?: string;
};

export default function HomePriorityActions({
  rol,
  title = "Acciones prioritarias",
  description = "Accesos directos a los módulos que más pesan en la operación diaria.",
}: HomePriorityActionsProps) {
  const modules = getDashboardHomePriorityModules(rol);
  const items = modules.map((module) => ({
    id: module.id,
    label: module.label,
    href: module.href,
    description: module.description,
    areaLabel: getDashboardArea(module.area)?.label ?? "Módulo",
    icon: module.icon,
  }));

  if (items.length === 0) return null;

  return (
    <section className="apple-panel px-5 py-5 sm:px-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="apple-copy mt-1 text-sm leading-6">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((module) => {
          return (
            <Link
              key={module.id}
              href={module.href}
              className="apple-panel-muted group rounded-[22px] px-4 py-4 transition-all hover:border-[color:color-mix(in_srgb,var(--blue-apple)_25%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--blue-apple)_4%,var(--surface-soft))]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                    {module.areaLabel}
                  </span>
                  <p className="mt-3 text-base font-semibold text-foreground">{module.label}</p>
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
