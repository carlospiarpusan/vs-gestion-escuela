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
  default: "apple-tone-default",
  primary: "apple-tone-primary",
  success: "apple-tone-success",
  warning: "apple-tone-warning",
  danger: "apple-tone-danger",
} as const;

export function AccountingWorkspaceHeader({ title, description, badge, actions }: WorkspaceHeaderProps) {
  return (
    <section className="apple-panel mb-6 px-5 py-5 sm:px-7 sm:py-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          {badge ? (
            <p className="apple-kicker">{badge}</p>
          ) : null}
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            {title}
          </h2>
          <p className="apple-copy mt-3 max-w-3xl text-sm leading-7">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2 xl:justify-end">{actions}</div> : null}
      </div>
    </section>
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
            className={`rounded-[22px] border px-4 py-3 text-left transition-colors ${
              active
                ? "border-[color:color-mix(in_srgb,var(--blue-apple)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--blue-apple)_8%,var(--surface-strong))] text-[var(--brand-600)] shadow-[0_16px_30px_rgba(37,99,235,0.08)]"
                : "border-[var(--surface-border)] bg-[var(--surface-strong)] text-foreground hover:border-[var(--surface-border-strong)]"
            }`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            {item.description ? (
              <p className="apple-copy mt-1 text-xs leading-5">{item.description}</p>
            ) : null}
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
                ? "bg-[linear-gradient(135deg,var(--brand-600),var(--brand-500))] text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)]"
                : "border border-[var(--surface-border)] bg-[var(--surface-strong)] text-[var(--gray-600)] hover:border-[var(--surface-border-strong)]"
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
    <div className="apple-panel-muted rounded-[24px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="apple-kicker">{eyebrow}</p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
        </div>
        {icon ? (
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${statToneMap[tone]}`}>
            {icon}
          </div>
        ) : null}
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {detail ? <p className="apple-copy mt-2 text-sm leading-6">{detail}</p> : null}
    </div>
  );
}

export function AccountingPanel({ title, description, actions, children }: PanelProps) {
  return (
    <section className="apple-panel rounded-[24px] p-5">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="apple-copy mt-1 text-sm leading-6">{description}</p>
          ) : null}
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
        <p className="text-sm text-[var(--gray-500)]">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={`${title}-${item.label}-${item.value}`}
              className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                  {item.meta ? <p className="mt-1 text-xs text-[var(--gray-500)]">{item.meta}</p> : null}
                </div>
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountingPanel>
  );
}
