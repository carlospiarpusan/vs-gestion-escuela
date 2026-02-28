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
  Calendar,
  Clock,
  FileText,
  DollarSign,
  TrendingDown,
  Building2,
  MapPin,
  UserCog,
  CalendarRange,
  X,
} from "lucide-react";

// --- Tipos ---

interface SidebarProps {
  rol: Rol | undefined;
  open: boolean;
  onClose: () => void;
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
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
  },
  {
    label: "Categorías",
    href: "/dashboard/categorias",
    icon: <Calendar size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "administrativo"],
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

export default function Sidebar({ rol, open, onClose }: SidebarProps) {
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
      {/* ========== Overlay oscuro en móvil ========== */}
      {/* Se muestra detrás del sidebar cuando está abierto en pantallas pequeñas */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ========== Sidebar ========== */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-white dark:bg-[#1d1d1f] border-r border-gray-200/50 dark:border-gray-800/50 z-50 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${open ? "translate-x-0" : "-translate-x-full"
          }`}
        aria-label="Menú de navegación"
      >
        {/* --- Header: Logo + botón cerrar (móvil) --- */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200/50 dark:border-gray-800/50">
          <span className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            AutoEscuela<span className="gradient-text">Pro</span>
          </span>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Cerrar menú"
          >
            <X size={16} className="text-[#86868b]" />
          </button>
        </div>

        {/* --- Lista de navegación --- */}
        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100%-3rem)]">
          {filteredItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive(item.href)
                ? "bg-[#0071e3] text-white"
                : "text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
