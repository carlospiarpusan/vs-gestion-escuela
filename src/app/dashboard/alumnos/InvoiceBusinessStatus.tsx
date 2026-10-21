"use client";

import type { FacturaxStatus } from "@/lib/vs-billing/facturax-contract";

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 2,
});
export default function InvoiceBusinessStatus({
  business,
}: {
  business: NonNullable<FacturaxStatus["business"]>;
}) {
  const { accounting, collection } = business;
  return (
    <div className="space-y-2 text-sm" aria-label="Estado contable en FacturaX">
      <p>
        Contabilidad:{" "}
        {
          {
            pending: "pendiente de contabilizar",
            posted: "contabilizada",
            not_required: "no aplica",
          }[accounting.state]
        }
        {accounting.journalReference ? ` · ${accounting.journalReference}` : ""}
      </p>
      {accounting.issue && (
        <p role="status" className="text-amber-700 dark:text-amber-300">
          {accounting.issue}
        </p>
      )}
      <p>
        Recaudo:{" "}
        {
          {
            unregistered: "sin registro de cartera",
            pending: "pendiente",
            partial: "parcial",
            paid: "pagado",
            not_required: "no aplica",
          }[collection.state]
        }
      </p>
      {collection.balance !== null && (
        <p>Saldo en FacturaX: {money.format(collection.balance / 100)}</p>
      )}
      {collection.paid !== null && (
        <p>Recaudado en FacturaX: {money.format(collection.paid / 100)}</p>
      )}
      {collection.issue && (
        <p role="status" className="text-amber-700 dark:text-amber-300">
          {collection.issue}
        </p>
      )}
      {collection.receipts.length > 0 && (
        <details>
          <summary className="cursor-pointer">Recibos ({collection.receipts.length})</summary>
          <ul className="mt-2 space-y-1">
            {collection.receipts.map((receipt, index) => (
              <li key={`${receipt.reference}:${index}`} className="break-words">
                {receipt.reference} · {money.format(receipt.amount / 100)} · {receipt.receivedOn}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
