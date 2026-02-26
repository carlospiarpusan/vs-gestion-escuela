/**
 * ============================================================
 * Componente Modal - Diálogo modal reutilizable
 * ============================================================
 *
 * Modal genérico con overlay oscuro, cierre por Escape y clic exterior.
 * Se usa para formularios de crear/editar en todas las páginas CRUD.
 *
 * Características:
 * - Cierre con tecla Escape
 * - Cierre al hacer clic fuera del modal (en el overlay)
 * - Scroll interno si el contenido excede el 90% del viewport
 * - Animación de entrada (animate-scale-in definida en CSS global)
 * - Atributos ARIA para accesibilidad
 *
 * @prop open     - Si el modal está visible o no
 * @prop onClose  - Callback para cerrar el modal
 * @prop title    - Título mostrado en el header del modal
 * @prop children - Contenido del modal (formulario, etc.)
 * @prop maxWidth - Clase de Tailwind para ancho máximo (default: "max-w-lg")
 *
 * Dependencias: lucide-react (icono X)
 * Usado por: todas las páginas CRUD del dashboard
 * ============================================================
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  /**
   * Memoizar el handler de Escape para evitar que useEffect
   * se re-registre innecesariamente cuando onClose cambia de referencia.
   */
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  /**
   * Registrar/desregistrar listener de teclado.
   * Solo se activa cuando el modal está abierto.
   */
  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleEscape]);

  // No renderizar nada si el modal está cerrado
  if (!open) return null;

  return (
    /* Overlay oscuro: cubre toda la pantalla */
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Cerrar solo si se hace clic directamente en el overlay (no en el contenido)
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Contenedor del modal */}
      <div
        className={`bg-white dark:bg-[#1d1d1f] rounded-2xl shadow-xl w-full ${maxWidth} max-h-[92vh] flex flex-col animate-scale-in`}
      >
        {/* --- Header: título + botón cerrar --- */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200/50 dark:border-gray-800/50 shrink-0">
          <h3
            id="modal-title"
            className="text-base sm:text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] pr-2 truncate"
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X size={16} className="text-[#86868b]" />
          </button>
        </div>

        {/* --- Body: contenido del modal con scroll si es necesario --- */}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
