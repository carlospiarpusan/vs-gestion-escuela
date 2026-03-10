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
  /** Texto simple de confirmación */
  message?: string;
  /** Contenido rico (JSX) que reemplaza a message si se provee */
  description?: React.ReactNode;
}

export default function DeleteConfirm({
  open,
  onClose,
  onConfirm,
  loading = false,
  title = "Eliminar registro",
  message = "¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.",
  description,
}: DeleteConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      {/* Mensaje de advertencia */}
      <div className="text-sm text-[#86868b] mb-6">
        {description ?? <p>{message}</p>}
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end">
        {/* Cancelar: cierra el diálogo sin hacer nada */}
        <button
          onClick={onClose}
          disabled={loading}
          className="apple-button-secondary text-sm"
        >
          Cancelar
        </button>
        {/* Eliminar: ejecuta la acción destructiva */}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="apple-button-danger text-sm disabled:opacity-50"
        >
          {loading ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}
