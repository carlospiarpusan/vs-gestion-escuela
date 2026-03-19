"use client";

import Modal from "@/components/dashboard/Modal";
import { HISTORICAL_MONTH_OPTIONS, HISTORICAL_LIMIT_OPTIONS } from "./constants";

export interface HistoricalSearchModalProps {
  open: boolean;
  onClose: () => void;
  emailHistoryMonths: string;
  setEmailHistoryMonths: (value: string) => void;
  emailHistoryMaxMessages: string;
  setEmailHistoryMaxMessages: (value: string) => void;
  emailSyncing: boolean;
  onSearch: () => void;
}

export default function HistoricalSearchModal({
  open,
  onClose,
  emailHistoryMonths,
  setEmailHistoryMonths,
  emailHistoryMaxMessages,
  setEmailHistoryMaxMessages,
  emailSyncing,
  onSearch,
}: HistoricalSearchModalProps) {
  const inputCls = "apple-input";

  return (
    <Modal open={open} onClose={onClose} title="Buscar Facturas Antiguas" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/5 p-4 text-sm text-[#1d1d1f] dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#f5f5f7]">
          <p className="font-semibold">Busqueda historica controlada</p>
          <p className="mt-1 text-xs text-[#86868b]">
            Este proceso revisa correos antiguos del buzon, ignora la restriccion de no leidos y
            mantiene la sincronizacion normal de correos nuevos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Meses hacia atras</label>
            <select
              value={emailHistoryMonths}
              onChange={(e) => setEmailHistoryMonths(e.target.value)}
              className={inputCls}
            >
              {HISTORICAL_MONTH_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value} meses
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#86868b]">Maximo de correos</label>
            <select
              value={emailHistoryMaxMessages}
              onChange={(e) => setEmailHistoryMaxMessages(e.target.value)}
              className={inputCls}
            >
              {HISTORICAL_LIMIT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value} correos
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-[#86868b]">
          Si encuentra mas correos de los que caben en el limite, te lo indicara al terminar para
          que puedas repetir la busqueda con un rango mayor o por mas tandas.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={onSearch}
            disabled={emailSyncing}
            className="rounded-lg bg-[#0071e3] px-4 py-2 text-sm text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
          >
            {emailSyncing ? "Buscando..." : "Buscar facturas antiguas"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
