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

import dynamic from "next/dynamic";
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
  formatCompactDate,
  formatAccountingMoney,
  type AccountingReportResponse,
  getMonthDateRange,
  MONTH_OPTIONS,
} from "@/lib/accounting-dashboard";
import { normalizeExpenseCategory } from "@/lib/expense-category";
import { EXPENSE_ADVANCED_SEARCH_HINT, parseExpenseSearch } from "@/lib/expense-search";
import type {
  EstadoPagoGasto,
  FacturaCorreoImportacion,
  Gasto,
  CategoriaGasto,
  MetodoPagoGasto,
} from "@/types/database";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Download,
  Landmark,
  Link2,
  Mail,
  Plus,
  ReceiptText,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Unplug,
  Upload,
  Wallet,
} from "lucide-react";

import {
  PAGE_SIZE,
  currentYear,
  categorias,
  metodos,
  estadosPagoGasto,
  emptyForm,
  emptyEmailIntegrationForm,
  EXPENSE_SECTION_ITEMS,
  EXPENSE_VIEW_ITEMS,
  parseExpenseSection,
  inferImapHost,
  isHorasClosureExpense,
  getEmailImportDisplayTitle,
  applyExpenseViewToSupabaseQuery,
  applyExpenseSearchToSupabaseQuery,
  getExpenseDueMeta,
  resolveSedeId,
  type GastoFormState,
  type EmailInvoiceIntegrationView,
  type EmailInvoiceConfigFormState,
  type EmailInvoiceSyncSummary,
  type SedeOption,
  type ExpenseSection,
  type ExpenseView,
} from "./constants";

const DeleteConfirm = dynamic(() => import("@/components/dashboard/DeleteConfirm"), {
  loading: () => null,
});
const GastoModal = dynamic(() => import("./GastoModal"), { loading: () => null });
const ImportInvoiceModal = dynamic(() => import("./ImportInvoiceModal"), {
  loading: () => null,
});
const EmailIntegrationModal = dynamic(() => import("./EmailIntegrationModal"), {
  loading: () => null,
});
const HistoricalSearchModal = dynamic(() => import("./HistoricalSearchModal"), {
  loading: () => null,
});

export default function GastosPage() {
  // --- Auth & state ---
  const { perfil } = useAuth();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState<ExpenseSection>(
    parseExpenseSection(searchParams.get("section"))
  );
  const [activeView, setActiveView] = useState<ExpenseView>("all");
  const fetchIdRef = useRef(0);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroEstadoPago, setFiltroEstadoPago] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroYear, setFiltroYear] = useState(String(currentYear));
  const [filtroRecurrente, setFiltroRecurrente] = useState(false);
  const [selectedTramitador, setSelectedTramitador] = useState("");
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
  const [emailIntegration, setEmailIntegration] = useState<EmailInvoiceIntegrationView | null>(
    null
  );
  const [emailImportHistory, setEmailImportHistory] = useState<FacturaCorreoImportacion[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] =
    useState<EmailInvoiceConfigFormState>(emptyEmailIntegrationForm);
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

  const buildDefaultEmailForm = useCallback(
    (
      options: SedeOption[],
      integration?: EmailInvoiceIntegrationView | null
    ): EmailInvoiceConfigFormState => {
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
    },
    [perfil?.email, perfil?.sede_id]
  );

  useEffect(() => {
    setActiveSection(parseExpenseSection(searchParams.get("section")));
  }, [searchParams]);

  useEffect(() => {
    if (activeSection !== "tramitadores" && selectedTramitador) {
      setSelectedTramitador("");
    }
  }, [activeSection, selectedTramitador]);

  useEffect(() => {
    sedesOptionsRef.current = sedesOptions;
  }, [sedesOptions]);

  useEffect(() => {
    emailModalOpenRef.current = emailModalOpen;
  }, [emailModalOpen]);

  const shouldLoadEmailAutomation =
    activeSection === "automatizacion" || emailModalOpen || emailHistoryModalOpen;

  const loadEmailIntegrationState = useCallback(
    async (options?: SedeOption[]) => {
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
        setEmailError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la integracion de correo."
        );
        setEmailIntegration(null);
        setEmailImportHistory([]);
        if (!emailModalOpenRef.current) {
          setEmailForm(buildDefaultEmailForm(nextOptions, null));
        }
      } finally {
        setEmailLoading(false);
      }
    },
    [buildDefaultEmailForm, perfil?.escuela_id]
  );

  /**
   * Fetch expenses from Supabase with server-side pagination and search.
   * Called on mount and after every successful create/update/delete.
   */
  const fetchData = useCallback(
    async (page = 0, search = "") => {
      if (!perfil?.escuela_id) return;
      const shouldLoadLedger =
        activeSection === "libro" ||
        activeSection === "cuentas" ||
        activeSection === "tramitadores";
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

        if (activeSection !== "tramitadores" && filtroCategoria) {
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
          if (selectedTramitador) {
            countQuery = countQuery.eq("proveedor", selectedTramitador);
          }
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
          .select(
            "id, mantenimiento_id, categoria, concepto, monto, metodo_pago, proveedor, numero_factura, fecha, fecha_vencimiento, estado_pago, recurrente, notas, created_at"
          )
          .eq("escuela_id", perfil.escuela_id)
          .order(activeSection === "cuentas" ? "fecha_vencimiento" : "fecha", {
            ascending: activeSection === "cuentas",
          })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (activeSection !== "tramitadores" && filtroCategoria) {
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
          if (selectedTramitador) {
            dataQuery = dataQuery.eq("proveedor", selectedTramitador);
          }
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
        setTableError(
          fetchError instanceof Error ? fetchError.message : "No se pudo consultar los gastos."
        );
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      perfil?.escuela_id,
      filtroCategoria,
      filtroMetodo,
      filtroEstadoPago,
      filtroMes,
      filtroYear,
      filtroRecurrente,
      activeView,
      activeSection,
      selectedTramitador,
    ]
  );

  // Fetch data once the authenticated profile is available.
  useEffect(() => {
    if (perfil) {
      fetchData(currentPage, searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    perfil?.id,
    currentPage,
    searchTerm,
    filtroCategoria,
    filtroMetodo,
    filtroEstadoPago,
    filtroMes,
    filtroYear,
    filtroRecurrente,
    activeView,
    activeSection,
    selectedTramitador,
  ]);

  useEffect(() => {
    if (!perfil?.rol) return;
    const shouldLoadSummary =
      activeSection === "libro" || activeSection === "cuentas" || activeSection === "tramitadores";

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
        include:
          activeSection === "cuentas" || activeSection === "tramitadores"
            ? "summary,breakdown,payables"
            : "summary,breakdown",
      });

      if (activeSection !== "tramitadores" && filtroCategoria)
        params.set("gasto_categoria", filtroCategoria);
      if (filtroMetodo) params.set("gasto_metodo", filtroMetodo);
      if (activeSection === "cuentas") {
        params.set("gasto_estado", "pendiente");
      } else if (filtroEstadoPago) {
        params.set("gasto_estado", filtroEstadoPago);
      }
      if (filtroRecurrente) params.set("recurrente", "true");
      if (activeSection === "tramitadores") {
        params.set("gasto_view", "tramitadores");
        if (selectedTramitador) {
          params.set("gasto_contraparte", selectedTramitador);
        }
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
        setSummaryError(
          summaryErr instanceof Error
            ? summaryErr.message
            : "No se pudo cargar el resumen de gastos."
        );
      } finally {
        setSummaryLoading(false);
      }
    };

    void loadSummary();
  }, [
    perfil?.rol,
    filtroCategoria,
    filtroMetodo,
    filtroEstadoPago,
    filtroMes,
    filtroYear,
    filtroRecurrente,
    searchTerm,
    activeView,
    activeSection,
    selectedTramitador,
  ]);

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

        const options = (sedesRows as SedeOption[]) || [];
        setSedesOptions(options);
        await loadEmailIntegrationState(options);
      } catch (resourceError: unknown) {
        setEmailError(
          resourceError instanceof Error
            ? resourceError.message
            : "No se pudo cargar la configuracion de correo."
        );
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
      setEmailNotice(
        "Correo conectado correctamente. Ya puedes sincronizar facturas automaticamente."
      );
      await loadEmailIntegrationState();
    } catch (saveError: unknown) {
      setEmailError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar la conexion de correo."
      );
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
      setEmailError(
        deleteError instanceof Error ? deleteError.message : "No se pudo desconectar el correo."
      );
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
      setEmailNotice(
        `Sincronizacion completada: ${importedText}, ${duplicatedText}, ${errorText}.`
      );
      await Promise.all([loadEmailIntegrationState(), fetchData(currentPage, searchTerm)]);
    } catch (syncError: unknown) {
      setEmailError(
        syncError instanceof Error ? syncError.message : "No se pudo sincronizar el correo."
      );
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
      await Promise.all([loadEmailIntegrationState(), fetchData(currentPage, searchTerm)]);
    } catch (syncError: unknown) {
      setEmailError(
        syncError instanceof Error
          ? syncError.message
          : "No se pudo buscar facturas antiguas en el correo."
      );
    } finally {
      setEmailSyncing(false);
    }
  };

  const persistExpense = useCallback(
    async (
      payload: {
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
      },
      editingId?: string
    ) => {
      const supabase = createClient();
      const normalizedPayload = {
        ...payload,
        categoria: normalizeExpenseCategory(
          payload.categoria,
          payload.concepto,
          payload.proveedor,
          payload.notas
        ),
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
    },
    [perfil]
  );

  const findDuplicateInvoiceExpense = useCallback(
    async (invoiceNumber: string, supplierName: string) => {
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
      const rows = (
        (existingRows as Pick<
          Gasto,
          "id" | "concepto" | "fecha" | "proveedor" | "numero_factura"
        >[]) || []
      ).filter((row) => {
        if (!normalizedSupplier) return true;
        return (row.proveedor ?? "").trim().toLowerCase() === normalizedSupplier;
      });

      return rows[0] || null;
    },
    [perfil?.escuela_id]
  );

  /** Open the modal in "create" mode with a blank form. */
  const openCreate = () => {
    setEditing(null);
    restoreDraft({
      ...emptyForm,
      categoria: activeSection === "tramitadores" ? "tramitador" : emptyForm.categoria,
      metodo_pago: activeSection === "tramitadores" ? "transferencia" : emptyForm.metodo_pago,
      estado_pago: activeSection === "tramitadores" ? "pendiente" : emptyForm.estado_pago,
      proveedor: activeSection === "tramitadores" ? selectedTramitador : "",
    });
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
      setLinkedNotice(
        "Este gasto viene del cierre mensual de horas. Regénéralo desde el módulo de Horas."
      );
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
    setError("");
    setModalOpen(true);
  };

  /** Open the delete-confirmation dialog for the given row. */
  const openDelete = (row: Gasto) => {
    if (row.mantenimiento_id) {
      setLinkedNotice(
        "Este gasto está sincronizado con bitácora/vehículos. Elimínalo desde ese módulo."
      );
      return;
    }
    if (isHorasClosureExpense(row)) {
      setLinkedNotice(
        "Este gasto está sincronizado con el cierre mensual de horas. Regénéralo o ajústalo desde el módulo de Horas."
      );
      return;
    }
    setDeleting(row);
    setDeleteOpen(true);
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
      setInvoiceImportError(
        parseError instanceof Error ? parseError.message : "No se pudo leer la factura electronica."
      );
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
      const duplicate = await findDuplicateInvoiceExpense(
        invoiceForm.numero_factura,
        invoiceForm.proveedor
      );
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
      setInvoiceImportError(
        importError instanceof Error
          ? importError.message
          : "No se pudo importar la factura electronica."
      );
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
    if (!form.concepto || !form.monto) {
      setError("Concepto y monto son obligatorios.");
      return;
    }
    if (form.categoria === "tramitador" && !form.proveedor.trim()) {
      setError("Debes indicar el nombre del tramitador para consolidar el gasto correctamente.");
      return;
    }

    // Validate that monto is a valid number.
    const montoNum = parseFloat(form.monto);
    if (isNaN(montoNum)) {
      setError("El monto debe ser un número válido.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        categoria: form.categoria,
        concepto: form.concepto,
        monto: montoNum,
        metodo_pago: form.metodo_pago,
        proveedor: form.proveedor || null,
        numero_factura: form.numero_factura || null,
        fecha: form.fecha,
        fecha_vencimiento: form.fecha_vencimiento || form.fecha,
        estado_pago: form.estado_pago,
        recurrente: form.recurrente,
        notas: form.notas || null,
      };

      await persistExpense(payload, editing?.id);

      // Success — close modal and refresh the table.
      clearDraft(emptyForm);
      setSaving(false);
      setModalOpen(false);
      fetchData(currentPage, searchTerm);
    } catch (networkError: unknown) {
      // Handle unexpected network / runtime errors.
      const message =
        networkError instanceof Error ? networkError.message : "Error de red inesperado.";
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
      setSaving(false);
      setDeleteOpen(false);
      setDeleting(null);
      fetchData(currentPage, searchTerm);
    } catch (networkError: unknown) {
      const message =
        networkError instanceof Error ? networkError.message : "Error al eliminar el gasto.";
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
          .select(
            "id, mantenimiento_id, categoria, concepto, monto, metodo_pago, proveedor, numero_factura, fecha, fecha_vencimiento, estado_pago, recurrente, notas, created_at"
          )
          .eq("escuela_id", perfil.escuela_id)
          .order(activeSection === "cuentas" ? "fecha_vencimiento" : "fecha", {
            ascending: activeSection === "cuentas",
          })
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (activeSection !== "tramitadores" && filtroCategoria)
          query = query.eq("categoria", filtroCategoria);
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
          if (selectedTramitador) {
            query = query.eq("proveedor", selectedTramitador);
          }
        } else {
          query = applyExpenseViewToSupabaseQuery(query, activeView);
        }
        if (searchTerm)
          query = applyExpenseSearchToSupabaseQuery(query, parseExpenseSearch(searchTerm));

        const { data: batch, error: exportError } = await query;
        if (exportError) throw exportError;

        const normalizedBatch = (batch as Gasto[]) ?? [];
        rows.push(...normalizedBatch);
        if (normalizedBatch.length < pageSize) break;
        from += pageSize;
      }

      downloadCsv(
        `gastos-${filtroYear}${filtroMes ? `-${filtroMes}` : ""}.csv`,
        [
          "Fecha",
          "Vencimiento",
          "Estado pago",
          "Categoria",
          "Concepto",
          "Monto",
          "Metodo",
          "Proveedor",
          "Factura",
          "Recurrente",
          "Notas",
        ],
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
      setTableError(
        exportErr instanceof Error ? exportErr.message : "No se pudo exportar los gastos."
      );
    } finally {
      setExporting(false);
    }
  };

  const years = buildAccountingYears();
  const mesesDelAno =
    Number(filtroYear) === currentYear
      ? MONTH_OPTIONS.filter((mes) => !mes.value || Number(mes.value) <= new Date().getMonth() + 1)
      : MONTH_OPTIONS;
  const hayFiltros = Boolean(
    (activeSection !== "tramitadores" && filtroCategoria) ||
    filtroMetodo ||
    (activeSection !== "cuentas" && filtroEstadoPago) ||
    filtroMes ||
    filtroRecurrente ||
    filtroYear !== String(currentYear) ||
    (activeSection === "tramitadores" && selectedTramitador) ||
    (activeSection !== "tramitadores" && activeView !== "all")
  );
  const topExpenseCategory = summary?.breakdown.gastosPorCategoria[0];
  const topPendingProvider = summary?.payables?.topProveedores[0];
  const payablesBuckets = summary?.payables?.buckets || [];
  const payablesTopProviders = summary?.payables?.topProveedores || [];
  const tramitadorRows = summary?.breakdown.topTramitadoresGasto || [];
  const tramitadorPortfolio = summary?.breakdown.tramitadorPortfolio || [];
  const pendingTramitadorRows = summary?.payables?.topTramitadores || [];
  const totalTramitador = (summary?.breakdown.gastosPorCategoria || [])
    .filter((row) => row.categoria === "tramitador")
    .reduce((sum, row) => sum + Number(row.total || 0), 0);
  const totalTramitadorPendiente = pendingTramitadorRows.reduce(
    (sum, row) => sum + Number(row.total || 0),
    0
  );
  const topTramitador = tramitadorRows[0];
  const topPendingTramitador = pendingTramitadorRows[0];
  const selectedTramitadorRow =
    tramitadorPortfolio.find((row) => row.nombre === selectedTramitador) || null;
  const tramitadorOptions = Array.from(
    new Set(
      [...tramitadorPortfolio, ...tramitadorRows, ...pendingTramitadorRows]
        .map((row) => row.nombre)
        .filter((value): value is string => Boolean(value))
    )
  );
  const tramitadoresActivos = tramitadorPortfolio.length;
  const tramitadoresConSaldo = tramitadorPortfolio.filter((row) => row.pendiente > 0).length;
  const unnamedTramitadorRow =
    tramitadorPortfolio.find((row) => row.nombre === "Sin tramitador") || null;
  const topTramitadorShare =
    totalTramitador > 0 && topTramitador
      ? (Number(topTramitador.total || 0) / totalTramitador) * 100
      : 0;
  const totalPagina = data.reduce((sum, row) => sum + Number(row.monto || 0), 0);
  const currentSectionMeta =
    EXPENSE_SECTION_ITEMS.find((item) => item.id === activeSection) || EXPENSE_SECTION_ITEMS[0];
  const visibleViewItems =
    activeSection === "automatizacion" || activeSection === "tramitadores"
      ? []
      : activeSection === "cuentas"
        ? EXPENSE_VIEW_ITEMS.filter(
            (item) =>
              item.id === "all" || item.id === "with_invoice" || item.id === "without_invoice"
          )
        : EXPENSE_VIEW_ITEMS;

  const clearFilters = () => {
    setFiltroCategoria("");
    setFiltroMetodo("");
    setFiltroEstadoPago("");
    setFiltroMes("");
    setFiltroYear(String(currentYear));
    setFiltroRecurrente(false);
    setSelectedTramitador("");
    setActiveView("all");
    setCurrentPage(0);
  };
  /** Column definitions for the DataTable component. */
  const columns = useMemo(() => {
    if (activeSection === "tramitadores") {
      return [
        { key: "fecha" as keyof Gasto, label: "Fecha" },
        {
          key: "proveedor" as keyof Gasto,
          label: "Tramitador",
          render: (row: Gasto) => (
            <div className="space-y-1">
              <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                {row.proveedor || "Sin tramitador"}
              </p>
              <p className="text-xs text-[#86868b]">{row.estado_pago}</p>
            </div>
          ),
        },
        {
          key: "concepto" as keyof Gasto,
          label: "Concepto",
          render: (row: Gasto) => (
            <div className="space-y-1">
              <span className="font-medium">{row.concepto}</span>
              {row.numero_factura ? (
                <p className="text-xs text-[#86868b]">Factura {row.numero_factura}</p>
              ) : null}
            </div>
          ),
        },
        {
          key: "monto" as keyof Gasto,
          label: "Monto",
          render: (row: Gasto) => (
            <span className="font-medium text-red-500">
              {formatAccountingMoney(Number(row.monto))}
            </span>
          ),
        },
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
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueMeta.className}`}
                >
                  {dueMeta.label}
                </span>
              </div>
            );
          },
        },
        { key: "metodo_pago" as keyof Gasto, label: "Método" },
      ];
    }

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
      {
        key: "categoria" as keyof Gasto,
        label: "Categoría",
        render: (r: Gasto) => (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[#86868b] dark:bg-gray-800">
            {r.categoria.replace("_", " ")}
          </span>
        ),
      },
      {
        key: "monto" as keyof Gasto,
        label: "Monto",
        render: (r: Gasto) => (
          <span className="font-medium text-red-500">{formatAccountingMoney(Number(r.monto))}</span>
        ),
      },
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
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueMeta.className}`}
                >
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
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                row.estado_pago === "pagado"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : row.estado_pago === "anulado"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {row.estado_pago}
            </span>
          ),
        },
      ];
    }

    return [...baseColumns, { key: "metodo_pago" as keyof Gasto, label: "Método" }];
  }, [activeSection]);

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
        <AccountingPanel
          title={currentSectionMeta.label}
          description={currentSectionMeta.description}
        >
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
                  <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Correo de facturas
                  </h3>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      emailIntegration?.activa
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "bg-gray-100 text-[#86868b] dark:bg-gray-800"
                    }`}
                  >
                    {emailIntegration?.activa ? "Activo" : "Sin conectar"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#86868b]">
                  Conecta un buzón IMAP para leer adjuntos XML o ZIP y registrar automaticamente las
                  facturas electronicas en gastos.
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
                <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">Buzon</p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {emailLoading ? "Cargando..." : emailIntegration?.correo || "Sin configurar"}
                </p>
                <p className="mt-1 text-xs text-[#86868b]">
                  {emailIntegration
                    ? `${emailIntegration.imap_host}:${emailIntegration.imap_port}`
                    : "Conecta un correo con IMAP habilitado"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">Bandeja</p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {emailIntegration?.mailbox || "INBOX"}
                </p>
                <p className="mt-1 text-xs text-[#86868b]">
                  {emailIntegration?.import_only_unseen
                    ? "Solo correos no leidos"
                    : "Correos nuevos por UID"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">
                  Ultima sincronizacion
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {emailIntegration?.last_synced_at
                    ? new Date(emailIntegration.last_synced_at).toLocaleString("es-CO")
                    : "Aun no sincronizado"}
                </p>
                <p className="mt-1 text-xs text-[#86868b]">
                  UID maximo: {emailIntegration?.last_uid || "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
                <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">
                  Modo automatico
                </p>
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
              <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Ultimas importaciones
              </h3>
            </div>
            <div className="mt-4 space-y-3">
              {emailImportHistory.length === 0 && (
                <p className="text-sm text-[#86868b]">
                  Aun no hay facturas importadas desde correo.
                </p>
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
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        item.status === "importada"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : item.status === "duplicada"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                            : item.status === "omitida"
                              ? "bg-gray-100 text-[#86868b] dark:bg-gray-800 dark:text-gray-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#86868b]">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("es-CO")
                      : "Sin fecha"}{" "}
                    {item.detail ? `• ${item.detail}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection !== "automatizacion" && (
        <div className="mb-4 rounded-xl bg-white px-4 py-3 dark:bg-[#1d1d1f]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div>
              <label className="apple-label">
                {activeSection === "tramitadores" ? "Tramitador" : "Categoría"}
              </label>
              {activeSection === "tramitadores" ? (
                <select
                  value={selectedTramitador}
                  onChange={(e) => {
                    setSelectedTramitador(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="apple-input"
                >
                  <option value="">Todos</option>
                  {tramitadorOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={filtroCategoria}
                  onChange={(e) => {
                    setFiltroCategoria(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="apple-input"
                >
                  <option value="">Todas</option>
                  {categorias.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="apple-label">Método</label>
              <select
                value={filtroMetodo}
                onChange={(e) => {
                  setFiltroMetodo(e.target.value);
                  setCurrentPage(0);
                }}
                className="apple-input"
              >
                <option value="">Todos</option>
                {metodos.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="apple-label">Estado pago</label>
              <select
                value={activeSection === "cuentas" ? "pendiente" : filtroEstadoPago}
                onChange={(e) => {
                  setFiltroEstadoPago(e.target.value);
                  setCurrentPage(0);
                }}
                className="apple-input"
                disabled={activeSection === "cuentas"}
              >
                <option value="">Todos</option>
                {estadosPagoGasto.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="apple-label">Año</label>
              <select
                value={filtroYear}
                onChange={(e) => {
                  setFiltroYear(e.target.value);
                  setFiltroMes("");
                  setCurrentPage(0);
                }}
                className="apple-input"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="apple-label">Mes</label>
              <select
                value={filtroMes}
                onChange={(e) => {
                  setFiltroMes(e.target.value);
                  setCurrentPage(0);
                }}
                className="apple-input"
              >
                {mesesDelAno.map((mes) => (
                  <option key={mes.value || "all"} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                <input
                  type="checkbox"
                  checked={filtroRecurrente}
                  onChange={(e) => {
                    setFiltroRecurrente(e.target.checked);
                    setCurrentPage(0);
                  }}
                  className="rounded"
                />
                Solo recurrentes
              </label>
            </div>
          </div>

          {hayFiltros && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#86868b] dark:border-gray-700"
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
              value={
                summaryLoading ? "..." : formatAccountingMoney(summary?.summary.gastosTotales || 0)
              }
              detail="Egreso consolidado del rango seleccionado."
              tone="danger"
              icon={<Landmark size={18} />}
            />
            <AccountingStatCard
              eyebrow="Promedio"
              label="Promedio por gasto"
              value={
                summaryLoading ? "..." : formatAccountingMoney(summary?.summary.gastoPromedio || 0)
              }
              detail={`${summary?.summary.totalGastos || 0} egreso${(summary?.summary.totalGastos || 0) === 1 ? "" : "s"} en el periodo.`}
              tone="primary"
              icon={<Wallet size={18} />}
            />
            <AccountingStatCard
              eyebrow="Control"
              label="Recurrentes"
              value={
                summaryLoading
                  ? "..."
                  : formatAccountingMoney(summary?.summary.gastosRecurrentesTotal || 0)
              }
              detail={`${summary?.summary.gastosRecurrentesCount || 0} movimiento${(summary?.summary.gastosRecurrentesCount || 0) === 1 ? "" : "s"} recurrente${(summary?.summary.gastosRecurrentesCount || 0) === 1 ? "" : "s"}.`}
              tone="warning"
              icon={<Repeat size={18} />}
            />
            <AccountingStatCard
              eyebrow="Concentración"
              label="Categoría líder"
              value={topExpenseCategory?.categoria || "Sin datos"}
              detail={
                summaryLoading ? "..." : formatAccountingMoney(topExpenseCategory?.total || 0)
              }
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
              value={
                summaryLoading
                  ? "..."
                  : formatAccountingMoney(summary?.payables?.totalPendiente || 0)
              }
              detail="Facturas y egresos pendientes de salida."
              tone="warning"
              icon={<ShieldCheck size={18} />}
            />
            <AccountingStatCard
              eyebrow="Riesgo"
              label="Vencido"
              value={
                summaryLoading ? "..." : formatAccountingMoney(summary?.payables?.vencido || 0)
              }
              detail="Obligaciones fuera del plazo esperado."
              tone="danger"
              icon={<AlertTriangle size={18} />}
            />
            <AccountingStatCard
              eyebrow="Agenda"
              label="Próximo a vencer"
              value={
                summaryLoading ? "..." : formatAccountingMoney(summary?.payables?.vencePronto || 0)
              }
              detail="Compromisos que vencen en 7 días o menos."
              tone="warning"
              icon={<Clock3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Proveedor"
              label="Proveedor líder"
              value={topPendingProvider?.nombre || "Sin datos"}
              detail={
                summaryLoading ? "..." : formatAccountingMoney(topPendingProvider?.total || 0)
              }
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
              eyebrow={selectedTramitadorRow ? "En foco" : "Cobertura"}
              label={selectedTramitadorRow ? selectedTramitadorRow.nombre : "Tramitadores activos"}
              value={
                selectedTramitadorRow
                  ? formatAccountingMoney(
                      selectedTramitadorRow.pagado + selectedTramitadorRow.pendiente
                    )
                  : String(tramitadoresActivos)
              }
              detail={
                summaryLoading
                  ? "..."
                  : selectedTramitadorRow
                    ? `Pagado ${formatAccountingMoney(selectedTramitadorRow.pagado)} · Pendiente ${formatAccountingMoney(selectedTramitadorRow.pendiente)}`
                    : `${tramitadoresConSaldo} con saldo abierto. ${topTramitador ? `${topTramitador.nombre} concentra ${topTramitadorShare.toFixed(0)}% del pagado.` : ""}`
              }
              tone={selectedTramitadorRow ? "primary" : "default"}
              icon={<BarChart3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Urgencia"
              label="Más urgente por pagar"
              value={topPendingTramitador?.nombre || "Sin pendientes"}
              detail={
                summaryLoading
                  ? "..."
                  : formatAccountingMoney(Number(topPendingTramitador?.total || 0))
              }
              tone="danger"
              icon={<AlertTriangle size={18} />}
            />
          </div>

          {unnamedTramitadorRow && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
              Hay {unnamedTramitadorRow.movimientos} movimiento
              {unnamedTramitadorRow.movimientos === 1 ? "" : "s"} sin nombre de tramitador. Completa
              el nombre desde alumnos, matrículas o gastos manuales para no fragmentar la cartera.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountingBreakdownCard
              title="Gasto por tramitador"
              subtitle="Cuánto se ha causado o pagado a cada tramitador en el periodo."
              rows={tramitadorRows.map((row) => ({
                concepto: row.nombre,
                cantidad: row.cantidad,
                total: row.total,
              }))}
              labelKey="concepto"
              emptyLabel="No hay pagos a tramitador en este corte."
            />
            <AccountingBreakdownCard
              title="Pendiente por tramitador"
              subtitle="Cuánto falta por pagarle a cada tramitador."
              rows={pendingTramitadorRows.map((row) => ({
                concepto: row.nombre,
                cantidad: row.cantidad,
                total: row.total,
              }))}
              labelKey="concepto"
              emptyLabel="No hay saldos pendientes con tramitadores."
            />
          </div>

          <AccountingPanel
            title="Cartera operativa por tramitador"
            description="Haz clic en un tercero para enfocar la tabla, el resumen y la exportación. Aquí se ve lo pagado, lo pendiente y el vencido por nombre normalizado."
            actions={
              selectedTramitador ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTramitador("");
                    setCurrentPage(0);
                  }}
                  className="rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-[#4a4a4f] transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-[#c7c7cc] dark:hover:border-gray-600"
                >
                  Ver todos
                </button>
              ) : null
            }
          >
            {tramitadorPortfolio.length === 0 ? (
              <p className="text-sm text-[#86868b]">
                No hay cartera de tramitadores para este rango.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {tramitadorPortfolio.map((row) => {
                  const isActive = selectedTramitador === row.nombre;
                  return (
                    <button
                      key={`tramitador-portfolio-${row.nombre}`}
                      type="button"
                      onClick={() => {
                        setSelectedTramitador((current) =>
                          current === row.nombre ? "" : row.nombre
                        );
                        setCurrentPage(0);
                      }}
                      className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                        isActive
                          ? "border-[#0071e3]/40 bg-[#0071e3]/8 dark:border-[#0071e3]/50 dark:bg-[#0071e3]/12"
                          : "border-gray-100 bg-[#f7f9fc] hover:border-gray-200 dark:border-gray-800 dark:bg-[#111214] dark:hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {row.nombre}
                          </p>
                          <p className="mt-1 text-xs text-[#86868b]">
                            {row.movimientos} movimiento{row.movimientos === 1 ? "" : "s"} · último{" "}
                            {row.ultimaFecha ? formatCompactDate(row.ultimaFecha) : "sin fecha"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            row.vencido > 0
                              ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                              : row.pendiente > 0
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          }`}
                        >
                          {row.vencido > 0 ? "Vencido" : row.pendiente > 0 ? "Pendiente" : "Al día"}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-white px-3 py-2 dark:bg-[#1d1d1f]">
                          <p className="text-[#86868b]">Pagado</p>
                          <p className="mt-1 font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {formatAccountingMoney(row.pagado)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 dark:bg-[#1d1d1f]">
                          <p className="text-[#86868b]">Pendiente</p>
                          <p className="mt-1 font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {formatAccountingMoney(row.pendiente)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 dark:bg-[#1d1d1f]">
                          <p className="text-[#86868b]">Vencido</p>
                          <p className="mt-1 font-semibold text-red-500">
                            {formatAccountingMoney(row.vencido)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 dark:bg-[#1d1d1f]">
                          <p className="text-[#86868b]">Promedio</p>
                          <p className="mt-1 font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {formatAccountingMoney(row.ticketPromedio)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </AccountingPanel>
        </div>
      )}

      {(activeSection === "libro" ||
        activeSection === "cuentas" ||
        activeSection === "tramitadores") && (
        <div className="mb-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs text-[#86868b] dark:border-gray-800 dark:bg-[#1d1d1f]">
          {EXPENSE_ADVANCED_SEARCH_HINT}
        </div>
      )}

      {(activeSection === "libro" ||
        activeSection === "cuentas" ||
        activeSection === "tramitadores") && (
        <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
          <DataTable
            key={activeSection}
            columns={columns}
            data={data}
            loading={loading}
            searchPlaceholder={
              activeSection === "cuentas"
                ? "Buscar por proveedor, concepto, factura o fecha de pago..."
                : activeSection === "tramitadores"
                  ? "Buscar por tramitador, concepto, factura o fecha..."
                  : "Buscar por concepto, proveedor, factura, categoria, metodo o notas. Usa fecha: o monto: para filtros exactos."
            }
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

      <GastoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={!!editing}
        form={form}
        setForm={setForm}
        error={error}
        saving={saving}
        onSave={handleSave}
        tramitadorOptions={tramitadorOptions.filter((option) => option !== "Sin tramitador")}
      />

      <ImportInvoiceModal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          resetInvoiceImport();
        }}
        invoiceImportError={invoiceImportError}
        parsingInvoice={parsingInvoice}
        importingInvoice={importingInvoice}
        invoicePreview={invoicePreview}
        invoiceForm={invoiceForm}
        setInvoiceForm={setInvoiceForm}
        invoiceFileInputRef={invoiceFileInputRef}
        onFileChange={handleInvoiceFileChange}
        onImport={handleImportInvoice}
      />

      <EmailIntegrationModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        emailIntegration={emailIntegration}
        emailForm={emailForm}
        setEmailForm={setEmailForm}
        sedesOptions={sedesOptions}
        emailError={emailError}
        emailSaving={emailSaving}
        onSave={handleSaveEmailIntegration}
        onEmailAddressChange={handleEmailAddressChange}
      />

      <HistoricalSearchModal
        open={emailHistoryModalOpen}
        onClose={() => setEmailHistoryModalOpen(false)}
        emailHistoryMonths={emailHistoryMonths}
        setEmailHistoryMonths={setEmailHistoryMonths}
        emailHistoryMaxMessages={emailHistoryMaxMessages}
        setEmailHistoryMaxMessages={setEmailHistoryMaxMessages}
        emailSyncing={emailSyncing}
        onSearch={handleHistoricalEmailSync}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={saving}
        message="¿Eliminar este gasto?"
      />
    </div>
  );
}
