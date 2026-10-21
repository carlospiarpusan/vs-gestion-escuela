"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardCatalogCached } from "@/lib/dashboard-client-cache";
import { fetchJsonWithRetry } from "@/lib/retry";
import type { StudentOption, StudentOptionsResponse } from "@/lib/student-options";

export default function StudentSearch({
  value,
  onChange,
  emptyLabel = "Sin alumno",
}: {
  value: string;
  onChange: (id: string) => void;
  emptyLabel?: string;
}) {
  const { perfil } = useAuth();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const scopeKey = `${perfil?.id}:${perfil?.rol}:${perfil?.escuela_id}:${perfil?.sede_id}`;
  const selectionKey = `${scopeKey}:${value}`;
  const requestKey = `${scopeKey}:${query.trim()}:${page}`;
  const [selection, setSelection] = useState<{
    key: string;
    student: StudentOption | null;
    error?: string;
  }>({ key: "", student: null });
  const selected = selection.key === selectionKey ? selection.student : null;
  const [response, setResponse] = useState<{
    key: string;
    payload: StudentOptionsResponse;
    error?: string;
  }>({ key: "", payload: { rows: [], hasMore: false } });
  const result = response.key === requestKey ? response.payload : { rows: [], hasMore: false };
  const loading = open && query.trim().length >= 2 && response.key !== requestKey;
  const error =
    response.key === requestKey
      ? response.error
      : selection.key === selectionKey
        ? selection.error
        : "";
  const label = (student: StudentOption) =>
    `${student.nombre} ${student.apellidos}${student.dni ? ` · ${student.dni}` : ""}`;

  useEffect(() => {
    let active = true;
    if (!value || !perfil?.escuela_id) return;
    const params = new URLSearchParams({ id: value, escuela_id: perfil.escuela_id });
    void getDashboardCatalogCached<StudentOptionsResponse>({
      name: "student-options",
      scope: {
        id: perfil.id,
        rol: perfil.rol,
        escuelaId: perfil.escuela_id,
        sedeId: perfil.sede_id,
      },
      params,
      loader: () => fetchJsonWithRetry(`/api/alumnos/opciones?${params}`),
    })
      .then((payload) => {
        if (active) setSelection({ key: selectionKey, student: payload.rows[0] || null });
      })
      .catch(() => {
        if (active)
          setSelection({
            key: selectionKey,
            student: null,
            error: "No se pudo cargar el alumno seleccionado.",
          });
      });
    return () => {
      active = false;
    };
  }, [value, selectionKey, perfil?.id, perfil?.rol, perfil?.escuela_id, perfil?.sede_id]);

  useEffect(() => {
    let active = true;
    if (!open || query.trim().length < 2 || !perfil?.escuela_id) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q: query.trim(),
        page: String(page),
        escuela_id: perfil.escuela_id!,
      });
      void getDashboardCatalogCached<StudentOptionsResponse>({
        name: "student-options",
        scope: {
          id: perfil.id,
          rol: perfil.rol,
          escuelaId: perfil.escuela_id,
          sedeId: perfil.sede_id,
        },
        params,
        loader: () => fetchJsonWithRetry(`/api/alumnos/opciones?${params}`),
      })
        .then((payload) => {
          if (active) setResponse({ key: requestKey, payload });
        })
        .catch(() => {
          if (active)
            setResponse({
              key: requestKey,
              payload: { rows: [], hasMore: false },
              error: "No se pudieron buscar los alumnos. Intenta de nuevo.",
            });
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, page, open, requestKey, perfil?.id, perfil?.rol, perfil?.escuela_id, perfil?.sede_id]);

  const choose = (student: StudentOption) => {
    setSelection({ key: `${scopeKey}:${student.id}`, student });
    setQuery("");
    setOpen(false);
    setPage(0);
    onChange(student.id);
  };
  return (
    <div
      ref={root}
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id} className="apple-label">
        Alumno
      </label>
      <input
        id={id}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && query.trim().length >= 2}
        aria-controls={`${id}-results`}
        aria-activedescendant={
          activeIndex >= 0 && activeIndex < result.rows.length
            ? `${id}-option-${activeIndex}`
            : undefined
        }
        value={query}
        placeholder="Nombre, cédula o contrato"
        className="apple-input"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(0);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!result.rows.length) return;
            setOpen(true);
            setActiveIndex((i) =>
              Math.max(
                0,
                Math.min(result.rows.length - 1, i + (event.key === "ArrowDown" ? 1 : -1))
              )
            );
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (open && activeIndex >= 0 && result.rows[activeIndex])
              choose(result.rows[activeIndex]);
          }
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />
      <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--gray-500)]">
        <span className="truncate">
          {value ? (selected?.id === value ? label(selected) : "Alumno seleccionado") : emptyLabel}
        </span>
        {value && (
          <button
            type="button"
            className="shrink-0 px-1 py-2 text-[var(--blue-apple)]"
            aria-label="Quitar alumno"
            onClick={() => {
              onChange("");
            }}
          >
            Quitar
          </button>
        )}
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute inset-x-0 z-30 mt-1 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-strong)] p-1 shadow-lg">
          <ul
            id={`${id}-results`}
            role="listbox"
            aria-label="Alumnos encontrados"
            className="max-h-48 overflow-y-auto"
          >
            {result.rows.map((student, index) => (
              <li key={student.id} role="presentation">
                <button
                  id={`${id}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={student.id === value}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-muted)] ${index === activeIndex ? "bg-[var(--surface-muted)]" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(student)}
                >
                  {label(student)}
                </button>
              </li>
            ))}
          </ul>
          <p role="status" className="px-3 py-1 text-xs text-[var(--gray-500)]">
            {loading ? "Buscando..." : error || (!result.rows.length ? "Sin resultados" : "")}
          </p>
          {(page > 0 || result.hasMore) && (
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <button
                type="button"
                disabled={page === 0 || loading}
                className="px-2 py-2 disabled:opacity-40"
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>Página {page + 1}</span>
              <button
                type="button"
                disabled={!result.hasMore || loading}
                className="px-2 py-2 disabled:opacity-40"
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
      {!open && error && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
