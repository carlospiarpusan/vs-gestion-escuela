"use client";

import Modal from "@/components/dashboard/Modal";
import { ShieldCheck } from "lucide-react";
import {
  MANUAL_IMAP_PROVIDER,
  type EmailInvoiceConfigFormState,
  type EmailInvoiceIntegrationView,
  type SedeOption,
} from "./constants";

export interface EmailIntegrationModalProps {
  open: boolean;
  onClose: () => void;
  emailIntegration: EmailInvoiceIntegrationView | null;
  emailForm: EmailInvoiceConfigFormState;
  setEmailForm: (
    value:
      | EmailInvoiceConfigFormState
      | ((prev: EmailInvoiceConfigFormState) => EmailInvoiceConfigFormState)
  ) => void;
  sedesOptions: SedeOption[];
  emailError: string;
  emailSaving: boolean;
  onSave: () => void;
  onEmailAddressChange: (correo: string) => void;
}

export default function EmailIntegrationModal({
  open,
  onClose,
  emailIntegration,
  emailForm,
  setEmailForm,
  sedesOptions,
  emailError,
  emailSaving,
  onSave,
  onEmailAddressChange,
}: EmailIntegrationModalProps) {
  const inputCls = "apple-input";
  const requiresPasswordReset = Boolean(
    emailIntegration?.last_error?.includes("La app password guardada fue cifrada con una llave anterior") ||
    emailIntegration?.last_error?.includes("No se pudo descifrar la credencial de correo") ||
      emailIntegration?.last_error?.includes("No se pudo leer la app password guardada")
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={emailIntegration ? "Editar Correo de Facturas" : "Conectar Correo de Facturas"}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {emailError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
            {emailError}
          </p>
        )}

        <div className="rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/5 p-4 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 text-[#0071e3]" />
            <div className="text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
              <p className="font-semibold">Conexion segura por IMAP</p>
              <p className="mt-1 text-xs text-[#86868b]">
                Guarda el correo y su app password cifrados para leer automaticamente adjuntos XML o
                ZIP y registrarlos como gastos.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Correo del buzon *</label>
            <input
              type="email"
              value={emailForm.correo}
              onChange={(e) => onEmailAddressChange(e.target.value)}
              className={inputCls}
              placeholder="facturas@tuempresa.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Sede contable destino *</label>
            <select
              value={emailForm.sede_id}
              onChange={(e) => setEmailForm((current) => ({ ...current, sede_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">Selecciona una sede</option>
              {sedesOptions.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-[#86868b]">Host IMAP *</label>
            <input
              type="text"
              value={emailForm.imap_host}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, imap_host: e.target.value }))
              }
              className={inputCls}
              placeholder="imap.gmail.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Puerto *</label>
            <input
              type="number"
              value={emailForm.imap_port}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, imap_port: e.target.value }))
              }
              className={inputCls}
              placeholder="993"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Usuario IMAP *</label>
            <input
              type="text"
              value={emailForm.imap_user}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, imap_user: e.target.value }))
              }
              className={inputCls}
              placeholder="facturas@tuempresa.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">
              {emailIntegration?.provider === MANUAL_IMAP_PROVIDER && emailIntegration?.has_password
                ? requiresPasswordReset
                  ? "Nueva app password *"
                  : "Nueva app password (opcional)"
                : "App password *"}
            </label>
            <input
              type="password"
              value={emailForm.imap_password}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, imap_password: e.target.value }))
              }
              className={inputCls}
              autoComplete="new-password"
              placeholder={
                emailIntegration?.provider === MANUAL_IMAP_PROVIDER &&
                emailIntegration?.has_password
                  ? requiresPasswordReset
                    ? "Ingresa la app password para recuperar la conexion"
                    : "Deja en blanco para conservar la actual"
                  : "Clave de aplicacion"
              }
            />
            {requiresPasswordReset && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                La app password guardada ya no se puede leer con la clave actual. Ingresala de
                nuevo para volver a cifrarla.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Bandeja</label>
            <input
              type="text"
              value={emailForm.mailbox}
              onChange={(e) => setEmailForm((current) => ({ ...current, mailbox: e.target.value }))}
              className={inputCls}
              placeholder="INBOX"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Filtro remitente</label>
            <input
              type="text"
              value={emailForm.from_filter}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, from_filter: e.target.value }))
              }
              className={inputCls}
              placeholder="facturador@proveedor.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Filtro asunto</label>
            <input
              type="text"
              value={emailForm.subject_filter}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, subject_filter: e.target.value }))
              }
              className={inputCls}
              placeholder="Factura electronica"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
            <input
              type="checkbox"
              checked={emailForm.imap_secure}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, imap_secure: e.target.checked }))
              }
              className="rounded"
            />
            Usar TLS/SSL
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
            <input
              type="checkbox"
              checked={emailForm.import_only_unseen}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, import_only_unseen: e.target.checked }))
              }
              className="rounded"
            />
            Solo no leidos
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
            <input
              type="checkbox"
              checked={emailForm.auto_sync}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, auto_sync: e.target.checked }))
              }
              className="rounded"
            />
            Sincronizar automaticamente
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
          <input
            type="checkbox"
            checked={emailForm.activa}
            onChange={(e) => setEmailForm((current) => ({ ...current, activa: e.target.checked }))}
            className="rounded"
          />
          Mantener la conexion activa
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={emailSaving}
            className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
          >
            {emailSaving
              ? "Guardando..."
              : emailIntegration
                ? "Guardar conexion"
                : "Conectar correo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
