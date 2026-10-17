"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "prefetch">;

export default function DashboardNavLink({
  href,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: Props) {
  const [intentHref, setIntentHref] = useState<Props["href"] | null>(null);

  return (
    <Link
      {...props}
      href={href}
      prefetch={intentHref === href ? null : false}
      onMouseEnter={(event) => {
        setIntentHref(href);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setIntentHref(href);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setIntentHref(href);
        onTouchStart?.(event);
      }}
    />
  );
}
