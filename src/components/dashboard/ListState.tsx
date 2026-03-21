import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";

type ListStateProps = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
  skeletonCount?: number;
  skeletonClassName?: string;
};

export default function ListState({
  loading = false,
  error,
  empty = false,
  emptyTitle = "Sin datos todavía",
  emptyDescription = "No hay información disponible para mostrar en este momento.",
  children,
  skeletonCount = 3,
  skeletonClassName = "h-16",
}: ListStateProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={index}
            className={`${skeletonClassName} animate-pulse rounded-[22px] bg-[var(--surface-muted)] dark:bg-[var(--surface-muted)]`}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50/80 px-5 py-5 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">No se pudo cargar esta sección</p>
            <p className="mt-1 text-sm leading-6">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--surface-border-strong)] bg-[var(--surface-soft)] px-5 py-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--gray-500)]">
          <Inbox size={18} />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">{emptyTitle}</p>
        <p className="apple-copy mt-1 text-sm leading-6">{emptyDescription}</p>
      </div>
    );
  }

  return <>{children}</>;
}
