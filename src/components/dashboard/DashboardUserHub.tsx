"use client";

import Link from "next/link";
import { LogOut, Moon, Sun, UserCircle2 } from "lucide-react";

type DashboardUserHubProps = {
  name: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void | Promise<void>;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export default function DashboardUserHub({
  name,
  darkMode,
  onToggleTheme,
  onLogout,
}: DashboardUserHubProps) {
  return (
    <div className="px-3 pb-3">
      <div className="apple-panel-muted flex items-center justify-between gap-3 rounded-[22px] px-3 py-2.5">
        <div title={name} className="apple-brand-mark flex h-10 w-10 shrink-0 text-sm font-semibold">
          {getInitials(name) || "U"}
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard/mi-cuenta"
            className="apple-icon-button flex h-9 w-9 items-center justify-center"
            title="Mi cuenta"
            aria-label="Mi cuenta"
          >
            <UserCircle2 size={16} />
          </Link>
          <button
            type="button"
            onClick={onToggleTheme}
            className="apple-icon-button flex h-9 w-9 items-center justify-center"
            title={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
            aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="apple-icon-button flex h-9 w-9 items-center justify-center text-red-600 dark:text-red-300"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
