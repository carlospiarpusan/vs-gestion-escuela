"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDraftForm } from "@/hooks/useDraftForm";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import { fetchJsonWithRetry, runSupabaseMutationWithRetry } from "@/lib/retry";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import type {
  Vehiculo, TipoVehiculo, EstadoVehiculo,
  MantenimientoVehiculo, TipoMantenimiento, Instructor,
} from "@/types/database";
import { Plus, Car, ClipboardList } from "lucide-react";

// ── Vehículos ──────────────────────────────────────────
const tipos: TipoVehiculo[] = ["coche", "moto", "camion", "autobus"];
const estadosV: EstadoVehiculo[] = ["disponible", "en_uso", "mantenimiento", "baja"];

const emptyVForm = {
  marca: "", modelo: "", matricula: "", tipo: "coche" as TipoVehiculo,
  anio: "", fecha_itv: "", seguro_vencimiento: "",
  estado: "disponible" as EstadoVehiculo, kilometraje: "0", notas: "",
};

// ── Mantenimiento ──────────────────────────────────────
const tiposMant: TipoMantenimiento[] = [
  "cambio_aceite", "gasolina", "repuesto", "mano_obra",
  "lavado", "neumaticos", "reparacion", "revision_general", "otros",
];

const emptyMForm = {
  vehiculo_id: "", instructor_id: "", tipo: "gasolina" as TipoMantenimiento,
  descripcion: "", monto: "", kilometraje_actual: "", litros: "",
  precio_por_litro: "", proveedor: "", numero_factura: "",
  fecha: new Date().toISOString().split("T")[0], notas: "",
};

const inputCls = "apple-input";
const labelCls = "apple-label";

function safeFloat(v: string, fb = 0) { const n = parseFloat(v); return isNaN(n) ? fb : n; }
function safeInt(v: string) { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
function safeFloatOrNull(v: string) { const n = parseFloat(v); return isNaN(n) ? null : n; }

const PAGE_SIZE = 50;

const tipoMantLabels: Record<TipoMantenimiento, string> = {
  gasolina: "Tanqueo",
  cambio_aceite: "Cambio de aceite",
  reparacion: "Reparación",
  revision_general: "Mantenimiento",
  repuesto: "Repuesto",
  mano_obra: "Mano de obra",
  lavado: "Lavado",
  neumaticos: "Neumáticos",
  otros: "Otros",
};

type VehiculoRow = { id: string; marca: string; modelo: string; matricula: string };
type InstructorRow = { id: string; nombre: string; apellidos: string };
type MantenimientoRow = MantenimientoVehiculo & { vehiculo_nombre?: string; instructor_nombre?: string };
type VehiculoConBitacora = Vehiculo & {
  registros_bitacora: number;
  ultimo_registro_fecha: string | null;
  ultimo_registro_tipo: TipoMantenimiento | null;
  ultimo_registro_descripcion: string | null;
  ultimo_registro_monto: number | null;
  ultimo_registro_km: number | null;
};
type VehiculosListResponse = {
  totalCount: number;
  rows: VehiculoConBitacora[];
};
type MantenimientoListResponse = {
  totalCount: number;
  rows: MantenimientoRow[];
};

function formatTipoMantenimiento(tipo: string) {
  return tipoMantLabels[tipo as TipoMantenimiento] || tipo.replace(/_/g, " ");
}

function formatFecha(fecha: string | null) {
  if (!fecha) return "Sin fecha";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCop(valor: number | null) {
  if (valor == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function VehiculosPage() {
  const { perfil } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"vehiculos" | "bitacora">("vehiculos");
  const isInstructor = perfil?.rol === "instructor";
  const canManageVehiculos = !isInstructor;

  // ── Vehículos state ──────────────────────────────────
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [vehiculosTabla, setVehiculosTabla] = useState<VehiculoConBitacora[]>([]);
  const [vehiculosTotalCount, setVehiculosTotalCount] = useState(0);
  const [vehiculosCurrentPage, setVehiculosCurrentPage] = useState(0);
  const [vehiculosSearchTerm, setVehiculosSearchTerm] = useState("");
  const [loadingV, setLoadingV] = useState(true);
  const [tableErrorV, setTableErrorV] = useState("");
  const [modalVOpen, setModalVOpen] = useState(false);
  const [editingV, setEditingV] = useState<Vehiculo | null>(null);
  const [deletingV, setDeletingV] = useState<Vehiculo | null>(null);
  const [deleteVOpen, setDeleteVOpen] = useState(false);
  const [savingV, setSavingV] = useState(false);
  const [errorV, setErrorV] = useState("");
  const vehiculosFetchIdRef = useRef(0);
  const {
    value: formV,
    setValue: setFormV,
    restoreDraft: restoreVehiculoDraft,
    clearDraft: clearVehiculoDraft,
  } = useDraftForm("dashboard:vehiculos:form", emptyVForm, {
    persist: modalVOpen && !editingV,
  });

  // ── Mantenimiento state ──────────────────────────────
  const [mantenimientos, setMantenimientos] = useState<MantenimientoRow[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [mantenimientosTotalCount, setMantenimientosTotalCount] = useState(0);
  const [mantenimientosCurrentPage, setMantenimientosCurrentPage] = useState(0);
  const [mantenimientosSearchTerm, setMantenimientosSearchTerm] = useState("");
  const [loadingM, setLoadingM] = useState(true);
  const [tableErrorM, setTableErrorM] = useState("");
  const [modalMOpen, setModalMOpen] = useState(false);
  const [editingM, setEditingM] = useState<MantenimientoVehiculo | null>(null);
  const [deletingM, setDeletingM] = useState<MantenimientoVehiculo | null>(null);
  const [deleteMOpen, setDeleteMOpen] = useState(false);
  const [savingM, setSavingM] = useState(false);
  const [errorM, setErrorM] = useState("");
  const [currentInstructorId, setCurrentInstructorId] = useState<string | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialVehiculoId, setHistorialVehiculoId] = useState<string | null>(null);
  const [historialRegistros, setHistorialRegistros] = useState<MantenimientoRow[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialError, setHistorialError] = useState("");
  const mantenimientoFetchIdRef = useRef(0);
  const {
    value: formM,
    setValue: setFormM,
    restoreDraft: restoreMantenimientoDraft,
    clearDraft: clearMantenimientoDraft,
  } = useDraftForm("dashboard:vehiculos:mantenimiento-form", emptyMForm, {
    persist: modalMOpen && !editingM,
  });

  useEffect(() => {
    if (searchParams.get("tab") === "bitacora") {
      setTab("bitacora");
    }
  }, [searchParams]);

  const loadCatalogs = useCallback(async () => {
    if (!perfil?.escuela_id) return;

    const supabase = createClient();
    const [vehiculosRows, instructoresRows, currentInstructor] = await Promise.all([
      fetchAllSupabaseRows<Vehiculo>((from, to) =>
        supabase
          .from("vehiculos")
          .select("*")
          .eq("escuela_id", perfil.escuela_id)
          .order("created_at", { ascending: false })
          .range(from, to)
          .then(({ data, error }) => ({ data: (data as Vehiculo[]) ?? [], error }))
      ),
      fetchAllSupabaseRows<InstructorRow>((from, to) =>
        supabase
          .from("instructores")
          .select("id, nombre, apellidos")
          .eq("escuela_id", perfil.escuela_id)
          .order("nombre", { ascending: true })
          .order("apellidos", { ascending: true })
          .range(from, to)
          .then(({ data, error }) => ({ data: (data as InstructorRow[]) ?? [], error }))
      ),
      isInstructor
        ? supabase
            .from("instructores")
            .select("id")
            .eq("user_id", perfil.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    setVehiculos(vehiculosRows);
    setInstructores(instructoresRows as Instructor[]);
    if (isInstructor) {
      setCurrentInstructorId(currentInstructor.data?.id ?? null);
    }
  }, [isInstructor, perfil?.escuela_id, perfil?.id]);

  const fetchVehiculosTable = useCallback(async (page = 0, search = "") => {
    if (!perfil?.escuela_id) return;

    const fetchId = ++vehiculosFetchIdRef.current;
    setLoadingV(true);
    setTableErrorV("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("q", search.trim());

      const payload = await fetchJsonWithRetry<VehiculosListResponse>(`/api/vehiculos?${params.toString()}`, {
        cache: "no-store",
      });

      if (fetchId !== vehiculosFetchIdRef.current) return;

      setVehiculosTabla(payload.rows || []);
      setVehiculosTotalCount(payload.totalCount || 0);
    } catch (fetchError: unknown) {
      if (fetchId !== vehiculosFetchIdRef.current) return;
      setVehiculosTabla([]);
      setVehiculosTotalCount(0);
      setTableErrorV(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los vehículos.");
    } finally {
      if (fetchId === vehiculosFetchIdRef.current) {
        setLoadingV(false);
      }
    }
  }, [perfil?.escuela_id]);

  const fetchBitacoraTable = useCallback(async (page = 0, search = "") => {
    if (!perfil?.escuela_id) return;

    const fetchId = ++mantenimientoFetchIdRef.current;
    setLoadingM(true);
    setTableErrorM("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("q", search.trim());

      const payload = await fetchJsonWithRetry<MantenimientoListResponse>(`/api/mantenimiento?${params.toString()}`, {
        cache: "no-store",
      });

      if (fetchId !== mantenimientoFetchIdRef.current) return;

      setMantenimientos(payload.rows || []);
      setMantenimientosTotalCount(payload.totalCount || 0);
    } catch (fetchError: unknown) {
      if (fetchId !== mantenimientoFetchIdRef.current) return;
      setMantenimientos([]);
      setMantenimientosTotalCount(0);
      setTableErrorM(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la bitácora.");
    } finally {
      if (fetchId === mantenimientoFetchIdRef.current) {
        setLoadingM(false);
      }
    }
  }, [perfil?.escuela_id]);

  const fetchHistorialVehiculo = useCallback(async (vehiculoId: string) => {
    setHistorialLoading(true);
    setHistorialError("");

    try {
      const params = new URLSearchParams({
        vehiculo_id: vehiculoId,
        page: "0",
        pageSize: "200",
      });
      const payload = await fetchJsonWithRetry<MantenimientoListResponse>(`/api/mantenimiento?${params.toString()}`, {
        cache: "no-store",
      });
      setHistorialRegistros(payload.rows || []);
    } catch (fetchError: unknown) {
      setHistorialRegistros([]);
      setHistorialError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el historial del vehículo.");
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    void loadCatalogs();
  }, [loadCatalogs, perfil?.escuela_id]);

  useEffect(() => {
    if (!perfil?.escuela_id || tab !== "vehiculos") return;
    void fetchVehiculosTable(vehiculosCurrentPage, vehiculosSearchTerm);
  }, [fetchVehiculosTable, perfil?.escuela_id, tab, vehiculosCurrentPage, vehiculosSearchTerm]);

  useEffect(() => {
    if (!perfil?.escuela_id || tab !== "bitacora") return;
    void fetchBitacoraTable(mantenimientosCurrentPage, mantenimientosSearchTerm);
  }, [fetchBitacoraTable, perfil?.escuela_id, tab, mantenimientosCurrentPage, mantenimientosSearchTerm]);

  // ── Vehiculos CRUD ───────────────────────────────────
  const openCreateV = () => {
    setEditingV(null);
    restoreVehiculoDraft(emptyVForm);
    setErrorV("");
    setModalVOpen(true);
  };
  const openEditV = (row: Vehiculo) => {
    setEditingV(row);
    setFormV({ marca: row.marca, modelo: row.modelo, matricula: row.matricula, tipo: row.tipo, anio: row.anio?.toString() || "", fecha_itv: row.fecha_itv || "", seguro_vencimiento: row.seguro_vencimiento || "", estado: row.estado, kilometraje: row.kilometraje.toString(), notas: row.notas || "" });
    setErrorV(""); setModalVOpen(true);
  };
  const openDeleteV = (row: Vehiculo) => { setDeletingV(row); setDeleteVOpen(true); };

  const handleSaveV = async () => {
    if (!formV.marca || !formV.modelo || !formV.matricula) { setErrorV("Marca, modelo y matrícula son obligatorios."); return; }
    setSavingV(true); setErrorV("");
    try {
      const supabase = createClient();
      const payload = {
        marca: formV.marca, modelo: formV.modelo, matricula: formV.matricula, tipo: formV.tipo,
        anio: formV.anio ? parseInt(formV.anio) : null, fecha_itv: formV.fecha_itv || null,
        seguro_vencimiento: formV.seguro_vencimiento || null, estado: formV.estado,
        kilometraje: parseInt(formV.kilometraje) || 0, notas: formV.notas || null,
      };
      if (editingV) {
        await runSupabaseMutationWithRetry(() =>
          supabase.from("vehiculos").update(payload).eq("id", editingV.id)
        );
      } else {
        if (!perfil) {
          setErrorV("No se encontró el perfil activo para guardar.");
          setSavingV(false);
          return;
        }
        let sedeId = perfil.sede_id;
        if (!sedeId && perfil.escuela_id) {
          const { data: s } = await supabase.from("sedes").select("id").eq("escuela_id", perfil.escuela_id).order("es_principal", { ascending: false }).limit(1).single();
          sedeId = s?.id || null;
        }
        await runSupabaseMutationWithRetry(() =>
          supabase.from("vehiculos").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: sedeId, user_id: perfil.id })
        );
      }
      clearVehiculoDraft(emptyVForm);
      setSavingV(false);
      setModalVOpen(false);
      await loadCatalogs();
      void fetchVehiculosTable(vehiculosCurrentPage, vehiculosSearchTerm);
    } catch (e: unknown) { setErrorV(e instanceof Error ? e.message : "Error al guardar"); setSavingV(false); }
  };

  const handleDeleteV = async () => {
    if (!deletingV) return;
    setSavingV(true);
    try {
      const { error: err } = await createClient().from("vehiculos").delete().eq("id", deletingV.id);
      if (err) { setErrorV(err.message); setSavingV(false); return; }
      setSavingV(false);
      setDeleteVOpen(false);
      setDeletingV(null);
      await loadCatalogs();
      void fetchVehiculosTable(vehiculosCurrentPage, vehiculosSearchTerm);
    } catch (e: unknown) { setErrorV(e instanceof Error ? e.message : "Error al eliminar"); setSavingV(false); }
  };

  // ── Mantenimiento CRUD ───────────────────────────────
  const openCreateM = () => {
    setEditingM(null);
    restoreMantenimientoDraft({ ...emptyMForm, instructor_id: isInstructor ? currentInstructorId ?? "" : "" });
    setErrorM("");
    setModalMOpen(true);
  };
  const openEditM = (row: MantenimientoVehiculo) => {
    setEditingM(row);
    setFormM({ vehiculo_id: row.vehiculo_id, instructor_id: row.instructor_id || "", tipo: row.tipo, descripcion: row.descripcion, monto: row.monto.toString(), kilometraje_actual: row.kilometraje_actual?.toString() || "", litros: row.litros?.toString() || "", precio_por_litro: row.precio_por_litro?.toString() || "", proveedor: row.proveedor || "", numero_factura: row.numero_factura || "", fecha: row.fecha, notas: row.notas || "" });
    setErrorM(""); setModalMOpen(true);
  };
  const openDeleteM = (row: MantenimientoVehiculo) => { setDeletingM(row); setDeleteMOpen(true); };

  const syncVehiculoKilometraje = useCallback(async (vehiculoId: string, kilometrajeActual: number | null) => {
    if (!vehiculoId || kilometrajeActual == null) return;
    const vehiculoActual = vehiculos.find((vehiculo) => vehiculo.id === vehiculoId);
    if (vehiculoActual && vehiculoActual.kilometraje >= kilometrajeActual) return;

    await createClient()
      .from("vehiculos")
      .update({ kilometraje: kilometrajeActual })
      .eq("id", vehiculoId);
  }, [vehiculos]);

  const handleSaveM = async () => {
    if (!formM.vehiculo_id || !formM.descripcion) { setErrorM("Vehículo y descripción son obligatorios."); return; }
    setSavingM(true); setErrorM("");
    try {
      const supabase = createClient();
      let instructorId = isInstructor ? currentInstructorId : formM.instructor_id || null;
      if (isInstructor && !instructorId) {
        const { data: currentInstructor } = await supabase
          .from("instructores")
          .select("id")
          .eq("user_id", perfil?.id)
          .maybeSingle();
        instructorId = currentInstructor?.id ?? null;
        setCurrentInstructorId(instructorId);
      }
      if (isInstructor && !instructorId) {
        setErrorM("No se encontró tu perfil de instructor para asociar este registro.");
        setSavingM(false);
        return;
      }
      const payload = {
        vehiculo_id: formM.vehiculo_id, instructor_id: instructorId,
        tipo: formM.tipo, descripcion: formM.descripcion,
        monto: safeFloat(formM.monto, 0),
        kilometraje_actual: formM.kilometraje_actual ? safeInt(formM.kilometraje_actual) : null,
        litros: formM.litros ? safeFloatOrNull(formM.litros) : null,
        precio_por_litro: formM.precio_por_litro ? safeFloatOrNull(formM.precio_por_litro) : null,
        proveedor: formM.proveedor || null, numero_factura: formM.numero_factura || null,
        fecha: formM.fecha, notas: formM.notas || null,
      };
      if (editingM) {
        await runSupabaseMutationWithRetry(() =>
          supabase.from("mantenimiento_vehiculos").update(payload).eq("id", editingM.id)
        );
      } else {
        if (!perfil) {
          setErrorM("No se encontró el perfil activo para guardar.");
          setSavingM(false);
          return;
        }
        let sedeId = perfil.sede_id;
        if (!sedeId && perfil.escuela_id) {
          const { data: s } = await supabase.from("sedes").select("id").eq("escuela_id", perfil.escuela_id).order("es_principal", { ascending: false }).limit(1).single();
          sedeId = s?.id || null;
        }
        await runSupabaseMutationWithRetry(() =>
          supabase.from("mantenimiento_vehiculos").insert({ ...payload, escuela_id: perfil.escuela_id, sede_id: sedeId, user_id: perfil.id })
        );
      }
      await syncVehiculoKilometraje(formM.vehiculo_id, payload.kilometraje_actual);
      clearMantenimientoDraft({ ...emptyMForm, instructor_id: isInstructor ? currentInstructorId ?? "" : "" });
      setSavingM(false);
      setModalMOpen(false);
      await loadCatalogs();
      void fetchVehiculosTable(vehiculosCurrentPage, vehiculosSearchTerm);
      void fetchBitacoraTable(mantenimientosCurrentPage, mantenimientosSearchTerm);
      if (historialOpen && historialVehiculoId === formM.vehiculo_id) {
        void fetchHistorialVehiculo(formM.vehiculo_id);
      }
    } catch (e: unknown) { setErrorM(e instanceof Error ? e.message : "Error al guardar"); setSavingM(false); }
  };

  const handleDeleteM = async () => {
    if (!deletingM) return;
    setSavingM(true);
    try {
      const { error: err } = await createClient().from("mantenimiento_vehiculos").delete().eq("id", deletingM.id);
      if (err) { setErrorM(err.message); setSavingM(false); return; }
      setSavingM(false);
      setDeleteMOpen(false);
      setDeletingM(null);
      await loadCatalogs();
      void fetchVehiculosTable(vehiculosCurrentPage, vehiculosSearchTerm);
      void fetchBitacoraTable(mantenimientosCurrentPage, mantenimientosSearchTerm);
      if (historialOpen && historialVehiculoId === deletingM.vehiculo_id) {
        void fetchHistorialVehiculo(deletingM.vehiculo_id);
      }
    } catch (e: unknown) { setErrorM(e instanceof Error ? e.message : "Error al eliminar"); setSavingM(false); }
  };

  // ── Column definitions ───────────────────────────────
  const estadoColors: Record<string, string> = {
    disponible: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    en_uso: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    mantenimiento: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    baja: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const tipoColors: Record<string, string> = {
    gasolina: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    cambio_aceite: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    repuesto: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    mano_obra: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    lavado: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    neumaticos: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    reparacion: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    revision_general: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    otros: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  const historialVehiculo = useMemo(
    () => vehiculos.find((vehiculo) => vehiculo.id === historialVehiculoId)
      || vehiculosTabla.find((vehiculo) => vehiculo.id === historialVehiculoId)
      || null,
    [historialVehiculoId, vehiculos, vehiculosTabla]
  );

  const colsV = [
    { key: "marca" as keyof Vehiculo, label: "Vehículo", render: (r: Vehiculo) => <span className="font-medium">{r.marca} {r.modelo}</span> },
    { key: "matricula" as keyof Vehiculo, label: "Matrícula" },
    { key: "tipo" as keyof Vehiculo, label: "Tipo" },
    { key: "kilometraje" as keyof Vehiculo, label: "Km", render: (r: Vehiculo) => <span>{r.kilometraje.toLocaleString()} km</span> },
    { key: "estado" as keyof Vehiculo, label: "Estado", render: (r: Vehiculo) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${estadoColors[r.estado]}`}>{r.estado.replace("_", " ")}</span> },
    {
      key: "bitacora",
      label: "Bitácora",
      render: (r: VehiculoConBitacora) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
            {r.registros_bitacora} registro{r.registros_bitacora === 1 ? "" : "s"}
          </p>
          {r.ultimo_registro_fecha ? (
            <p className="text-xs leading-5 text-[#86868b]">
              Último: {formatTipoMantenimiento(r.ultimo_registro_tipo || "")} el {formatFecha(r.ultimo_registro_fecha)}
              {r.ultimo_registro_km != null ? ` · ${r.ultimo_registro_km.toLocaleString()} km` : ""}
            </p>
          ) : (
            <p className="text-xs text-[#86868b]">Sin historial registrado.</p>
          )}
        </div>
      ),
    },
  ];

  const colsM = [
    { key: "fecha" as keyof MantenimientoVehiculo, label: "Fecha" },
    { key: "vehiculo_nombre" as string, label: "Vehículo", render: (r: MantenimientoVehiculo & { vehiculo_nombre?: string }) => <span className="font-medium">{r.vehiculo_nombre}</span> },
    { key: "tipo" as keyof MantenimientoVehiculo, label: "Tipo", render: (r: MantenimientoVehiculo) => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${tipoColors[r.tipo]}`}>{formatTipoMantenimiento(r.tipo)}</span> },
    { key: "descripcion" as keyof MantenimientoVehiculo, label: "Descripción" },
    { key: "monto" as keyof MantenimientoVehiculo, label: "Monto", render: (r: MantenimientoVehiculo) => <span className="font-semibold text-red-500">${Number(r.monto).toLocaleString("es-CO")}</span> },
    { key: "kilometraje_actual" as keyof MantenimientoVehiculo, label: "Km", render: (r: MantenimientoVehiculo) => <span>{r.kilometraje_actual ? `${r.kilometraje_actual.toLocaleString()} km` : "—"}</span> },
  ];

  const canOpenCreate = tab === "bitacora" || canManageVehiculos;

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Vehículos</h2>
          <p className="text-sm text-[#86868b] mt-0.5">
            {isInstructor ? "Consulta y registra la bitácora de vehículos" : "Gestiona la flota y la bitácora de vehículos"}
          </p>
        </div>
        {canOpenCreate && (
          <button
            onClick={tab === "vehiculos" ? openCreateV : openCreateM}
            className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
          >
            <Plus size={16} />
            {tab === "vehiculos" ? "Nuevo Vehículo" : "Nuevo Registro"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="apple-segmented mb-4">
        <button
          onClick={() => setTab("vehiculos")}
          className="apple-segmented-button"
          data-active={tab === "vehiculos"}
        >
          <Car size={15} />
          Vehículos
        </button>
        <button
          onClick={() => setTab("bitacora")}
          className="apple-segmented-button"
          data-active={tab === "bitacora"}
        >
          <ClipboardList size={15} />
          Bitácora
        </button>
      </div>

      {/* Tabla Vehículos */}
      {tab === "vehiculos" && (
        <div className="apple-panel p-4 sm:p-6">
          <DataTable
            columns={colsV}
            data={vehiculosTabla}
            loading={loadingV}
            searchPlaceholder="Buscar por marca o matrícula..."
            searchKeys={["marca", "modelo", "matricula"]}
            onEdit={canManageVehiculos ? openEditV : undefined}
            onDelete={canManageVehiculos ? openDeleteV : undefined}
            extraActions={(row: VehiculoConBitacora) => (
              <button
                onClick={() => { setHistorialVehiculoId(row.id); setHistorialOpen(true); }}
                className="apple-icon-button hover:text-[#0071e3]"
                title="Ver bitácora del vehículo"
                aria-label="Ver bitácora del vehículo"
              >
                <ClipboardList size={14} />
              </button>
            )}
          />
        </div>
      )}

      {/* Tabla Bitácora */}
      {tab === "bitacora" && (
        <div className="apple-panel p-4 sm:p-6">
          <DataTable
            columns={colsM}
            data={mantenimientos}
            loading={loadingM}
            searchPlaceholder="Buscar por vehículo, descripción o fecha..."
            searchKeys={["descripcion", "fecha", "vehiculo_nombre"] as (keyof MantenimientoRow)[]}
            onEdit={(row: MantenimientoRow) => {
              if (isInstructor && row.instructor_id !== currentInstructorId) return;
              openEditM(row);
            }}
            onDelete={canManageVehiculos ? openDeleteM : undefined}
          />
        </div>
      )}

      {/* Modal Vehículo */}
      <Modal open={modalVOpen} onClose={() => setModalVOpen(false)} title={editingV ? "Editar Vehículo" : "Nuevo Vehículo"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {errorV && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{errorV}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Marca *</label><input type="text" value={formV.marca} onChange={(e) => setFormV({ ...formV, marca: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Modelo *</label><input type="text" value={formV.modelo} onChange={(e) => setFormV({ ...formV, modelo: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>Matrícula *</label><input type="text" value={formV.matricula} onChange={(e) => setFormV({ ...formV, matricula: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Tipo</label><select value={formV.tipo} onChange={(e) => setFormV({ ...formV, tipo: e.target.value as TipoVehiculo })} className={inputCls}>{tipos.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className={labelCls}>Año</label><input type="number" value={formV.anio} onChange={(e) => setFormV({ ...formV, anio: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>Kilometraje</label><input type="number" value={formV.kilometraje} onChange={(e) => setFormV({ ...formV, kilometraje: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Fecha ITV</label><input type="date" value={formV.fecha_itv} onChange={(e) => setFormV({ ...formV, fecha_itv: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Vence Seguro</label><input type="date" value={formV.seguro_vencimiento} onChange={(e) => setFormV({ ...formV, seguro_vencimiento: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Estado</label><select value={formV.estado} onChange={(e) => setFormV({ ...formV, estado: e.target.value as EstadoVehiculo })} className={inputCls}>{estadosV.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}</select></div>
          <div><label className={labelCls}>Notas</label><textarea value={formV.notas} onChange={(e) => setFormV({ ...formV, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalVOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSaveV} disabled={savingV} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{savingV ? "Guardando..." : editingV ? "Guardar Cambios" : "Crear Vehículo"}</button>
          </div>
        </div>
      </Modal>

      {/* Modal Bitácora */}
      <Modal open={modalMOpen} onClose={() => setModalMOpen(false)} title={editingM ? "Editar Registro de Bitácora" : "Nuevo Registro de Bitácora"} maxWidth="max-w-xl">
        <div className="space-y-4">
          {errorM && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{errorM}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Vehículo *</label>
              <select value={formM.vehiculo_id} onChange={(e) => setFormM({ ...formM, vehiculo_id: e.target.value })} className={inputCls}>
                <option value="">Seleccionar...</option>
                {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.matricula})</option>)}
              </select>
            </div>
            {isInstructor ? (
              <div>
                <label className={labelCls}>Responsable</label>
                <div className={`${inputCls} flex items-center text-sm text-[#86868b]`}>
                  Registro asociado a tu perfil de instructor
                </div>
              </div>
            ) : (
              <div><label className={labelCls}>Instructor</label>
                <select value={formM.instructor_id} onChange={(e) => setFormM({ ...formM, instructor_id: e.target.value })} className={inputCls}>
                  <option value="">Sin asignar</option>
                  {instructores.map((i) => <option key={i.id} value={i.id}>{i.nombre} {i.apellidos}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Tipo</label><select value={formM.tipo} onChange={(e) => setFormM({ ...formM, tipo: e.target.value as TipoMantenimiento })} className={inputCls}>{tiposMant.map((t) => <option key={t} value={t}>{formatTipoMantenimiento(t)}</option>)}</select></div>
            <div><label className={labelCls}>Fecha</label><input type="date" value={formM.fecha} onChange={(e) => setFormM({ ...formM, fecha: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Descripción *</label><input type="text" value={formM.descripcion} onChange={(e) => setFormM({ ...formM, descripcion: e.target.value })} className={inputCls} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>Monto ($)</label><input type="number" step="0.01" value={formM.monto} onChange={(e) => setFormM({ ...formM, monto: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Kilometraje</label><input type="number" value={formM.kilometraje_actual} onChange={(e) => setFormM({ ...formM, kilometraje_actual: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Litros</label><input type="number" step="0.01" value={formM.litros} onChange={(e) => setFormM({ ...formM, litros: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={labelCls}>$/Litro</label><input type="number" step="0.01" value={formM.precio_por_litro} onChange={(e) => setFormM({ ...formM, precio_por_litro: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Proveedor</label><input type="text" value={formM.proveedor} onChange={(e) => setFormM({ ...formM, proveedor: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>N° Factura</label><input type="text" value={formM.numero_factura} onChange={(e) => setFormM({ ...formM, numero_factura: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Notas</label><textarea value={formM.notas} onChange={(e) => setFormM({ ...formM, notas: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalMOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSaveM} disabled={savingM} className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">{savingM ? "Guardando..." : editingM ? "Guardar Cambios" : "Crear Registro"}</button>
          </div>
        </div>
      </Modal>

      <Modal
        open={historialOpen}
        onClose={() => { setHistorialOpen(false); setHistorialVehiculoId(null); }}
        title={historialVehiculo ? `Bitácora de ${historialVehiculo.marca} ${historialVehiculo.modelo}` : "Bitácora del vehículo"}
        maxWidth="max-w-3xl"
      >
        {historialVehiculo && (
          <div className="space-y-5">
            <div className="apple-panel-muted grid gap-3 px-4 py-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">Vehículo</p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {historialVehiculo.marca} {historialVehiculo.modelo}
                </p>
                <p className="text-xs text-[#86868b]">{historialVehiculo.matricula}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">Kilometraje</p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {historialVehiculo.kilometraje.toLocaleString()} km
                </p>
                <p className="text-xs text-[#86868b]">Sincronizado desde bitácora.</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868b]">Historial</p>
                <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {(historialVehiculo as VehiculoConBitacora).registros_bitacora || 0} registro{(historialVehiculo as VehiculoConBitacora).registros_bitacora === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-[#86868b]">
                  {(historialVehiculo as VehiculoConBitacora).ultimo_registro_fecha
                    ? `Último: ${formatFecha((historialVehiculo as VehiculoConBitacora).ultimo_registro_fecha)}`
                    : "Sin movimientos todavía."}
                </p>
              </div>
            </div>

            {historialRegistros.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--surface-border-strong)] px-6 py-12 text-center">
                <ClipboardList size={28} className="mx-auto text-[#86868b]" />
                <p className="mt-3 text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Este vehículo todavía no tiene registros en bitácora.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historialRegistros.map((registro) => (
                  <div
                    key={registro.id}
                    className="rounded-3xl border border-[var(--surface-border)] bg-white/60 px-4 py-4 dark:bg-white/[0.03]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${tipoColors[registro.tipo]}`}>
                            {formatTipoMantenimiento(registro.tipo)}
                          </span>
                          <span className="text-xs text-[#86868b]">{formatFecha(registro.fecha)}</span>
                          {registro.kilometraje_actual != null && (
                            <span className="text-xs text-[#86868b]">{registro.kilometraje_actual.toLocaleString()} km</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {registro.descripcion}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#86868b]">
                          {registro.instructor_nombre && registro.instructor_nombre !== "—"
                            ? `Instructor: ${registro.instructor_nombre}`
                            : "Sin instructor asignado"}
                          {registro.litros != null ? ` · ${registro.litros} L` : ""}
                          {registro.precio_por_litro != null ? ` · ${formatCop(registro.precio_por_litro)} / litro` : ""}
                          {registro.numero_factura ? ` · Factura ${registro.numero_factura}` : ""}
                        </p>
                        {registro.notas && (
                          <p className="mt-2 text-xs leading-5 text-[#6e6e73] dark:text-[#aeaeb2]">
                            {registro.notas}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-xs text-[#86868b]">Monto</p>
                        <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {formatCop(registro.monto)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <DeleteConfirm open={deleteVOpen} onClose={() => setDeleteVOpen(false)} onConfirm={handleDeleteV} loading={savingV} error={errorV} message={`¿Eliminar ${deletingV?.marca} ${deletingV?.modelo} (${deletingV?.matricula})?`} />
      <DeleteConfirm open={deleteMOpen} onClose={() => setDeleteMOpen(false)} onConfirm={handleDeleteM} loading={savingM} error={errorM} message="¿Eliminar este registro de bitácora?" />
    </div>
  );
}
