import type { ReactNode } from "react";

type FilterPanelProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function FilterPanel({
  title,
  description,
  actions,
  children,
}: FilterPanelProps) {
  return (
    <section className="apple-panel-muted rounded-[24px] px-5 py-5 sm:px-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="apple-copy mt-1 text-sm leading-6">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}
