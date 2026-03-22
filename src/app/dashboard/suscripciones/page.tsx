"use client";

import { Construction } from "lucide-react";

export default function SuscripcionesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          Pagos y Suscripciones
        </h2>
        <p className="mt-1 text-sm text-[#86868b]">
          Gestiona la facturación, los métodos de pago y el estado de cuenta de cada escuela
          afiliada.
        </p>
      </div>

      <div className="apple-panel-muted flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
          <Construction size={26} className="text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          Módulo en desarrollo
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#86868b]">
          El sistema de pagos y suscripciones para escuelas afiliadas estará disponible
          próximamente. Incluirá facturación automática, control de planes y métodos de pago.
        </p>
      </div>
    </div>
  );
}
