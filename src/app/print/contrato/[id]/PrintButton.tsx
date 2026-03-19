"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2 font-semibold text-white transition-opacity hover:opacity-80 print:hidden"
    >
      <Printer size={16} />
      Imprimir Contrato
    </button>
  );
}
