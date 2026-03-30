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

import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import TableScrollArea from "@/components/dashboard/TableScrollArea";
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";

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
  /** Callback al cambiar búsqueda confirmada (requerido en server-side) */
  onSearchChange?: (term: string) => void;
  /** Página actual controlada externamente (server-side) */
  currentPage?: number;
  /** Valor de búsqueda controlado externamente (opcional) */
  searchTerm?: string;
  /** Render específico para la tarjeta móvil */
  mobileCardRender?: (row: T) => React.ReactNode;
}

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
  searchTerm: externalSearchTerm,
  mobileCardRender,
}: DataTableProps<T>) {
  const isMobile = useIsMobileVariant();
  const [searchInput, setSearchInput] = useState(externalSearchTerm ?? "");
  const [appliedSearch, setAppliedSearch] = useState((externalSearchTerm ?? "").trim());
  const [page, setPage] = useState(0);
  const [prevExternalSearch, setPrevExternalSearch] = useState(externalSearchTerm);

  if (prevExternalSearch !== externalSearchTerm) {
    setPrevExternalSearch(externalSearchTerm);
    const next = externalSearchTerm ?? "";
    setSearchInput(next);
    setAppliedSearch(next.trim());
  }

  // En modo server-side, la página viene del padre
  const activePage = serverSide && externalPage != null ? externalPage : page;

  // --- Client-side: filtrar y paginar en memoria ---
  const filtered = useMemo(() => {
    if (serverSide) return data; // en server-side, data ya viene filtrada
    if (!appliedSearch) return data;
    const term = appliedSearch.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }, [appliedSearch, data, searchKeys, serverSide]);

  const totalItems = serverSide ? totalCount : filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(activePage, totalPages - 1);

  // En client-side, paginar en memoria; en server-side, data ya es la página
  const paginated = serverSide
    ? data
    : filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  /** Confirma la búsqueda actual y la aplica a la tabla */
  const applySearch = (term = searchInput) => {
    const normalizedTerm = term.trim();
    setAppliedSearch(normalizedTerm);

    if (serverSide) {
      onSearchChange?.(normalizedTerm);
      return;
    }

    setPage(0);
  };

  /** Actualiza el texto del input sin disparar consultas prematuras */
  const handleSearchInputChange = (val: string) => {
    setSearchInput(val);

    if (val === "") {
      applySearch("");
    }
  };

  /** Limpia el buscador y restablece la tabla */
  const clearSearch = () => {
    setSearchInput("");
    applySearch("");
  };

  /** Cambiar de página */
  const goToPage = (newPage: number) => {
    if (serverSide) {
      onPageChange?.(newPage);
    } else {
      setPage(newPage);
    }
  };

  const renderMobileCard = (row: T) => {
    if (mobileCardRender) {
      return mobileCardRender(row);
    }

    return (
      <div className="apple-panel-muted overflow-hidden rounded-[24px] p-4">
        <div className="space-y-3">
          {columns.map((col) => {
            const value = col.render
              ? col.render(row)
              : String((row as Record<string, unknown>)[String(col.key)] ?? "—");

            return (
              <div key={String(col.key)} className="flex flex-col gap-1">
                <span className="apple-kicker">{col.label}</span>
                <div className="text-foreground text-sm break-words">{value}</div>
              </div>
            );
          })}
        </div>

        {(extraActions || onEdit || onDelete) && (
          <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 [&>*]:w-full [&>*]:justify-center sm:[&>*]:w-auto">
            {extraActions?.(row)}
            {onEdit && (
              <button
                onClick={() => onEdit(row)}
                className="apple-button-secondary min-h-[42px] px-4 text-xs font-semibold"
              >
                <Pencil size={14} />
                Editar
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(row)}
                className="apple-button-danger min-h-[42px] px-4 text-xs font-semibold"
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- Estado: Cargando datos (skeleton) ---
  if (loading) {
    return (
      <div>
        <div className="relative mb-5">
          <div className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
        <TableScrollArea>
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200/50 dark:border-gray-800/50">
                {columns.map((col) => (
                  <th key={String(col.key)} className="px-5 py-4 text-left">
                    <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  </th>
                ))}
                {(onEdit || onDelete || extraActions) && (
                  <th className="sticky right-0 bg-[var(--surface-strong)]/95 px-5 py-4 text-right backdrop-blur-sm">
                    <div className="ml-auto h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <tr key={i} className="border-b border-gray-200/30 dark:border-gray-800/30">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-5 py-4">
                      <div
                        className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
                        style={{ width: `${60 + Math.random() * 40}%` }}
                      />
                    </td>
                  ))}
                  {(onEdit || onDelete || extraActions) && (
                    <td className="sticky right-0 bg-[var(--surface-strong)]/95 px-5 py-4 text-right backdrop-blur-sm">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-6 w-6 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-6 w-6 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableScrollArea>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--gray-500)]"
            />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applySearch();
                }

                if (e.key === "Escape" && searchInput) {
                  e.preventDefault();
                  clearSearch();
                }
              }}
              aria-label={searchPlaceholder}
              className="apple-input pr-12 pl-11"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--gray-500)] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                aria-label="Limpiar búsqueda"
                title="Limpiar"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => applySearch()}
            className="apple-button-secondary min-h-[46px] w-full px-5 text-sm font-medium sm:w-auto"
          >
            Buscar
          </button>
        </div>

        {searchInput !== appliedSearch && (
          <p className="mt-2 px-1 text-xs text-[var(--gray-500)]">
            Presiona Enter o usa el botón Buscar para aplicar el filtro.
          </p>
        )}
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {paginated.length === 0 ? (
            <div className="apple-panel-muted rounded-[24px] px-5 py-8 text-center text-sm text-[var(--gray-500)]">
              {appliedSearch ? "Sin resultados" : "No hay registros"}
            </div>
          ) : (
            paginated.map((row) => <div key={String(row.id)}>{renderMobileCard(row)}</div>)
          )}
        </div>
      ) : (
        <TableScrollArea>
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200/50 dark:border-gray-800/50">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    scope="col"
                    className="px-5 py-4 text-left text-[11px] font-semibold tracking-[0.18em] whitespace-nowrap text-[var(--gray-500)] uppercase"
                  >
                    {col.label}
                  </th>
                ))}
                {(onEdit || onDelete || extraActions) && (
                  <th
                    scope="col"
                    className="sticky right-0 bg-[var(--surface-strong)]/95 px-5 py-4 text-right text-[11px] font-semibold tracking-[0.18em] whitespace-nowrap text-[var(--gray-500)] uppercase backdrop-blur-sm"
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
                    className="px-5 py-12 text-center text-[var(--gray-500)]"
                  >
                    {appliedSearch ? "Sin resultados" : "No hay registros"}
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-200/30 transition-colors hover:bg-black/[0.02] dark:border-gray-800/30 dark:hover:bg-white/[0.03]"
                  >
                    {columns.map((col) => (
                      <td key={String(col.key)} className="text-foreground px-5 py-4 align-top">
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                      </td>
                    ))}
                    {(onEdit || onDelete || extraActions) && (
                      <td className="sticky right-0 bg-[var(--surface-strong)]/95 px-5 py-4 text-right backdrop-blur-sm">
                        <div className="flex items-center justify-end gap-1">
                          {extraActions && extraActions(row)}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="apple-icon-button hover:text-[var(--blue-apple)]"
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
        </TableScrollArea>
      )}

      {/* ========== Paginación ========== */}
      {totalPages > 1 && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-[var(--gray-500)]">
            {totalItems} registro{totalItems !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <button
              onClick={() => goToPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="apple-icon-button disabled:opacity-30"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} className="text-foreground" />
            </button>
            <span className="rounded-full border border-[var(--surface-border)] px-3 py-1 text-xs font-medium text-[var(--gray-500)]">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage >= totalPages - 1}
              className="apple-icon-button disabled:opacity-30"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} className="text-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
