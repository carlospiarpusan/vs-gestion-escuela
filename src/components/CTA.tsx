"use client";

import Link from "next/link";

export default function CTA() {
  return (
    <section
      id="pricing"
      className="py-24 bg-[#f5f5f7] dark:bg-[#1d1d1f]/30"
    >
      <div className="max-w-[980px] mx-auto px-6 text-center">
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] mb-4">
          Lleva tu autoescuela al siguiente nivel.
        </h2>
        <p className="text-xl text-[#86868b] max-w-2xl mx-auto mb-4">
          Únete a cientos de autoescuelas que ya confían en AutoEscuelaPro para
          gestionar su día a día.
        </p>
        <p className="text-[#86868b] mb-10">
          Gratis para empezar. Sin tarjeta de crédito.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/registro"
            className="bg-[#0071e3] text-white text-lg px-10 py-3.5 rounded-full hover:bg-[#0077ED] transition-all duration-300 hover:scale-105 font-medium shadow-lg shadow-[#0071e3]/20"
          >
            Crear cuenta gratuita
          </Link>
          <Link
            href="/login"
            className="text-[#0071e3] text-lg px-10 py-3.5 rounded-full hover:bg-[#0071e3]/5 transition-all duration-300 font-medium"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}
