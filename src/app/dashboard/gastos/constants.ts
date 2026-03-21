/**
 * Types, constants, and helper functions for the Gastos module.
 *
 * Extracted from page.tsx to keep the main component file focused on state,
 * handlers, and rendering.
 *
 * @module dashboard/gastos/constants
 */

import { createClient } from "@/lib/supabase";
import { getCurrentAccountingYear } from "@/lib/accounting-dashboard";
import type {
  EstadoPagoGasto,
  FacturaCorreoImportacion,
  FacturaCorreoProveedor,
  CategoriaGasto,
  MetodoPagoGasto,
} from "@/types/database";
import type { ExpenseSearchCriteria } from "@/lib/expense-search";

export const PAGE_SIZE = 10;
export const currentYear = getCurrentAccountingYear();
export const currentMonth = new Date().getMonth() + 1;

/** All available expense categories. */
export const categorias: CategoriaGasto[] = [
  "combustible",
  "mantenimiento_vehiculo",
  "alquiler",
  "servicios",
  "nominas",
  "seguros",
  "material_didactico",
  "marketing",
  "impuestos",
  "suministros",
  "reparaciones",
  "tramitador",
  "otros",
];

/** Accepted payment methods. */
export const metodos: MetodoPagoGasto[] = ["efectivo", "tarjeta", "transferencia", "domiciliacion"];
export const estadosPagoGasto: EstadoPagoGasto[] = ["pagado", "pendiente", "anulado"];

/** Default (empty) form values used when creating a new expense. */
export const emptyForm = {
  categoria: "otros" as CategoriaGasto,
  concepto: "",
  monto: "",
  metodo_pago: "efectivo" as MetodoPagoGasto,
  proveedor: "",
  numero_factura: "",
  fecha: new Date().toISOString().split("T")[0],
  fecha_vencimiento: new Date().toISOString().split("T")[0],
  estado_pago: "pagado" as EstadoPagoGasto,
  recurrente: false,
  notas: "",
};
export type GastoFormState = typeof emptyForm;

export type EmailInvoiceIntegrationView = {
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

export type EmailInvoiceConfigFormState = {
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

export type EmailInvoiceSyncSummary = {
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

export type SedeOption = {
  id: string;
  nombre: string;
  es_principal?: boolean | null;
};

export type ExpenseSection = "libro" | "cuentas" | "tramitadores" | "facturas";
export type ExpenseView =
  | "all"
  | "vehicular"
  | "administrativo"
  | "personal"
  | "with_invoice"
  | "without_invoice"
  | "recurrente";
export type ExpenseSupabaseQueryable<T> = {
  in(column: string, values: readonly string[]): T;
  not(column: string, operator: string, value: string | null): T;
  neq(column: string, value: string): T;
  or(filters: string): T;
  eq(column: string, value: boolean | number | string): T;
  ilike(column: string, pattern: string): T;
  gte(column: string, value: string): T;
  lte(column: string, value: string): T;
};

export const emptyEmailIntegrationForm: EmailInvoiceConfigFormState = {
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
export const MANUAL_IMAP_PROVIDER: FacturaCorreoProveedor = "imap";
export const HISTORICAL_MONTH_OPTIONS = [3, 6, 12, 24, 36, 60];
export const HISTORICAL_LIMIT_OPTIONS = [100, 250, 500, 1000, 2000];
export const VEHICULAR_EXPENSE_CATEGORIES: CategoriaGasto[] = [
  "combustible",
  "mantenimiento_vehiculo",
  "reparaciones",
  "seguros",
];
export const ADMINISTRATIVE_EXPENSE_CATEGORIES: CategoriaGasto[] = [
  "alquiler",
  "servicios",
  "material_didactico",
  "marketing",
  "impuestos",
  "suministros",
  "otros",
];
export const PEOPLE_EXPENSE_CATEGORIES: CategoriaGasto[] = ["nominas", "tramitador"];
export const EXPENSE_SECTION_ITEMS: Array<{
  id: ExpenseSection;
  label: string;
  description: string;
}> = [
  {
    id: "libro",
    label: "Libro de gastos",
    description: "Registro, filtros, factura electrónica y exportación.",
  },
  {
    id: "facturas",
    label: "Facturas",
    description: "Carga manual, correo automático e historial de soportes.",
  },
  {
    id: "cuentas",
    label: "Cuentas por pagar",
    description: "Pendientes, vencimientos y control por proveedor.",
  },
  {
    id: "tramitadores",
    label: "Tramitadores",
    description: "Cartera, concentración y seguimiento operativo por tercero.",
  },
];
export const EXPENSE_VIEW_ITEMS: Array<{ id: ExpenseView; label: string; description: string }> = [
  { id: "all", label: "Todo", description: "Todos los egresos del periodo." },
  {
    id: "vehicular",
    label: "Operación vehicular",
    description: "Combustible, reparaciones, mantenimiento y seguros.",
  },
  {
    id: "administrativo",
    label: "Administrativos",
    description: "Servicios, arriendo, insumos, impuestos y marketing.",
  },
  { id: "personal", label: "Personal y terceros", description: "Nomina y pagos a tramitador." },
  {
    id: "with_invoice",
    label: "Con factura",
    description: "Solo gastos documentados con numero de factura.",
  },
  {
    id: "without_invoice",
    label: "Sin factura",
    description: "Gastos sin soporte documental registrado.",
  },
  { id: "recurrente", label: "Recurrentes", description: "Pagos periodicos o permanentes." },
];

export function parseExpenseSection(value: string | null): ExpenseSection {
  if (value === "panel" || value === "libro") return "libro";
  if (value === "proveedores" || value === "cuentas") return "cuentas";
  if (value === "tramitadores") return "tramitadores";
  if (value === "facturas" || value === "automatizacion") return "facturas";
  return "libro";
}

export function inferImapHost(correo: string) {
  const domain = correo.split("@")[1]?.toLowerCase() || "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "imap.gmail.com";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.es"].includes(domain))
    return "outlook.office365.com";
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com")
    return "imap.mail.me.com";
  if (domain === "yahoo.com" || domain === "ymail.com") return "imap.mail.yahoo.com";
  return "";
}

export function isHorasClosureExpense(row: Pick<import("@/types/database").Gasto, "notas">) {
  return (row.notas ?? "").startsWith("CIERRE_HORAS_INSTRUCTOR|");
}

export function formatInvoiceMoney(amount: number, currency: string) {
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

export function getEmailImportDisplayTitle(item: FacturaCorreoImportacion) {
  const attachmentIsFallback = /^factura-adjunta-\d+\.(xml|zip|eml)$/i.test(
    item.attachment_name || ""
  );
  if (item.invoice_number) return item.invoice_number;
  if (attachmentIsFallback && item.asunto) return item.asunto;
  return item.attachment_name;
}

export function applyExpenseViewToSupabaseQuery<T extends ExpenseSupabaseQueryable<T>>(
  query: T,
  view: ExpenseView
): T {
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

export function applyExpenseSearchToSupabaseQuery<T extends ExpenseSupabaseQueryable<T>>(
  query: T,
  expenseSearch: ExpenseSearchCriteria
): T {
  if (expenseSearch.freeText) {
    const textPattern = `%${expenseSearch.freeText}%`;
    query = query.or(
      [
        `concepto.ilike.${textPattern}`,
        `proveedor.ilike.${textPattern}`,
        `numero_factura.ilike.${textPattern}`,
        `notas.ilike.${textPattern}`,
        `categoria.ilike.${textPattern}`,
        `metodo_pago.ilike.${textPattern}`,
      ].join(",")
    );
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
    query = query
      .gte("fecha", expenseSearch.fechaRange.from)
      .lte("fecha", expenseSearch.fechaRange.to);
  }
  if (expenseSearch.monto !== null) {
    query = query.eq("monto", expenseSearch.monto);
  }
  if (expenseSearch.recurrente !== null) {
    query = query.eq("recurrente", expenseSearch.recurrente);
  }

  return query;
}

export function getExpenseDueMeta(dateValue: string | null) {
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
      detail:
        daysUntil === 0 ? "Vence hoy" : `Vence en ${daysUntil} día${daysUntil === 1 ? "" : "s"}`,
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    };
  }

  return {
    label: "Al día",
    detail: `Vence en ${daysUntil} días`,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
}

export async function resolveSedeId(escuelaId: string, preferredSedeId: string | null) {
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
