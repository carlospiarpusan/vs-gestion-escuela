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
import { usePathname } from "next/navigation";
import type { Rol } from "@/types/database";
import {
  Home,
  Users,
  UserCheck,
  Car,
  Clock,
  FileText,
  DollarSign,
  TrendingDown,
  Building2,
  MapPin,
  UserCog,
  CalendarRange,
  X,
  PanelLeftClose,
  PanelLeftOpen,
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
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "instructor", "recepcion", "alumno"],
  },
  {
    label: "Alumnos",
    href: "/dashboard/alumnos",
    icon: <Users size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo", "recepcion"],
  },
  {
    label: "Administrativos",
    href: "/dashboard/administrativos",
    icon: <UserCog size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede"],
  },
  {
    label: "Instructores",
    href: "/dashboard/instructores",
    icon: <UserCheck size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
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
    roles: ["super_admin", "admin_escuela", "admin_sede"],
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

export default function Sidebar({ rol, open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  // Filtrar ítems según el rol del usuario
  // Si no hay rol (cargando), no se muestra ningún ítem
  const filteredItems = navItems.filter(
    (item) => rol && item.roles.includes(rol)
  );

  /**
   * Determinar si una ruta está activa.
   * /dashboard es un caso especial: solo es activo en match exacto.
   * Las demás rutas usan startsWith para incluir subrutas.
   */
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
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
        className={`fixed top-0 left-0 z-50 h-full w-[17rem] px-3 py-3 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:hidden" : "lg:static lg:z-auto lg:h-screen lg:w-[18rem] lg:translate-x-0 lg:px-4 lg:py-4"}`}
        aria-label="Menú de navegación"
      >
        <div className="apple-panel flex h-full flex-col overflow-hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#86868b]">Dashboard</p>
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
            {filteredItems.map((item) => {
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
                      : "text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-white/70 dark:hover:bg-white/5"
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
            })}
          </nav>

        </div>
      </aside>
    </>
  );
}
