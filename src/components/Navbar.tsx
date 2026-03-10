"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Características", href: "#features" },
    { name: "Cómo funciona", href: "#how-it-works" },
    { name: "Precios", href: "#pricing" },
  ];

  return (
    <>
      <nav
        className={cn(
          "fixed left-1/2 top-3 z-50 w-[min(1120px,calc(100%-1rem))] -translate-x-1/2 transition-all duration-300 sm:top-4 sm:w-[min(1120px,calc(100%-2rem))]",
          scrolled || menuOpen
            ? "opacity-100"
            : "opacity-95"
        )}
      >
        <div className={cn(
          "apple-toolbar rounded-[26px] px-4 py-3 sm:px-5",
          scrolled || menuOpen ? "shadow-[0_18px_40px_rgba(15,23,42,0.12)]" : "shadow-[0_10px_26px_rgba(15,23,42,0.08)]"
        )}>
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="z-50 flex items-center gap-3 transition-opacity hover:opacity-85"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0071e3] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,113,227,0.3)]">
                A
              </span>
              <span className="text-[16px] font-semibold tracking-tight text-foreground">
                AutoEscuela<span className="gradient-text">Pro</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[var(--surface-border)] bg-white/45 px-2 py-1 dark:bg-white/[0.03]">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="rounded-full px-3 py-2 text-[12px] font-medium tracking-[0.02em] text-foreground/72 transition-colors hover:text-blue-apple"
                >
                  {link.name}
                </a>
              ))}
            </div>

            {/* Auth Buttons — desktop */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="apple-button-ghost text-[12px] font-medium tracking-[0.02em]"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/registro"
                className="apple-button-primary text-[12px] font-medium tracking-[0.02em]"
              >
                Prueba gratis
              </Link>
            </div>

            {/* Mobile: login button + hamburger */}
            <div className="flex md:hidden items-center gap-3 z-50">
              <Link
                href="/login"
                className="apple-button-primary px-3.5 py-2 text-[12px] font-medium"
              >
                Iniciar Sesión
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="apple-icon-button"
              >
                <AnimatePresence mode="wait">
                  {menuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X size={18} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ opacity: 0, rotate: 90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu size={18} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="apple-overlay fixed inset-0 z-40 px-5 pt-24 md:hidden"
          >
            <div className="apple-panel mx-auto max-w-md p-5">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#86868b]">
                  Navegación
                </p>
                <p className="mt-1 text-sm text-[#6e6e73] dark:text-[#aeaeb2]">
                  Acceso rápido a la información principal del sitio.
                </p>
              </div>
              <div className="apple-divider mb-4" />
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="rounded-2xl px-4 py-3 text-lg font-semibold text-foreground transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/login"
                  className="apple-button-secondary justify-center text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/registro"
                  className="apple-button-primary justify-center text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Prueba gratis
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
