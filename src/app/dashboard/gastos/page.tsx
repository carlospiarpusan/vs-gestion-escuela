/**
 * GastosPage - Expense management page for the school dashboard.
 *
 * This page allows authenticated users to view, create, edit, and delete
 * expense records (gastos) stored in the Supabase "gastos" table.
 *
 * Features:
 *  - CRUD operations for expenses via Supabase client.
 *  - Real-time form validation (required fields, numeric monto).
 *  - Error feedback displayed inside the modal form.
 *  - Responsive grid layout with dark-mode support.
 *
 * @module dashboard/gastos
 */
"use client";

import { useEffect, useState, useCallback, useMemo, useRef, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import DataTable from "@/components/dashboard/DataTable";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import {
  AccountingChipTabs,
  AccountingMiniList,
  AccountingPanel,
  AccountingStatCard,
  AccountingWorkspaceHeader,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { runSupabaseMutationWithRetry } from "@/lib/retry";
import {
  buildElectronicInvoiceNote,
  parseElectronicInvoiceFile,
  type ElectronicInvoicePreview,
} from "@/lib/electronic-invoice";
import {
  buildAccountingYears,
  downloadCsv,
  fetchAccountingReport,
  formatAccountingMoney,
  type AccountingReportResponse,
  getCurrentAccountingYear,
  getMonthDateRange,
  MONTH_OPTIONS,
} from "@/lib/accounting-dashboard";
import { normalizeExpenseCategory } from "@/lib/expense-category";
import { EXPENSE_ADVANCED_SEARCH_HINT, parseExpenseSearch, type ExpenseSearchCriteria } from "@/lib/expense-search";
import type { EstadoPagoGasto, FacturaCorreoImportacion, FacturaCorreoProveedor, Gasto, CategoriaGasto, MetodoPagoGasto } from "@/types/database";
import { AlertTriangle, BarChart3, Clock3, Download, Landmark, Link2, Mail, Plus, ReceiptText, RefreshCw, Repeat, ShieldCheck, Unplug, Upload, Wallet } from "lucide-react";

const PAGE_SIZE = 10;
const currentYear = getCurrentAccountingYear();

/** All available expense categories. */
const categorias: CategoriaGasto[] = ["combustible", "mantenimiento_vehiculo", "alquiler", "servicios", "nominas", "seguros", "material_didactico", "marketing", "impuestos", "suministros", "reparaciones", "tramitador", "otros"];

/** Accepted payment methods. */
const metodos: MetodoPagoGasto[] = ["efectivo", "tarjeta", "transferencia", "domiciliacion"];
const estadosPagoGasto: EstadoPagoGasto[] = ["pagado", "pendiente", "anulado"];

/** Default (empty) form values used when creating a new expense. */
const emptyForm = {
  categoria: "otros" as CategoriaGasto, concepto: "", monto: "",
  metodo_pago: "efectivo" as MetodoPagoGasto, proveedor: "",
  numero_factura: "", fecha: new Date().toISOString().split("T")[0],
  fecha_vencimiento: new Date().toISOString().split("T")[0],
  estado_pago: "pagado" as EstadoPagoGasto,
  recurrente: false, notas: "",
};
type GastoFormState = typeof emptyForm;

type EmailInvoiceIntegrationView = {
  id: string;
  escuela_id: string;
  sede_id: string;
  created_by: string | null;
  updated_by: string | null;
  provider: FacturaCorreoProveedor;
  correo: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_user: string;
  mailbox: string;
  from_filter: string | null;
  subject_filter: string | null;
  import_only_unseen: boolean;
  auto_sync: boolean;
  activa: boolean;
  last_uid: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  has_password: boolean;
};

type EmailInvoiceConfigFormState = {
  sede_id: string;
  correo: string;
  imap_host: string;
  imap_port: string;
  imap_secure: boolean;
  imap_user: string;
  imap_password: string;
  mailbox: string;
  from_filter: string;
  subject_filter: string;
  import_only_unseen: boolean;
  auto_sync: boolean;
  activa: boolean;
};

type EmailInvoiceSyncSummary = {
  mode: "incremental" | "historical";
  imported: number;
  duplicated: number;
  errors: number;
  skipped: number;
  processedMessages: number;
  processedAttachments: number;
  matchedMessages: number;
  truncated: boolean;
  lookbackMonths: number | null;
  lastSyncedAt: string | null;
};

type SedeOption = {
  id: string;
  nombre: string;
  es_principal?: boolean | null;
};

type ExpenseSection = "libro" | "cuentas" | "tramitadores" | "automatizacion";
type ExpenseView = "all" | "vehicular" | "administrativo" | "personal" | "with_invoice" | "without_invoice" | "recurrente";
type ExpenseSupabaseQueryable<T> = {
  in(column: string, values: readonly string[]): T;
  not(column: string, operator: string, value: string | null): T;
  neq(column: string, value: string): T;
  or(filters: string): T;
  eq(column: string, value: boolean | number | string): T;
  ilike(column: string, pattern: string): T;
  gte(column: string, value: string): T;
  lte(column: string, value: string): T;
};

const emptyEmailIntegrationForm: EmailInvoiceConfigFormState = {
  sede_id: "",
  correo: "",
  imap_host: "",
  imap_port: "993",
  imap_secure: true,
  imap_user: "",
  imap_password: "",
  mailbox: "INBOX",
  from_filter: "",
  subject_filter: "",
  import_only_unseen: true,
  auto_sync: true,
  activa: true,
};
const MANUAL_IMAP_PROVIDER: FacturaCorreoProveedor = "imap";
const HISTORICAL_MONTH_OPTIONS = [3, 6, 12, 24, 36, 60];
const HISTORICAL_LIMIT_OPTIONS = [100, 250, 500, 1000, 2000];
const VEHICULAR_EXPENSE_CATEGORIES: CategoriaGasto[] = ["combustible", "mantenimiento_vehiculo", "reparaciones", "seguros"];
const ADMINISTRATIVE_EXPENSE_CATEGORIES: CategoriaGasto[] = ["alquiler", "servicios", "material_didactico", "marketing", "impuestos", "suministros", "otros"];
const PEOPLE_EXPENSE_CATEGORIES: CategoriaGasto[] = ["nominas", "tramitador"];
const EXPENSE_SECTION_ITEMS: Array<{ id: ExpenseSection; label: string; description: string }> = [
  { id: "libro", label: "Libro de gastos", description: "Registro, filtros, factura electrónica y exportación." },
  { id: "cuentas", label: "Cuentas por pagar", description: "Pendientes, vencimientos y control por proveedor." },
  { id: "tramitadores", label: "Tramitadores", description: "Lo pagado, lo pendiente y la concentración por tercero." },
  { id: "automatizacion", label: "Automatización", description: "Importación de factura y correo automático de soportes." },
];
const EXPENSE_VIEW_ITEMS: Array<{ id: ExpenseView; label: string; description: string }> = [
  { id: "all", label: "Todo", description: "Todos los egresos del periodo." },
  { id: "vehicular", label: "Operación vehicular", description: "Combustible, reparaciones, mantenimiento y seguros." },
  { id: "administrativo", label: "Administrativos", description: "Servicios, arriendo, insumos, impuestos y marketing." },
  { id: "personal", label: "Personal y terceros", description: "Nomina y pagos a tramitador." },
  { id: "with_invoice", label: "Con factura", description: "Solo gastos documentados con numero de factura." },
  { id: "without_invoice", label: "Sin factura", description: "Gastos sin soporte documental registrado." },
  { id: "recurrente", label: "Recurrentes", description: "Pagos periodicos o permanentes." },
];

function parseExpenseSection(value: string | null): ExpenseSection {
  if (value === "panel" || value === "libro") return "libro";
  if (value === "proveedores" || value === "cuentas") return "cuentas";
  if (value === "tramitadores") return "tramitadores";
  if (value === "automatizacion") return "automatizacion";
  return "libro";
}

function inferImapHost(correo: string) {
  const domain = correo.split("@")[1]?.toLowerCase() || "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "imap.gmail.com";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.es"].includes(domain)) return "outlook.office365.com";
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") return "imap.mail.me.com";
  if (domain === "yahoo.com" || domain === "ymail.com") return "imap.mail.yahoo.com";
  return "";
}

function isHorasClosureExpense(row: Pick<Gasto, "notas">) {
  return (row.notas ?? "").startsWith("CIERRE_HORAS_INSTRUCTOR|");
}

function formatInvoiceMoney(amount: number, currency: string) {
  const normalizedCurrency = currency && currency.length === 3 ? currency.toUpperCase() : "COP";

  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: normalizedCurrency === "COP" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`;
  }
}

function getEmailImportDisplayTitle(item: FacturaCorreoImportacion) {
  const attachmentIsFallback = /^factura-adjunta-\d+\.(xml|zip|eml)$/i.test(item.attachment_name || "");
  if (item.invoice_number) return item.invoice_number;
  if (attachmentIsFallback && item.asunto) return item.asunto;
  return item.attachment_name;
}

function applyExpenseViewToSupabaseQuery<T extends ExpenseSupabaseQueryable<T>>(query: T, view: ExpenseView): T {
  switch (view) {
    case "vehicular":
      return query.in("categoria", VEHICULAR_EXPENSE_CATEGORIES);
    case "administrativo":
      return query.in("categoria", ADMINISTRATIVE_EXPENSE_CATEGORIES);
    case "personal":
      return query.in("categoria", PEOPLE_EXPENSE_CATEGORIES);
    case "with_invoice":
      return query.not("numero_factura", "is", null).neq("numero_factura", "");
    case "without_invoice":
      return query.or("numero_factura.is.null,numero_factura.eq.");
    case "recurrente":
      return query.eq("recurrente", true);
    default:
      return query;
  }
}

function applyExpenseSearchToSupabaseQuery<T extends ExpenseSupabaseQueryable<T>>(query: T, expenseSearch: ExpenseSearchCriteria): T {
  if (expenseSearch.freeText) {
    const textPattern = `%${expenseSearch.freeText}%`;
    query = query.or([
      `concepto.ilike.${textPattern}`,
      `proveedor.ilike.${textPattern}`,
      `numero_factura.ilike.${textPattern}`,
      `notas.ilike.${textPattern}`,
      `categoria.ilike.${textPattern}`,
      `metodo_pago.ilike.${textPattern}`,
    ].join(","));
  }

  if (expenseSearch.fields.concepto) {
    query = query.ilike("concepto", `%${expenseSearch.fields.concepto}%`);
  }
  if (expenseSearch.fields.proveedor) {
    query = query.ilike("proveedor", `%${expenseSearch.fields.proveedor}%`);
  }
  if (expenseSearch.fields.factura) {
    query = query.ilike("numero_factura", `%${expenseSearch.fields.factura}%`);
  }
  if (expenseSearch.fields.categoria) {
    query = query.ilike("categoria", `%${expenseSearch.fields.categoria}%`);
  }
  if (expenseSearch.fields.metodo) {
    query = query.ilike("metodo_pago", `%${expenseSearch.fields.metodo}%`);
  }
  if (expenseSearch.fields.notas) {
    query = query.ilike("notas", `%${expenseSearch.fields.notas}%`);
  }
  if (expenseSearch.fechaRange) {
    query = query.gte("fecha", expenseSearch.fechaRange.from).lte("fecha", expenseSearch.fechaRange.to);
  }
  if (expenseSearch.monto !== null) {
    query = query.eq("monto", expenseSearch.monto);
  }
  if (expenseSearch.recurrente !== null) {
    query = query.eq("recurrente", expenseSearch.recurrente);
  }

  return query;
}

function getExpenseDueMeta(dateValue: string | null) {
  if (!dateValue) {
    return {
      label: "Sin vencimiento",
      detail: "Sin fecha definida",
      className: "bg-gray-100 text-[#86868b] dark:bg-gray-800 dark:text-gray-300",
    };
  }

  const target = new Date(`${dateValue}T00:00:00`);
  const today = new Date(`${new Date().toISOString().split("T")[0]}T00:00:00`);
  const daysUntil = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (daysUntil < 0) {
    return {
      label: "Vencido",
      detail: `${Math.abs(daysUntil)} día${Math.abs(daysUntil) === 1 ? "" : "s"} vencido`,
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
  }

  if (daysUntil <= 7) {
    return {
      label: "Próximo",
      detail: daysUntil === 0 ? "Vence hoy" : `Vence en ${daysUntil} día${daysUntil === 1 ? "" : "s"}`,
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    };
  }

  return {
    label: "Al día",
    detail: `Vence en ${daysUntil} días`,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
}

async function resolveSedeId(escuelaId: string, preferredSedeId: string | null) {
  if (preferredSedeId) return preferredSedeId;

  const supabase = createClient();
  const { data } = await supabase
    .from("sedes")
    .select("id")
    .eq("escuela_id", escuelaId)
    .order("es_principal", { ascending: false })
    .limit(1)
    .single();

  return data?.id || null;
}

export default function GastosPage() {
  // --- Auth & state ---
  const { perfil } = useAuth();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState<ExpenseSection>(parseExpenseSection(searchParams.get("section")));
  const [activeView, setActiveView] = useState<ExpenseView>("all");
  const fetchIdRef = useRef(0);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroEstadoPago, setFiltroEstadoPago] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroYear, setFiltroYear] = useState(String(currentYear));
  const [filtroRecurrente, setFiltroRecurrente] = useState(false);
  const [summary, setSummary] = useState<AccountingReportResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [deleting, setDeleting] = useState<Gasto | null>(null);
  const [saving, setSaving] = useState(false);
  const [importingInvoice, setImportingInvoice] = useState(false);
  const [parsingInvoice, setParsingInvoice] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<ElectronicInvoicePreview | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<GastoFormState>(emptyForm);
  const [invoiceImportError, setInvoiceImportError] = useState("");
  const [emailIntegration, setEmailIntegration] = useState<EmailInvoiceIntegrationView | null>(null);
  const [emailImportHistory, setEmailImportHistory] = useState<FacturaCorreoImportacion[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState<EmailInvoiceConfigFormState>(emptyEmailIntegrationForm);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSyncing, setEmailSyncing] = useState(false);
  const [emailHistoryModalOpen, setEmailHistoryModalOpen] = useState(false);
  const [emailHistoryMonths, setEmailHistoryMonths] = useState("24");
  const [emailHistoryMaxMessages, setEmailHistoryMaxMessages] = useState("500");
  const [emailError, setEmailError] = useState("");
  const [emailNotice, setEmailNotice] = useState("");
  const [sedesOptions, setSedesOptions] = useState<SedeOption[]>([]);
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");
  const [linkedNotice, setLinkedNotice] = useState("");
  const invoiceFileInputRef = useRef<HTMLInputElement | null>(null);
  const sedesOptionsRef = useRef<SedeOption[]>([]);
  const emailModalOpenRef = useRef(false);
  const {
    value: form,
    setValue: setForm,
    restoreDraft,
    clearDraft,
  } = useDraftForm("dashboard:gastos:form", emptyForm, {
    persist: modalOpen && !editing,
  });

  const buildDefaultEmailForm = useCallback((options: SedeOption[], integration?: EmailInvoiceIntegrationView | null): EmailInvoiceConfigFormState => {
    if (integration) {
      return {
        sede_id: integration.sede_id,
        correo: integration.correo,
        imap_host: integration.imap_host,
        imap_port: String(integration.imap_port || 993),
        imap_secure: integration.imap_secure,
        imap_user: integration.imap_user,
        imap_password: "",
        mailbox: integration.mailbox || "INBOX",
        from_filter: integration.from_filter || "",
        subject_filter: integration.subject_filter || "",
        import_only_unseen: integration.import_only_unseen,
        auto_sync: integration.auto_sync,
        activa: integration.activa,
      };
    }

    const preferredSede = perfil?.sede_id || options[0]?.id || "";
    return {
      ...emptyEmailIntegrationForm,
      sede_id: preferredSede,
      correo: perfil?.email || "",
      imap_user: perfil?.email || "",
      imap_host: perfil?.email ? inferImapHost(perfil.email) : "",
    };
  }, [perfil?.email, perfil?.sede_id]);

  useEffect(() => {
    setActiveSection(parseExpenseSection(searchParams.get("section")));
  }, [searchParams]);

  useEffect(() => {
    sedesOptionsRef.current = sedesOptions;
  }, [sedesOptions]);

  useEffect(() => {
    emailModalOpenRef.current = emailModalOpen;
  }, [emailModalOpen]);

  const shouldLoadEmailAutomation =
    activeSection === "automatizacion" || emailModalOpen || emailHistoryModalOpen;

  const loadEmailIntegrationState = useCallback(async (options?: SedeOption[]) => {
    if (!perfil?.escuela_id) return;

    setEmailLoading(true);
    setEmailError("");

    try {
      const response = await fetch("/api/gastos/facturas-correo", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo cargar la integracion de correo.");
      }

      const integration = (payload.integration as EmailInvoiceIntegrationView | null) || null;
      const history = (payload.history as FacturaCorreoImportacion[]) || [];
      const nextOptions = options || sedesOptionsRef.current;
      setEmailIntegration(integration);
      setEmailImportHistory(history);
      if (!emailModalOpenRef.current) {
        setEmailForm(buildDefaultEmailForm(nextOptions, integration));
      }
    } catch (loadError: unknown) {
      const nextOptions = options || sedesOptionsRef.current;
      setEmailError(loadError instanceof Error ? loadError.message : "No se pudo cargar la integracion de correo.");
      setEmailIntegration(null);
      setEmailImportHistory([]);
      if (!emailModalOpenRef.current) {
        setEmailForm(buildDefaultEmailForm(nextOptions, null));
      }
    } finally {
      setEmailLoading(false);
    }
  }, [buildDefaultEmailForm, perfil?.escuela_id]);

  /**
   * Fetch expenses from Supabase with server-side pagination and search.
   * Called on mount and after every successful create/update/delete.
   */
  const fetchData = useCallback(async (page = 0, search = "") => {
    if (!perfil?.escuela_id) return;
    const shouldLoadLedger = activeSection === "libro" || activeSection === "cuentas" || activeSection === "tramitadores";
    const effectiveEstadoPago = activeSection === "cuentas" ? "pendiente" : filtroEstadoPago;

    if (!shouldLoadLedger) {
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setTableError("");

    try {
      const supabase = createClient();
      const expenseSearch = parseExpenseSearch(search);

      let countQuery = supabase
        .from("gastos")
        .select("id", { count: "exact", head: true })
        .eq("escuela_id", perfil.escuela_id);

      if (filtroCategoria) {
        countQuery = countQuery.eq("categoria", filtroCategoria);
      }
      if (filtroMetodo) {
        countQuery = countQuery.eq("metodo_pago", filtroMetodo);
      }
      if (effectiveEstadoPago) {
        countQuery = countQuery.eq("estado_pago", effectiveEstadoPago);
      }
      if (filtroRecurrente) {
        countQuery = countQuery.eq("recurrente", true);
      }
      if (filtroYear) {
        const range = getMonthDateRange(Number(filtroYear), filtroMes);
        countQuery = countQuery.gte("fecha", range.from).lte("fecha", range.to);
      }
      if (activeSection === "tramitadores") {
        countQuery = countQuery.eq("categoria", "tramitador");
      } else {
        countQuery = applyExpenseViewToSupabaseQuery(countQuery, activeView);
      }
      countQuery = applyExpenseSearchToSupabaseQuery(countQuery, expenseSearch);

      const { count, error: countError } = await countQuery;
      if (countError) {
        throw countError;
      }

      if (fetchId !== fetchIdRef.current) return;

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let dataQuery = supabase
        .from("gastos")
        .select("id, mantenimiento_id, categoria, concepto, monto, metodo_pago, proveedor, numero_factura, fecha, fecha_vencimiento, estado_pago, recurrente, notas, created_at")
        .eq("escuela_id", perfil.escuela_id)
        .order(activeSection === "cuentas" ? "fecha_vencimiento" : "fecha", { ascending: activeSection === "cuentas" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filtroCategoria) {
        dataQuery = dataQuery.eq("categoria", filtroCategoria);
      }
      if (filtroMetodo) {
        dataQuery = dataQuery.eq("metodo_pago", filtroMetodo);
      }
      if (effectiveEstadoPago) {
        dataQuery = dataQuery.eq("estado_pago", effectiveEstadoPago);
      }
      if (filtroRecurrente) {
        dataQuery = dataQuery.eq("recurrente", true);
      }
      if (filtroYear) {
        const range = getMonthDateRange(Number(filtroYear), filtroMes);
        dataQuery = dataQuery.gte("fecha", range.from).lte("fecha", range.to);
      }
      if (activeSection === "tramitadores") {
        dataQuery = dataQuery.eq("categoria", "tramitador");
      } else {
        dataQuery = applyExpenseViewToSupabaseQuery(dataQuery, activeView);
      }
      dataQuery = applyExpenseSearchToSupabaseQuery(dataQuery, expenseSearch);

      const { data, error: dataError } = await dataQuery;
      if (dataError) {
        throw dataError;
      }

      if (fetchId !== fetchIdRef.current) return;

      setTotalCount(count ?? 0);
      setData((data as Gasto[]) || []);
    } catch (fetchError: unknown) {
      if (fetchId !== fetchIdRef.current) return;
      setTotalCount(0);
      setData([]);
      setTableError(fetchError instanceof Error ? fetchError.message : "No se pudo consultar los gastos.");
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [perfil?.escuela_id, filtroCategoria, filtroMetodo, filtroEstadoPago, filtroMes, filtroYear, filtroRecurrente, activeView, activeSection]);

  // Fetch data once the authenticated profile is available.
  useEffect(() => {
    if (perfil) {
      fetchData(currentPage, searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, currentPage, searchTerm, filtroCategoria, filtroMetodo, filtroEstadoPago, filtroMes, filtroYear, filtroRecurrente, activeView, activeSection]);

  useEffect(() => {
    if (!perfil?.rol) return;
    const shouldLoadSummary = activeSection === "libro" || activeSection === "cuentas" || activeSection === "tramitadores";

    if (!shouldLoadSummary) {
      setSummary(null);
      setSummaryError("");
      setSummaryLoading(false);
      return;
    }

    const loadSummary = async () => {
      const range = getMonthDateRange(Number(filtroYear), filtroMes);
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        page: "0",
        pageSize: "10",
        include: activeSection === "cuentas" || activeSection === "tramitadores" ? "summary,breakdown,payables" : "summary,breakdown",
      });

      if (filtroCategoria) params.set("gasto_categoria", filtroCategoria);
      if (filtroMetodo) params.set("gasto_metodo", filtroMetodo);
      if (activeSection === "cuentas") {
        params.set("gasto_estado", "pendiente");
      } else if (filtroEstadoPago) {
        params.set("gasto_estado", filtroEstadoPago);
      }
      if (filtroRecurrente) params.set("recurrente", "true");
      if (activeSection === "tramitadores") {
        params.set("gasto_view", "tramitadores");
      } else if (activeView !== "all") {
        params.set("gasto_view", activeView);
      }
      if (searchTerm) params.set("q", searchTerm);

      setSummaryLoading(true);
      setSummaryError("");

      try {
        const payload = await fetchAccountingReport(params);
        setSummary(payload);
      } catch (summaryErr: unknown) {
        setSummary(null);
        setSummaryError(summaryErr instanceof Error ? summaryErr.message : "No se pudo cargar el resumen de gastos.");
      } finally {
        setSummaryLoading(false);
      }
    };

    void loadSummary();
  }, [perfil?.rol, filtroCategoria, filtroMetodo, filtroEstadoPago, filtroMes, filtroYear, filtroRecurrente, searchTerm, activeView, activeSection]);

  useEffect(() => {
    if (!perfil?.escuela_id || !shouldLoadEmailAutomation) return;

    const supabase = createClient();
    const loadEmailResources = async () => {
      try {
        const { data: sedesRows, error: sedesError } = await supabase
          .from("sedes")
          .select("id, nombre, es_principal")
          .eq("escuela_id", perfil.escuela_id)
          .eq("estado", "activa")
          .order("es_principal", { ascending: false })
          .order("nombre", { ascending: true });

        if (sedesError) {
          throw sedesError;
        }

        const options = ((sedesRows as SedeOption[]) || []);
        setSedesOptions(options);
        await loadEmailIntegrationState(options);
      } catch (resourceError: unknown) {
        setEmailError(resourceError instanceof Error ? resourceError.message : "No se pudo cargar la configuracion de correo.");
      }
    };

    void loadEmailResources();
  }, [loadEmailIntegrationState, perfil?.escuela_id, shouldLoadEmailAutomation]);

  /** Handle page change from DataTable (server-side). */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /** Handle search change from DataTable (server-side). */
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(0);
  }, []);

  const resetInvoiceImport = useCallback(() => {
    setInvoicePreview(null);
    setInvoiceForm(emptyForm);
    setInvoiceImportError("");
    setParsingInvoice(false);
    setImportingInvoice(false);
    if (invoiceFileInputRef.current) {
      invoiceFileInputRef.current.value = "";
    }
  }, []);

  const openEmailIntegrationModal = () => {
    setEmailNotice("");
    setEmailError("");
    setEmailForm(buildDefaultEmailForm(sedesOptions, emailIntegration));
    setEmailModalOpen(true);
  };

  const handleEmailAddressChange = (correo: string) => {
    const normalized = correo.trim().toLowerCase();
    const suggestedHost = inferImapHost(normalized);

    setEmailForm((current) => ({
      ...current,
      correo: normalized,
      imap_user: current.imap_user ? current.imap_user : normalized,
      imap_host: current.imap_host ? current.imap_host : suggestedHost,
    }));
  };

  const handleSaveEmailIntegration = async () => {
    if (!perfil?.escuela_id) {
      setEmailError("No se encontro una escuela activa para conectar el correo.");
      return;
    }

    if (!emailForm.sede_id || !emailForm.correo || !emailForm.imap_host || !emailForm.imap_user) {
      setEmailError("Correo, sede, host IMAP y usuario IMAP son obligatorios.");
      return;
    }

    const port = Number(emailForm.imap_port);
    if (!Number.isInteger(port) || port <= 0) {
      setEmailError("El puerto IMAP no es valido.");
      return;
    }

    setEmailSaving(true);
    setEmailError("");
    setEmailNotice("");

    try {
      const response = await fetch("/api/gastos/facturas-correo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sede_id: emailForm.sede_id,
          correo: emailForm.correo.trim().toLowerCase(),
          imap_host: emailForm.imap_host.trim(),
          imap_port: port,
          imap_secure: emailForm.imap_secure,
          imap_user: emailForm.imap_user.trim(),
          imap_password: emailForm.imap_password.trim() || null,
          mailbox: emailForm.mailbox.trim() || "INBOX",
          from_filter: emailForm.from_filter.trim() || null,
          subject_filter: emailForm.subject_filter.trim() || null,
          import_only_unseen: emailForm.import_only_unseen,
          auto_sync: emailForm.auto_sync,
          activa: emailForm.activa,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar la conexion de correo.");
      }

      setEmailModalOpen(false);
      setEmailNotice("Correo conectado correctamente. Ya puedes sincronizar facturas automaticamente.");
      await loadEmailIntegrationState();
    } catch (saveError: unknown) {
      setEmailError(saveError instanceof Error ? saveError.message : "No se pudo guardar la conexion de correo.");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleDeleteEmailIntegration = async () => {
    if (!emailIntegration) return;

    setEmailSaving(true);
    setEmailError("");
    setEmailNotice("");

    try {
      const response = await fetch("/api/gastos/facturas-correo", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo desconectar el correo.");
      }

      setEmailIntegration(null);
      setEmailImportHistory([]);
      setEmailForm(buildDefaultEmailForm(sedesOptions, null));
      setEmailNotice("Conexion de correo eliminada.");
    } catch (deleteError: unknown) {
      setEmailError(deleteError instanceof Error ? deleteError.message : "No se pudo desconectar el correo.");
    } finally {
      setEmailSaving(false);
    }
  };

  const openHistoricalEmailSearchModal = () => {
    setEmailError("");
    setEmailNotice("");
    setEmailHistoryModalOpen(true);
  };

  const handleSyncEmailIntegration = async () => {
    if (!emailIntegration) return;

    setEmailSyncing(true);
    setEmailError("");
    setEmailNotice("");

    try {
      const response = await fetch("/api/gastos/facturas-correo/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo sincronizar el correo.");
      }

      const summary = payload.summary as EmailInvoiceSyncSummary;
      const importedText = `${summary.imported} importadas`;
      const duplicatedText = `${summary.duplicated} duplicadas`;
      const errorText = `${summary.errors} con error`;
      setEmailNotice(`Sincronizacion completada: ${importedText}, ${duplicatedText}, ${errorText}.`);
      await Promise.all([
        loadEmailIntegrationState(),
        fetchData(currentPage, searchTerm),
      ]);
    } catch (syncError: unknown) {
      setEmailError(syncError instanceof Error ? syncError.message : "No se pudo sincronizar el correo.");
    } finally {
      setEmailSyncing(false);
    }
  };

  const handleHistoricalEmailSync = async () => {
    if (!emailIntegration) return;

    const monthsBack = Number(emailHistoryMonths);
    const maxMessages = Number(emailHistoryMaxMessages);

    if (!Number.isInteger(monthsBack) || monthsBack <= 0) {
      setEmailError("El rango historico en meses no es valido.");
      return;
    }

    if (!Number.isInteger(maxMessages) || maxMessages <= 0) {
      setEmailError("El maximo de correos a revisar no es valido.");
      return;
    }

    setEmailSyncing(true);
    setEmailError("");
    setEmailNotice("");

    try {
      const response = await fetch("/api/gastos/facturas-correo/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "historical",
          months_back: monthsBack,
          max_messages: maxMessages,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo buscar facturas antiguas en el correo.");
      }

      const summary = payload.summary as EmailInvoiceSyncSummary;
      const truncationText = summary.truncated
        ? ` Se revisaron ${summary.processedMessages} de ${summary.matchedMessages} correos encontrados.`
        : summary.mode === "historical"
          ? ` Se revisaron ${summary.processedMessages} correos historicos.`
          : "";

      setEmailHistoryModalOpen(false);
      setEmailNotice(
        `Busqueda historica completada: ${summary.imported} importadas, ${summary.duplicated} duplicadas, ${summary.skipped} omitidas y ${summary.errors} con error.${truncationText}`
      );
      await Promise.all([
        loadEmailIntegrationState(),
        fetchData(currentPage, searchTerm),
      ]);
    } catch (syncError: unknown) {
      setEmailError(syncError instanceof Error ? syncError.message : "No se pudo buscar facturas antiguas en el correo.");
    } finally {
      setEmailSyncing(false);
    }
  };

  const persistExpense = useCallback(async (payload: {
    categoria: CategoriaGasto;
    concepto: string;
    monto: number;
    metodo_pago: MetodoPagoGasto;
    proveedor: string | null;
    numero_factura: string | null;
    fecha: string;
    fecha_vencimiento: string;
    estado_pago: EstadoPagoGasto;
    recurrente: boolean;
    notas: string | null;
  }, editingId?: string) => {
    const supabase = createClient();
    const normalizedPayload = {
      ...payload,
      categoria: normalizeExpenseCategory(payload.categoria, payload.concepto, payload.proveedor, payload.notas),
    };

    if (editingId) {
      await runSupabaseMutationWithRetry(() =>
        supabase.from("gastos").update(normalizedPayload).eq("id", editingId)
      );
      return;
    }

    if (!perfil) {
      throw new Error("No se encontro el perfil activo para guardar.");
    }
    if (!perfil.escuela_id) {
      throw new Error("No se encontro una escuela activa para registrar el gasto.");
    }

    const sedeId = await resolveSedeId(perfil.escuela_id, perfil.sede_id);
    if (!sedeId) {
      throw new Error("No se encontro una sede activa para registrar el gasto.");
    }

    await runSupabaseMutationWithRetry(() =>
      supabase.from("gastos").insert({
        ...normalizedPayload,
        escuela_id: perfil.escuela_id,
        sede_id: sedeId,
        user_id: perfil.id,
      })
    );
  }, [perfil]);

  const findDuplicateInvoiceExpense = useCallback(async (invoiceNumber: string, supplierName: string) => {
    if (!perfil?.escuela_id || !invoiceNumber.trim()) return null;

    const supabase = createClient();
    const { data: existingRows, error: duplicateError } = await supabase
      .from("gastos")
      .select("id, concepto, fecha, proveedor, numero_factura")
      .eq("escuela_id", perfil.escuela_id)
      .eq("numero_factura", invoiceNumber.trim())
      .order("fecha", { ascending: false })
      .limit(10);

    if (duplicateError) {
      throw duplicateError;
    }

    const normalizedSupplier = supplierName.trim().toLowerCase();
    const rows = ((existingRows as Pick<Gasto, "id" | "concepto" | "fecha" | "proveedor" | "numero_factura">[]) || []).filter((row) => {
      if (!normalizedSupplier) return true;
      return (row.proveedor ?? "").trim().toLowerCase() === normalizedSupplier;
    });

    return rows[0] || null;
  }, [perfil?.escuela_id]);

  /** Open the modal in "create" mode with a blank form. */
  const openCreate = () => {
    setEditing(null);
    restoreDraft(emptyForm);
    setError("");
    setLinkedNotice("");
    setModalOpen(true);
  };

  const openImportModal = () => {
    setLinkedNotice("");
    resetInvoiceImport();
    setImportModalOpen(true);
  };

  /** Open the modal in "edit" mode, pre-filling the form with the selected row. */
  const openEdit = (row: Gasto) => {
    if (row.mantenimiento_id) {
      setLinkedNotice("Este gasto viene de bitácora/vehículos. Edítalo desde ese módulo.");
      return;
    }
    if (isHorasClosureExpense(row)) {
      setLinkedNotice("Este gasto viene del cierre mensual de horas. Regénéralo desde el módulo de Horas.");
      return;
    }
    setEditing(row);
    setForm({
      categoria: row.categoria,
      concepto: row.concepto,
      monto: row.monto.toString(),
      metodo_pago: row.metodo_pago,
      proveedor: row.proveedor || "",
      numero_factura: row.numero_factura || "",
      fecha: row.fecha,
      fecha_vencimiento: row.fecha_vencimiento || row.fecha,
      estado_pago: row.estado_pago || "pagado",
      recurrente: row.recurrente,
      notas: row.notas || "",
    });
    setError(""); setModalOpen(true);
  };

  /** Open the delete-confirmation dialog for the given row. */
  const openDelete = (row: Gasto) => {
    if (row.mantenimiento_id) {
      setLinkedNotice("Este gasto está sincronizado con bitácora/vehículos. Elimínalo desde ese módulo.");
      return;
    }
    if (isHorasClosureExpense(row)) {
      setLinkedNotice("Este gasto está sincronizado con el cierre mensual de horas. Regénéralo o ajústalo desde el módulo de Horas.");
      return;
    }
    setDeleting(row); setDeleteOpen(true);
  };

  const handleInvoiceFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsingInvoice(true);
    setInvoiceImportError("");
    setInvoicePreview(null);

    try {
      const preview = await parseElectronicInvoiceFile(file);

      setInvoicePreview(preview);
      setInvoiceForm({
        categoria: preview.categorySuggestion,
        concepto: preview.conceptSuggestion,
        monto: String(preview.payableAmount),
        metodo_pago: preview.paymentMethodSuggestion,
        proveedor: preview.supplierName,
        numero_factura: preview.invoiceNumber,
        fecha: preview.issueDate,
        fecha_vencimiento: preview.dueDate || preview.issueDate,
        estado_pago: "pendiente",
        recurrente: false,
        notas: buildElectronicInvoiceNote(preview),
      });
    } catch (parseError: unknown) {
      setInvoiceImportError(parseError instanceof Error ? parseError.message : "No se pudo leer la factura electronica.");
    } finally {
      setParsingInvoice(false);
    }
  };

  const handleImportInvoice = async () => {
    if (!invoicePreview) {
      setInvoiceImportError("Primero debes cargar una factura electronica valida.");
      return;
    }

    if (!invoiceForm.concepto || !invoiceForm.monto) {
      setInvoiceImportError("Concepto y monto son obligatorios para importar la factura.");
      return;
    }

    const montoNum = parseFloat(invoiceForm.monto);
    if (Number.isNaN(montoNum) || montoNum <= 0) {
      setInvoiceImportError("El monto importado no es valido.");
      return;
    }

    setImportingInvoice(true);
    setInvoiceImportError("");

    try {
      const duplicate = await findDuplicateInvoiceExpense(invoiceForm.numero_factura, invoiceForm.proveedor);
      if (duplicate) {
        throw new Error(
          `La factura ${duplicate.numero_factura || invoiceForm.numero_factura} del proveedor ${duplicate.proveedor || invoiceForm.proveedor || "registrado"} ya existe en gastos (${duplicate.fecha}).`
        );
      }

      await persistExpense({
        categoria: invoiceForm.categoria,
        concepto: invoiceForm.concepto.trim(),
        monto: montoNum,
        metodo_pago: invoiceForm.metodo_pago,
        proveedor: invoiceForm.proveedor.trim() || null,
        numero_factura: invoiceForm.numero_factura.trim() || null,
        fecha: invoiceForm.fecha,
        fecha_vencimiento: invoiceForm.fecha_vencimiento || invoiceForm.fecha,
        estado_pago: invoiceForm.estado_pago,
        recurrente: invoiceForm.recurrente,
        notas: invoiceForm.notas.trim() || null,
      });

      resetInvoiceImport();
      setImportModalOpen(false);
      await fetchData(currentPage, searchTerm);
    } catch (importError: unknown) {
      setInvoiceImportError(importError instanceof Error ? importError.message : "No se pudo importar la factura electronica.");
    } finally {
      setImportingInvoice(false);
    }
  };

  /**
   * Validate the form and persist the expense (create or update).
   * Wrapped in try/catch to handle unexpected network errors gracefully.
   */
  const handleSave = async () => {
    // Validate required fields.
    if (!form.concepto || !form.monto) { setError("Concepto y monto son obligatorios."); return; }

    // Validate that monto is a valid number.
    const montoNum = parseFloat(form.monto);
    if (isNaN(montoNum)) { setError("El monto debe ser un número válido."); return; }

    setSaving(true); setError("");

    try {
      const payload = {
        categoria: form.categoria, concepto: form.concepto, monto: montoNum,
        metodo_pago: form.metodo_pago, proveedor: form.proveedor || null,
        numero_factura: form.numero_factura || null, fecha: form.fecha,
        fecha_vencimiento: form.fecha_vencimiento || form.fecha,
        estado_pago: form.estado_pago,
        recurrente: form.recurrente, notas: form.notas || null,
      };

      await persistExpense(payload, editing?.id);

      // Success — close modal and refresh the table.
      clearDraft(emptyForm);
      setSaving(false); setModalOpen(false); fetchData(currentPage, searchTerm);
    } catch (networkError: unknown) {
      // Handle unexpected network / runtime errors.
      const message = networkError instanceof Error ? networkError.message : "Error de red inesperado.";
      setError(message);
      setSaving(false);
    }
  };

  /**
   * Delete the selected expense row.
   * Wrapped in try/catch so network failures surface in the UI.
   */
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const { error: err } = await createClient().from("gastos").delete().eq("id", deleting.id);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      // Success — close dialog and refresh.
      setSaving(false); setDeleteOpen(false); setDeleting(null); fetchData(currentPage, searchTerm);
    } catch (networkError: unknown) {
      const message = networkError instanceof Error ? networkError.message : "Error al eliminar el gasto.";
      setError(message);
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    if (!perfil?.escuela_id) return;

    setExporting(true);
    try {
      const supabase = createClient();
      const rows: Gasto[] = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        let query = supabase
          .from("gastos")
          .select("id, mantenimiento_id, categoria, concepto, monto, metodo_pago, proveedor, numero_factura, fecha, fecha_vencimiento, estado_pago, recurrente, notas, created_at")
          .eq("escuela_id", perfil.escuela_id)
          .order(activeSection === "cuentas" ? "fecha_vencimiento" : "fecha", { ascending: activeSection === "cuentas" })
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (filtroCategoria) query = query.eq("categoria", filtroCategoria);
        if (filtroMetodo) query = query.eq("metodo_pago", filtroMetodo);
        if (activeSection === "cuentas") {
          query = query.eq("estado_pago", "pendiente");
        } else if (filtroEstadoPago) {
          query = query.eq("estado_pago", filtroEstadoPago);
        }
        if (filtroRecurrente) query = query.eq("recurrente", true);
        if (filtroYear) {
          const range = getMonthDateRange(Number(filtroYear), filtroMes);
          query = query.gte("fecha", range.from).lte("fecha", range.to);
        }
        if (activeSection === "tramitadores") {
          query = query.eq("categoria", "tramitador");
        } else {
          query = applyExpenseViewToSupabaseQuery(query, activeView);
        }
        if (searchTerm) query = applyExpenseSearchToSupabaseQuery(query, parseExpenseSearch(searchTerm));

        const { data: batch, error: exportError } = await query;
        if (exportError) throw exportError;

        const normalizedBatch = (batch as Gasto[]) ?? [];
        rows.push(...normalizedBatch);
        if (normalizedBatch.length < pageSize) break;
        from += pageSize;
      }

      downloadCsv(
        `gastos-${filtroYear}${filtroMes ? `-${filtroMes}` : ""}.csv`,
        ["Fecha", "Vencimiento", "Estado pago", "Categoria", "Concepto", "Monto", "Metodo", "Proveedor", "Factura", "Recurrente", "Notas"],
        rows.map((row) => [
          row.fecha,
          row.fecha_vencimiento,
          row.estado_pago,
          row.categoria,
          row.concepto,
          Number(row.monto),
          row.metodo_pago,
          row.proveedor,
          row.numero_factura,
          row.recurrente ? "Si" : "No",
          row.notas,
        ])
      );
    } catch (exportErr: unknown) {
      setTableError(exportErr instanceof Error ? exportErr.message : "No se pudo exportar los gastos.");
    } finally {
      setExporting(false);
    }
  };

  const years = buildAccountingYears();
  const mesesDelAno = Number(filtroYear) === currentYear
    ? MONTH_OPTIONS.filter((mes) => !mes.value || Number(mes.value) <= new Date().getMonth() + 1)
    : MONTH_OPTIONS;
  const hayFiltros = Boolean(
    filtroCategoria
    || filtroMetodo
    || (activeSection !== "cuentas" && filtroEstadoPago)
    || filtroMes
    || filtroRecurrente
    || filtroYear !== String(currentYear)
    || (activeSection !== "tramitadores" && activeView !== "all")
  );
  const topExpenseCategory = summary?.breakdown.gastosPorCategoria[0];
  const topPendingProvider = summary?.payables?.topProveedores[0];
  const payablesBuckets = summary?.payables?.buckets || [];
  const payablesTopProviders = summary?.payables?.topProveedores || [];
  const tramitadorRows = summary?.breakdown.topTramitadoresGasto || [];
  const pendingTramitadorRows = summary?.payables?.topTramitadores || [];
  const totalTramitador = (summary?.breakdown.gastosPorCategoria || [])
    .filter((row) => row.categoria === "tramitador")
    .reduce((sum, row) => sum + Number(row.total || 0), 0);
  const totalTramitadorPendiente = pendingTramitadorRows
    .reduce((sum, row) => sum + Number(row.total || 0), 0);
  const topTramitador = tramitadorRows[0];
  const topPendingTramitador = pendingTramitadorRows[0];
  const totalPagina = data.reduce((sum, row) => sum + Number(row.monto || 0), 0);
  const currentSectionMeta = EXPENSE_SECTION_ITEMS.find((item) => item.id === activeSection) || EXPENSE_SECTION_ITEMS[0];
  const visibleViewItems = activeSection === "automatizacion" || activeSection === "tramitadores"
    ? []
    : activeSection === "cuentas"
      ? EXPENSE_VIEW_ITEMS.filter((item) => item.id === "all" || item.id === "with_invoice" || item.id === "without_invoice")
      : EXPENSE_VIEW_ITEMS;

  const clearFilters = () => {
    setFiltroCategoria("");
    setFiltroMetodo("");
    setFiltroEstadoPago("");
    setFiltroMes("");
    setFiltroYear(String(currentYear));
    setFiltroRecurrente(false);
    setActiveView("all");
    setCurrentPage(0);
  };
  /** Column definitions for the DataTable component. */
  const columns = useMemo(() => {
    const baseColumns = [
      { key: "fecha" as keyof Gasto, label: activeSection === "cuentas" ? "Registro" : "Fecha" },
      {
        key: "concepto" as keyof Gasto,
        label: "Concepto",
        render: (r: Gasto) => (
          <div className="space-y-1">
            <span className="font-medium">{r.concepto}</span>
            {r.mantenimiento_id && (
              <span className="inline-flex rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0071e3]">
                Bitácora
              </span>
            )}
          </div>
        ),
      },
      { key: "categoria" as keyof Gasto, label: "Categoría", render: (r: Gasto) => <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-[#86868b] font-medium">{r.categoria.replace("_", " ")}</span> },
      { key: "monto" as keyof Gasto, label: "Monto", render: (r: Gasto) => <span className="font-medium text-red-500">{formatAccountingMoney(Number(r.monto))}</span> },
      { key: "proveedor" as keyof Gasto, label: "Proveedor" },
    ];

    if (activeSection === "cuentas") {
      return [
        ...baseColumns,
        {
          key: "fecha_vencimiento" as keyof Gasto,
          label: "Vencimiento",
          render: (row: Gasto) => {
            const dueMeta = getExpenseDueMeta(row.fecha_vencimiento);
            return (
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {row.fecha_vencimiento || "—"}
                </p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueMeta.className}`}>
                  {dueMeta.label}
                </span>
                <p className="text-[11px] text-[#86868b]">{dueMeta.detail}</p>
              </div>
            );
          },
        },
        {
          key: "estado_pago" as keyof Gasto,
          label: "Estado pago",
          render: (row: Gasto) => (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              row.estado_pago === "pagado"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : row.estado_pago === "anulado"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}>
              {row.estado_pago}
            </span>
          ),
        },
      ];
    }

    return [
      ...baseColumns,
      { key: "metodo_pago" as keyof Gasto, label: "Método" },
    ];
  }, [activeSection]);

  /** Shared Tailwind classes for form inputs. */
  const inputCls = "apple-input";

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Gastos"
        title="Gastos"
        description="Libro de egresos, cuentas por pagar, tramitadores y automatización de facturas. Cada sección trabaja un flujo específico para que la operación contable no se mezcle."
        actions={
          activeSection === "automatizacion" ? (
            <>
              <button
                type="button"
                onClick={openEmailIntegrationModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
              >
                <Link2 size={16} />
                {emailIntegration ? "Editar correo" : "Conectar correo"}
              </button>
              <button
                type="button"
                onClick={handleSyncEmailIntegration}
                disabled={!emailIntegration || emailSyncing || emailLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 px-4 py-2.5 text-sm font-semibold text-[#0071e3] transition-colors hover:bg-[#0071e3]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]"
              >
                <RefreshCw size={16} className={emailSyncing ? "animate-spin" : ""} />
                {emailSyncing ? "Sincronizando..." : "Sincronizar ahora"}
              </button>
              <button
                type="button"
                onClick={openHistoricalEmailSearchModal}
                disabled={!emailIntegration || emailSyncing || emailLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#1d1d1f] transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:border-gray-600"
              >
                <Clock3 size={16} />
                Buscar antiguas
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
              >
                <Plus size={16} />
                Nuevo gasto
              </button>
              <button
                type="button"
                onClick={openImportModal}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 px-4 py-2.5 text-sm font-semibold text-[#0071e3] transition-colors hover:bg-[#0071e3]/10 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]"
              >
                <Upload size={16} />
                Importar factura
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#1d1d1f] transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:border-gray-600"
              >
                <Download size={16} />
                {exporting ? "Exportando CSV..." : "Exportar CSV"}
              </button>
            </>
          )
        }
      />

      {linkedNotice && (
        <div className="mb-4 rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/8 px-4 py-3 text-sm text-[#0b63c7] dark:text-[#69a9ff]">
          {linkedNotice}
        </div>
      )}

      {emailNotice && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-300">
          {emailNotice}
        </div>
      )}

      {emailError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
          {emailError}
        </div>
      )}

      {activeSection !== "automatizacion" && (
        <AccountingPanel title={currentSectionMeta.label} description={currentSectionMeta.description}>
          {visibleViewItems.length > 0 ? (
            <AccountingChipTabs
              value={activeView}
              items={visibleViewItems}
              onChange={(view) => {
                setActiveView(view);
                setCurrentPage(0);
              }}
            />
          ) : null}
        </AccountingPanel>
      )}

      {activeSection === "automatizacion" && (
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-[#0071e3]" />
                <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Correo de facturas</h3>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  emailIntegration?.activa
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "bg-gray-100 text-[#86868b] dark:bg-gray-800"
                }`}>
                  {emailIntegration?.activa ? "Activo" : "Sin conectar"}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#86868b]">
                Conecta un buzón IMAP para leer adjuntos XML o ZIP y registrar automaticamente las facturas electronicas en gastos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openEmailIntegrationModal}
                className="inline-flex items-center gap-2 rounded-lg border border-[#0071e3]/20 bg-[#0071e3]/5 px-3 py-2 text-sm text-[#0071e3] dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10"
              >
                <Link2 size={15} />
                {emailIntegration ? "Editar conexion" : "Conectar"}
              </button>
              <button
                type="button"
                onClick={handleSyncEmailIntegration}
                disabled={!emailIntegration || emailSyncing || emailLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#1d1d1f] disabled:opacity-50 dark:border-gray-700 dark:text-[#f5f5f7]"
              >
                <RefreshCw size={15} className={emailSyncing ? "animate-spin" : ""} />
                {emailSyncing ? "Sincronizando..." : "Sincronizar ahora"}
              </button>
              <button
                type="button"
                onClick={openHistoricalEmailSearchModal}
                disabled={!emailIntegration || emailSyncing || emailLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#1d1d1f] disabled:opacity-50 dark:border-gray-700 dark:text-[#f5f5f7]"
              >
                <Clock3 size={15} />
                Buscar antiguas
              </button>
              {emailIntegration && (
                <button
                  type="button"
                  onClick={handleDeleteEmailIntegration}
                  disabled={emailSaving}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50 dark:border-red-900/30 dark:text-red-300"
                >
                  <Unplug size={15} />
                  Desconectar
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Buzon</p>
              <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {emailLoading ? "Cargando..." : emailIntegration?.correo || "Sin configurar"}
              </p>
              <p className="mt-1 text-xs text-[#86868b]">
                {emailIntegration ? `${emailIntegration.imap_host}:${emailIntegration.imap_port}` : "Conecta un correo con IMAP habilitado"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Bandeja</p>
              <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {emailIntegration?.mailbox || "INBOX"}
              </p>
              <p className="mt-1 text-xs text-[#86868b]">
                {emailIntegration?.import_only_unseen ? "Solo correos no leidos" : "Correos nuevos por UID"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Ultima sincronizacion</p>
              <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {emailIntegration?.last_synced_at ? new Date(emailIntegration.last_synced_at).toLocaleString("es-CO") : "Aun no sincronizado"}
              </p>
              <p className="mt-1 text-xs text-[#86868b]">UID maximo: {emailIntegration?.last_uid || "—"}</p>
            </div>
            <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Modo automatico</p>
              <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {emailIntegration?.auto_sync ? "Cron activo" : "Solo manual"}
              </p>
              <p className="mt-1 text-xs text-[#86868b]">
                {emailIntegration?.subject_filter || emailIntegration?.from_filter
                  ? `Filtros: ${emailIntegration?.from_filter || "sin remitente"} / ${emailIntegration?.subject_filter || "sin asunto"}`
                  : "Sin filtros adicionales"}
              </p>
            </div>
          </div>

          {emailIntegration?.last_error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{emailIntegration.last_error}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-[#0071e3]" />
            <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Ultimas importaciones</h3>
          </div>
          <div className="mt-4 space-y-3">
            {emailImportHistory.length === 0 && (
              <p className="text-sm text-[#86868b]">Aun no hay facturas importadas desde correo.</p>
            )}
            {emailImportHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl bg-[#f5f5f7] px-4 py-3 dark:bg-[#111]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {getEmailImportDisplayTitle(item)}
                    </p>
                    <p className="mt-1 text-xs text-[#86868b]">
                      {item.supplier_name || item.remitente || "Proveedor no identificado"}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item.status === "importada"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : item.status === "duplicada"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                        : item.status === "omitida"
                          ? "bg-gray-100 text-[#86868b] dark:bg-gray-800 dark:text-gray-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#86868b]">
                  {item.created_at ? new Date(item.created_at).toLocaleString("es-CO") : "Sin fecha"} {item.detail ? `• ${item.detail}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeSection !== "automatizacion" && (
      <div className="bg-white dark:bg-[#1d1d1f] rounded-xl px-4 py-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
          <div>
            <label className="apple-label">Categoría</label>
            <select value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setCurrentPage(0); }} className="apple-input">
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>{categoria.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="apple-label">Método</label>
            <select value={filtroMetodo} onChange={(e) => { setFiltroMetodo(e.target.value); setCurrentPage(0); }} className="apple-input">
              <option value="">Todos</option>
              {metodos.map((metodo) => (
                <option key={metodo} value={metodo}>{metodo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="apple-label">Estado pago</label>
            <select
              value={activeSection === "cuentas" ? "pendiente" : filtroEstadoPago}
              onChange={(e) => { setFiltroEstadoPago(e.target.value); setCurrentPage(0); }}
              className="apple-input"
              disabled={activeSection === "cuentas"}
            >
              <option value="">Todos</option>
              {estadosPagoGasto.map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="apple-label">Año</label>
            <select value={filtroYear} onChange={(e) => { setFiltroYear(e.target.value); setFiltroMes(""); setCurrentPage(0); }} className="apple-input">
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="apple-label">Mes</label>
            <select value={filtroMes} onChange={(e) => { setFiltroMes(e.target.value); setCurrentPage(0); }} className="apple-input">
              {mesesDelAno.map((mes) => (
                <option key={mes.value || "all"} value={mes.value}>{mes.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] cursor-pointer">
              <input
                type="checkbox"
                checked={filtroRecurrente}
                onChange={(e) => { setFiltroRecurrente(e.target.checked); setCurrentPage(0); }}
                className="rounded"
              />
              Solo recurrentes
            </label>
          </div>
        </div>

        {hayFiltros && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-[#86868b]"
            >
              Limpiar filtros
            </button>
            <p className="text-sm font-semibold text-red-500 dark:text-red-400">
              Total página: {formatAccountingMoney(totalPagina)}
            </p>
          </div>
        )}
      </div>
      )}

      {activeSection !== "automatizacion" && summaryError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {summaryError}
        </div>
      )}

      {activeSection !== "automatizacion" && tableError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {tableError}
        </div>
      )}

      {activeSection === "libro" && (
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AccountingStatCard
              eyebrow="Egreso"
              label="Gasto total"
              value={summaryLoading ? "..." : formatAccountingMoney(summary?.summary.gastosTotales || 0)}
              detail="Egreso consolidado del rango seleccionado."
              tone="danger"
              icon={<Landmark size={18} />}
            />
            <AccountingStatCard
              eyebrow="Promedio"
              label="Promedio por gasto"
              value={summaryLoading ? "..." : formatAccountingMoney(summary?.summary.gastoPromedio || 0)}
              detail={`${summary?.summary.totalGastos || 0} egreso${(summary?.summary.totalGastos || 0) === 1 ? "" : "s"} en el periodo.`}
              tone="primary"
              icon={<Wallet size={18} />}
            />
            <AccountingStatCard
              eyebrow="Control"
              label="Recurrentes"
              value={summaryLoading ? "..." : formatAccountingMoney(summary?.summary.gastosRecurrentesTotal || 0)}
              detail={`${summary?.summary.gastosRecurrentesCount || 0} movimiento${(summary?.summary.gastosRecurrentesCount || 0) === 1 ? "" : "s"} recurrente${(summary?.summary.gastosRecurrentesCount || 0) === 1 ? "" : "s"}.`}
              tone="warning"
              icon={<Repeat size={18} />}
            />
            <AccountingStatCard
              eyebrow="Concentración"
              label="Categoría líder"
              value={topExpenseCategory?.categoria || "Sin datos"}
              detail={summaryLoading ? "..." : formatAccountingMoney(topExpenseCategory?.total || 0)}
              tone="default"
              icon={<BarChart3 size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <AccountingMiniList
              title="Categorías dominantes"
              description="Dónde se concentra el gasto del periodo."
              emptyLabel="No hay categorías con movimiento."
              items={(summary?.breakdown.gastosPorCategoria || []).slice(0, 6).map((row) => ({
                label: row.categoria || "Sin categoría",
                value: formatAccountingMoney(row.total),
                meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
              }))}
            />
            <AccountingMiniList
              title="Proveedores principales"
              description="Contrapartes con mayor peso económico."
              emptyLabel="No hay proveedores con movimientos en este rango."
              items={(summary?.breakdown.topProveedoresGasto || []).slice(0, 6).map((row) => ({
                label: row.concepto || "Sin proveedor",
                value: formatAccountingMoney(row.total),
                meta: `${row.cantidad} gasto${row.cantidad === 1 ? "" : "s"}`,
              }))}
            />
            <AccountingMiniList
              title="Métodos dominantes"
              description="Cómo se están pagando los egresos."
              emptyLabel="No hay métodos de pago registrados."
              items={(summary?.breakdown.gastosPorMetodo || []).slice(0, 6).map((row) => ({
                label: row.metodo_pago || "Sin método",
                value: formatAccountingMoney(row.total),
                meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
              }))}
            />
          </div>
        </div>
      )}

      {activeSection === "cuentas" && (
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AccountingStatCard
              eyebrow="Por pagar"
              label="Total pendiente"
              value={summaryLoading ? "..." : formatAccountingMoney(summary?.payables?.totalPendiente || 0)}
              detail="Facturas y egresos pendientes de salida."
              tone="warning"
              icon={<ShieldCheck size={18} />}
            />
            <AccountingStatCard
              eyebrow="Riesgo"
              label="Vencido"
              value={summaryLoading ? "..." : formatAccountingMoney(summary?.payables?.vencido || 0)}
              detail="Obligaciones fuera del plazo esperado."
              tone="danger"
              icon={<AlertTriangle size={18} />}
            />
            <AccountingStatCard
              eyebrow="Agenda"
              label="Próximo a vencer"
              value={summaryLoading ? "..." : formatAccountingMoney(summary?.payables?.vencePronto || 0)}
              detail="Compromisos que vencen en 7 días o menos."
              tone="warning"
              icon={<Clock3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Proveedor"
              label="Proveedor líder"
              value={topPendingProvider?.nombre || "Sin datos"}
              detail={summaryLoading ? "..." : formatAccountingMoney(topPendingProvider?.total || 0)}
              tone="default"
              icon={<ReceiptText size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountingBreakdownCard
              title="Antigüedad por pagar"
              subtitle="Distribución de cuentas por pagar según su vencimiento."
              rows={payablesBuckets.map((row) => ({ ...row, concepto: row.bucket }))}
              labelKey="concepto"
              emptyLabel="No hay egresos pendientes para este rango."
            />
            <AccountingBreakdownCard
              title="Top proveedores por pagar"
              subtitle="Contrapartes con mayor saldo pendiente actualmente."
              rows={payablesTopProviders.map((row) => ({ ...row, concepto: row.nombre }))}
              labelKey="concepto"
              emptyLabel="No hay proveedores con saldo pendiente."
            />
          </div>
        </div>
      )}

      {activeSection === "tramitadores" && (
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AccountingStatCard
              eyebrow="Tramitadores"
              label="Pagado del periodo"
              value={summaryLoading ? "..." : formatAccountingMoney(totalTramitador)}
              detail="Total ejecutado en categoría tramitador."
              tone="primary"
              icon={<ReceiptText size={18} />}
            />
            <AccountingStatCard
              eyebrow="Tramitadores"
              label="Pendiente por pagar"
              value={summaryLoading ? "..." : formatAccountingMoney(totalTramitadorPendiente)}
              detail="Saldo abierto con terceros."
              tone="warning"
              icon={<Clock3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Ranking"
              label="Tramitador líder"
              value={topTramitador?.nombre || "Sin datos"}
              detail={summaryLoading ? "..." : formatAccountingMoney(Number(topTramitador?.total || 0))}
              tone="default"
              icon={<BarChart3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Urgencia"
              label="Más urgente por pagar"
              value={topPendingTramitador?.nombre || "Sin pendientes"}
              detail={summaryLoading ? "..." : formatAccountingMoney(Number(topPendingTramitador?.total || 0))}
              tone="danger"
              icon={<AlertTriangle size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountingBreakdownCard
              title="Gasto por tramitador"
              subtitle="Cuánto se ha causado o pagado a cada tramitador en el periodo."
              rows={tramitadorRows.map((row) => ({ concepto: row.nombre, cantidad: row.cantidad, total: row.total }))}
              labelKey="concepto"
              emptyLabel="No hay pagos a tramitador en este corte."
            />
            <AccountingBreakdownCard
              title="Pendiente por tramitador"
              subtitle="Cuánto falta por pagarle a cada tramitador."
              rows={pendingTramitadorRows.map((row) => ({ concepto: row.nombre, cantidad: row.cantidad, total: row.total }))}
              labelKey="concepto"
              emptyLabel="No hay saldos pendientes con tramitadores."
            />
          </div>
        </div>
      )}

      {(activeSection === "libro" || activeSection === "cuentas" || activeSection === "tramitadores") && (
      <div className="mb-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs text-[#86868b] dark:border-gray-800 dark:bg-[#1d1d1f]">
        {EXPENSE_ADVANCED_SEARCH_HINT}
      </div>
      )}

      {(activeSection === "libro" || activeSection === "cuentas" || activeSection === "tramitadores") && (
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <DataTable
          key={activeSection}
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder={activeSection === "cuentas" ? "Buscar por proveedor, concepto, factura o fecha de pago..." : activeSection === "tramitadores" ? "Buscar por tramitador, concepto, factura o fecha..." : "Buscar por concepto, proveedor, factura, categoria, metodo o notas. Usa fecha: o monto: para filtros exactos."}
          searchTerm={searchTerm}
          onEdit={openEdit}
          onDelete={openDelete}
          serverSide
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onSearchChange={handleSearchChange}
          pageSize={PAGE_SIZE}
        />
      </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Gasto" : "Nuevo Gasto"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {/* Inline error banner */}
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

          {/* Category & payment method selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Categoría</label><select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as CategoriaGasto })} className={inputCls}>{categorias.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Método de Pago</label><select value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value as MetodoPagoGasto })} className={inputCls}>{metodos.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Estado de pago</label><select value={form.estado_pago} onChange={e => setForm({ ...form, estado_pago: e.target.value as EstadoPagoGasto })} className={inputCls}>{estadosPagoGasto.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select></div>
          </div>

          {/* Concepto (required) */}
          <div><label className="block text-xs text-[#86868b] mb-1">Concepto *</label><input type="text" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} className={inputCls} /></div>

          {/* Monto, fecha, and invoice number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Monto *</label><input type="number" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Fecha</label><input type="date" value={form.fecha} onChange={e => setForm((prev) => ({ ...prev, fecha: e.target.value, fecha_vencimiento: !prev.fecha_vencimiento || prev.fecha_vencimiento === prev.fecha ? e.target.value : prev.fecha_vencimiento }))} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">Vencimiento</label><input type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-[#86868b] mb-1">N° Factura</label><input type="text" value={form.numero_factura} onChange={e => setForm({ ...form, numero_factura: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Proveedor and recurrente toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#86868b] mb-1">Proveedor</label><input type="text" value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} className={inputCls} /></div>
            <div className="flex items-end pb-1"><label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] cursor-pointer"><input type="checkbox" checked={form.recurrente} onChange={e => setForm({ ...form, recurrente: e.target.checked })} className="rounded" /> Gasto recurrente</label></div>
          </div>

          {/* Optional notes */}
          <div><label className="block text-xs text-[#86868b] mb-1">Notas</label><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Gasto"}</button>
          </div>
        </div>
      </Modal>

      <Modal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          resetInvoiceImport();
        }}
        title="Importar Factura Electronica"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          {invoiceImportError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {invoiceImportError}
            </p>
          )}

          <div className="rounded-2xl border border-dashed border-[#0071e3]/25 bg-[#0071e3]/5 p-4 dark:border-[#0071e3]/35 dark:bg-[#0071e3]/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Sube el XML de la factura electronica
                </p>
                <p className="mt-1 text-xs text-[#86868b]">
                  Se leen numero de factura, fecha, proveedor, total, impuestos y conceptos para crear el gasto con soporte contable.
                  Tambien puedes subir el ZIP original cuando la factura venga con PDF y XML.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm font-medium text-white hover:bg-[#0077ED]">
                <Upload size={15} />
                {parsingInvoice ? "Leyendo archivo..." : "Seleccionar XML o ZIP"}
                <input
                  ref={invoiceFileInputRef}
                  type="file"
                  accept=".xml,.zip,text/xml,application/xml,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(event) => void handleInvoiceFileChange(event)}
                />
              </label>
            </div>
          </div>

          {invoicePreview && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Factura</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{invoicePreview.invoiceNumber}</p>
                  <p className="mt-2 text-xs text-[#86868b]">
                    {invoicePreview.sourceFormat === "zip" ? `ZIP: ${invoicePreview.fileName}` : `XML: ${invoicePreview.fileName}`}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Proveedor</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{invoicePreview.supplierName}</p>
                </div>
                <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Fecha</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{invoicePreview.issueDate}</p>
                </div>
                <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Total</p>
                  <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {formatInvoiceMoney(invoicePreview.payableAmount, invoicePreview.currency)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-[#86868b] mb-1">Categoria sugerida</label>
                      <select
                        value={invoiceForm.categoria}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, categoria: e.target.value as CategoriaGasto })}
                        className={inputCls}
                      >
                        {categorias.map((categoria) => (
                          <option key={categoria} value={categoria}>{categoria.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#86868b] mb-1">Estado de pago</label>
                      <select
                        value={invoiceForm.estado_pago}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, estado_pago: e.target.value as EstadoPagoGasto })}
                        className={inputCls}
                      >
                        {estadosPagoGasto.map((estado) => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#86868b] mb-1">Metodo de pago</label>
                      <select
                        value={invoiceForm.metodo_pago}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, metodo_pago: e.target.value as MetodoPagoGasto })}
                        className={inputCls}
                      >
                        {metodos.map((metodo) => (
                          <option key={metodo} value={metodo}>{metodo}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#86868b] mb-1">Concepto *</label>
                    <input
                      type="text"
                      value={invoiceForm.concepto}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, concepto: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-[#86868b] mb-1">Monto *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={invoiceForm.monto}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, monto: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#86868b] mb-1">Fecha</label>
                      <input
                        type="date"
                        value={invoiceForm.fecha}
                        onChange={(e) => setInvoiceForm((prev) => ({
                          ...prev,
                          fecha: e.target.value,
                          fecha_vencimiento: !prev.fecha_vencimiento || prev.fecha_vencimiento === prev.fecha
                            ? e.target.value
                            : prev.fecha_vencimiento,
                        }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#86868b] mb-1">Vencimiento</label>
                      <input
                        type="date"
                        value={invoiceForm.fecha_vencimiento}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, fecha_vencimiento: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#86868b] mb-1">N° Factura</label>
                      <input
                        type="text"
                        value={invoiceForm.numero_factura}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, numero_factura: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#86868b] mb-1">Proveedor</label>
                      <input
                        type="text"
                        value={invoiceForm.proveedor}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, proveedor: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={invoiceForm.recurrente}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, recurrente: e.target.checked })}
                          className="rounded"
                        />
                        Registrar como gasto recurrente
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#86868b] mb-1">Notas contables</label>
                    <textarea
                      value={invoiceForm.notas}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, notas: e.target.value })}
                      rows={5}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Resumen fiscal</p>
                    <div className="mt-3 space-y-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                      <p><span className="font-semibold">Moneda:</span> {invoicePreview.currency}</p>
                      <p><span className="font-semibold">XML detectado:</span> {invoicePreview.xmlEntryName}</p>
                      <p><span className="font-semibold">PDF detectado:</span> {invoicePreview.pdfEntryName || "No encontrado en el archivo"}</p>
                      <p><span className="font-semibold">Subtotal:</span> {invoicePreview.subtotalAmount !== null ? formatInvoiceMoney(invoicePreview.subtotalAmount, invoicePreview.currency) : "No disponible"}</p>
                      <p><span className="font-semibold">Impuestos:</span> {invoicePreview.taxAmount !== null ? formatInvoiceMoney(invoicePreview.taxAmount, invoicePreview.currency) : "No disponible"}</p>
                      <p><span className="font-semibold">NIT proveedor:</span> {invoicePreview.supplierTaxId || "No disponible"}</p>
                      <p><span className="font-semibold">Vencimiento:</span> {invoicePreview.dueDate || "No disponible"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#86868b]">Lineas detectadas</p>
                    {invoicePreview.lineItems.length === 0 ? (
                      <p className="mt-3 text-sm text-[#86868b]">
                        El XML no trae lineas detalladas legibles. Puedes ajustar el concepto manualmente.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {invoicePreview.lineItems.slice(0, 6).map((item) => (
                          <li key={item} className="rounded-xl bg-white px-3 py-2 dark:bg-[#161618]">
                            {item}
                          </li>
                        ))}
                        {invoicePreview.lineItems.length > 6 && (
                          <li className="text-xs text-[#86868b]">
                            + {invoicePreview.lineItems.length - 6} linea(s) adicionales en la factura.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => {
                setImportModalOpen(false);
                resetInvoiceImport();
              }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImportInvoice}
              disabled={!invoicePreview || parsingInvoice || importingInvoice}
              className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              {importingInvoice ? "Importando..." : "Registrar gasto desde factura"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title={emailIntegration ? "Editar Correo de Facturas" : "Conectar Correo de Facturas"}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {emailError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20">
              {emailError}
            </p>
          )}

          <div className="rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/5 p-4 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 text-[#0071e3]" />
              <div className="text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                <p className="font-semibold">Conexion segura por IMAP</p>
                <p className="mt-1 text-xs text-[#86868b]">
                  Guarda el correo y su app password cifrados para leer automaticamente adjuntos XML o ZIP y registrarlos como gastos.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-[#86868b] mb-1">Correo del buzon *</label>
              <input
                type="email"
                value={emailForm.correo}
                onChange={(e) => handleEmailAddressChange(e.target.value)}
                className={inputCls}
                placeholder="facturas@tuempresa.com"
              />
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">Sede contable destino *</label>
              <select
                value={emailForm.sede_id}
                onChange={(e) => setEmailForm((current) => ({ ...current, sede_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Selecciona una sede</option>
                {sedesOptions.map((sede) => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-[#86868b] mb-1">Host IMAP *</label>
              <input
                type="text"
                value={emailForm.imap_host}
                onChange={(e) => setEmailForm((current) => ({ ...current, imap_host: e.target.value }))}
                className={inputCls}
                placeholder="imap.gmail.com"
              />
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">Puerto *</label>
              <input
                type="number"
                value={emailForm.imap_port}
                onChange={(e) => setEmailForm((current) => ({ ...current, imap_port: e.target.value }))}
                className={inputCls}
                placeholder="993"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-[#86868b] mb-1">Usuario IMAP *</label>
              <input
                type="text"
                value={emailForm.imap_user}
                onChange={(e) => setEmailForm((current) => ({ ...current, imap_user: e.target.value }))}
                className={inputCls}
                placeholder="facturas@tuempresa.com"
              />
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">
                {emailIntegration?.provider === MANUAL_IMAP_PROVIDER && emailIntegration?.has_password
                  ? "Nueva app password (opcional)"
                  : "App password *"}
              </label>
              <input
                type="password"
                value={emailForm.imap_password}
                onChange={(e) => setEmailForm((current) => ({ ...current, imap_password: e.target.value }))}
                className={inputCls}
                autoComplete="new-password"
                placeholder={emailIntegration?.provider === MANUAL_IMAP_PROVIDER && emailIntegration?.has_password
                  ? "Deja en blanco para conservar la actual"
                  : "Clave de aplicacion"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-[#86868b] mb-1">Bandeja</label>
              <input
                type="text"
                value={emailForm.mailbox}
                onChange={(e) => setEmailForm((current) => ({ ...current, mailbox: e.target.value }))}
                className={inputCls}
                placeholder="INBOX"
              />
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">Filtro remitente</label>
              <input
                type="text"
                value={emailForm.from_filter}
                onChange={(e) => setEmailForm((current) => ({ ...current, from_filter: e.target.value }))}
                className={inputCls}
                placeholder="facturador@proveedor.com"
              />
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">Filtro asunto</label>
              <input
                type="text"
                value={emailForm.subject_filter}
                onChange={(e) => setEmailForm((current) => ({ ...current, subject_filter: e.target.value }))}
                className={inputCls}
                placeholder="Factura electronica"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
              <input
                type="checkbox"
                checked={emailForm.imap_secure}
                onChange={(e) => setEmailForm((current) => ({ ...current, imap_secure: e.target.checked }))}
                className="rounded"
              />
              Usar TLS/SSL
            </label>
            <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
              <input
                type="checkbox"
                checked={emailForm.import_only_unseen}
                onChange={(e) => setEmailForm((current) => ({ ...current, import_only_unseen: e.target.checked }))}
                className="rounded"
              />
              Solo no leidos
            </label>
            <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
              <input
                type="checkbox"
                checked={emailForm.auto_sync}
                onChange={(e) => setEmailForm((current) => ({ ...current, auto_sync: e.target.checked }))}
                className="rounded"
              />
              Sincronizar automaticamente
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
            <input
              type="checkbox"
              checked={emailForm.activa}
              onChange={(e) => setEmailForm((current) => ({ ...current, activa: e.target.checked }))}
              className="rounded"
            />
            Mantener la conexion activa
          </label>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setEmailModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEmailIntegration}
              disabled={emailSaving}
              className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              {emailSaving ? "Guardando..." : emailIntegration ? "Guardar conexion" : "Conectar correo"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={emailHistoryModalOpen}
        onClose={() => setEmailHistoryModalOpen(false)}
        title="Buscar Facturas Antiguas"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/5 p-4 text-sm text-[#1d1d1f] dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#f5f5f7]">
            <p className="font-semibold">Busqueda historica controlada</p>
            <p className="mt-1 text-xs text-[#86868b]">
              Este proceso revisa correos antiguos del buzon, ignora la restriccion de no leidos y mantiene la sincronizacion normal de correos nuevos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-[#86868b] mb-1">Meses hacia atras</label>
              <select
                value={emailHistoryMonths}
                onChange={(e) => setEmailHistoryMonths(e.target.value)}
                className={inputCls}
              >
                {HISTORICAL_MONTH_OPTIONS.map((value) => (
                  <option key={value} value={value}>{value} meses</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#86868b] mb-1">Maximo de correos</label>
              <select
                value={emailHistoryMaxMessages}
                onChange={(e) => setEmailHistoryMaxMessages(e.target.value)}
                className={inputCls}
              >
                {HISTORICAL_LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>{value} correos</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-[#86868b]">
            Si encuentra mas correos de los que caben en el limite, te lo indicara al terminar para que puedas repetir la busqueda con un rango mayor o por mas tandas.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setEmailHistoryModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleHistoricalEmailSync}
              disabled={emailSyncing}
              className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              {emailSyncing ? "Buscando..." : "Buscar facturas antiguas"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation dialog */}
      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={saving} message="¿Eliminar este gasto?" />
    </div>
  );
}
