/**
 * ============================================================
 * Componente DataTable - Tabla de datos genérica y reutilizable
 * ============================================================
 *
 * Tabla con búsqueda, paginación y acciones (editar/eliminar).
 * Se usa en TODAS las páginas CRUD del dashboard.
 *
 * Soporta dos modos de operación:
 *
 * 1. **Client-side** (por defecto): recibe todos los datos y pagina/filtra
 *    en el navegador. Ideal para tablas pequeñas (< 500 registros).
 *
 * 2. **Server-side** (`serverSide=true`): delega paginación y búsqueda
 *    al servidor (Supabase). Ideal para miles de registros.
 *    Requiere: totalCount, onPageChange, onSearchChange.
 *
 * Props principales:
 * @prop columns          - Definición de columnas (key, label, render opcional)
 * @prop data             - Array de datos a mostrar (página actual en server-side)
 * @prop searchKeys       - Campos por los que se puede buscar (solo client-side)
 * @prop onEdit           - Callback al pulsar editar (opcional)
 * @prop onDelete         - Callback al pulsar eliminar (opcional)
 * @prop pageSize         - Registros por página (default: 10)
 * @prop serverSide       - Activa modo server-side
 * @prop totalCount       - Total de registros en el servidor (server-side)
 * @prop onPageChange     - Callback al cambiar de página (server-side)
 * @prop onSearchChange   - Callback al cambiar búsqueda (server-side)
 * @prop currentPage      - Página actual controlada externamente (server-side)
 *
 * Dependencias: lucide-react (iconos)
 * Usado por: alumnos, instructores, vehiculos, clases, examenes,
 *            ingresos, gastos, mantenimiento
 * ============================================================
 */

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

// --- Tipos ---

/** Definición de una columna de la tabla */
interface Column<T> {
  /** Campo del objeto T que representa esta columna (o string para campos virtuales) */
  key: keyof T | string;
  /** Texto del encabezado */
  label: string;
  /** Función de renderizado personalizado (opcional). Si no se pasa, muestra el valor como texto */
  render?: (row: T) => React.ReactNode;
}

/** Props del componente DataTable */
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  extraActions?: (row: T) => React.ReactNode;
  pageSize?: number;
  /** Modo server-side: delega paginación y búsqueda al servidor */
  serverSide?: boolean;
  /** Total de registros en el servidor (requerido en server-side) */
  totalCount?: number;
  /** Callback al cambiar de página (requerido en server-side) */
  onPageChange?: (page: number) => void;
  /** Callback al cambiar búsqueda con debounce (requerido en server-side) */
  onSearchChange?: (term: string) => void;
  /** Página actual controlada externamente (server-side) */
  currentPage?: number;
}

/** Milisegundos de debounce para búsqueda server-side */
const SEARCH_DEBOUNCE_MS = 400;

export default function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  searchPlaceholder = "Buscar...",
  searchKeys = [],
  onEdit,
  onDelete,
  extraActions,
  pageSize = 10,
  serverSide = false,
  totalCount = 0,
  onPageChange,
  onSearchChange,
  currentPage: externalPage,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // En modo server-side, la página viene del padre
  const activePage = serverSide && externalPage != null ? externalPage : page;

  // --- Client-side: filtrar y paginar en memoria ---
  const filtered = useMemo(() => {
    if (serverSide) return data; // en server-side, data ya viene filtrada
    if (!search) return data;
    const term = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, search, searchKeys, serverSide]);

  const totalItems = serverSide ? totalCount : filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(activePage, totalPages - 1);

  // En client-side, paginar en memoria; en server-side, data ya es la página
  const paginated = serverSide
    ? data
    : filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  /** Búsqueda: client-side inmediata, server-side con debounce */
  const handleSearch = (val: string) => {
    setSearch(val);

    if (serverSide) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearchChange?.(val);
      }, SEARCH_DEBOUNCE_MS);
    } else {
      setPage(0);
    }
  };

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /** Cambiar de página */
  const goToPage = (newPage: number) => {
    if (serverSide) {
      onPageChange?.(newPage);
    } else {
      setPage(newPage);
    }
  };

  // --- Estado: Cargando datos (skeleton) ---
  if (loading) {
    return (
      <div>
        <div className="relative mb-5">
          <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
        <div className="apple-table-shell overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200/50 dark:border-gray-800/50">
                {columns.map((col) => (
                  <th key={String(col.key)} className="px-5 py-4 text-left">
                    <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </th>
                ))}
                {(onEdit || onDelete || extraActions) && (
                  <th className="px-5 py-4 text-right">
                    <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse ml-auto" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <tr key={i} className="border-b border-gray-200/30 dark:border-gray-800/30">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-5 py-4">
                      <div className="h-4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                  {(onEdit || onDelete || extraActions) && (
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-6 w-6 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                        <div className="h-6 w-6 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"
        />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          aria-label={searchPlaceholder}
          className="apple-input pl-11 pr-4"
        />
      </div>

      <div className="apple-table-shell overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-gray-200/50 dark:border-gray-800/50">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className="px-5 py-4 text-left font-semibold text-[#86868b] text-[11px] uppercase tracking-[0.18em] whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete || extraActions) && (
                <th
                  scope="col"
                  className="px-5 py-4 text-right font-semibold text-[#86868b] text-[11px] uppercase tracking-[0.18em] whitespace-nowrap"
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete || extraActions ? 1 : 0)}
                  className="px-5 py-12 text-center text-[#86868b]"
                >
                  {search ? "Sin resultados" : "No hay registros"}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-200/30 dark:border-gray-800/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-5 py-4 align-top text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                    </td>
                  ))}
                  {(onEdit || onDelete || extraActions) && (
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {extraActions && extraActions(row)}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="apple-icon-button hover:text-[#0071e3]"
                            aria-label="Editar registro"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="apple-icon-button hover:text-red-500"
                            aria-label="Eliminar registro"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========== Paginación ========== */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs font-medium text-[#86868b]">
            {totalItems} registro{totalItems !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="apple-icon-button disabled:opacity-30"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} className="text-[#1d1d1f] dark:text-[#f5f5f7]" />
            </button>
            <span className="rounded-full border border-[var(--surface-border)] px-3 py-1 text-xs font-medium text-[#86868b]">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage >= totalPages - 1}
              className="apple-icon-button disabled:opacity-30"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} className="text-[#1d1d1f] dark:text-[#f5f5f7]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
