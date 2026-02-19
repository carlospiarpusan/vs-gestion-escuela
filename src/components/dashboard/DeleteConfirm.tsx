/**
 * ============================================================
 * Componente DeleteConfirm - Diálogo de confirmación de eliminación
 * ============================================================
 *
 * Modal pequeño que pide confirmación antes de eliminar un registro.
 * Muestra un mensaje personalizable y dos botones: Cancelar y Eliminar.
 *
 * Se usa en combinación con el estado `deleteOpen` y `deleting`
 * en todas las páginas CRUD del dashboard.
 *
 * @prop open      - Si el diálogo está visible
 * @prop onClose   - Callback para cancelar/cerrar
 * @prop onConfirm - Callback al confirmar la eliminación
 * @prop loading   - Si está procesando la eliminación (deshabilita botones)
 * @prop title     - Título del diálogo (default: "Eliminar registro")
 * @prop message   - Mensaje de confirmación personalizado
 *
 * Dependencias: Modal.tsx
 * Usado por: todas las páginas CRUD del dashboard
 * ============================================================
 */

"use client";

import Modal from "./Modal";

interface DeleteConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  message?: string;
}

export default function DeleteConfirm({
  open,
  onClose,
  onConfirm,
  loading = false,
  title = "Eliminar registro",
  message = "¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.",
}: DeleteConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      {/* Mensaje de advertencia */}
      <p className="text-sm text-[#86868b] mb-6">{message}</p>

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end">
        {/* Cancelar: cierra el diálogo sin hacer nada */}
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancelar
        </button>
        {/* Eliminar: ejecuta la acción destructiva */}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {loading ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}
