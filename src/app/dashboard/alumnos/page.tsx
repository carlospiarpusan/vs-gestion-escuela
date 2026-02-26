"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import DataTable from "@/components/dashboard/DataTable";
import Modal from "@/components/dashboard/Modal";
import DeleteConfirm from "@/components/dashboard/DeleteConfirm";
import type { Alumno, Ingreso, EstadoAlumno, MetodoPago } from "@/types/database";
import { Plus, X, DollarSign } from "lucide-react";

const estadosAlumno: EstadoAlumno[] = ["activo", "inactivo", "graduado"];
const metodosPago: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datáfono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];

const TODAS_CATEGORIAS = [
  "A1", "A2", "B1", "C1", "RC1", "C2", "C3",
  "A2 y B1", "A2 y C1", "A2 y RC1", "A2 y C2", "A2 y C3",
  "A1 y B1", "A1 y C1", "A1 y RC1", "A1 y C2", "A1 y C3",
];

const emptyForm = {
  nombre: "",
  apellidos: "",
  dni: "",
  email: "",
  telefono: "",
  direccion: "",
  tipo_permiso: "B" as import("@/types/database").TipoPermiso,
  categorias: [] as string[],
  estado: "activo" as EstadoAlumno,
  notas: "",
  valor_total: "",
  abono: "",
  metodo_pago_abono: "efectivo" as MetodoPago,
  // Tramitador
  tiene_tramitador: false,
  tramitador_nombre: "",
  tramitador_valor: "",
};

const inputClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

const labelClass = "block text-xs text-[#86868b] mb-1";

export default function AlumnosPage() {
  const { perfil } = useAuth();

  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriasEscuela, setCategoriasEscuela] = useState<string[]>([]);
  const [pagosMap, setPagosMap] = useState<Map<string, number>>(new Map());
  const [filtrosCat, setFiltrosCat] = useState<string[]>([]);

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Alumno | null>(null);
  const [deleting, setDeleting] = useState<Alumno | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Modal de abonos
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [abonoAlumno, setAbonoAlumno] = useState<Alumno | null>(null);
  const [abonoIngresos, setAbonoIngresos] = useState<Ingreso[]>([]);
  const [loadingIngresos, setLoadingIngresos] = useState(false);
  const [abonoMonto, setAbonoMonto] = useState("");
  const [abonoMetodo, setAbonoMetodo] = useState<MetodoPago>("efectivo");
  const [abonoConcepto, setAbonoConcepto] = useState("");
  const [abonoSaving, setAbonoSaving] = useState(false);
  const [abonoError, setAbonoError] = useState("");

  const fetchAlumnos = useCallback(async () => {
    if (!perfil?.escuela_id) return;
    const supabase = createClient();
    const [alumnosRes, ingresosRes] = await Promise.all([
      supabase
        .from("alumnos")
        .select("id, nombre, apellidos, dni, telefono, email, tipo_permiso, categorias, estado, valor_total, fecha_inscripcion, ciudad, departamento, direccion, tiene_tramitador, tramitador_nombre, tramitador_valor, sede_id, user_id, created_at")
        .eq("escuela_id", perfil.escuela_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("ingresos")
        .select("alumno_id, monto")
        .eq("escuela_id", perfil.escuela_id)
        .not("alumno_id", "is", null),
    ]);
    setAlumnos((alumnosRes.data as Alumno[]) || []);
    // Calcular total pagado por alumno
    const mapa = new Map<string, number>();
    for (const ing of (ingresosRes.data || []) as { alumno_id: string; monto: number }[]) {
      mapa.set(ing.alumno_id, (mapa.get(ing.alumno_id) || 0) + Number(ing.monto));
    }
    setPagosMap(mapa);
    setLoading(false);
  }, [perfil?.escuela_id]);

  const fetchCategorias = useCallback(async (escuelaId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("escuelas")
      .select("categorias")
      .eq("id", escuelaId)
      .single();
    setCategoriasEscuela(data?.categorias || []);
  }, []);

  useEffect(() => {
    if (perfil) {
      fetchAlumnos();
      if (perfil.escuela_id) fetchCategorias(perfil.escuela_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  const alumnosFiltrados =
    filtrosCat.length === 0
      ? alumnos
      : alumnos.filter((a) =>
          filtrosCat.some((f) => (a.categorias || []).includes(f))
        );

  const toggleFiltroCat = (cat: string) => {
    setFiltrosCat((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleCategoria = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
        ? prev.categorias.filter((c) => c !== cat)
        : [...prev.categorias, cat],
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (alumno: Alumno) => {
    setEditing(alumno);
    setForm({
      nombre: alumno.nombre,
      apellidos: alumno.apellidos,
      dni: alumno.dni,
      email: alumno.email || "",
      telefono: alumno.telefono,
      direccion: alumno.direccion || "",
      tipo_permiso: alumno.tipo_permiso,
      categorias: alumno.categorias || [],
      estado: alumno.estado,
      notas: alumno.notas || "",
      valor_total: alumno.valor_total ? String(alumno.valor_total) : "",
      abono: "",
      metodo_pago_abono: "efectivo",
      tiene_tramitador: alumno.tiene_tramitador || false,
      tramitador_nombre: alumno.tramitador_nombre || "",
      tramitador_valor: alumno.tramitador_valor ? String(alumno.tramitador_valor) : "",
    });
    setError("");
    setModalOpen(true);
  };

  const openDelete = (alumno: Alumno) => {
    setDeleting(alumno);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const openAbono = useCallback(async (alumno: Alumno) => {
    setAbonoAlumno(alumno);
    setAbonoMonto("");
    setAbonoMetodo("efectivo");
    setAbonoConcepto("");
    setAbonoError("");
    setAbonoIngresos([]);
    setAbonoOpen(true);
    setLoadingIngresos(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("ingresos")
      .select("*")
      .eq("alumno_id", alumno.id)
      .order("created_at", { ascending: false });
    setAbonoIngresos((data as Ingreso[]) || []);
    setLoadingIngresos(false);
  }, []);

  const handleSave = async () => {
    if (!form.nombre || !form.apellidos || !form.dni || !form.telefono) {
      setError("Nombre, apellidos, DNI y teléfono son obligatorios.");
      return;
    }
    if (form.categorias.length === 0) {
      setError("Debes seleccionar al menos una categoría de curso.");
      return;
    }

    const abonoNum = parseFloat(String(form.abono)) || 0;
    const valorTotalNum = parseFloat(String(form.valor_total)) || 0;

    if (!editing && abonoNum > 0 && valorTotalNum > 0 && abonoNum > valorTotalNum) {
      setError("El abono no puede ser mayor al valor total del curso.");
      return;
    }

    if (!perfil?.escuela_id) {
      setError("Tu usuario no tiene escuela asignada. Contacta al administrador.");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();
    try {
      let sedeId = perfil.sede_id;
      if (!sedeId) {
        const { data: sedeData } = await supabase
          .from("sedes")
          .select("id")
          .eq("escuela_id", perfil.escuela_id)
          .order("es_principal", { ascending: false })
          .limit(1)
          .single();
        sedeId = sedeData?.id || null;
      }
      if (!sedeId) {
        setError("No se encontró una sede para esta escuela. Crea una sede primero.");
        setSaving(false);
        return;
      }

      let alumnoUserId = perfil.id;

      if (!editing) {
        // Crear cuenta de acceso para el alumno (usuario=cédula, contraseña=cédula)
        const authRes = await fetch("/api/crear-alumno-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: `${form.nombre} ${form.apellidos}`,
            email: form.email || null,
            dni: form.dni,
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
          }),
        });
        const authJson = await authRes.json();
        if (!authRes.ok) {
          setError(authJson.error || "Error al crear la cuenta del alumno.");
          setSaving(false);
          return;
        }
        alumnoUserId = authJson.user_id;
      }

      const tramitadorValorNum = parseFloat(form.tramitador_valor) || 0;

      const payload = {
        user_id: alumnoUserId,
        escuela_id: perfil.escuela_id,
        sede_id: sedeId,
        nombre: form.nombre,
        apellidos: form.apellidos,
        dni: form.dni,
        email: form.email || null,
        telefono: form.telefono,
        fecha_nacimiento: null,
        direccion: form.direccion || null,
        tipo_permiso: form.tipo_permiso,
        categorias: form.categorias,
        estado: form.estado,
        notas: form.notas || null,
        valor_total: valorTotalNum || null,
        tiene_tramitador: form.tiene_tramitador,
        tramitador_nombre: form.tiene_tramitador ? (form.tramitador_nombre.trim() || null) : null,
        tramitador_valor: form.tiene_tramitador ? (tramitadorValorNum || null) : null,
      };

      const hoy = new Date().toISOString().split("T")[0];

      if (editing) {
        const { error } = await supabase.from("alumnos").update(payload).eq("id", editing.id);
        if (error) throw error;

        // Si el tramitador cambió → registrar gasto por la diferencia
        if (form.tiene_tramitador && tramitadorValorNum > 0) {
          const originalValor = editing.tramitador_valor ?? 0;
          const diferencia = tramitadorValorNum - originalValor;
          const esPrimeraTramitador = !editing.tiene_tramitador;
          const montoGasto = esPrimeraTramitador ? tramitadorValorNum : diferencia;
          if (montoGasto > 0) {
            await supabase.from("gastos").insert([{
              escuela_id: perfil.escuela_id,
              sede_id: sedeId,
              user_id: perfil.id,
              categoria: "tramitador",
              concepto: `Tramitador — ${form.nombre} ${form.apellidos}`,
              monto: montoGasto,
              metodo_pago: "transferencia",
              proveedor: form.tramitador_nombre.trim() || null,
              fecha: hoy,
              recurrente: false,
              notas: `Tramitador asignado al alumno ${form.nombre} ${form.apellidos}`,
            }]);
          }
        }
      } else {
        const { error: insertError } = await supabase.from("alumnos").insert([payload]);
        if (insertError) throw insertError;

        // Obtener el id del alumno recién creado
        const { data: alumnoData } = await supabase
          .from("alumnos")
          .select("id")
          .eq("dni", form.dni)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Abono inicial → ingreso
        if (abonoNum > 0) {
          await supabase.from("ingresos").insert([{
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
            user_id: perfil.id,
            alumno_id: alumnoData?.id || null,
            categoria: "matricula",
            concepto: `Matrícula — ${form.nombre} ${form.apellidos}`,
            monto: abonoNum,
            metodo_pago: form.metodo_pago_abono,
            fecha: hoy,
            estado: "cobrado",
            notas: null,
          }]);
        }

        // Tramitador → gasto
        if (form.tiene_tramitador && tramitadorValorNum > 0) {
          await supabase.from("gastos").insert([{
            escuela_id: perfil.escuela_id,
            sede_id: sedeId,
            user_id: perfil.id,
            categoria: "tramitador",
            concepto: `Tramitador — ${form.nombre} ${form.apellidos}`,
            monto: tramitadorValorNum,
            metodo_pago: "transferencia",
            proveedor: form.tramitador_nombre.trim() || null,
            fecha: hoy,
            recurrente: false,
            notas: `Tramitador asignado al alumno ${form.nombre} ${form.apellidos}`,
          }]);
        }
      }

      setModalOpen(false);
      fetchAlumnos();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al guardar";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAbono = async () => {
    if (!abonoAlumno || !perfil?.escuela_id) return;
    const monto = parseFloat(abonoMonto);
    if (!monto || monto <= 0) {
      setAbonoError("El monto del abono debe ser mayor a 0.");
      return;
    }

    const valorTotal = abonoAlumno.valor_total || 0;
    const totalPagado = abonoIngresos.reduce((s, i) => s + i.monto, 0);
    const saldo = valorTotal - totalPagado;

    if (valorTotal > 0 && monto > saldo + 0.01) {
      setAbonoError(
        `El abono ($${monto.toLocaleString("es-CO")}) supera el saldo pendiente ($${saldo.toLocaleString("es-CO")}).`
      );
      return;
    }

    setAbonoSaving(true);
    setAbonoError("");
    try {
      const supabase = createClient();
      let sedeId = perfil.sede_id;
      if (!sedeId) {
        const { data: sedeData } = await supabase
          .from("sedes")
          .select("id")
          .eq("escuela_id", perfil.escuela_id)
          .order("es_principal", { ascending: false })
          .limit(1)
          .single();
        sedeId = sedeData?.id || null;
      }

      const { error } = await supabase.from("ingresos").insert([{
        escuela_id: perfil.escuela_id,
        sede_id: sedeId,
        user_id: perfil.id,
        alumno_id: abonoAlumno.id,
        categoria: "matricula",
        concepto: abonoConcepto.trim() || `Abono — ${abonoAlumno.nombre} ${abonoAlumno.apellidos}`,
        monto,
        metodo_pago: abonoMetodo,
        fecha: new Date().toISOString().split("T")[0],
        estado: "cobrado",
        notas: null,
      }]);

      if (error) throw error;

      // Recargar ingresos del alumno (modal) y mapa de pagos (tabla)
      const { data } = await supabase
        .from("ingresos")
        .select("*")
        .eq("alumno_id", abonoAlumno.id)
        .order("created_at", { ascending: false });
      setAbonoIngresos((data as Ingreso[]) || []);
      // Actualizar el mapa de pagos para reflejar el nuevo saldo en la tabla
      setPagosMap((prev) => {
        const nueva = new Map(prev);
        const totalActual = (data as Ingreso[]).reduce((s, i) => s + Number(i.monto), 0);
        nueva.set(abonoAlumno.id, totalActual);
        return nueva;
      });
      setAbonoMonto("");
      setAbonoConcepto("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "Error al registrar";
      setAbonoError(msg);
    } finally {
      setAbonoSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    setDeleteError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("alumnos").delete().eq("id", deleting.id);
      if (error) throw error;
      setDeleteOpen(false);
      setDeleting(null);
      fetchAlumnos();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "nombre" as keyof Alumno,
      label: "Alumno",
      render: (row: Alumno) => (
        <span className="font-medium">{row.nombre} {row.apellidos}</span>
      ),
    },
    { key: "dni" as keyof Alumno, label: "DNI" },
    { key: "telefono" as keyof Alumno, label: "Teléfono" },
    {
      key: "categorias" as keyof Alumno,
      label: "Categorías",
      render: (row: Alumno) => {
        const cats = row.categorias || [];
        if (cats.length === 0) return <span className="text-[#86868b] text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <span
                key={c}
                className="px-1.5 py-0.5 text-[10px] rounded-md bg-[#0071e3]/10 text-[#0071e3] font-semibold"
              >
                {c}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "valor_total" as keyof Alumno,
      label: "Valor Curso",
      render: (row: Alumno) =>
        row.valor_total
          ? <span className="text-sm font-medium">${(row.valor_total as number).toLocaleString("es-CO")}</span>
          : <span className="text-[#86868b] text-xs">—</span>,
    },
    {
      key: "saldo" as string,
      label: "Saldo Pendiente",
      render: (row: Alumno) => {
        const vt = row.valor_total || 0;
        if (!vt) return <span className="text-[#86868b] text-xs">—</span>;
        const pagado = pagosMap.get(row.id) || 0;
        const saldo = vt - pagado;
        if (saldo <= 0) {
          return (
            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Al día
            </span>
          );
        }
        return (
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            ${saldo.toLocaleString("es-CO")}
          </span>
        );
      },
    },
  ];

  // Calcular balance del alumno en modal de abonos
  const valorTotal = abonoAlumno?.valor_total || 0;
  const totalPagado = abonoIngresos.reduce((s, i) => s + i.monto, 0);
  const saldoPendiente = valorTotal - totalPagado;

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Alumnos</h2>
          <p className="text-sm text-[#86868b] mt-0.5">Gestiona los alumnos de tu escuela</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          <Plus size={16} />
          Nuevo Alumno
        </button>
      </div>

      {/* Filtro por categoría */}
      {(() => {
        const cats = categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS;
        return (
          <div className="bg-white dark:bg-[#1d1d1f] rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#86868b] font-medium mr-1">Filtrar:</span>
            {cats.map((cat) => {
              const activo = filtrosCat.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleFiltroCat(cat)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                    activo
                      ? "bg-[#0071e3] text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-[#86868b] hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            {filtrosCat.length > 0 && (
              <button
                onClick={() => setFiltrosCat([])}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-[#86868b] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1"
              >
                <X size={11} />
                Limpiar
              </button>
            )}
          </div>
        );
      })()}

      {/* Tabla */}
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-4 sm:p-6">
        <DataTable
          columns={columns}
          data={alumnosFiltrados}
          loading={loading}
          searchPlaceholder="Buscar por nombre o DNI..."
          searchKeys={["nombre", "apellidos", "dni"]}
          onEdit={openEdit}
          onDelete={openDelete}
          extraActions={(row) => (
            <button
              onClick={() => openAbono(row)}
              className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-[#86868b] hover:text-green-600"
              title="Registrar abono"
              aria-label="Registrar abono"
            >
              <DollarSign size={14} />
            </button>
          )}
        />
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Alumno" : "Nuevo Alumno"}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nombre *</label>
              <input type="text" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Apellidos *</label>
              <input type="text" value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>DNI *</label>
              <input type="text" value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Teléfono *</label>
              <input type="text" value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Correo</label>
              <input type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dirección</label>
              <input type="text" value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className={inputClass} />
            </div>
          </div>

          {/* Categorías */}
          <div>
            <label className={labelClass}>
              Categoría del curso *{" "}
              <span className="normal-case font-normal">
                ({form.categorias.length} seleccionada{form.categorias.length !== 1 ? "s" : ""})
              </span>
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(categoriasEscuela.length > 0 ? categoriasEscuela : TODAS_CATEGORIAS).map((cat) => {
                const sel = form.categorias.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoria(cat)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-semibold border-2 transition-colors ${
                      sel
                        ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
                        : "border-gray-200 dark:border-gray-700 text-[#86868b] hover:border-gray-300"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Estado</label>
              <select value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoAlumno })}
                className={inputClass}>
                {estadosAlumno.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Valor total del curso</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.valor_total}
                onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Tramitador */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative" onClick={() => setForm({ ...form, tiene_tramitador: !form.tiene_tramitador })}>
                <div className={`w-10 h-6 rounded-full transition-colors ${form.tiene_tramitador ? "bg-[#0071e3]" : "bg-gray-200 dark:bg-gray-700"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${form.tiene_tramitador ? "translate-x-5" : "translate-x-1"}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Tiene tramitador</p>
                <p className="text-xs text-[#86868b]">El costo se registrará automáticamente en Gastos</p>
              </div>
            </label>

            {form.tiene_tramitador && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={labelClass}>Nombre del tramitador</label>
                  <input
                    type="text"
                    value={form.tramitador_nombre}
                    onChange={(e) => setForm({ ...form, tramitador_nombre: e.target.value })}
                    placeholder="Nombre o agencia"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Valor {editing && (editing.tramitador_valor ?? 0) > 0 ? "(ajuste sobre el anterior)" : "(va a Gastos)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.tramitador_valor}
                    onChange={(e) => setForm({ ...form, tramitador_valor: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Notas</label>
            <textarea value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`} />
          </div>

          {/* Pago inicial — solo al crear */}
          {!editing && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-3">
                Abono inicial
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Monto del abono</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.abono}
                      onChange={(e) => setForm({ ...form, abono: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Método de pago</label>
                    <select
                      value={form.metodo_pago_abono}
                      onChange={(e) => setForm({ ...form, metodo_pago_abono: e.target.value as MetodoPago })}
                      className={inputClass}
                    >
                      {metodosPago.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {parseFloat(String(form.valor_total)) > 0 && (
                  <p className="text-xs text-[#86868b]">
                    Saldo pendiente tras abono:{" "}
                    <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      ${Math.max(0, parseFloat(String(form.valor_total)) - (parseFloat(String(form.abono)) || 0)).toLocaleString("es-CO")}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Alumno"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Abonos */}
      <Modal
        open={abonoOpen}
        onClose={() => setAbonoOpen(false)}
        title={`Abonos — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {/* Resumen financiero */}
          {valorTotal > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0a]">
                <p className="text-[10px] text-[#86868b] uppercase tracking-wider mb-1">Valor Curso</p>
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  ${valorTotal.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                <p className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Pagado</p>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  ${totalPagado.toLocaleString("es-CO")}
                </p>
              </div>
              <div className={`text-center p-3 rounded-xl ${saldoPendiente <= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}>
                <p className={`text-[10px] uppercase tracking-wider mb-1 ${saldoPendiente <= 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {saldoPendiente <= 0 ? "¡Al día!" : "Pendiente"}
                </p>
                <p className={`text-sm font-semibold ${saldoPendiente <= 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                  ${Math.max(0, saldoPendiente).toLocaleString("es-CO")}
                </p>
              </div>
            </div>
          )}

          {/* Historial de pagos */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b] mb-2">
              Historial de pagos
            </p>
            {loadingIngresos ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : abonoIngresos.length === 0 ? (
              <p className="text-xs text-[#86868b] text-center py-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl">
                Sin pagos registrados
              </p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {abonoIngresos.map((ingreso) => (
                  <div
                    key={ingreso.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0a0a0a]"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {ingreso.concepto}
                      </p>
                      <p className="text-[10px] text-[#86868b]">
                        {ingreso.fecha} · {metodosPago.find((m) => m.value === ingreso.metodo_pago)?.label || ingreso.metodo_pago}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-3 shrink-0">
                      +${ingreso.monto.toLocaleString("es-CO")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario nuevo abono */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b]">
              Registrar nuevo abono
            </p>

            {abonoError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                {abonoError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Monto *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={abonoMonto}
                  onChange={(e) => setAbonoMonto(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Método de pago</label>
                <select
                  value={abonoMetodo}
                  onChange={(e) => setAbonoMetodo(e.target.value as MetodoPago)}
                  className={inputClass}
                >
                  {metodosPago.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Concepto (opcional)</label>
              <input
                type="text"
                placeholder={`Abono — ${abonoAlumno?.nombre} ${abonoAlumno?.apellidos}`}
                value={abonoConcepto}
                onChange={(e) => setAbonoConcepto(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Preview saldo tras abono */}
            {valorTotal > 0 && parseFloat(abonoMonto) > 0 && (
              <p className="text-xs text-[#86868b]">
                Saldo pendiente tras abono:{" "}
                <span className={`font-semibold ${(saldoPendiente - parseFloat(abonoMonto)) <= 0 ? "text-green-600" : "text-amber-600"}`}>
                  ${Math.max(0, saldoPendiente - (parseFloat(abonoMonto) || 0)).toLocaleString("es-CO")}
                </span>
              </p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSaveAbono}
                disabled={abonoSaving || !abonoMonto}
                className="px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"
              >
                {abonoSaving ? "Registrando..." : "Registrar Abono"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {deleteError && deleteOpen && (
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center">
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg shadow-lg border border-red-200 dark:border-red-800">
            {deleteError}
          </p>
        </div>
      )}

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(""); }}
        onConfirm={handleDelete}
        loading={saving}
        message={`¿Eliminar a ${deleting?.nombre} ${deleting?.apellidos}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
