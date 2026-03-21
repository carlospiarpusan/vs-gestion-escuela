import type { ReactNode } from "react";

type SectionIntroProps = {
  badge: string;
  title: string;
  description: string;
  align?: "left" | "center";
  aside?: ReactNode;
};

export default function SectionIntro({
  badge,
  title,
  description,
  align = "left",
  aside,
}: SectionIntroProps) {
  const centered = align === "center";

  return (
    <div
      className={`mb-12 grid gap-6 ${
        aside ? "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end" : ""
      }`}
    >
      <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
        <span className="apple-badge">{badge}</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {title}
        </h2>
        <p className="apple-copy mt-5 text-base leading-7 sm:text-lg">
          {description}
        </p>
      </div>
      {aside ? <div className={centered ? "mx-auto" : ""}>{aside}</div> : null}
    </div>
  );
}
