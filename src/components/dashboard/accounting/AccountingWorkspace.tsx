"use client";

import type { ReactNode } from "react";

type WorkspaceHeaderProps = {
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
};

type SectionTabsProps<T extends string> = {
  value: T;
  items: Array<{ id: T; label: string; description?: string }>;
  onChange: (value: T) => void;
};

type StatCardProps = {
  eyebrow?: string;
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  icon?: ReactNode;
};

type PanelProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

type MiniListProps = {
  title: string;
  description?: string;
  emptyLabel: string;
  items: Array<{ label: string; value: string; meta?: string }>;
};

const statToneMap = {
  default: "bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#111214] dark:text-[#f5f5f7]",
  primary: "bg-[#0071e3]/10 text-[#0071e3] dark:bg-[#0071e3]/15 dark:text-[#69a9ff]",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
} as const;

export function AccountingWorkspaceHeader({ title, description, badge, actions }: WorkspaceHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        {badge ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">{badge}</p>
        ) : null}
        <h2 className="mt-1 text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-[#86868b]">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AccountingSectionTabs<T extends string>({ value, items, onChange }: SectionTabsProps<T>) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
              active
                ? "border-[#0071e3]/30 bg-[#0071e3]/8 text-[#0b63c7] dark:border-[#0071e3]/40 dark:bg-[#0071e3]/12 dark:text-[#69a9ff]"
                : "border-gray-100 bg-white text-[#1d1d1f] hover:border-gray-200 dark:border-gray-800 dark:bg-[#1d1d1f] dark:text-[#f5f5f7] dark:hover:border-gray-700"
            }`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            {item.description ? <p className="mt-1 text-xs text-[#86868b]">{item.description}</p> : null}
          </button>
        );
      })}
    </div>
  );
}

export function AccountingChipTabs<T extends string>({
  value,
  items,
  onChange,
}: SectionTabsProps<T>) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-[#0071e3] text-white"
                : "border border-gray-200 bg-white text-[#4a4a4f] hover:border-gray-300 dark:border-gray-700 dark:bg-[#1d1d1f] dark:text-[#c7c7cc] dark:hover:border-gray-600"
            }`}
            title={item.description}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function AccountingStatCard({
  eyebrow,
  label,
  value,
  detail,
  tone = "default",
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-[#1d1d1f]">
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">{eyebrow}</p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{label}</p>
        </div>
        {icon ? (
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${statToneMap[tone]}`}>
            {icon}
          </div>
        ) : null}
      </div>
      <p className="mt-5 text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{value}</p>
      {detail ? <p className="mt-2 text-sm text-[#86868b]">{detail}</p> : null}
    </div>
  );
}

export function AccountingPanel({ title, description, actions, children }: PanelProps) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-[#1d1d1f]">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{title}</h3>
          {description ? <p className="mt-1 text-sm text-[#86868b]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AccountingMiniList({ title, description, emptyLabel, items }: MiniListProps) {
  return (
    <AccountingPanel title={title} description={description}>
      {items.length === 0 ? (
        <p className="text-sm text-[#86868b]">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={`${title}-${item.label}-${item.value}`}
              className="rounded-2xl bg-[#f7f9fc] px-4 py-3 dark:bg-[#111214]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{item.label}</p>
                  {item.meta ? <p className="mt-1 text-xs text-[#86868b]">{item.meta}</p> : null}
                </div>
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountingPanel>
  );
}
