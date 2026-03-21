"use client";

import { Building2 } from "lucide-react";
import type { DashboardSchoolOption } from "@/lib/dashboard-scope";

type DashboardSchoolSwitcherProps = {
  compact?: boolean;
  activeEscuelaId?: string | null;
  schoolOptions?: DashboardSchoolOption[];
  onSchoolChange?: (schoolId: string) => void | Promise<void>;
};

export default function DashboardSchoolSwitcher({
  compact = false,
  activeEscuelaId,
  schoolOptions = [],
  onSchoolChange,
}: DashboardSchoolSwitcherProps) {
  if (compact || schoolOptions.length === 0 || !onSchoolChange) {
    return null;
  }

  return (
    <div className="px-3 pb-3">
      <div className="apple-panel-muted rounded-[22px] p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="apple-brand-mark flex h-8 w-8 items-center justify-center rounded-2xl">
            <Building2 size={15} />
          </span>
          <div>
            <p className="apple-kicker">Escuela activa</p>
            <p className="apple-copy text-xs">
              Cambia el alcance operativo del panel.
            </p>
          </div>
        </div>

        <select
          value={activeEscuelaId ?? ""}
          onChange={(event) => {
            void onSchoolChange(event.target.value);
          }}
          className="apple-select"
          aria-label="Seleccionar escuela activa"
        >
          {schoolOptions.map((school) => (
            <option key={school.id} value={school.id}>
              {school.nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
