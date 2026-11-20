"use client";

import { normalizeTramitadorNombre, type TramitadorOption } from "@/lib/tramitadores";

type TramitadorFieldsProps = {
  idPrefix: string;
  options: TramitadorOption[];
  nombre: string;
  valor: string;
  disabled?: boolean;
  required?: boolean;
  labelClassName: string;
  inputClassName: string;
  valorLabelSuffix?: string;
  onChange: (next: { tramitador_nombre: string; tramitador_valor: string }) => void;
};

export function findTramitadorOption(options: TramitadorOption[], nombre: string) {
  const key = normalizeTramitadorNombre(nombre);
  return key
    ? (options.find((option) => normalizeTramitadorNombre(option.nombre) === key) ?? null)
    : null;
}

/**
 * Selector del catálogo de tramitadores. Al elegir uno de tipo comisión se propone
 * su comisión fija (editable); los de tipo descuento no generan gasto.
 */
export default function TramitadorFields({
  idPrefix,
  options,
  nombre,
  valor,
  disabled = false,
  required = false,
  labelClassName,
  inputClassName,
  valorLabelSuffix,
  onChange,
}: TramitadorFieldsProps) {
  const selected = findTramitadorOption(options, nombre);
  // Un nombre histórico que ya no está en el catálogo se conserva visible.
  const legacyName = nombre.trim() && !selected ? nombre.trim() : null;
  const selectId = `${idPrefix}-tramitador`;
  const valorId = `${idPrefix}-tramitador-valor`;

  return (
    <>
      <div>
        <label htmlFor={selectId} className={labelClassName}>
          Tramitador{required ? " *" : ""}
        </label>
        <select
          id={selectId}
          required={required}
          disabled={disabled}
          value={selected?.nombre ?? legacyName ?? ""}
          onChange={(event) => {
            const option = findTramitadorOption(options, event.target.value);
            onChange({
              tramitador_nombre: event.target.value,
              tramitador_valor:
                option?.tipo === "comision" && option.comision_valor !== null
                  ? String(option.comision_valor)
                  : option?.tipo === "descuento"
                    ? ""
                    : valor,
            });
          }}
          className={inputClassName}
        >
          <option value="">Selecciona</option>
          {legacyName ? <option value={legacyName}>{legacyName}</option> : null}
          {options.map((option) => (
            <option key={option.id} value={option.nombre}>
              {option.nombre}
              {option.tipo === "descuento" ? " · descuento" : ""}
            </option>
          ))}
        </select>
        {options.length === 0 ? (
          <p className="mt-1 text-[11px] text-[#86868b]">
            Sin tramitadores. Créalos en Configuración › Tramitadores.
          </p>
        ) : null}
      </div>
      {selected?.tipo === "descuento" ? (
        <p className="self-end pb-2 text-xs text-[#86868b]">
          Descuento ya aplicado en el valor del curso. No genera gasto.
        </p>
      ) : (
        <div>
          <label htmlFor={valorId} className={labelClassName}>
            Comisión{valorLabelSuffix ? ` ${valorLabelSuffix}` : ""}
          </label>
          <input
            id={valorId}
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="0"
            value={valor}
            disabled={disabled}
            onChange={(event) =>
              onChange({ tramitador_nombre: nombre, tramitador_valor: event.target.value })
            }
            className={inputClassName}
          />
        </div>
      )}
    </>
  );
}
