import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import InvoiceBusinessStatus from "./InvoiceBusinessStatus";

it("no presenta saldo cero ni pagado cuando FacturaX no registró cartera", () => {
  render(
    <InvoiceBusinessStatus
      business={{
        accounting: { state: "pending", journalReference: null, issue: "Falta asiento." },
        collection: { state: "unregistered", balance: null, paid: null, issue: null, receipts: [] },
      }}
    />
  );
  expect(screen.getByText(/pendiente de contabilizar/)).toBeInTheDocument();
  expect(screen.getByText(/sin registro de cartera/)).toBeInTheDocument();
  expect(screen.queryByText(/Saldo en FacturaX/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Recaudado en FacturaX/)).not.toBeInTheDocument();
});
it("muestra asiento y recibos independientemente del estado fiscal", () => {
  render(
    <InvoiceBusinessStatus
      business={{
        accounting: { state: "posted", journalReference: "AS-1", issue: null },
        collection: {
          state: "paid",
          balance: 0,
          paid: 100000,
          issue: null,
          receipts: [
            {
              reference: "RC-1",
              amount: 100000,
              receivedOn: "2026-10-20",
              recordedOn: "2026-10-20",
            },
          ],
        },
      }}
    />
  );
  expect(screen.getByText(/contabilizada.*AS-1/)).toBeInTheDocument();
  expect(screen.getByText(/Recaudo: pagado/)).toBeInTheDocument();
  expect(screen.getByText(/Saldo en FacturaX/)).toBeInTheDocument();
  expect(screen.getByText(/RC-1/)).toBeInTheDocument();
});
