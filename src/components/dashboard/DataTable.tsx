/**
 * ============================================================
 * Componente DataTable - Tabla de datos genérica y reutilizable
 * ============================================================
 *
 * Tabla con búsqueda, paginación y acciones (editar/eliminar).
 * Se usa en TODAS las páginas CRUD del dashboard.
 *
 * Características:
 * - Genérica: funciona con cualquier tipo T que tenga un campo `id`
 * - Búsqueda: filtra por los campos indicados en `searchKeys`
 * - Paginación: 10 registros por página (configurable)
 * - Acciones: botones editar/eliminar opcionales
 * - Columnas personalizables: cada columna puede tener un `render` custom
 *
 * Props principales:
 * @prop columns    - Definición de columnas (key, label, render opcional)
 * @prop data       - Array de datos a mostrar
 * @prop searchKeys - Campos por los que se puede buscar
 * @prop onEdit     - Callback al pulsar editar (opcional)
 * @prop onDelete   - Callback al pulsar eliminar (opcional)
 * @prop pageSize   - Registros por página (default: 10)
 *
 * Dependencias: lucide-react (iconos)
 * Usado por: alumnos, instructores, vehiculos, clases, examenes,
 *            ingresos, gastos, mantenimiento
 * ============================================================
 */

"use client";

import { useState, useMemo } from "react";
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
  pageSize?: number;
}

export default function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  searchPlaceholder = "Buscar...",
  searchKeys = [],
  onEdit,
  onDelete,
  pageSize = 10,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  /**
   * Filtrar datos por término de búsqueda.
   * Se usa useMemo para evitar recalcular en cada render
   * cuando los datos o la búsqueda no han cambiado.
   */
  const filtered = useMemo(() => {
    if (!search) return data;
    const term = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, search, searchKeys]);

  // --- Cálculos de paginación ---
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  /** Actualizar búsqueda y resetear a la primera página */
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  // --- Estado: Cargando datos ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* ========== Barra de búsqueda ========== */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]"
        />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          aria-label={searchPlaceholder}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
        />
      </div>

      {/* ========== Tabla de datos ========== */}
      <div className="overflow-x-auto rounded-xl border border-gray-200/50 dark:border-gray-800/50">
        <table className="w-full text-sm">
          {/* Encabezados de columna */}
          <thead>
            <tr className="border-b border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#161616]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className="px-4 py-3 text-left font-medium text-[#86868b] text-xs uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              {/* Columna de acciones (solo si hay callbacks) */}
              {(onEdit || onDelete) && (
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-medium text-[#86868b] text-xs uppercase tracking-wider"
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>

          {/* Filas de datos */}
          <tbody>
            {paginated.length === 0 ? (
              /* Mensaje cuando no hay datos */
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-4 py-8 text-center text-[#86868b]"
                >
                  {search ? "Sin resultados" : "No hay registros"}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-200/30 dark:border-gray-800/30 hover:bg-gray-50/50 dark:hover:bg-[#161616] transition-colors"
                >
                  {/* Celdas de cada columna */}
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-4 py-3 text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                    </td>
                  ))}
                  {/* Botones de acción (editar/eliminar) */}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[#86868b] hover:text-[#0071e3]"
                            aria-label="Editar registro"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[#86868b] hover:text-red-500"
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
        <div className="flex items-center justify-between mt-4">
          {/* Contador de registros */}
          <span className="text-xs text-[#86868b]">
            {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
          </span>
          {/* Controles de navegación */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} className="text-[#1d1d1f] dark:text-[#f5f5f7]" />
            </button>
            <span className="text-xs text-[#86868b]">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
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
