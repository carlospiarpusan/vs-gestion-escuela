"use client";

import type { ChangeEvent, RefObject } from "react";
import Modal from "@/components/dashboard/Modal";
import type { ElectronicInvoicePreview } from "@/lib/electronic-invoice";
import type { CategoriaGasto, EstadoPagoGasto, MetodoPagoGasto } from "@/types/database";
import { Upload } from "lucide-react";
import {
  categorias,
  metodos,
  estadosPagoGasto,
  formatInvoiceMoney,
  type GastoFormState,
} from "./constants";

export interface ImportInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoiceImportError: string;
  parsingInvoice: boolean;
  importingInvoice: boolean;
  invoicePreview: ElectronicInvoicePreview | null;
  invoiceForm: GastoFormState;
  setInvoiceForm: (value: GastoFormState | ((prev: GastoFormState) => GastoFormState)) => void;
  invoiceFileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}

export default function ImportInvoiceModal({
  open,
  onClose,
  invoiceImportError,
  parsingInvoice,
  importingInvoice,
  invoicePreview,
  invoiceForm,
  setInvoiceForm,
  invoiceFileInputRef,
  onFileChange,
  onImport,
}: ImportInvoiceModalProps) {
  const inputCls = "apple-input";

  return (
    <Modal open={open} onClose={onClose} title="Importar Factura Electronica" maxWidth="max-w-3xl">
      <div className="space-y-5">
        {invoiceImportError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
            {invoiceImportError}
          </p>
        )}

        <div className="rounded-2xl border border-dashed border-[#0071e3]/25 bg-[#0071e3]/5 p-4 dark:border-[#0071e3]/35 dark:bg-[#0071e3]/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Sube el XML de la factura electronica
              </p>
              <p className="mt-1 text-xs text-[#86868b]">
                Se leen numero de factura, fecha, proveedor, total, impuestos y conceptos para crear
                el gasto con soporte contable. Tambien puedes subir el ZIP original cuando la
                factura venga con PDF y XML.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm font-medium text-white hover:bg-[#0077ED]">
              <Upload size={15} />
              {parsingInvoice ? "Leyendo archivo..." : "Seleccionar XML o ZIP"}
              <input
                ref={invoiceFileInputRef}
                type="file"
                accept=".xml,.zip,text/xml,application/xml,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={(event) => void onFileChange(event)}
              />
            </label>
          </div>
        </div>

        {invoicePreview && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">Factura</p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {invoicePreview.invoiceNumber}
                </p>
                <p className="mt-2 text-xs text-[#86868b]">
                  {invoicePreview.sourceFormat === "zip"
                    ? `ZIP: ${invoicePreview.fileName}`
                    : `XML: ${invoicePreview.fileName}`}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">Proveedor</p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {invoicePreview.supplierName}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">Fecha</p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {invoicePreview.issueDate}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">Total</p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {formatInvoiceMoney(invoicePreview.payableAmount, invoicePreview.currency)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#86868b]">Categoria sugerida</label>
                    <select
                      value={invoiceForm.categoria}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          categoria: e.target.value as CategoriaGasto,
                        })
                      }
                      className={inputCls}
                    >
                      {categorias.map((categoria) => (
                        <option key={categoria} value={categoria}>
                          {categoria.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#86868b]">Estado de pago</label>
                    <select
                      value={invoiceForm.estado_pago}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          estado_pago: e.target.value as EstadoPagoGasto,
                        })
                      }
                      className={inputCls}
                    >
                      {estadosPagoGasto.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#86868b]">Metodo de pago</label>
                    <select
                      value={invoiceForm.metodo_pago}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          metodo_pago: e.target.value as MetodoPagoGasto,
                        })
                      }
                      className={inputCls}
                    >
                      {metodos.map((metodo) => (
                        <option key={metodo} value={metodo}>
                          {metodo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[#86868b]">Concepto *</label>
                  <input
                    type="text"
                    value={invoiceForm.concepto}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, concepto: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-[#86868b]">Monto *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceForm.monto}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, monto: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#86868b]">Fecha</label>
                    <input
                      type="date"
                      value={invoiceForm.fecha}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({
                          ...prev,
                          fecha: e.target.value,
                          fecha_vencimiento:
                            !prev.fecha_vencimiento || prev.fecha_vencimiento === prev.fecha
                              ? e.target.value
                              : prev.fecha_vencimiento,
                        }))
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#86868b]">Vencimiento</label>
                    <input
                      type="date"
                      value={invoiceForm.fecha_vencimiento}
                      onChange={(e) =>
                        setInvoiceForm({ ...invoiceForm, fecha_vencimiento: e.target.value })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#86868b]">N° Factura</label>
                    <input
                      type="text"
                      value={invoiceForm.numero_factura}
                      onChange={(e) =>
                        setInvoiceForm({ ...invoiceForm, numero_factura: e.target.value })
                      }
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-[#86868b]">Proveedor</label>
                    <input
                      type="text"
                      value={invoiceForm.proveedor}
                      onChange={(e) =>
                        setInvoiceForm({ ...invoiceForm, proveedor: e.target.value })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                      <input
                        type="checkbox"
                        checked={invoiceForm.recurrente}
                        onChange={(e) =>
                          setInvoiceForm({ ...invoiceForm, recurrente: e.target.checked })
                        }
                        className="rounded"
                      />
                      Registrar como gasto recurrente
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[#86868b]">Notas contables</label>
                  <textarea
                    value={invoiceForm.notas}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notas: e.target.value })}
                    rows={5}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                  <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">
                    Resumen fiscal
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                    <p>
                      <span className="font-semibold">Moneda:</span> {invoicePreview.currency}
                    </p>
                    <p>
                      <span className="font-semibold">XML detectado:</span>{" "}
                      {invoicePreview.xmlEntryName}
                    </p>
                    <p>
                      <span className="font-semibold">PDF detectado:</span>{" "}
                      {invoicePreview.pdfEntryName || "No encontrado en el archivo"}
                    </p>
                    <p>
                      <span className="font-semibold">Subtotal:</span>{" "}
                      {invoicePreview.subtotalAmount !== null
                        ? formatInvoiceMoney(invoicePreview.subtotalAmount, invoicePreview.currency)
                        : "No disponible"}
                    </p>
                    <p>
                      <span className="font-semibold">Impuestos:</span>{" "}
                      {invoicePreview.taxAmount !== null
                        ? formatInvoiceMoney(invoicePreview.taxAmount, invoicePreview.currency)
                        : "No disponible"}
                    </p>
                    <p>
                      <span className="font-semibold">NIT proveedor:</span>{" "}
                      {invoicePreview.supplierTaxId || "No disponible"}
                    </p>
                    <p>
                      <span className="font-semibold">Vencimiento:</span>{" "}
                      {invoicePreview.dueDate || "No disponible"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                  <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">
                    Lineas detectadas
                  </p>
                  {invoicePreview.lineItems.length === 0 ? (
                    <p className="mt-3 text-sm text-[#86868b]">
                      El XML no trae lineas detalladas legibles. Puedes ajustar el concepto
                      manualmente.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {invoicePreview.lineItems.slice(0, 6).map((item) => (
                        <li key={item} className="rounded-xl bg-white px-3 py-2 dark:bg-[#161618]">
                          {item}
                        </li>
                      ))}
                      {invoicePreview.lineItems.length > 6 && (
                        <li className="text-xs text-[#86868b]">
                          + {invoicePreview.lineItems.length - 6} linea(s) adicionales en la
                          factura.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={onImport}
            disabled={!invoicePreview || parsingInvoice || importingInvoice}
            className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
          >
            {importingInvoice ? "Importando..." : "Registrar gasto desde factura"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
