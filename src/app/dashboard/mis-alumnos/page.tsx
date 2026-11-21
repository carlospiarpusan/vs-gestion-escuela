"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJsonWithRetry } from "@/lib/retry";
import { formatCop } from "@/lib/intl-formatters";
import { normalizeTramitadorNombre, type TramitadorPortalPayload } from "@/lib/tramitadores";

const ESTADO_LABEL = { activo: "Activo", cerrado: "Cerrado", cancelado: "Cancelado" } as const;

export default function MisAlumnosPage() {
  const [data, setData] = useState<TramitadorPortalPayload | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchJsonWithRetry<TramitadorPortalPayload>("/api/tramitador/mis-alumnos", {
      cache: "no-store",
    })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudieron cargar.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const term = normalizeTramitadorNombre(search);
    if (!data || !term) return data?.rows ?? [];
    return data.rows.filter(
      (row) =>
        normalizeTramitadorNombre(row.alumno_nombre).includes(term) ||
        (row.alumno_documento ?? "").includes(term)
    );
  }, [data, search]);

  const showCommission = data?.tramitador.tipo === "comision";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Mis alumnos</h2>
        {data ? (
          <p className="mt-0.5 text-sm text-[#86868b]">
            {data.tramitador.nombre} · {data.rows.length} alumnos
          </p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      {data ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-y border-[var(--surface-border)] py-3 sm:grid-cols-4">
          {[
            ["Valor cursos", data.totales.valor_curso],
            ["Abonado", data.totales.abonado],
            ["Saldo", data.totales.saldo],
            ...(showCommission ? [["Comisión", data.totales.comision] as const] : []),
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-[#86868b]">{label}</dt>
              <dd className="text-base font-semibold text-[#1d1d1f] tabular-nums dark:text-[#f5f5f7]">
                {formatCop(value as number)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div>
        <label htmlFor="mis-alumnos-buscar" className="sr-only">
          Buscar alumno
        </label>
        <input
          id="mis-alumnos-buscar"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o cédula"
          className="apple-input sm:max-w-xs"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[var(--surface-border)] text-left text-xs font-medium tracking-wide text-[#86868b] uppercase">
              <th className="py-2.5 pr-3">Alumno</th>
              <th className="px-3 py-2.5">Curso</th>
              <th className="px-3 py-2.5 text-right">Valor</th>
              <th className="px-3 py-2.5 text-right">Abonado</th>
              <th className="px-3 py-2.5 text-right">Saldo</th>
              {showCommission ? <th className="py-2.5 pl-3 text-right">Comisión</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {!data && !error ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[#86868b]">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[#86868b]">
                  Sin alumnos asignados.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.matricula_id}
                  className={row.estado === "cancelado" ? "opacity-55" : ""}
                >
                  <td className="py-2.5 pr-3 align-top">
                    <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {row.alumno_nombre}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {[row.alumno_documento, row.alumno_telefono, row.alumno_email]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <p className="text-[var(--gray-700)] dark:text-[#d2d2d7]">
                      {row.categorias.join(", ") || "—"}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {[row.numero_contrato, row.fecha_inscripcion, ESTADO_LABEL[row.estado]]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right align-top tabular-nums">
                    {formatCop(row.valor_curso)}
                  </td>
                  <td className="px-3 py-2.5 text-right align-top tabular-nums">
                    {formatCop(row.abonado)}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right align-top font-medium tabular-nums ${row.saldo > 0 ? "text-[#1d1d1f] dark:text-[#f5f5f7]" : "text-green-700 dark:text-green-400"}`}
                  >
                    {formatCop(row.saldo)}
                  </td>
                  {showCommission ? (
                    <td className="py-2.5 pl-3 text-right align-top tabular-nums">
                      {row.comision !== null ? formatCop(row.comision) : "—"}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
