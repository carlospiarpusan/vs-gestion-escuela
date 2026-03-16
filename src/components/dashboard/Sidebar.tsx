/**
 * ============================================================
 * Componente Sidebar - Navegación lateral del dashboard
 * ============================================================
 *
 * Barra lateral con enlaces a los módulos del dashboard.
 * Los ítems se filtran según el rol del usuario autenticado.
 *
 * Comportamiento responsive:
 * - Desktop (lg+): siempre visible como sidebar estático
 * - Móvil (<lg): oculto por defecto, se muestra con animación
 *   al pulsar el botón hamburguesa del header
 *
 * Jerarquía de roles (de más a menos acceso):
 * super_admin > admin_escuela > admin_sede > secretaria > instructor > recepcion > alumno
 *
 * @prop rol     - Rol del usuario actual (determina qué ítems se muestran)
 * @prop open    - Si el sidebar está abierto en móvil
 * @prop onClose - Callback para cerrar el sidebar en móvil
 *
 * Dependencias: next/link, next/navigation, lucide-react, types/database
 * Usado por: dashboard/layout.tsx
 * ============================================================
 */

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Rol } from "@/types/database";
import {
  Home,
  Users,
  UserCheck,
  BookOpen,
  Car,
  Clock,
  FileText,
  DollarSign,
  TrendingDown,
  Building2,
  MapPin,
  UserCog,
  CalendarRange,
  BarChart3,
  X,
  PanelLeftClose,
  ChevronDown,
  Landmark,
  TrendingUp,
  ReceiptText,
  Wallet,
  Mail,
  GraduationCap,
} from "lucide-react";

// --- Tipos ---

interface SidebarProps {
  rol: Rol | undefined;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/** Definición de un ítem de navegación del sidebar */
interface NavItem {
  /** Texto visible del enlace */
  label: string;
  /** Ruta de destino */
  href: string;
  /** Icono de Lucide */
  icon: React.ReactNode;
  /** Roles que pueden ver este ítem */
  roles: Rol[];
}

/**
 * Lista de ítems de navegación del sidebar.
 * Cada ítem define qué roles tienen acceso a esa sección.
 * El orden aquí determina el orden en el menú.
 */
const navItems: NavItem[] = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: <Home size={18} />,
    roles: [
      "super_admin",
      "admin_escuela",
      "admin_sede",
      "administrativo",
      "instructor",
      "recepcion",
      "alumno",
    ],
  },
  {
    label: "Vehículos",
    href: "/dashboard/vehiculos",
    icon: <Car size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "instructor"],
  },
  {
    label: "Clases",
    href: "/dashboard/clases",
    icon: <Clock size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    label: "Horas",
    href: "/dashboard/horas",
    icon: <CalendarRange size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "instructor"],
  },
  {
    label: "Exámenes",
    href: "/dashboard/examenes",
    icon: <FileText size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "alumno"],
  },
  {
    label: "Ingresos",
    href: "/dashboard/ingresos",
    icon: <DollarSign size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    label: "Gastos",
    href: "/dashboard/gastos",
    icon: <TrendingDown size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    label: "Informes",
    href: "/dashboard/informes",
    icon: <BarChart3 size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    label: "Sedes",
    href: "/dashboard/sedes",
    icon: <MapPin size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede"],
  },
  {
    label: "Escuelas",
    href: "/dashboard/escuelas",
    icon: <Building2 size={18} />,
    roles: ["super_admin"],
  },
];

const userNavItems: NavItem[] = [
  {
    label: "Alumnos",
    href: "/dashboard/alumnos",
    icon: <Users size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "recepcion"],
  },
  {
    label: "Administrativos",
    href: "/dashboard/administrativos",
    icon: <UserCog size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede"],
  },
  {
    label: "Instructores",
    href: "/dashboard/instructores",
    icon: <UserCheck size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
];

const reportsNavItems = [
  {
    label: "Resumen contable",
    href: "/dashboard/informes?section=resumen",
    icon: <Landmark size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"] as Rol[],
    section: "resumen",
  },
  {
    label: "Analítica",
    href: "/dashboard/informes?section=analitica",
    icon: <TrendingUp size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"] as Rol[],
    section: "analitica",
  },
  {
    label: "Estudiantes",
    href: "/dashboard/informes?section=estudiantes",
    icon: <GraduationCap size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"] as Rol[],
    section: "estudiantes",
  },
];

const incomeNavItems: NavItem[] = [
  {
    label: "Libro contable",
    href: "/dashboard/ingresos",
    icon: <ReceiptText size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    label: "Cartera",
    href: "/dashboard/cartera",
    icon: <Landmark size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    label: "Caja diaria",
    href: "/dashboard/caja-diaria",
    icon: <Wallet size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
];

const expenseNavItems = [
  {
    label: "Libro de gastos",
    href: "/dashboard/gastos?section=libro",
    icon: <ReceiptText size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"] as Rol[],
    section: "libro",
  },
  {
    label: "Cuentas por pagar",
    href: "/dashboard/gastos?section=cuentas",
    icon: <Building2 size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"] as Rol[],
    section: "cuentas",
  },
  {
    label: "Tramitadores",
    href: "/dashboard/gastos?section=tramitadores",
    icon: <TrendingDown size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"] as Rol[],
    section: "tramitadores",
  },
  {
    label: "Automatización",
    href: "/dashboard/gastos?section=automatizacion",
    icon: <Mail size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"] as Rol[],
    section: "automatizacion",
  },
];

const examNavItems = [
  {
    label: "Analíticas",
    href: "/dashboard/examenes?section=analiticas",
    icon: <BarChart3 size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"] as Rol[],
    section: "analiticas",
  },
  {
    label: "Banco CALE",
    href: "/dashboard/examenes?section=banco",
    icon: <BookOpen size={16} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"] as Rol[],
    section: "banco",
  },
];

const SUPER_ADMIN_NAV_PATHS = new Set([
  "/dashboard",
  "/dashboard/escuelas",
  "/dashboard/sedes",
  "/dashboard/examenes",
  "/dashboard/informes",
]);

export default function Sidebar({ rol, open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [usersOpen, setUsersOpen] = useState(false);
  const [examsOpen, setExamsOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  // Filtrar ítems según el rol del usuario
  // Si no hay rol (cargando), no se muestra ningún ítem
  const filteredItems = navItems.filter((item) => {
    if (!rol || !item.roles.includes(rol)) return false;
    if (rol === "super_admin") return SUPER_ADMIN_NAV_PATHS.has(item.href);
    return true;
  });

  const visibleUserItems = userNavItems.filter((item) => {
    if (!rol || !item.roles.includes(rol)) return false;
    if (rol === "super_admin") return SUPER_ADMIN_NAV_PATHS.has(item.href);
    return true;
  });

  const visibleReportItems = reportsNavItems.filter((item) => {
    if (!rol || !item.roles.includes(rol)) return false;
    if (rol === "super_admin") return SUPER_ADMIN_NAV_PATHS.has("/dashboard/informes");
    return true;
  });

  const visibleExamItems = examNavItems.filter((item) => {
    if (!rol || !item.roles.includes(rol)) return false;
    if (rol === "super_admin") return SUPER_ADMIN_NAV_PATHS.has("/dashboard/examenes");
    return true;
  });

  const visibleIncomeItems = incomeNavItems.filter((item) => {
    if (!rol || !item.roles.includes(rol)) return false;
    if (rol === "super_admin") return SUPER_ADMIN_NAV_PATHS.has("/dashboard/ingresos");
    return true;
  });

  const visibleExpenseItems = expenseNavItems.filter((item) => {
    if (!rol || !item.roles.includes(rol)) return false;
    if (rol === "super_admin") return SUPER_ADMIN_NAV_PATHS.has("/dashboard/gastos");
    return true;
  });

  /**
   * Determinar si una ruta está activa.
   * /dashboard es un caso especial: solo es activo en match exacto.
   * Las demás rutas usan startsWith para incluir subrutas.
   */
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const usersSectionActive = visibleUserItems.some((item) => isActive(item.href));
  const usersExpanded = usersOpen || usersSectionActive;
  const examSection = searchParams.get("section") || "analiticas";
  const examsSectionActive = pathname.startsWith("/dashboard/examenes");
  const examsExpanded = examsOpen || examsSectionActive;
  const incomesSectionActive =
    pathname.startsWith("/dashboard/ingresos") ||
    pathname.startsWith("/dashboard/cartera") ||
    pathname.startsWith("/dashboard/caja-diaria");
  const incomesExpanded = incomeOpen || incomesSectionActive;
  const expenseSection = searchParams.get("section") || "panel";
  const expensesSectionActive = pathname.startsWith("/dashboard/gastos");
  const expensesExpanded = expenseOpen || expensesSectionActive;
  const reportSection = searchParams.get("section") || "resumen";
  const reportsSectionActive = pathname.startsWith("/dashboard/informes");
  const reportsExpanded = reportsOpen || reportsSectionActive;
  const leadingItems = filteredItems.slice(0, 1);
  const remainingItems = filteredItems.slice(1);

  const renderLink = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
          active
            ? "bg-[#0071e3] text-white shadow-[0_18px_34px_rgba(0,113,227,0.28)]"
            : "text-[#1d1d1f] hover:bg-white/70 dark:text-[#f5f5f7] dark:hover:bg-white/5"
        }`}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
            active
              ? "bg-white/16 text-white"
              : "bg-black/[0.04] text-[#6e6e73] group-hover:bg-black/[0.06] dark:bg-white/[0.04] dark:text-[#aeaeb2] dark:group-hover:bg-white/[0.08]"
          }`}
        >
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const renderSubmenuGroup = <T extends { href: string; icon: React.ReactNode; label: string }>(
    key: string,
    label: string,
    icon: React.ReactNode,
    active: boolean,
    expanded: boolean,
    onToggle: () => void,
    items: T[],
    isItemActive: (item: T) => boolean
  ) => (
    <div key={key} className="pt-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
          active
            ? "bg-[#0071e3] text-white shadow-[0_18px_34px_rgba(0,113,227,0.28)]"
            : "text-[#1d1d1f] hover:bg-white/70 dark:text-[#f5f5f7] dark:hover:bg-white/5"
        }`}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
            active
              ? "bg-white/16 text-white"
              : "bg-black/[0.04] text-[#6e6e73] group-hover:bg-black/[0.06] dark:bg-white/[0.04] dark:text-[#aeaeb2] dark:group-hover:bg-white/[0.08]"
          }`}
        >
          {icon}
        </span>
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-2 space-y-1 pl-4">
          {items.map((item) => {
            const itemActive = isItemActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={itemActive ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                  itemActive
                    ? "bg-[#0071e3]/12 text-[#0071e3] dark:bg-[#0071e3]/16 dark:text-[#69a9ff]"
                    : "text-[#1d1d1f] hover:bg-white/70 dark:text-[#f5f5f7] dark:hover:bg-white/5"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    itemActive
                      ? "bg-[#0071e3]/10 text-[#0071e3] dark:bg-[#0071e3]/20 dark:text-[#69a9ff]"
                      : "bg-black/[0.04] text-[#6e6e73] group-hover:bg-black/[0.06] dark:bg-white/[0.04] dark:text-[#aeaeb2] dark:group-hover:bg-white/[0.08]"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

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
        className={`fixed top-0 left-0 z-50 h-full w-[17rem] px-3 py-3 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:hidden" : "lg:static lg:z-auto lg:h-screen lg:w-[18rem] lg:translate-x-0 lg:px-4 lg:py-4"}`}
        aria-label="Menú de navegación"
      >
        <div className="apple-panel flex h-full flex-col overflow-hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <div>
              <p className="text-[0.7rem] font-semibold tracking-[0.24em] text-[#86868b] uppercase">
                Dashboard
              </p>
              <span className="text-lg font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                AutoEscuela<span className="gradient-text">Pro</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="apple-icon-button lg:hidden"
              aria-label="Cerrar menú"
            >
              <X size={16} />
            </button>
            <button
              onClick={onToggleCollapse}
              className="apple-icon-button hidden lg:flex"
              aria-label="Ocultar menú"
              title="Ocultar menú"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="apple-divider" />
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
            {leadingItems.map(renderLink)}

            {visibleUserItems.length > 0 &&
              renderSubmenuGroup(
                "users-group",
                "Usuarios",
                <Users size={18} />,
                usersSectionActive,
                usersExpanded,
                () => setUsersOpen((value) => !value),
                visibleUserItems,
                (item) => isActive(item.href)
              )}

            {remainingItems.map((item) => {
              if (item.href === "/dashboard/examenes" && rol !== "alumno") {
                if (visibleExamItems.length === 0) return null;
                return renderSubmenuGroup(
                  "exam-group",
                  "Exámenes",
                  <FileText size={18} />,
                  examsSectionActive,
                  examsExpanded,
                  () => setExamsOpen((value) => !value),
                  visibleExamItems,
                  (submenuItem) =>
                    pathname.startsWith("/dashboard/examenes") &&
                    examSection === submenuItem.section
                );
              }

              if (item.href === "/dashboard/ingresos") {
                if (visibleIncomeItems.length === 0) return null;
                return renderSubmenuGroup(
                  "income-group",
                  "Ingresos",
                  <DollarSign size={18} />,
                  incomesSectionActive,
                  incomesExpanded,
                  () => setIncomeOpen((value) => !value),
                  visibleIncomeItems,
                  (submenuItem) => isActive(submenuItem.href)
                );
              }

              if (item.href === "/dashboard/gastos") {
                if (visibleExpenseItems.length === 0) return null;
                return renderSubmenuGroup(
                  "expense-group",
                  "Gastos",
                  <TrendingDown size={18} />,
                  expensesSectionActive,
                  expensesExpanded,
                  () => setExpenseOpen((value) => !value),
                  visibleExpenseItems,
                  (submenuItem) =>
                    pathname.startsWith("/dashboard/gastos") &&
                    expenseSection === submenuItem.section
                );
              }

              if (item.href === "/dashboard/informes") {
                if (visibleReportItems.length === 0) return null;
                return renderSubmenuGroup(
                  "reports-group",
                  "Informes",
                  <BarChart3 size={18} />,
                  reportsSectionActive,
                  reportsExpanded,
                  () => setReportsOpen((value) => !value),
                  visibleReportItems,
                  (submenuItem) =>
                    pathname.startsWith("/dashboard/informes") &&
                    reportSection === submenuItem.section
                );
              }

              return renderLink(item);
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
