"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Download, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatCop } from "@/lib/intl-formatters";
import { APP_TIME_ZONE, getTodayDateString } from "@/lib/date-utils";
import { MONTH_OPTIONS } from "@/lib/accounting-dashboard";
import { analysisSheets, type SchoolAnalysis } from "@/lib/analytics/school-analysis";

type Filters = { year: string; month: string; sede_id: string; escuela_id: string };
const control =
  "min-h-11 w-full min-w-0 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-base sm:text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-medium disabled:opacity-50";
const section = "min-w-0 scroll-mt-24 border-t border-[var(--surface-border)] py-5";
const muted = "text-[var(--gray-500)]";
const labels: Record<string, string> = {
  combustible: "Combustible",
  mantenimiento_vehiculo: "Mantenimiento vehicular",
  alquiler: "Alquiler",
  servicios: "Servicios",
  nominas: "Nómina",
  seguros: "Seguros",
  material_didactico: "Material didáctico",
  marketing: "Marketing",
  impuestos: "Impuestos",
  suministros: "Suministros",
  reparaciones: "Reparaciones",
  tramitador: "Tramitadores",
  otros: "Otros",
};
function range(from: string, to: string) {
  return `${from.split("-").reverse().join("/")} – ${to.split("-").reverse().join("/")}`;
}
function change(value: number | null) {
  return value === null ? "Sin base comparable" : `${value > 0 ? "+" : ""}${value}%`;
}

export default function SchoolAnalysisPage() {
  const { perfil } = useAuth();
  const params = useSearchParams();
  // Reset local filters and results when the authorized context or URL changes.
  const context = JSON.stringify([
    perfil?.id,
    perfil?.rol,
    perfil?.escuela_id,
    perfil?.sede_id,
    params.toString(),
  ]);
  return <SchoolAnalysisView key={context} />;
}

function SchoolAnalysisView() {
  const { perfil } = useAuth();
  const params = useSearchParams();
  const today = getTodayDateString();
  const initial = (): Filters => ({
    year: params.get("year") || today.slice(0, 4),
    month: params.get("month") || today.slice(5, 7),
    sede_id: params.get("sede_id") || "",
    escuela_id: params.get("escuela_id") || "",
  });
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);
  const [refresh, setRefresh] = useState(0);
  const [report, setReport] = useState<SchoolAnalysis | null>(null);
  const [branches, setBranches] = useState<SchoolAnalysis["branches"]>([]);
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const requestId = useRef(0);
  const role = perfil?.rol;
  const allowed =
    role && ["super_admin", "admin_escuela", "admin_sede", "administrativo"].includes(role);
  const limited = role === "admin_sede" || role === "administrativo";

  useEffect(() => {
    if (!perfil?.id || !allowed) return;
    const id = ++requestId.current;
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setReport(null);
    setExportError("");
    const query = new URLSearchParams({ year: applied.year, month: applied.month });
    if (applied.sede_id && !limited) query.set("sede_id", applied.sede_id);
    if (applied.escuela_id && role === "super_admin") query.set("escuela_id", applied.escuela_id);
    if (refresh) query.set("fresh", "1");
    void (async () => {
      try {
        const response = await fetch(`/api/reportes/analisis?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = await response.json().catch(() => {
          throw new Error("No se pudo cargar el análisis. Vuelve a intentarlo.");
        });
        if (!response.ok) throw new Error(payload?.error || "No se pudo cargar el análisis.");
        if (!active || id !== requestId.current) return;
        setReport(payload);
        setBranches(payload.branches);
        if (Array.isArray(payload.schools)) setSchools(payload.schools);
      } catch (cause) {
        if (!active || controller.signal.aborted || id !== requestId.current) return;
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el análisis.");
      } finally {
        if (active && id === requestId.current) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
      requestId.current += 1;
    };
  }, [perfil?.id, perfil?.escuela_id, perfil?.sede_id, role, allowed, limited, applied, refresh]);

  const apply = () => {
    setApplied({ ...draft });
    setRefresh((n) => n + 1);
  };
  async function exportReport() {
    if (!report || loading || exporting) return;
    setExporting(true);
    setExportError("");
    const id = requestId.current;
    try {
      const { downloadSpreadsheetWorkbook } = await import("@/lib/spreadsheet-export");
      if (id !== requestId.current) return;
      await downloadSpreadsheetWorkbook(
        `analisis-${report.window.year}-${report.window.month ?? "anual"}.xlsx`,
        analysisSheets(report)
      );
    } catch {
      setExportError("No se pudo exportar el análisis. Vuelve a intentarlo.");
    } finally {
      setExporting(false);
    }
  }
  if (perfil && !allowed) return <p role="alert">Tu rol no tiene acceso a estos informes.</p>;
  const years = Array.from(
    { length: Number(today.slice(0, 4)) - 1999 },
    (_, i) => Number(today.slice(0, 4)) - i
  );
  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-6" aria-busy={loading}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/dashboard/informes"
            className={`inline-flex min-h-11 items-center gap-1 text-sm ${muted}`}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Informes
          </Link>
          <h1 className="text-2xl font-semibold">Análisis</h1>
        </div>
        <button
          type="button"
          className={button}
          disabled={!report || loading || exporting}
          onClick={() => void exportReport()}
        >
          <Download size={16} aria-hidden="true" />
          {exporting ? "Exportando…" : "Excel"}
        </button>
      </header>

      <form
        className={`grid grid-cols-2 items-end gap-3 border-y border-[var(--surface-border)] py-4 ${role === "super_admin" ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        {role === "super_admin" && (
          <label className="min-w-0 text-sm">
            Escuela
            <select
              className={`mt-1 ${control}`}
              value={draft.escuela_id}
              onChange={(e) => setDraft((s) => ({ ...s, escuela_id: e.target.value, sede_id: "" }))}
            >
              <option value="">Consolidado plataforma</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="min-w-0 text-sm">
          Año
          <select
            className={`mt-1 ${control}`}
            value={draft.year}
            onChange={(e) => setDraft((s) => ({ ...s, year: e.target.value, month: "all" }))}
          >
            {years.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-sm">
          Mes
          <select
            className={`mt-1 ${control}`}
            value={draft.month}
            onChange={(e) => setDraft((s) => ({ ...s, month: e.target.value }))}
          >
            <option value="all">Todo el año</option>
            {MONTH_OPTIONS.filter((m) => m.value).map((m) => (
              <option
                key={m.value}
                value={m.value}
                disabled={
                  draft.year === today.slice(0, 4) && Number(m.value) > Number(today.slice(5, 7))
                }
              >
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-sm">
          Sede
          <select
            className={`mt-1 ${control}`}
            value={limited ? (perfil?.sede_id ?? "") : draft.sede_id}
            disabled={limited || !branches.length}
            onChange={(e) => setDraft((s) => ({ ...s, sede_id: e.target.value }))}
          >
            {!limited && <option value="">Todas</option>}
            {branches.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading || !perfil}
          className={`${button} bg-[var(--surface-muted)]`}
        >
          <RefreshCw size={16} aria-hidden="true" className={loading ? "animate-spin" : ""} />
          {loading ? "Cargando…" : "Actualizar"}
        </button>
      </form>
      {exportError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {exportError}
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-2 border-l-2 border-red-500 pl-3 text-sm">
          <p>{error}</p>
          <button type="button" className={button} onClick={apply}>
            <RefreshCw size={16} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}
      {loading && (
        <div role="status" className="min-h-64 animate-pulse space-y-4 py-4">
          <p className={`text-sm ${muted}`}>Consultando registros…</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-20 bg-[var(--surface-muted)]" />
            ))}
          </div>
        </div>
      )}
      {report && !loading && <AnalysisResults report={report} />}
    </div>
  );
}

function AnalysisResults({ report }: { report: SchoolAnalysis }) {
  const { window, current, previous, quality, portfolio } = report;
  const maxCourse = Math.max(1, ...report.courses.map((r) => r.count));
  const maxDebt = Math.max(1, ...portfolio.aging.map((r) => r.balance));
  const noActivity =
    !current.enrollments &&
    !current.collectedCount &&
    !current.expenseCount &&
    !current.pendingExpenses;
  return (
    <>
      <div className={`space-y-1 text-xs ${muted}`}>
        <p>
          Sede:{" "}
          {report.scope.branchId
            ? (report.branches.find((branch) => branch.id === report.scope.branchId)?.name ??
              "Sede asignada")
            : "Todas"}
        </p>
        <p>
          {range(window.current.from, window.current.to)}
          {window.partial ? " · Corte parcial" : ""}
        </p>
        <p>Comparación: {range(window.previous.from, window.previous.to)}</p>
        <p>
          Actualizado{" "}
          {new Intl.DateTimeFormat("es-CO", {
            timeZone: APP_TIME_ZONE,
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(report.generatedAt))}{" "}
          · Bogotá
        </p>
      </div>
      {noActivity && (
        <p role="status" className="border-l-2 border-[var(--surface-border)] pl-3 text-sm">
          Sin movimientos registrados en este período. La cartera y la calidad corresponden al
          historial actual.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 py-2 lg:grid-cols-4">
        {[
          {
            label: "Matrículas",
            value: current.enrollments.toLocaleString("es-CO"),
            before: previous.enrollments.toLocaleString("es-CO"),
            delta: report.changes.enrollments,
          },
          {
            label: "Recaudo",
            value: formatCop(current.collected),
            before: formatCop(previous.collected),
            delta: report.changes.collected,
          },
          {
            label: "Gastos pagados",
            value: formatCop(current.paidExpenses),
            before: formatCop(previous.paidExpenses),
            delta: report.changes.paidExpenses,
          },
          {
            label: "Flujo registrado",
            value: formatCop(current.cashFlow),
            before: formatCop(previous.cashFlow),
            delta: undefined,
          },
        ].map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className={`text-sm ${muted}`}>{m.label}</dt>
            <dd className="mt-1 text-xl font-semibold break-words tabular-nums">{m.value}</dd>
            <dd className={`mt-1 text-xs ${muted}`}>Anterior: {m.before}</dd>
            {m.delta !== undefined && (
              <dd className="mt-1 text-xs tabular-nums">{change(m.delta)}</dd>
            )}
          </div>
        ))}
      </dl>
      <p className={`text-xs ${muted}`}>
        Flujo = recaudo menos gastos pagados. No es utilidad; el recaudo puede incluir valores para
        terceros. Gastos pendientes del corte: {formatCop(current.pendingExpenses)}.
      </p>

      <section className={section} aria-labelledby="analysis-signals">
        <h2 id="analysis-signals" className="mb-3 text-base font-semibold">
          Señales
        </h2>
        {report.alerts.length ? (
          <ul className="divide-y divide-[var(--surface-border)]">
            {report.alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-3">
                {a.tone === "attention" ? (
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                ) : (
                  <Info
                    size={18}
                    className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium">{a.title}</h3>
                  <p className={`mt-1 text-sm ${muted}`}>{a.detail}</p>
                </div>
                <Link
                  href={a.href}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center"
                  aria-label={`Revisar: ${a.title}`}
                  title={`Revisar: ${a.title}`}
                >
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-sm ${muted}`}>
            Sin señales en los datos disponibles para estas reglas.
          </p>
        )}
      </section>

      <section className={section} aria-labelledby="analysis-months">
        <h2 id="analysis-months" className="mb-3 scroll-mt-24 text-base font-semibold">
          Evolución del período
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <thead>
              <tr className={`border-b border-[var(--surface-border)] ${muted}`}>
                <th className="py-2 pr-3 font-medium">Mes</th>
                <th className="px-3 py-2 text-right font-medium">Matrículas</th>
                <th className="px-3 py-2 text-right font-medium">Recaudo</th>
                <th className="py-2 pl-3 text-right font-medium">Gastos pagados</th>
              </tr>
            </thead>
            <tbody>
              {report.monthly.map((r) => (
                <tr key={r.month} className="border-b border-[var(--surface-border)]">
                  <th className="py-3 pr-3 font-normal whitespace-nowrap">{r.month}</th>
                  <td className="px-3 py-3 text-right">{r.enrollments}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {formatCop(r.collected)}
                  </td>
                  <td className="py-3 pl-3 text-right whitespace-nowrap">
                    {formatCop(r.paidExpenses)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid min-w-0 gap-x-8 lg:grid-cols-2">
        <section className={section} aria-labelledby="analysis-courses">
          <h2 id="analysis-courses" className="mb-3 scroll-mt-24 text-base font-semibold">
            Matrículas por curso
          </h2>
          {report.courses.length ? (
            <ul className="space-y-4">
              {report.courses.map((r) => (
                <li key={r.label}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="min-w-0 break-words">{r.label}</span>
                    <span className="tabular-nums">{r.count}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface-muted)]" aria-hidden="true">
                    <div
                      className="h-full bg-[#0071e3]"
                      style={{ width: `${(r.count / maxCourse) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm ${muted}`}>Sin matrículas registradas.</p>
          )}
        </section>
        <section className={section} aria-labelledby="analysis-expenses">
          <h2 id="analysis-expenses" className="mb-3 scroll-mt-24 text-base font-semibold">
            Gastos pagados por categoría
          </h2>
          {report.expenses.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={muted}>
                    <th className="py-2 pr-3 font-medium">Categoría</th>
                    <th className="py-2 text-right font-medium">Seleccionado</th>
                    <th className="py-2 pl-3 text-right font-medium">Anterior</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenses.map((r) => (
                    <tr key={r.category} className="border-t border-[var(--surface-border)]">
                      <th className="py-3 pr-3 font-normal">{labels[r.category] ?? r.category}</th>
                      <td className="py-3 text-right whitespace-nowrap tabular-nums">
                        {formatCop(r.current)}
                      </td>
                      <td className="py-3 pl-3 text-right whitespace-nowrap tabular-nums">
                        {formatCop(r.previous)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={`text-sm ${muted}`}>Sin gastos pagados en los períodos comparados.</p>
          )}
        </section>
      </div>

      <section className={section} aria-labelledby="analysis-debt">
        <h2 id="analysis-debt" className="scroll-mt-24 text-base font-semibold">
          Cartera actual · {range(window.today, window.today).split(" – ")[0]}
        </h2>
        <dl className="my-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            ["Saldo por cobrar", portfolio.balance],
            ["Cuotas vencidas registradas", portfolio.overdue],
            ["Sin programación completa", portfolio.withoutSchedule],
          ].map(([label, value]) => (
            <div className="min-w-0" key={label}>
              <dt className={`text-sm ${muted}`}>{label}</dt>
              <dd className="mt-1 font-semibold break-words tabular-nums">
                {formatCop(Number(value))}
              </dd>
            </div>
          ))}
        </dl>
        <h3 className={`mb-3 text-sm ${muted}`}>Antigüedad desde el registro, no días de mora</h3>
        {portfolio.aging.length ? (
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {portfolio.aging.map((r) => (
              <li key={r.bucket}>
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
                  <span>
                    {r.bucket} días · {r.count} saldos
                  </span>
                  <span className="tabular-nums">{formatCop(r.balance)}</span>
                </div>
                <div className="h-1.5 bg-[var(--surface-muted)]" aria-hidden="true">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-400"
                    style={{ width: `${(r.balance / maxDebt) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-sm ${muted}`}>Sin saldos pendientes en los registros disponibles.</p>
        )}
      </section>
      <section
        id="calidad-datos"
        className={`${section} scroll-mt-24`}
        aria-labelledby="analysis-quality"
      >
        <h2 id="analysis-quality" className="text-base font-semibold">
          Calidad del historial
        </h2>
        <p className={`mt-2 text-xs ${muted}`}>
          {quality.students} alumnos revisados en el alcance actual. Primera actividad registrada:{" "}
          {quality.firstActivity ?? "Sin historial"}. Esto no acredita que el historial esté
          completo.
        </p>
        <dl className="mt-3 divide-y divide-[var(--surface-border)]">
          {[
            ["Contacto incompleto: correo, teléfono o dirección", quality.incompleteContact],
            ["Registros adicionales con documento repetido", quality.duplicateDocuments],
            ["Contratos sin valor positivo", quality.contractsWithoutValue],
            ["Alumnos regulares sin matrícula asociada", quality.regularsWithoutContract],
            ["Recaudos de alumnos regulares sin contrato", quality.unlinkedCollections],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2 text-sm">
              <dt>{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
