"use client";

import type { FacturaxCatalog } from "@/lib/vs-billing/facturax-contract";

export type CollectionState = "" | "pending" | "received";
export default function InvoiceCollectionFields({
  catalog,
  method,
  condition,
  choice,
  account,
  confirmed,
  disabled,
  onChoice,
  onAccount,
  onConfirm,
}: {
  catalog: FacturaxCatalog;
  method: string;
  condition: "contado" | "credito";
  choice: CollectionState;
  account: string;
  confirmed: boolean;
  disabled: boolean;
  onChoice: (value: CollectionState) => void;
  onAccount: (value: string) => void;
  onConfirm: (value: boolean) => void;
}) {
  if (!catalog.capabilities?.paymentCollection) return null;
  const defaults =
    catalog.defaultCollectionAccounts?.filter((entry) => entry.method === method) ?? [];
  const defaultAccount =
    defaults.length === 1
      ? catalog.collectionAccounts?.find((entry) => entry.code === defaults[0].accountCode)
      : null;
  const control =
    "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-base sm:min-h-10 sm:text-sm";
  return (
    <div className="space-y-3 border-y border-[var(--surface-border)] py-3 text-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>
          Recaudo *
          <select
            required
            className={control}
            value={choice}
            disabled={disabled}
            onChange={(event) => onChoice(event.target.value as CollectionState)}
          >
            <option value="">Seleccionar</option>
            <option value="pending">Pendiente de recibir</option>
            <option
              value="received"
              disabled={
                condition === "credito" ||
                method === "Instrumento no definido" ||
                catalog.canConfirmCollections !== true
              }
            >
              Recibido completo
            </option>
          </select>
        </label>
        {choice === "received" && (
          <label>
            Cuenta receptora *
            <select
              className={control}
              value={account}
              disabled={disabled}
              onChange={(event) => onAccount(event.target.value)}
            >
              <option value="">
                {defaultAccount
                  ? `${defaultAccount.code} · ${defaultAccount.name} (predeterminada)`
                  : "Seleccionar"}
              </option>
              {(catalog.collectionAccounts ?? []).map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.code} · {entry.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {choice === "received" && (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={disabled}
            onChange={(event) => onConfirm(event.target.checked)}
            className="mt-1"
          />
          Confirmo que se recibió el total de esta factura en la cuenta seleccionada y autorizo
          registrar el recaudo en FacturaX.
        </label>
      )}
    </div>
  );
}
