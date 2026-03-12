"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TableScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
  framed?: boolean;
}

export default function TableScrollArea({
  children,
  className,
  viewportClassName,
  framed = true,
}: TableScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const topSizerRef = useRef<HTMLDivElement>(null);
  const syncSourceRef = useRef<"top" | "viewport" | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const topScroll = topScrollRef.current;
    const topSizer = topSizerRef.current;

    if (!viewport || !topScroll || !topSizer) return;

    const updateState = () => {
      const scrollWidth = viewport.scrollWidth;
      const clientWidth = viewport.clientWidth;
      const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
      const overflow = maxScrollLeft > 1;
      const scrollLeft = viewport.scrollLeft;

      topSizer.style.width = `${scrollWidth}px`;
      setHasOverflow((prev) => (prev === overflow ? prev : overflow));
      setCanScrollLeft((prev) => {
        const next = overflow && scrollLeft > 0;
        return prev === next ? prev : next;
      });
      setCanScrollRight((prev) => {
        const next = overflow && scrollLeft < maxScrollLeft - 1;
        return prev === next ? prev : next;
      });

      if (!overflow) {
        if (topScroll.scrollLeft !== 0) topScroll.scrollLeft = 0;
        return;
      }

      if (Math.abs(topScroll.scrollLeft - scrollLeft) > 1) {
        topScroll.scrollLeft = scrollLeft;
      }
    };

    const syncFromViewport = () => {
      if (syncSourceRef.current === "top") {
        syncSourceRef.current = null;
        updateState();
        return;
      }

      syncSourceRef.current = "viewport";
      topScroll.scrollLeft = viewport.scrollLeft;
      syncSourceRef.current = null;
      updateState();
    };

    const syncFromTop = () => {
      if (syncSourceRef.current === "viewport") {
        syncSourceRef.current = null;
        return;
      }

      syncSourceRef.current = "top";
      viewport.scrollLeft = topScroll.scrollLeft;
      syncSourceRef.current = null;
      updateState();
    };

    const handleWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.shiftKey ? event.deltaY : 0;

      if (!delta || viewport.scrollWidth <= viewport.clientWidth + 1) return;

      event.preventDefault();
      viewport.scrollLeft += delta;
      updateState();
    };

    const resizeObserver = new ResizeObserver(() => {
      updateState();
    });

    const observeContent = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(viewport);

      const content = viewport.firstElementChild;
      if (content instanceof HTMLElement) {
        resizeObserver.observe(content);
      }

      updateState();
    };

    const mutationObserver = new MutationObserver(() => {
      observeContent();
    });

    observeContent();
    mutationObserver.observe(viewport, { childList: true });
    viewport.addEventListener("scroll", syncFromViewport, { passive: true });
    topScroll.addEventListener("scroll", syncFromTop, { passive: true });
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    topScroll.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", updateState);

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      viewport.removeEventListener("scroll", syncFromViewport);
      topScroll.removeEventListener("scroll", syncFromTop);
      viewport.removeEventListener("wheel", handleWheel);
      topScroll.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", updateState);
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={topScrollRef}
        className={cn(
          "table-scroll-sync hidden overflow-x-auto overflow-y-hidden rounded-full transition-all duration-200 lg:block",
          hasOverflow ? "mb-3 h-3 opacity-100" : "mb-0 h-0 border-transparent opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
      >
        <div ref={topSizerRef} className="h-px" />
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-[color:var(--surface-strong)] to-transparent transition-opacity duration-200 lg:block",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-10 bg-gradient-to-l from-[color:var(--surface-strong)] to-transparent transition-opacity duration-200 lg:block",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />

        <div
          ref={viewportRef}
          className={cn(
            "table-scroll-area overflow-x-auto overflow-y-hidden",
            framed && "apple-table-shell",
            viewportClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
