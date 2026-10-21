import PrintButton from "../../contrato/[id]/PrintButton";
import { extractDateOnly } from "@/lib/date-utils";
export type PaymentReceiptData = {
  id: string;
  escuela: string;
  nit: string | null;
  sede: string;
  direccion: string | null;
  telefono: string | null;
  alumno: string;
  documento: string;
  contrato: string | null;
  concepto: string;
  monto: number | string;
  fecha: string | Date;
  metodo_pago: string;
  registrado_por: string;
};
const methods: Record<string, string> = {
  efectivo: "Efectivo",
  datafono: "Datáfono",
  nequi: "Nequi",
  sistecredito: "Sistecrédito",
  otro: "Otro",
};
export default function PaymentReceipt({ receipt }: { receipt: PaymentReceiptData }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-8 print:max-w-none print:p-0">
      <div className="mb-5 flex justify-end print:hidden">
        <PrintButton label="Imprimir recibo" />
      </div>
      <article className="bg-white p-5 text-[#1d1d1f] sm:p-8 print:p-0">
        <header className="border-b border-gray-200 pb-4">
          <p className="text-xs font-medium text-[#0071e3]">Recibo de pago</p>
          <h1 className="mt-1 text-xl font-semibold">{receipt.escuela}</h1>
          <p className="mt-1 text-sm">
            {receipt.nit ? `NIT ${receipt.nit} · ` : ""}
            {receipt.sede}
          </p>
          <p className="text-sm text-gray-600">
            {[receipt.direccion, receipt.telefono].filter(Boolean).join(" · ")}
          </p>
        </header>
        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Recibido de</dt>
            <dd className="font-medium">{receipt.alumno}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Documento</dt>
            <dd>{receipt.documento}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Fecha</dt>
            <dd>{extractDateOnly(receipt.fecha) || ""}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Medio de pago</dt>
            <dd>{methods[receipt.metodo_pago] || receipt.metodo_pago}</dd>
          </div>
          {receipt.contrato && (
            <div>
              <dt className="text-gray-500">Contrato</dt>
              <dd>{receipt.contrato}</dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Concepto</dt>
            <dd className="break-words">{receipt.concepto}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-y border-gray-200 py-4">
          <span className="text-sm">Valor recibido</span>
          <strong className="text-2xl">
            {new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 2,
            }).format(Number(receipt.monto))}
          </strong>
        </div>
        <footer className="mt-5 space-y-1 text-xs text-gray-500">
          <p>Registrado por: {receipt.registrado_por}</p>
          <p className="break-all">Referencia: {receipt.id}</p>
          <p>Comprobante interno de pago.</p>
        </footer>
      </article>
    </main>
  );
}
