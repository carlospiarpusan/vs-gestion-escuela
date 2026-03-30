import type { ReactNode } from "react";

type SummaryItem = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
};

type SummaryRowProps = {
  items: SummaryItem[];
  columns?: "auto" | 2 | 3 | 4 | 5;
};

const toneStyles: Record<NonNullable<SummaryItem["tone"]>, string> = {
  default: "apple-tone-default",
  primary: "apple-tone-primary",
  success: "apple-tone-success",
  warning: "apple-tone-warning",
  danger: "apple-tone-danger",
};

function getGridClass(columns: SummaryRowProps["columns"]) {
  if (columns === 2) return "md:grid-cols-2";
  if (columns === 3) return "md:grid-cols-2 xl:grid-cols-3";
  if (columns === 4) return "md:grid-cols-2 xl:grid-cols-4";
  if (columns === 5) return "md:grid-cols-2 xl:grid-cols-5";
  return "md:grid-cols-2 xl:grid-cols-4";
}

export default function SummaryRow({ items, columns = "auto" }: SummaryRowProps) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${getGridClass(columns)}`}>
      {items.map((item) => (
        <article key={item.id} className="apple-panel-muted rounded-[24px] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="apple-kicker">{item.label}</p>
              <p className="text-foreground mt-3 truncate text-2xl font-semibold tracking-tight">
                {item.value}
              </p>
            </div>
            {item.icon ? (
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  toneStyles[item.tone ?? "default"]
                }`}
              >
                {item.icon}
              </div>
            ) : null}
          </div>
          {item.detail ? <p className="apple-copy mt-3 text-sm leading-6">{item.detail}</p> : null}
        </article>
      ))}
    </div>
  );
}
