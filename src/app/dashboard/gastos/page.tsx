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
import { AccountingWorkspaceHeader } from "@/components/dashboard/accounting/AccountingWorkspace";
import ExportFormatActions from "@/components/dashboard/ExportFormatActions";
import { runSupabaseMutationWithRetry } from "@/lib/retry";
import {
  buildElectronicInvoiceNote,
  parseElectronicInvoiceFile,
  type ElectronicInvoicePreview,
} from "@/lib/electronic-invoice";
import {
  buildAccountingYears,
  downloadCsv,
  getMonthDateRange,
  MONTH_OPTIONS,
} from "@/lib/accounting-dashboard";
import {
  getDashboardCatalogCached,
  getDashboardListCached,
  invalidateDashboardClientCaches,
} from "@/lib/dashboard-client-cache";
import { revalidateTaggedServerCaches } from "@/lib/server-cache-client";
import { buildScopedMutationRevalidationTags } from "@/lib/server-cache-tags";
import { fetchExpenseDashboard } from "@/lib/finance/expense-service";
import type { ExpenseDashboardResponse } from "@/lib/finance/types";
import { downloadSpreadsheetWorkbook } from "@/lib/spreadsheet-export";
import { normalizeExpenseCategory } from "@/lib/expense-category";
import { parseExpenseSearch } from "@/lib/expense-search";
import type {
  EstadoPagoGasto,
  FacturaCorreoImportacion,
  Gasto,
  CategoriaGasto,
  MetodoPagoGasto,
} from "@/types/database";
import { Plus } from "lucide-react";

import {
  PAGE_SIZE,
  currentYear,
  currentMonth,
  categorias,
  metodos,
  estadosPagoGasto,
  emptyForm,
  emptyEmailIntegrationForm,
  parseExpenseSection,
  inferImapHost,
  isHorasClosureExpense,
  applyExpenseViewToSupabaseQuery,
  applyExpenseSearchToSupabaseQuery,
  resolveSedeId,
  type GastoFormState,
  type EmailInvoiceIntegrationView,
  type EmailInvoiceConfigFormState,
  type EmailInvoiceSyncSummary,
  type SedeOption,
  type ExpenseSection,
  type ExpenseView,
} from "./constants";
import {
  buildExpenseColumns,
  buildExpenseTramitadorOptions,
  ExpenseFacturasSection,
  ExpenseFiltersSection,
  ExpenseSearchHint,
  ExpenseSectionPanel,
  ExpenseStatusBanners,
  ExpenseSummarySection,
  ExpenseTableSection,
} from "./GastosSections";

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
  const defaultMonth = String(currentMonth).padStart(2, "0");
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
  const [reloadKey, setReloadKey] = useState(0);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroEstadoPago, setFiltroEstadoPago] = useState("");
  const [filtroMes, setFiltroMes] = useState(defaultMonth);
  const [filtroYear, setFiltroYear] = useState(String(currentYear));
  const [filtroRecurrente, setFiltroRecurrente] = useState(false);
  const [selectedTramitador, setSelectedTramitador] = useState("");
  const [summary, setSummary] = useState<ExpenseDashboardResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [exportingFormat, setExportingFormat] = useState<"csv" | "xls" | null>(null);
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
    activeSection === "facturas" || emailModalOpen || emailHistoryModalOpen;

  const loadEmailIntegrationState = useCallback(
    async (options?: SedeOption[]) => {
      if (!perfil?.escuela_id) return;

      setEmailLoading(true);
      setEmailError("");

      try {
        const response = await fetch("/api/gastos/facturas-correo");
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
        activeSection === "nomina" ||
        activeSection === "cuentas" ||
        activeSection === "tramitadores";
      const effectiveEstadoPago = activeSection === "cuentas" ? "pendiente" : filtroEstadoPago;
      const effectiveCategoria = activeSection === "nomina" ? "nominas" : filtroCategoria;

      if (!shouldLoadLedger) {
        setLoading(false);
        return;
      }

      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setTableError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
          section: activeSection,
          view: activeView,
        });
        if (search) params.set("q", search);
        if (effectiveCategoria) params.set("categoria", effectiveCategoria);
        if (filtroMetodo) params.set("metodo", filtroMetodo);
        if (effectiveEstadoPago) params.set("estado", effectiveEstadoPago);
        if (filtroMes) params.set("mes", filtroMes);
        if (filtroYear) params.set("year", filtroYear);
        if (filtroRecurrente) params.set("recurrente", "true");
        if (selectedTramitador) params.set("tramitador", selectedTramitador);

        const payload = await getDashboardListCached<{ count: number; rows: Gasto[] }>({
          name: "gastos-ledger",
          scope: {
            id: perfil.id,
            rol: perfil.rol,
            escuelaId: perfil.escuela_id,
            sedeId: perfil.sede_id,
          },
          params,
          loader: async () => {
            const supabase = createClient();
            const expenseSearch = parseExpenseSearch(search);

            let countQuery = supabase
              .from("gastos")
              .select("id", { count: "exact", head: true })
              .eq("escuela_id", perfil.escuela_id);

            if (activeSection !== "tramitadores" && effectiveCategoria) {
              countQuery = countQuery.eq("categoria", effectiveCategoria);
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
            } else if (activeSection !== "nomina") {
              countQuery = applyExpenseViewToSupabaseQuery(countQuery, activeView);
            }
            countQuery = applyExpenseSearchToSupabaseQuery(countQuery, expenseSearch);

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

            if (activeSection !== "tramitadores" && effectiveCategoria) {
              dataQuery = dataQuery.eq("categoria", effectiveCategoria);
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
            } else if (activeSection !== "nomina") {
              dataQuery = applyExpenseViewToSupabaseQuery(dataQuery, activeView);
            }
            dataQuery = applyExpenseSearchToSupabaseQuery(dataQuery, expenseSearch);

            const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
              countQuery,
              dataQuery,
            ]);

            if (countError) {
              throw countError;
            }
            if (dataError) {
              throw dataError;
            }

            return {
              count: count ?? 0,
              rows: (data as Gasto[]) || [],
            };
          },
        });

        if (fetchId !== fetchIdRef.current) return;

        setTotalCount(payload.count);
        setData(payload.rows);
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
      filtroMetodo,
      filtroEstadoPago,
      filtroMes,
      filtroYear,
      filtroRecurrente,
      activeView,
      activeSection,
      selectedTramitador,
      perfil?.id,
      perfil?.rol,
      perfil?.sede_id,
      filtroCategoria,
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
    reloadKey,
  ]);

  useEffect(() => {
    if (!perfil?.rol) return;
    const shouldLoadSummary =
      activeSection === "libro" ||
      activeSection === "nomina" ||
      activeSection === "cuentas" ||
      activeSection === "tramitadores";

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
      });
      const effectiveCategoria = activeSection === "nomina" ? "nominas" : filtroCategoria;

      if (activeSection !== "tramitadores" && effectiveCategoria) {
        params.set("categoria", effectiveCategoria);
      }
      if (filtroMetodo) params.set("metodo", filtroMetodo);
      if (activeSection === "cuentas") {
        params.set("estado", "pendiente");
      } else if (filtroEstadoPago) {
        params.set("estado", filtroEstadoPago);
      }
      if (filtroRecurrente) params.set("recurrente", "true");
      if (activeSection === "tramitadores") {
        params.set("view", "tramitadores");
        if (selectedTramitador) {
          params.set("contraparte", selectedTramitador);
        }
      } else if (activeSection !== "nomina" && activeView !== "all") {
        params.set("view", activeView);
      }
      if (searchTerm) params.set("q", searchTerm);

      setSummaryLoading(true);
      setSummaryError("");

      try {
        const payload = await fetchExpenseDashboard(params);
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
    reloadKey,
  ]);

  useEffect(() => {
    if (!perfil?.escuela_id || !shouldLoadEmailAutomation) return;

    const loadEmailResources = async () => {
      try {
        const options = await getDashboardCatalogCached<SedeOption[]>({
          name: "gastos-email-sedes",
          scope: {
            id: perfil.id,
            rol: perfil.rol,
            escuelaId: perfil.escuela_id,
            sedeId: perfil.sede_id,
          },
          loader: async () => {
            const supabase = createClient();
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

            return (sedesRows as SedeOption[]) || [];
          },
        });
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
  }, [
    loadEmailIntegrationState,
    perfil?.escuela_id,
    perfil?.id,
    perfil?.rol,
    perfil?.sede_id,
    shouldLoadEmailAutomation,
  ]);

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

  const invalidateExpenseResources = useCallback(() => {
    invalidateDashboardClientCaches([
      "dashboard-list:gastos-ledger:",
      "dashboard-catalog:gastos-email-sedes:",
      "finance-expense:",
      "finance-reports:",
    ]);
    void revalidateTaggedServerCaches(
      buildScopedMutationRevalidationTags({
        scope: { escuelaId: perfil?.escuela_id, sedeId: perfil?.sede_id },
        includeFinance: true,
        includeDashboard: true,
      })
    );
  }, [perfil?.escuela_id, perfil?.sede_id]);

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
      invalidateExpenseResources();
      setReloadKey((value) => value + 1);
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
      invalidateExpenseResources();
      setReloadKey((value) => value + 1);
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
      categoria:
        activeSection === "tramitadores"
          ? "tramitador"
          : activeSection === "nomina"
            ? "nominas"
            : emptyForm.categoria,
      metodo_pago:
        activeSection === "tramitadores" || activeSection === "nomina"
          ? "transferencia"
          : emptyForm.metodo_pago,
      estado_pago:
        activeSection === "tramitadores" || activeSection === "nomina"
          ? "pendiente"
          : emptyForm.estado_pago,
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
      invalidateExpenseResources();
      setReloadKey((value) => value + 1);
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
      invalidateExpenseResources();
      setReloadKey((value) => value + 1);
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
      invalidateExpenseResources();
      setReloadKey((value) => value + 1);
      fetchData(currentPage, searchTerm);
    } catch (networkError: unknown) {
      const message =
        networkError instanceof Error ? networkError.message : "Error al eliminar el gasto.";
      setError(message);
      setSaving(false);
    }
  };

  const handleExport = async (format: "csv" | "xls") => {
    if (!perfil?.escuela_id) return;

    setExportingFormat(format);
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

        if (activeSection !== "tramitadores") {
          const effectiveCategoria = activeSection === "nomina" ? "nominas" : filtroCategoria;
          if (effectiveCategoria) query = query.eq("categoria", effectiveCategoria);
        }
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
        } else if (activeSection !== "nomina") {
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
      const filenamePrefix =
        activeSection === "nomina"
          ? "nomina"
          : activeSection === "tramitadores"
            ? "tramitadores"
            : activeSection === "cuentas"
              ? "cuentas-por-pagar"
              : "gastos";
      const filenameBase = `${filenamePrefix}-${filtroYear}${filtroMes ? `-${filtroMes}` : ""}`;
      const headers = [
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
      ];
      const exportRows = rows.map((row) => [
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
      ]);

      if (format === "csv") {
        downloadCsv(`${filenameBase}.csv`, headers, exportRows);
        return;
      }

      await downloadSpreadsheetWorkbook(`${filenameBase}.xls`, [
        {
          name: activeSection === "nomina" ? "Resumen nomina" : "Resumen gastos",
          headers: ["Indicador", "Valor"],
          rows: [
            [
              activeSection === "nomina" ? "Nomina causada" : "Gastos totales",
              summary?.summary?.gastosTotales || 0,
            ],
            ["Gasto promedio", summary?.summary?.gastoPromedio || 0],
            ["Total de gastos", summary?.summary?.totalGastos || 0],
            ["Gastos recurrentes", summary?.summary?.gastosRecurrentesTotal || 0],
            ["Pendiente por pagar", summary?.payables?.totalPendiente || 0],
          ],
        },
        {
          name: activeSection === "nomina" ? "Libro nomina" : "Libro de gastos",
          headers,
          rows: exportRows,
        },
      ]);
    } catch (exportErr: unknown) {
      setTableError(
        exportErr instanceof Error ? exportErr.message : "No se pudo exportar los gastos."
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const years = buildAccountingYears();
  const mesesDelAno =
    Number(filtroYear) === currentYear
      ? MONTH_OPTIONS.filter((mes) => !mes.value || Number(mes.value) <= new Date().getMonth() + 1)
      : MONTH_OPTIONS;
  const hayFiltros = Boolean(
    (activeSection !== "tramitadores" && activeSection !== "nomina" && filtroCategoria) ||
    filtroMetodo ||
    (activeSection !== "cuentas" && filtroEstadoPago) ||
    filtroMes !== defaultMonth ||
    filtroRecurrente ||
    filtroYear !== String(currentYear) ||
    (activeSection === "tramitadores" && selectedTramitador) ||
    (activeSection !== "tramitadores" && activeSection !== "nomina" && activeView !== "all")
  );
  const tramitadorOptions = useMemo(() => buildExpenseTramitadorOptions(summary), [summary]);
  const totalPagina = useMemo(
    () => data.reduce((sum, row) => sum + Number(row.monto || 0), 0),
    [data]
  );

  const clearFilters = () => {
    setFiltroCategoria("");
    setFiltroMetodo("");
    setFiltroEstadoPago("");
    setFiltroMes(defaultMonth);
    setFiltroYear(String(currentYear));
    setFiltroRecurrente(false);
    setSelectedTramitador("");
    setActiveView("all");
    setCurrentPage(0);
  };
  const columns = useMemo(() => buildExpenseColumns(activeSection), [activeSection]);
  const headerDescription =
    activeSection === "facturas"
      ? "Soportes del gasto en un solo lugar: carga manual, correo automático e historial de importaciones."
      : activeSection === "nomina"
        ? "Pagos de nómina con lectura propia, sin mezclar instructores y colaboradores con el resto del libro de gastos."
        : "Libro de egresos, cuentas por pagar y tramitadores. Cada sección trabaja un flujo específico para que la operación contable no se mezcle.";

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Gastos"
        title="Gastos"
        description={headerDescription}
        actions={
          activeSection === "facturas" ? null : (
            <>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
              >
                <Plus size={16} />
                {activeSection === "nomina" ? "Nueva nómina" : "Nuevo gasto"}
              </button>
              <ExportFormatActions
                exportingFormat={exportingFormat}
                disabled={loading || data.length === 0}
                onExportCsv={() => void handleExport("csv")}
                onExportXls={() => void handleExport("xls")}
              />
            </>
          )
        }
      />

      <ExpenseStatusBanners
        linkedNotice={linkedNotice}
        emailNotice={emailNotice}
        emailError={emailError}
        summaryError={summaryError}
        tableError={tableError}
        activeSection={activeSection}
      />

      <ExpenseSectionPanel
        activeSection={activeSection}
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          setCurrentPage(0);
        }}
      />

      {activeSection === "facturas" ? (
        <ExpenseFacturasSection
          emailIntegration={emailIntegration}
          emailImportHistory={emailImportHistory}
          emailLoading={emailLoading}
          emailSyncing={emailSyncing}
          emailSaving={emailSaving}
          onOpenImportModal={openImportModal}
          onOpenIntegration={openEmailIntegrationModal}
          onSync={handleSyncEmailIntegration}
          onOpenHistoricalSearch={openHistoricalEmailSearchModal}
          onDisconnect={handleDeleteEmailIntegration}
        />
      ) : null}

      <ExpenseFiltersSection
        activeSection={activeSection}
        selectedTramitador={selectedTramitador}
        tramitadorOptions={tramitadorOptions}
        filtroCategoria={filtroCategoria}
        filtroMetodo={filtroMetodo}
        filtroEstadoPago={filtroEstadoPago}
        filtroYear={filtroYear}
        filtroMes={filtroMes}
        filtroRecurrente={filtroRecurrente}
        years={years}
        mesesDelAno={mesesDelAno}
        categorias={categorias}
        metodos={metodos}
        estadosPagoGasto={estadosPagoGasto}
        hayFiltros={hayFiltros}
        totalPagina={totalPagina}
        onSelectedTramitadorChange={(value) => {
          setSelectedTramitador(value);
          setCurrentPage(0);
        }}
        onCategoriaChange={(value) => {
          setFiltroCategoria(value);
          setCurrentPage(0);
        }}
        onMetodoChange={(value) => {
          setFiltroMetodo(value);
          setCurrentPage(0);
        }}
        onEstadoPagoChange={(value) => {
          setFiltroEstadoPago(value);
          setCurrentPage(0);
        }}
        onYearChange={(value) => {
          setFiltroYear(value);
          setFiltroMes("");
          setCurrentPage(0);
        }}
        onMesChange={(value) => {
          setFiltroMes(value);
          setCurrentPage(0);
        }}
        onRecurrenteChange={(value) => {
          setFiltroRecurrente(value);
          setCurrentPage(0);
        }}
        onClearFilters={clearFilters}
      />

      <ExpenseSummarySection
        activeSection={activeSection}
        summary={summary}
        summaryLoading={summaryLoading}
        selectedTramitador={selectedTramitador}
        onToggleSelectedTramitador={(name) => {
          setSelectedTramitador((current) => (current === name ? "" : name));
          setCurrentPage(0);
        }}
        onClearSelectedTramitador={() => {
          setSelectedTramitador("");
          setCurrentPage(0);
        }}
      />

      <ExpenseSearchHint activeSection={activeSection} />

      <ExpenseTableSection
        activeSection={activeSection}
        columns={columns}
        data={data}
        loading={loading}
        totalCount={totalCount}
        currentPage={currentPage}
        searchTerm={searchTerm}
        onEdit={openEdit}
        onDelete={openDelete}
        onPageChange={handlePageChange}
        onSearchChange={handleSearchChange}
        pageSize={PAGE_SIZE}
      />

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
