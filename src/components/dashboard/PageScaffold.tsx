import type { ReactNode } from "react";

type PageScaffoldProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
};

export default function PageScaffold({
  eyebrow,
  title,
  description,
  actions,
  aside,
  children,
}: PageScaffoldProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="apple-panel overflow-hidden px-4 py-4 sm:px-7 sm:py-6">
        <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            {eyebrow ? <p className="apple-kicker">{eyebrow}</p> : null}
            <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="apple-copy mt-3 max-w-3xl text-sm leading-7 sm:text-[15px]">
              {description}
            </p>
          </div>

          {(actions || aside) && (
            <div className="flex min-w-0 flex-col gap-3 xl:min-w-[280px] xl:items-end">
              {actions ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end [&>*]:w-full sm:[&>*]:w-auto">
                  {actions}
                </div>
              ) : null}
              {aside ? <div className="w-full xl:max-w-sm">{aside}</div> : null}
            </div>
          )}
        </div>
      </section>

      {children}
    </div>
  );
}
