"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 glass ${
        scrolled
          ? "bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-gray-800/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[980px] mx-auto px-6">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]"
          >
            AutoEscuela<span className="gradient-text">Pro</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-xs text-[#1d1d1f]/80 dark:text-[#f5f5f7]/80 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
            >
              Características
            </a>
            <a
              href="#how-it-works"
              className="text-xs text-[#1d1d1f]/80 dark:text-[#f5f5f7]/80 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
            >
              Cómo funciona
            </a>
            <a
              href="#pricing"
              className="text-xs text-[#1d1d1f]/80 dark:text-[#f5f5f7]/80 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
            >
              Precios
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs text-[#0071e3] hover:underline transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/registro"
              className="text-xs bg-[#0071e3] text-white px-4 py-1.5 rounded-full hover:bg-[#0077ED] transition-colors"
            >
              Registro
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-[#1d1d1f] dark:text-[#f5f5f7]"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200/50 dark:border-gray-800/50 animate-fade-in">
            <div className="flex flex-col gap-4">
              <a
                href="#features"
                className="text-sm text-[#1d1d1f]/80 dark:text-[#f5f5f7]/80"
                onClick={() => setMenuOpen(false)}
              >
                Características
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-[#1d1d1f]/80 dark:text-[#f5f5f7]/80"
                onClick={() => setMenuOpen(false)}
              >
                Cómo funciona
              </a>
              <a
                href="#pricing"
                className="text-sm text-[#1d1d1f]/80 dark:text-[#f5f5f7]/80"
                onClick={() => setMenuOpen(false)}
              >
                Precios
              </a>
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-200/20 dark:border-gray-800/20">
                <Link
                  href="/login"
                  className="text-sm text-[#0071e3]"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/registro"
                  className="text-sm bg-[#0071e3] text-white px-4 py-2 rounded-full text-center hover:bg-[#0077ED] transition-colors"
                >
                  Registro
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
