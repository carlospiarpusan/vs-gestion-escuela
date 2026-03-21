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
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  mobilePresentation?: "sheet" | "fullscreen";
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
  mobilePresentation = "sheet",
}: ModalProps) {
  const isMobile = useIsMobileVariant();
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

  const isFullscreenMobile = isMobile && mobilePresentation === "fullscreen";

  return (
    <div
      ref={overlayRef}
      className={`apple-overlay fixed inset-0 z-50 flex justify-center ${
        isFullscreenMobile ? "items-stretch p-0" : "items-end p-0 sm:items-center sm:p-4"
      }`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`apple-panel w-full ${
          isFullscreenMobile
            ? "h-[100dvh] max-w-none rounded-none"
            : `${maxWidth} max-h-[96dvh] rounded-t-[2rem] sm:max-h-[90vh] sm:rounded-[2rem]`
        } flex flex-col overflow-hidden animate-scale-in shadow-[var(--surface-shadow-strong)]`}
      >
        <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-7 sm:py-5">
          <h3
            id="modal-title"
            className="pr-2 truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="apple-icon-button shrink-0"
            aria-label="Cerrar modal"
          >
            <X size={16} className="text-[var(--gray-500)]" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-7 sm:pb-6">
          <div className="apple-divider mb-5" />
          {children}
        </div>
      </div>
    </div>
  );
}
