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
  FileText,
  DollarSign,
  TrendingDown,
  Wrench,
  BookOpen,
  Building2,
  X,
} from "lucide-react";

interface SidebarProps {
  rol: Rol | undefined;
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Rol[];
}

const navItems: NavItem[] = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: <Home size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "secretaria", "instructor", "recepcion", "alumno"],
  },
  {
    label: "Alumnos",
    href: "/dashboard/alumnos",
    icon: <Users size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "secretaria", "recepcion"],
  },
  {
    label: "Instructores",
    href: "/dashboard/instructores",
    icon: <UserCheck size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "secretaria"],
  },
  {
    label: "Vehículos",
    href: "/dashboard/vehiculos",
    icon: <Car size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "secretaria"],
  },
  {
    label: "Clases",
    href: "/dashboard/clases",
    icon: <Calendar size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "secretaria", "instructor"],
  },
  {
    label: "Exámenes",
    href: "/dashboard/examenes",
    icon: <FileText size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "secretaria"],
  },
  {
    label: "Ingresos",
    href: "/dashboard/ingresos",
    icon: <DollarSign size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "secretaria"],
  },
  {
    label: "Gastos",
    href: "/dashboard/gastos",
    icon: <TrendingDown size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "secretaria"],
  },
  {
    label: "Mantenimiento",
    href: "/dashboard/mantenimiento",
    icon: <Wrench size={18} />,
    roles: ["super_admin", "admin_escuela", "admin_sede", "instructor"],
  },
  {
    label: "Cursos",
    href: "/dashboard/cursos",
    icon: <BookOpen size={18} />,
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

  const filteredItems = navItems.filter(
    (item) => rol && item.roles.includes(rol)
  );

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-white dark:bg-[#1d1d1f] border-r border-gray-200/50 dark:border-gray-800/50 z-50 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo + cerrar móvil */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200/50 dark:border-gray-800/50">
          <span className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            AutoEscuela<span className="gradient-text">Pro</span>
          </span>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={16} className="text-[#86868b]" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100%-3rem)]">
          {filteredItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(item.href)
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
