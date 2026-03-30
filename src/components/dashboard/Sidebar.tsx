"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Rol } from "@/types/database";
import { PanelLeftClose } from "lucide-react";
import { findDashboardModuleByPath, getDashboardNavigationForRole } from "@/lib/dashboard-nav";
import { renderDashboardIcon } from "@/components/dashboard/dashboard-icons";

interface SidebarProps {
  rol: Rol | undefined;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  scopeControl?: ReactNode | ((options: { compact: boolean }) => ReactNode);
  footer?: ReactNode | ((options: { compact: boolean }) => ReactNode);
}

export default function Sidebar({
  rol,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  scopeControl,
  footer,
}: SidebarProps) {
  const pathname = usePathname();
  const navigation = getDashboardNavigationForRole(rol);
  const activeModule = findDashboardModuleByPath(pathname);
  const collapsedDesktop = collapsed && !open;
  const scopeControlContent =
    typeof scopeControl === "function" ? scopeControl({ compact: collapsedDesktop }) : scopeControl;
  const footerContent =
    typeof footer === "function" ? footer({ compact: collapsedDesktop }) : footer;

  const renderModuleLink = (
    module: (typeof navigation)[number]["modules"][number],
    compact = false
  ) => {
    const active = activeModule?.id === module.id;

    return (
      <Link
        key={module.id}
        href={module.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        title={compact ? module.label : undefined}
        className={`group flex items-center gap-3 rounded-2xl transition-all ${
          compact ? "justify-center px-2 py-3" : "px-4 py-3.5 sm:py-3"
        } ${
          active
            ? "bg-[linear-gradient(135deg,var(--brand-600),var(--brand-500))] text-white shadow-[0_18px_34px_rgba(37,99,235,0.22)]"
            : "text-[var(--gray-800)] hover:bg-[var(--surface-muted)] dark:text-[var(--gray-800)] dark:hover:bg-white/[0.06]"
        }`}
      >
        <span
          className={`flex items-center justify-center rounded-full transition-all ${
            compact ? "h-10 w-10" : "h-10 w-10"
          } ${
            active
              ? "bg-white/14 text-white"
              : "bg-[var(--surface-muted)] text-[var(--gray-600)] group-hover:bg-[var(--surface-soft)] dark:bg-white/[0.04] dark:text-[var(--gray-600)] dark:group-hover:bg-white/[0.08]"
          }`}
        >
          {renderDashboardIcon(module.icon, compact ? 17 : 18)}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{module.label}</span>
            <span
              className={`mt-0.5 block truncate text-[11px] ${
                active ? "text-white/78" : "text-[var(--gray-500)]"
              }`}
            >
              {module.description}
            </span>
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {open && (
        <div
          className="apple-overlay fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${
          collapsedDesktop
            ? "lg:static lg:z-auto lg:h-screen lg:w-[6rem] lg:translate-x-0 lg:px-3 lg:py-4"
            : "w-[min(21rem,calc(100vw-0.5rem))] px-2 py-[max(0.6rem,env(safe-area-inset-top))] pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:h-screen lg:w-[21rem] lg:translate-x-0 lg:px-4 lg:py-4"
        }`}
        aria-label="Menú de navegación"
      >
        <div className="apple-panel flex h-full flex-col overflow-hidden rounded-[28px] lg:rounded-[22px]">
          <div
            className={`flex items-center justify-between ${collapsedDesktop ? "px-3 py-4" : "px-4 py-4 sm:px-5"}`}
          >
            {collapsedDesktop ? (
              <span className="apple-brand-mark mx-auto flex h-10 w-10 items-center justify-center text-sm font-semibold">
                A
              </span>
            ) : (
              <div>
                <p className="apple-kicker">Condusoft</p>
                <span className="text-foreground text-lg font-semibold tracking-tight">
                  Operación ordenada
                </span>
              </div>
            )}

            <button
              onClick={onToggleCollapse}
              className="apple-icon-button hidden lg:flex"
              aria-label={collapsedDesktop ? "Expandir menú" : "Ocultar menú"}
              title={collapsedDesktop ? "Expandir menú" : "Ocultar menú"}
            >
              <PanelLeftClose size={16} className={collapsedDesktop ? "rotate-180" : ""} />
            </button>
          </div>

          <div className={`px-4 ${collapsedDesktop ? "pb-2" : "pb-3"}`}>
            <div className="apple-divider" />
          </div>

          {scopeControlContent ? <div>{scopeControlContent}</div> : null}

          <nav
            className={`flex-1 overflow-y-auto overscroll-contain ${collapsedDesktop ? "space-y-4 px-2 py-2" : "space-y-5 px-3 pb-5"}`}
          >
            {navigation.map((area) => (
              <section key={area.id}>
                {!collapsedDesktop && area.id !== "overview" ? (
                  <div className="mb-2 px-2">
                    <p className="apple-kicker">{area.label}</p>
                    <p className="apple-copy mt-1 text-xs leading-5">{area.description}</p>
                  </div>
                ) : null}

                <div className={collapsedDesktop ? "space-y-2" : "space-y-2"}>
                  {area.modules.map((module) => renderModuleLink(module, collapsedDesktop))}
                </div>
              </section>
            ))}
          </nav>

          {footerContent ? (
            <div className="border-t border-[var(--surface-border)] pt-3">{footerContent}</div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
