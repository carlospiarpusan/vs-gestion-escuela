"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

export default function PrintButton() {
  const [printing, setPrinting] = useState(false);

  async function waitForPrintLayout() {
    const fontSet = document.fonts;
    if (fontSet?.ready) {
      try {
        await fontSet.ready;
      } catch {}
    }

    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>(".contract-print-sheet img")
    ).filter((image) => !image.complete);

    if (images.length) {
      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              const finish = () => resolve();
              image.addEventListener("load", finish, { once: true });
              image.addEventListener("error", finish, { once: true });
            })
        )
      );
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  async function handlePrint() {
    if (printing) return;
    setPrinting(true);

    try {
      await waitForPrintLayout();
      window.print();
    } finally {
      window.setTimeout(() => setPrinting(false), 250);
    }
  }

  return (
    <button
      onClick={handlePrint}
      disabled={printing}
      className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2 font-semibold text-white transition-opacity hover:opacity-80 print:hidden"
    >
      <Printer size={16} />
      {printing ? "Preparando impresion..." : "Imprimir Contrato"}
    </button>
  );
}
