"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PUBLIC_NAV_LINKS } from "@/lib/public-navigation";
import CondusoftLogo from "@/components/brand/CondusoftLogo";

const mobileHighlights = ["Alumnos y matrículas", "Ingresos y cartera", "Gastos y flota"];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <>
      <nav
        className={cn(
          "fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-50 w-[min(1120px,calc(100%-0.75rem))] -translate-x-1/2 transition-all duration-300 sm:top-4 sm:w-[min(1120px,calc(100%-2rem))]"
        )}
      >
        <div
          className={cn(
            "apple-toolbar rounded-[24px] !bg-white px-3 py-3 sm:px-5 dark:!bg-slate-950",
            scrolled || menuOpen
              ? "shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
              : "shadow-[0_10px_26px_rgba(15,23,42,0.08)]"
          )}
        >
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <Link
              href="/"
              prefetch={false}
              className="z-50 flex items-center gap-3 transition-opacity hover:opacity-85"
            >
              <CondusoftLogo
                size="md"
                subtitle="Software para autoescuelas"
                subtitleClassName="hidden sm:block"
              />
            </Link>

            <div className="apple-panel-muted hidden items-center gap-2 rounded-full px-2 py-1 md:flex">
              {PUBLIC_NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="hover:text-blue-apple rounded-full px-3 py-2 text-[12px] font-medium tracking-[0.02em] text-[var(--gray-600)] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                prefetch={false}
                className="apple-button-ghost text-[12px] font-medium tracking-[0.02em]"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/registro"
                prefetch={false}
                className="apple-button-primary text-[12px] font-medium tracking-[0.02em]"
              >
                Crear cuenta
              </Link>
            </div>

            <div className="z-50 flex items-center gap-2 md:hidden">
              <Link
                href="/login"
                prefetch={false}
                className="apple-button-secondary inline-flex min-h-[38px] px-3.5 py-1.5 text-[12px] font-semibold shadow-sm"
              >
                Iniciar sesión
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="apple-icon-button h-10 w-10 shrink-0"
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuOpen}
                aria-controls="mobile-public-navigation"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id="mobile-public-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Navegación principal"
          className="apple-overlay fixed inset-0 z-40 px-3 pt-[calc(env(safe-area-inset-top)+5.15rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="mx-auto flex h-full max-w-md flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white p-4 shadow-[0_26px_60px_rgba(15,23,42,0.18)] sm:p-5 dark:border-white/10 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4">
              <p className="apple-kicker">ConduSoft para autoescuelas en Colombia</p>
              <p className="apple-copy mt-1 text-sm">
                Entra directo a funciones, implementación, FAQ y planes sin perder contexto del
                producto.
              </p>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {mobileHighlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--gray-600)]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="apple-divider mb-4" />

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {PUBLIC_NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-foreground rounded-[20px] border border-transparent px-4 py-3.5 text-base font-semibold transition-colors hover:border-[var(--surface-border)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="flex items-center justify-between gap-3">
                    {link.label}
                    <ArrowRight className="h-4 w-4 text-[var(--gray-500)]" />
                  </span>
                </a>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/login"
                prefetch={false}
                className="apple-button-secondary min-h-[48px] justify-center text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/registro"
                prefetch={false}
                className="apple-button-primary min-h-[48px] justify-center text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
