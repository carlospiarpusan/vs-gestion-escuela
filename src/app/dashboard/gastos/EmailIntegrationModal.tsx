"use client";

import { useState } from "react";
import Modal from "@/components/dashboard/Modal";
import { ShieldCheck } from "lucide-react";
import {
  MANUAL_IMAP_PROVIDER,
  type EmailInvoiceConfigFormState,
  type EmailInvoiceIntegrationView,
  type SedeOption,
} from "./constants";

export interface EmailIntegrationModalProps {
  oauthProviders?: { gmail_google: boolean; outlook_microsoft: boolean };
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
  oauthProviders,
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
  const [manual, setManual] = useState(emailIntegration?.provider === MANUAL_IMAP_PROVIDER);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const connect = async (provider: "gmail_google" | "outlook_microsoft") => {
    if (connecting || !emailForm.sede_id) return;
    setConnecting(true);
    setConnectionError("");
    try {
      const response = await fetch("/api/gastos/facturas-correo/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          sede_id: emailForm.sede_id,
          from_filter: emailForm.from_filter,
          subject_filter: emailForm.subject_filter,
          import_only_unseen: emailForm.import_only_unseen,
          auto_sync: emailForm.auto_sync,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url)
        throw new Error(payload.error || "No se pudo iniciar la conexión.");
      window.location.assign(payload.url);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "No se pudo conectar el correo.");
      setConnecting(false);
    }
  };
  const inputCls = "apple-input";
  const requiresPasswordReset = Boolean(
    emailIntegration?.last_error?.includes(
      "La app password guardada fue cifrada con una llave anterior"
    ) ||
    emailIntegration?.last_error?.includes("No se pudo descifrar la credencial de correo") ||
    emailIntegration?.last_error?.includes("No se pudo leer la app password guardada")
  );

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!connecting && !emailSaving) onClose();
      }}
      title={emailIntegration ? "Editar correo de la empresa" : "Conectar correo de la empresa"}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {(connectionError || emailError) && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
            {connectionError || emailError}
          </p>
        )}

        <div className="rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/5 p-4 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 text-[#0071e3]" />
            <div className="text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
              <p className="font-semibold">Buzón de facturas de la empresa</p>
              <p className="mt-1 text-xs text-[#86868b]">
                El administrador conecta una sola vez el correo donde la empresa recibe las facturas
                de sus proveedores. Sus adjuntos XML o ZIP se registran automáticamente en Gastos
                con la sede contable elegida. El acceso es de lectura.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={
              connecting || emailSaving || !emailForm.sede_id || !oauthProviders?.gmail_google
            }
            onClick={() => void connect("gmail_google")}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            {emailIntegration?.provider === "gmail_google"
              ? "Cambiar cuenta de Google"
              : "Conectar Google"}
          </button>
          <button
            type="button"
            disabled={
              connecting || emailSaving || !emailForm.sede_id || !oauthProviders?.outlook_microsoft
            }
            onClick={() => void connect("outlook_microsoft")}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            Conectar Microsoft / Hotmail
          </button>
        </div>
        <p className="text-xs text-[#86868b]">
          Google abrirá un selector para elegir cualquier cuenta de Gmail o Google Workspace donde
          recibas las facturas. Puede ser una cuenta distinta a la que usas para entrar en
          ConduSoft.
        </p>
        {!emailForm.sede_id && (
          <p className="text-xs text-[#86868b]">
            Selecciona la sede contable para conectar el buzón de la empresa.
          </p>
        )}
        {oauthProviders && (!oauthProviders.gmail_google || !oauthProviders.outlook_microsoft) && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Conexión pendiente de configuración:{" "}
            {[
              !oauthProviders.gmail_google ? "Google" : "",
              !oauthProviders.outlook_microsoft ? "Microsoft / Hotmail" : "",
            ]
              .filter(Boolean)
              .join(" y ")}
            .
          </p>
        )}
        {connecting && (
          <p role="status" className="text-sm">
            Abriendo el inicio de sesión seguro...
          </p>
        )}
        {emailIntegration && (
          <p className="text-sm">
            Buzón de la empresa conectado: {emailIntegration.correo}. Conectar otra cuenta reemplaza
            este buzón; los gastos ya importados se conservan.
          </p>
        )}
        <button
          type="button"
          onClick={() => setManual((current) => !current)}
          className="text-sm text-[#0071e3]"
        >
          {manual ? "Ocultar configuración IMAP" : "Usar otro correo (IMAP)"}
        </button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {manual && (
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">
                Correo de facturas de la empresa *
              </label>
              <input
                type="email"
                value={emailForm.correo}
                onChange={(e) => onEmailAddressChange(e.target.value)}
                className={inputCls}
                placeholder="facturas@tuempresa.com"
              />
            </div>
          )}
          <div>
            <label
              htmlFor="invoice-email-destination"
              className="mb-1 block text-xs text-[#86868b]"
            >
              Sede contable destino *
            </label>
            <select
              id="invoice-email-destination"
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

        {manual && (
          <>
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
                  {emailIntegration?.provider === MANUAL_IMAP_PROVIDER &&
                  emailIntegration?.has_password
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
          </>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {manual && (
            <div>
              <label className="mb-1 block text-xs text-[#86868b]">Bandeja</label>
              <input
                type="text"
                value={emailForm.mailbox}
                onChange={(e) =>
                  setEmailForm((current) => ({ ...current, mailbox: e.target.value }))
                }
                className={inputCls}
                placeholder="INBOX"
              />
            </div>
          )}
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
          {manual && (
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
          )}
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
            Importar gastos automáticamente
          </label>
        </div>
        <p className="text-xs text-[#86868b]">
          Con la importación automática activada, el sistema revisa diariamente el buzón conectado y
          registra las facturas compatibles sin repetir las ya importadas. Puedes usar «Sincronizar
          ahora» para revisarlo en cualquier momento.
        </p>

        {manual && (
          <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
            <input
              type="checkbox"
              checked={emailForm.activa}
              onChange={(e) =>
                setEmailForm((current) => ({ ...current, activa: e.target.checked }))
              }
              className="rounded"
            />
            Mantener la conexion activa
          </label>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={connecting || emailSaving}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          {manual && (
            <button
              onClick={onSave}
              disabled={emailSaving || connecting}
              className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
            >
              {emailSaving
                ? "Guardando..."
                : emailIntegration
                  ? "Guardar conexion"
                  : "Conectar correo"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
