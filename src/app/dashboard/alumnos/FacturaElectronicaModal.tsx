"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Mail,
  Minus,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import Modal from "@/components/dashboard/Modal";
import { getTodayDateString } from "@/lib/date-utils";
import {
  INVOICE_STATES,
  invoiceStudent,
  quoteMatchesStudent,
  type ContractInvoice,
  type FacturaxCatalog,
  type FacturaxQuote,
} from "@/lib/vs-billing/facturax-contract";
import { formatMatriculaLabel, type AlumnoRow } from "./constants";
import {
  getStudentInvoiceIssues,
  getQuotedCustomerIssues,
  INVOICE_FIELD_LABELS,
  INVOICE_DATA_CODE,
  invoiceDataIssuesSchema,
  InvoiceDataIncompleteError,
  type InvoiceContactSnapshot,
  type InvoiceDataIssue,
} from "@/lib/vs-billing/student-invoice-data";
import InvoiceContactEditor from "./InvoiceContactEditor";
import {
  createBillingProductSearch,
  readBillingProductUsage,
  rememberBillingProducts,
} from "@/lib/vs-billing/product-usage";

const API = "/api/alumnos/factura-electronica";
const invoiceCurrencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 2,
});
const money = (value: number) => invoiceCurrencyFormatter.format(value / 100);
const control =
  "w-full min-w-0 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm";
function productIssue(product: FacturaxCatalog["products"][number]) {
  if (product.available) return null;
  const issues: string[] = [];
  if (product.taxTreatment === "unconfigured" || (product.taxTreatment === "vat" && !product.tax))
    issues.push("Falta definir el tratamiento de IVA");
  if (product.price <= 0) issues.push("Falta definir un precio mayor que cero");
  return `${issues.length ? issues.join(". ") : "Revisar los datos fiscales"} en FacturaX.`;
}
async function request<T>(body: unknown): Promise<T> {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    const issues = invoiceDataIssuesSchema.safeParse(result.issues);
    if (result.code === INVOICE_DATA_CODE && issues.success)
      throw new InvoiceDataIncompleteError(issues.data, result.error);
    throw new Error(result.error ?? "No se pudo completar la operacion.");
  }
  return result;
}
async function fetchInvoices(
  alumnoId: string
): Promise<{ enabled: boolean; contact?: InvoiceContactSnapshot; invoices: ContractInvoice[] }> {
  const response = await fetch(`${API}?alumnoId=${encodeURIComponent(alumnoId)}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "No se pudo consultar FacturaX.");
  return result;
}

export default function FacturaElectronicaModal({
  alumno,
  onClose,
  onEditStudent,
  userId,
}: {
  alumno: AlumnoRow;
  onClose: () => void;
  onEditStudent?: () => void;
  userId?: string | null;
}) {
  const [contractId, setContractId] = useState(
    alumno.matriculas.length === 1 ? alumno.matriculas[0].id : ""
  );
  const [invoices, setInvoices] = useState<ContractInvoice[]>([]);
  const [contact, setContact] = useState<InvoiceContactSnapshot | null>(null);
  const [remoteIssues, setRemoteIssues] = useState<InvoiceDataIssue[]>([]);
  const [editingContact, setEditingContact] = useState(false);
  const [contactRevision, setContactRevision] = useState(0);
  const handleIncomplete = useCallback((nextIssues: InvoiceDataIssue[]) => {
    setRemoteIssues(nextIssues);
    setEditingContact(true);
  }, []);
  const [enabled, setEnabled] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const result = await fetchInvoices(alumno.id);
    setInvoices(result.invoices);
    setEnabled(result.enabled);
    if (result.contact) setContact(result.contact);
    else if (result.enabled)
      throw new Error("No se pudieron recuperar los datos del alumno. Recarga la pagina.");
  }, [alumno.id]);
  useEffect(() => {
    let mounted = true;
    void fetchInvoices(alumno.id)
      .then((result) => {
        if (mounted) {
          setInvoices(result.invoices);
          setEnabled(result.enabled);
          if (result.contact) setContact(result.contact);
          else if (result.enabled)
            setError("No se pudieron recuperar los datos del alumno. Recarga la pagina.");
        }
      })
      .catch((e) => {
        if (mounted) setError(e.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [alumno.id]);
  const contract = alumno.matriculas.find((m) => m.id === contractId);
  const contactIssues = contact ? getStudentInvoiceIssues(contact) : [];
  const contactComplete = !!contact && contactIssues.length === 0;
  const issues = [
    ...new Map([...contactIssues, ...remoteIssues].map((issue) => [issue.field, issue])).values(),
  ];
  const identityMissing = contactIssues.some((issue) =>
    ["student.name", "student.document", "student.documentType"].includes(issue.field)
  );
  const requiresContactEditor = editingContact || issues.length > 0;
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Factura electronica"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        <div>
          <h4 className="font-semibold break-words">
            {contact?.nombre ?? alumno.nombre} {contact?.apellidos ?? alumno.apellidos}
          </h4>
          <p className="text-sm text-[var(--gray-500)]">
            {contact?.tipo_documento ?? alumno.tipo_documento} {contact?.dni ?? alumno.dni}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="flex items-center gap-2 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Consultando facturas...
          </p>
        ) : !enabled ? (
          <p className="text-sm">La conexion de emision con FacturaX esta pendiente de activar.</p>
        ) : (
          <>
            {issues.length > 0 && (
              <div role="alert" className="space-y-2 text-sm text-red-600">
                <p>Completa o revisa los datos antes de emitir:</p>
                <ul className="grid list-disc grid-cols-2 gap-x-4 gap-y-1 pl-4">
                  {issues.map((issue) => (
                    <li key={issue.field} className="min-w-0 break-words" title={issue.message}>
                      {INVOICE_FIELD_LABELS[issue.field] ?? issue.field}
                    </li>
                  ))}
                </ul>
                {remoteIssues.map((issue) => (
                  <p key={issue.field}>{issue.message}</p>
                ))}
              </div>
            )}
            {identityMissing && onEditStudent && (
              <button
                type="button"
                disabled={busy}
                onClick={onEditStudent}
                className="apple-button-secondary"
              >
                <Pencil size={16} />
                Editar identificacion del alumno
              </button>
            )}
            {contact && requiresContactEditor ? (
              <InvoiceContactEditor
                key={`${contact.version}:${contactRevision}`}
                contact={contact}
                disabled={busy}
                onBusy={setBusy}
                onReload={async () => {
                  await load();
                  setContactRevision((n) => n + 1);
                }}
                onSave={async (value) => {
                  const result = await request<{ contact: InvoiceContactSnapshot }>({
                    action: "billing_contact",
                    alumnoId: alumno.id,
                    version: contact.version,
                    contact: value,
                  });
                  return result.contact;
                }}
                onSaved={(updated) => {
                  setContact(updated);
                  setRemoteIssues([]);
                  setEditingContact(false);
                  setContactRevision((n) => n + 1);
                }}
              />
            ) : contact ? (
              <div className="space-y-3 border-y border-[var(--surface-border)] py-4">
                <label htmlFor="invoice-student-email" className="block text-sm font-medium">
                  Correo electronico del alumno
                </label>
                <input
                  id="invoice-student-email"
                  type="email"
                  value={contact.email ?? ""}
                  readOnly
                  className={control}
                />
                <p className="text-sm text-[var(--gray-500)]">
                  {contact.direccion} · {contact.ciudad}, {contact.departamento} ·{" "}
                  {contact.telefono}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditingContact(true)}
                  className="apple-button-secondary"
                >
                  <Pencil size={16} />
                  Editar contacto
                </button>
              </div>
            ) : null}
            <label className="block text-sm font-medium">
              Contrato
              <select
                aria-label="Contrato"
                value={contractId}
                disabled={busy}
                onChange={(e) => setContractId(e.target.value)}
                className={`${control} mt-1`}
              >
                <option value="">Seleccionar contrato</option>
                {alumno.matriculas.map((m) => {
                  const invoice = invoices.find((i) => i.contratoId === m.id);
                  return (
                    <option key={m.id} value={m.id}>
                      {formatMatriculaLabel(m)}
                      {invoice?.status?.number ? ` · Factura ${invoice.status.number}` : ""}
                      {m.estado === "cancelado" ? " · Cancelado" : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            {!alumno.matriculas.length && (
              <p className="text-sm">Este alumno no tiene contratos.</p>
            )}
            {contract && (contactComplete || invoices.some((i) => i.contratoId === contractId)) && (
              <InvoiceForm
                key={`${userId ?? ""}:${contractId}:${contact?.version}:${contactRevision}`}
                userId={userId}
                alumno={{ ...alumno, email: contact?.email ?? alumno.email }}
                contractId={contractId}
                cancelled={contract.estado === "cancelado" || alumno.estado === "inactivo"}
                invoice={invoices.find((i) => i.contratoId === contractId)}
                onBusy={setBusy}
                reload={load}
                contactComplete={contactComplete && !editingContact}
                currentContact={contact}
                onIncomplete={handleIncomplete}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function InvoiceForm({
  userId,
  alumno,
  contractId,
  cancelled,
  invoice,
  onBusy,
  reload,
  contactComplete,
  currentContact,
  onIncomplete,
}: {
  userId?: string | null;
  alumno: AlumnoRow;
  contractId: string;
  cancelled: boolean;
  invoice?: ContractInvoice;
  onBusy: (busy: boolean) => void;
  reload: () => Promise<void>;
  contactComplete: boolean;
  currentContact: InvoiceContactSnapshot | null;
  onIncomplete: (issues: InvoiceDataIssue[]) => void;
}) {
  const [catalog, setCatalog] = useState<FacturaxCatalog | null>(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    lock = useRef(false);
  const [query, setQuery] = useState(""),
    [quantities, setQuantities] = useState<Record<string, string>>({});
  const [productUsage, setProductUsage] = useState(() => readBillingProductUsage(userId));
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [taxChoices, setTaxChoices] = useState<Record<string, string>>({});
  const [method, setMethod] = useState(""),
    [condition, setCondition] = useState<"contado" | "credito">("contado"),
    [dueDate, setDueDate] = useState(getTodayDateString());
  const [delivery, setDelivery] = useState<"email" | "physical">(
    alumno.email ? "email" : "physical"
  );
  const [quote, setQuote] = useState<FacturaxQuote | null>(null),
    [confirmed, setConfirmed] = useState(false);
  const ids = { alumnoId: alumno.id, contratoId: contractId };
  const invoiceId = invoice?.requestId;
  useEffect(() => {
    if (invoiceId || cancelled) return;
    let mounted = true;
    void request<FacturaxCatalog>({
      action: "catalog",
      alumnoId: alumno.id,
      contratoId: contractId,
    })
      .then((data) => {
        if (mounted) {
          setCatalog(data);
          setMethod((current) =>
            data.paymentMethods.includes(current)
              ? current
              : data.paymentMethods.includes("Efectivo")
                ? "Efectivo"
                : ""
          );
          setError("");
          if (data.customerIssues?.length) onIncomplete(data.customerIssues);
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(e.message);
          if (e instanceof InvoiceDataIncompleteError) onIncomplete(e.issues);
        }
      });
    return () => {
      mounted = false;
    };
  }, [alumno.id, contractId, invoiceId, cancelled, onIncomplete]);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (e instanceof InvoiceDataIncompleteError) onIncomplete(e.issues);
      setError(
        e instanceof Error ? e.message : "No se pudo confirmar la operacion. Consulta el estado."
      );
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  async function emit(review: FacturaxQuote) {
    await run(async () => {
      try {
        await request({ action: "emit", ...ids, requestId: review.id, confirmed: true });
      } finally {
        await reload();
        setConfirmed(false);
      }
    });
  }
  const review = invoice ? invoice.status?.quote : quote;
  const pendingReview = !invoice || invoice.status?.state === "quoted";
  const reviewedContactChanged = !!(
    review?.sourceStudent &&
    currentContact &&
    getStudentInvoiceIssues(currentContact).length === 0 &&
    !quoteMatchesStudent(review, invoiceStudent(currentContact))
  );
  const selected = Object.entries(quantities);
  const [productLimit, setProductLimit] = useState(100);
  const searchProducts = useMemo(
    () => createBillingProductSearch(catalog?.products ?? [], productUsage),
    [catalog, productUsage]
  );
  const matchingProducts = useMemo(() => searchProducts(query), [searchProducts, query]);
  const availableCount = useMemo(
    () => catalog?.products.filter((product) => product.available).length ?? 0,
    [catalog]
  );
  return (
    <div className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30"
        >
          {error}
        </p>
      )}
      {invoice && (
        <div className="space-y-3 border-y border-[var(--surface-border)] py-4">
          <div className="flex items-start gap-2">
            <ReceiptText size={20} className="shrink-0" />
            <div>
              <p className="font-semibold">
                {invoice.status?.number ? `Factura ${invoice.status.number}` : "Solicitud guardada"}
              </p>
              <p role="status" className="text-sm">
                {invoice.status ? INVOICE_STATES[invoice.status.state] : "Resultado por confirmar"}
              </p>
            </div>
          </div>
          {invoice.status?.emailState && (
            <p className="text-sm">
              Correo:{" "}
              {
                {
                  sent: "aceptado por el proveedor; recepcion sin confirmar",
                  queued: "pendiente de envio",
                  sending: "enviando",
                  unknown: "resultado por confirmar",
                  failed: "fallo de envio; revisar en FacturaX",
                }[invoice.status.emailState]
              }
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              className="apple-button-secondary"
              onClick={() =>
                run(async () => {
                  await request({ action: "refresh", ...ids });
                  await reload();
                })
              }
            >
              <RefreshCw size={16} />
              Consultar estado
            </button>
            {invoice.status?.state === "accepted" &&
              !["sent", "sending", "unknown", "failed"].includes(
                invoice.status.emailState ?? ""
              ) && (
                <button
                  disabled={busy}
                  className="apple-button-primary"
                  onClick={() =>
                    run(async () => {
                      await request({ action: "email", ...ids, confirmed: true });
                      await reload();
                    })
                  }
                >
                  <Mail size={16} />
                  Enviar al alumno
                </button>
              )}
            {invoice.status?.state === "quoted" && (
              <button
                disabled={busy}
                className="apple-button-secondary"
                onClick={() =>
                  run(async () => {
                    await request({ action: "discard", ...ids, confirmed: true });
                    setQuote(null);
                    setConfirmed(false);
                    await reload();
                  })
                }
              >
                <Trash2 size={16} />
                Descartar preparacion
              </button>
            )}
          </div>
          {invoice.status &&
            ["prepared", "unknown", "rejected", "contingency"].includes(invoice.status.state) && (
              <a
                href="https://www.facturax.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline"
              >
                Revisar documento en FacturaX
              </a>
            )}
        </div>
      )}
      {!invoice && cancelled && (
        <p className="text-sm">
          El contrato o el alumno esta inactivo. No se puede emitir una nueva factura.
        </p>
      )}
      {!invoice && !cancelled && !review && (
        <>
          {!catalog && !error && (
            <p role="status" className="flex gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Cargando productos de FacturaX...
            </p>
          )}
          {catalog && (
            <>
              {catalog.customerIssue && (
                <p role="alert" className="text-sm text-amber-700">
                  {catalog.customerIssue}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p role="status">
                  {availableCount} disponibles
                  {catalog.products.length > availableCount &&
                    ` · ${catalog.products.length - availableCount} pendientes de configurar`}
                </p>
                {catalog.products.length > availableCount && (
                  <a
                    href="https://www.facturax.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Configurar en FacturaX
                  </a>
                )}
              </div>
              <p className="text-sm text-[var(--gray-500)]">
                Los productos más utilizados aparecen primero. {selected.length}{" "}
                {selected.length === 1 ? "seleccionado" : "seleccionados"}.
              </p>
              <label className="flex items-center gap-2">
                <Search size={18} />
                <input
                  aria-label="Buscar productos"
                  className={control}
                  placeholder="Buscar producto o codigo"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setProductLimit(100);
                  }}
                />
              </label>
              <div className="max-h-64 divide-y divide-[var(--surface-border)] overflow-y-auto border-y border-[var(--surface-border)]">
                {matchingProducts.slice(0, productLimit).map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                    <label className="flex min-w-0 flex-1 items-start gap-2">
                      <input
                        type="checkbox"
                        aria-label={p.name}
                        aria-describedby={!p.available ? `product-issue-${p.id}` : undefined}
                        disabled={busy || !p.available}
                        checked={p.id in quantities}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setQuantities((prev) => {
                            const next = { ...prev };
                            if (checked) next[p.id] = "1";
                            else delete next[p.id];
                            return next;
                          });
                        }}
                      />
                      <span className="min-w-0 text-sm">
                        <span className="block font-medium break-words">{p.name}</span>
                        <span className="text-[var(--gray-500)]">
                          {p.priceEditable ? "Precio variable" : money(p.price)}
                          {p.tax
                            ? ` + IVA ${p.tax}%`
                            : p.taxTreatment === "excluded"
                              ? " · Excluido"
                              : p.taxTreatment === "exempt"
                                ? " · Exento"
                                : ""}
                        </span>
                        {!p.available && (
                          <span
                            id={`product-issue-${p.id}`}
                            className="mt-1 block text-xs text-amber-700 dark:text-amber-400"
                          >
                            {productIssue(p)}
                          </span>
                        )}
                      </span>
                    </label>
                    {p.id in quantities && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Reducir cantidad de ${p.name}`}
                          className="apple-icon-button"
                          disabled={busy || Number(quantities[p.id]) <= 1}
                          onClick={() =>
                            setQuantities((prev) => ({
                              ...prev,
                              [p.id]: String(Math.max(1, Math.min(1000, Number(prev[p.id]) - 1))),
                            }))
                          }
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          aria-label={`Cantidad de ${p.name}`}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="1000"
                          step="1"
                          value={quantities[p.id]}
                          disabled={busy}
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            if (/^\d*$/.test(value))
                              setQuantities((prev) => ({ ...prev, [p.id]: value }));
                          }}
                          className={`${control} !w-20 text-center`}
                        />
                        <button
                          type="button"
                          aria-label={`Aumentar cantidad de ${p.name}`}
                          className="apple-icon-button"
                          disabled={busy || Number(quantities[p.id]) >= 1000}
                          onClick={() =>
                            setQuantities((prev) => ({
                              ...prev,
                              [p.id]: String(Math.min(1000, Math.max(1, Number(prev[p.id]) + 1))),
                            }))
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                    {p.id in quantities && (p.priceEditable || p.requiresTaxChoice) && (
                      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                        {p.priceEditable && (
                          <label className="text-sm">
                            Precio unitario sin IVA (COP)
                            <input
                              aria-label={`Precio de ${p.name}`}
                              inputMode="decimal"
                              type="number"
                              min="0.01"
                              max="1000000000"
                              step="0.01"
                              value={prices[p.id] ?? ""}
                              disabled={busy}
                              onChange={(e) =>
                                setPrices((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              className={`${control} mt-1`}
                            />
                          </label>
                        )}
                        {p.requiresTaxChoice && (
                          <label className="text-sm">
                            Tratamiento de IVA
                            <select
                              aria-label={`IVA de ${p.name}`}
                              value={taxChoices[p.id] ?? ""}
                              disabled={busy}
                              onChange={(e) =>
                                setTaxChoices((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              className={`${control} mt-1`}
                            >
                              <option value="">Seleccionar IVA</option>
                              <option value="19">IVA 19%</option>
                              <option value="5">IVA 5%</option>
                              <option value="excluded">Excluido de IVA</option>
                              <option value="exempt">Exento de IVA</option>
                            </select>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {!catalog.products.length && (
                  <p className="py-4 text-sm">No hay productos disponibles en FacturaX.</p>
                )}
                {catalog.products.length > 0 && !matchingProducts.length && (
                  <p className="py-4 text-sm">Sin resultados.</p>
                )}
                {matchingProducts.length > productLimit && (
                  <button
                    className="apple-button-secondary my-2"
                    onClick={() => setProductLimit((limit) => limit + 100)}
                  >
                    Ver mas productos
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Medio de pago
                  <select
                    className={`${control} mt-1`}
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">Seleccionar</option>
                    {catalog.paymentMethods.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Forma de pago
                  <select
                    className={`${control} mt-1`}
                    value={condition}
                    onChange={(e) => {
                      setCondition(e.target.value as typeof condition);
                      setDueDate(getTodayDateString());
                    }}
                    disabled={busy}
                  >
                    <option value="contado">Contado</option>
                    <option value="credito">Credito</option>
                  </select>
                </label>
                {condition === "credito" && (
                  <label className="text-sm">
                    Vencimiento
                    <input
                      type="date"
                      className={`${control} mt-1`}
                      min={getTodayDateString()}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                )}
                <label className="text-sm">
                  Entrega
                  <select
                    className={`${control} mt-1`}
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value as typeof delivery)}
                    disabled={busy}
                  >
                    <option value="email" disabled={!alumno.email}>
                      Correo electronico
                    </option>
                    <option value="physical">Impresa</option>
                  </select>
                </label>
              </div>
              <button
                className="apple-button-primary"
                disabled={
                  busy || !selected.length || !method || !!catalog.customerIssue || !contactComplete
                }
                onClick={() =>
                  run(async () => {
                    const items = selected.map(([productId, value]) => {
                      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1000)
                        throw new Error(
                          "Revisa las cantidades: solo unidades enteras entre 1 y 1000."
                        );
                      const product = catalog.products.find((p) => p.id === productId)!;
                      let unitPrice: number | undefined;
                      if (product.priceEditable) {
                        const price = prices[productId] ?? "";
                        if (
                          !/^\d+(?:\.\d{1,2})?$/.test(price) ||
                          Number(price) <= 0 ||
                          Number(price) > 1_000_000_000
                        )
                          throw new Error(
                            `Ingresa un precio valido para ${product.name}, con hasta dos decimales.`
                          );
                        unitPrice = Math.round(Number(price) * 100);
                      }
                      if (product.requiresTaxChoice && !taxChoices[productId])
                        throw new Error(`Selecciona el tratamiento de IVA de ${product.name}.`);
                      return {
                        productId,
                        quantity: Number(value) * 1000,
                        ...(unitPrice !== undefined ? { unitPrice } : {}),
                        ...(product.requiresTaxChoice ? { taxChoice: taxChoices[productId] } : {}),
                      };
                    });
                    const prepared = await request<FacturaxQuote>({
                      action: "quote",
                      ...ids,
                      items,
                      payment: {
                        method,
                        condition,
                        dueDate: condition === "contado" ? getTodayDateString() : dueDate,
                      },
                      delivery,
                    });
                    setQuote(prepared);
                    setProductUsage(
                      rememberBillingProducts(
                        userId,
                        prepared.id,
                        items.map((item) => item.productId),
                        productUsage
                      )
                    );
                    setConfirmed(false);
                  })
                }
              >
                <ReceiptText size={16} />
                Revisar factura
              </button>
            </>
          )}
        </>
      )}
      {review && (
        <div className="space-y-4">
          <h4 className="font-semibold">
            {pendingReview ? "Revision antes de emitir" : "Datos de la factura"}
          </h4>
          {pendingReview && reviewedContactChanged && (
            <p role="alert" className="text-sm text-red-600">
              Los datos del alumno cambiaron. Genera una revision nueva antes de emitir.
            </p>
          )}
          {pendingReview &&
            (getQuotedCustomerIssues(review.customer).length > 0 || !review.sourceStudent) && (
              <p role="alert" className="text-sm text-red-600">
                Esta revision no tiene los datos completos. Descarta la preparacion y genera una
                revision nueva.
              </p>
            )}
          <p className="text-sm break-words">
            {review.customer.name}
            <br />
            {review.customer.documentType} {review.customer.document}
            <br />
            {review.customer.email}
            {review.delivery === "physical" && (
              <>
                <br />
                Entrega impresa
              </>
            )}
          </p>
          {review.customer.fiscal && (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ["Direccion", review.customer.fiscal.address],
                ["Telefono", review.customer.fiscal.phone],
                ["Pais", review.customer.fiscal.countryCode],
                ["Departamento", review.customer.fiscal.departmentCode],
                ["Municipio", review.customer.fiscal.cityCode],
                [
                  "Tipo de persona",
                  review.customer.fiscal.personType === "2" ? "Persona natural" : "",
                ],
                ["Regimen fiscal", review.customer.fiscal.taxRegime],
                ["Responsabilidad fiscal", review.customer.fiscal.responsibilities],
                ["Tratamiento tributario", review.customer.fiscal.taxScheme],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[var(--gray-500)]">{label}</dt>
                  <dd className="break-words">{value || "No indicado"}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="divide-y divide-[var(--surface-border)]">
            {review.lines.map((line, index) => (
              <li key={index} className="flex items-start justify-between gap-4 py-2 text-sm">
                <span className="min-w-0 break-words">
                  {line.description} × {line.quantity / 1000}
                  <span className="block text-[var(--gray-500)]">
                    {line.tax
                      ? `IVA ${line.tax}%`
                      : line.taxTreatment === "excluded"
                        ? "Excluido de IVA"
                        : "Exento de IVA"}
                  </span>
                </span>
                <span className="shrink-0">
                  {money(Math.round((line.price * line.quantity) / 1000))}
                </span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            <dt>Subtotal</dt>
            <dd className="text-right">{money(review.totals.subtotal)}</dd>
            <dt>IVA</dt>
            <dd className="text-right">{money(review.totals.vat)}</dd>
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold">{money(review.totals.total)}</dd>
          </dl>
          <p className="text-sm">
            {review.payment.condition === "contado" ? "Contado" : "Credito"} ·{" "}
            {review.payment.method} · Vence {review.payment.dueDate}
          </p>
          {alumno.facturado && (
            <p className="text-sm text-amber-700">
              La ficha del alumno tiene una factura previa
              {alumno.numero_factura_electronica ? ` (${alumno.numero_factura_electronica})` : ""}.
              Verifica que no corresponda a este contrato.
            </p>
          )}
          {pendingReview && (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1"
                />
                Confirmo el cliente, los conceptos, los impuestos y el total. Autorizo emitir esta
                factura real en FacturaX para el contrato seleccionado.
              </label>
              <div className="flex flex-wrap gap-2">
                {!invoice && (
                  <button
                    disabled={busy}
                    className="apple-button-secondary"
                    onClick={() => {
                      setQuote(null);
                      setConfirmed(false);
                    }}
                  >
                    Volver
                  </button>
                )}
                <button
                  disabled={
                    busy ||
                    !confirmed ||
                    cancelled ||
                    !contactComplete ||
                    reviewedContactChanged ||
                    !review.sourceStudent ||
                    getQuotedCustomerIssues(review.customer).length > 0
                  }
                  className="apple-button-primary"
                  onClick={() => emit(review)}
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Emitir
                  en FacturaX
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
