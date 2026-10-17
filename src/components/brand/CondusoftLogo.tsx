import Image from "next/image";
import { cn } from "@/lib/utils";

type CondusoftMarkSvgProps = {
  className?: string;
  title?: string;
};

type CondusoftLogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  title?: string;
};

const markSizeMap = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

const wordSizeMap = {
  sm: "text-[1rem]",
  md: "text-[1.08rem]",
  lg: "text-[1.34rem]",
} as const;

const subtitleSizeMap = {
  sm: "text-[0.6rem]",
  md: "text-[0.66rem]",
  lg: "text-[0.72rem]",
} as const;

export function CondusoftMarkSvg({ className, title }: CondusoftMarkSvgProps) {
  return (
    <Image
      src="/brand/condusoft-mark.svg"
      alt={title ?? ""}
      width={64}
      height={64}
      className={className}
      aria-hidden={title ? undefined : true}
      priority={false}
    />
  );
}

export default function CondusoftLogo({
  className,
  markClassName,
  wordmarkClassName,
  subtitle,
  subtitleClassName,
  iconOnly = false,
  size = "md",
  title = "ConduSoft",
}: CondusoftLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <CondusoftMarkSvg
        className={cn("shrink-0", markSizeMap[size], markClassName)}
        title={iconOnly ? title : undefined}
      />

      {iconOnly ? null : (
        <span className="min-w-0">
          <span
            className={cn(
              "block leading-none font-semibold tracking-[-0.05em]",
              wordSizeMap[size],
              wordmarkClassName
            )}
          >
            <span className="text-[#111111] dark:text-white">Condu</span>
            <span className="text-[#0071e3] dark:text-[#60a5fa]">Soft</span>
          </span>
          {subtitle ? (
            <span
              className={cn(
                "mt-1 block font-semibold tracking-[0.18em] text-[var(--gray-500)] uppercase",
                subtitleSizeMap[size],
                subtitleClassName
              )}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}
