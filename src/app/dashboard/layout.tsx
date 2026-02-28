"use client";

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";
import { LogOut, Sun, Moon, Menu, AlertCircle, KeyRound, Eye, EyeOff, UserCheck, UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

const DEPARTAMENTOS_COLOMBIA = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá",
  "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba",
  "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
  "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda",
  "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca",
  "Vaupés", "Vichada", "Bogotá D.C.",
].sort();

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";
const labelCls = "block text-xs text-[#86868b] mb-1";

/* ─────────────────────────────────────────────────────────────
   DashboardInner: consume el AuthContext que provee el padre.
   Todas las páginas hijas también leerán del mismo contexto
   sin costo adicional de red.
───────────────────────────────────────────────────────────── */
function DashboardInner({ children }: { children: React.ReactNode }) {
  // Lee del contexto — sin llamadas extra a Supabase
  const { user, perfil, escuelaNombre, sedeNombre, loading, error, logout } = useAuth();

  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Modal 1: Cambio de contraseña obligatorio ---
  const [cambioOpen, setCambioOpen] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [cambioError, setCambioError] = useState("");
  const [cambioLoading, setCambioLoading] = useState(false);

  // --- Modal 2: Completar perfil (alumnos) ---
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [perfilEmail, setPerfilEmail] = useState("");
  const [perfilDireccion, setPerfilDireccion] = useState("");
  const [perfilCiudad, setPerfilCiudad] = useState("");
  const [perfilDepartamento, setPerfilDepartamento] = useState("");
  const [perfilError, setPerfilError] = useState("");
  const [perfilLoading, setPerfilLoading] = useState(false);

  // --- Modal 3: Mi Cuenta (editar datos + cambiar contraseña) ---
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const [cuentaNombre, setCuentaNombre] = useState("");
  const [cuentaTelefono, setCuentaTelefono] = useState("");
  const [cuentaPass1, setCuentaPass1] = useState("");
  const [cuentaPass2, setCuentaPass2] = useState("");
  const [showCuentaPass1, setShowCuentaPass1] = useState(false);
  const [showCuentaPass2, setShowCuentaPass2] = useState(false);
  const [cuentaError, setCuentaError] = useState("");
  const [cuentaOk, setCuentaOk] = useState("");
  const [cuentaLoading, setCuentaLoading] = useState(false);

  // Detectar flags en user_metadata
  useEffect(() => {
    if (!user) return;
    if (user.user_metadata?.debe_cambiar_password === true) {
      setCambioOpen(true);
    } else if (user.user_metadata?.debe_completar_perfil === true && perfil?.rol === "alumno") {
      abrirCompletarPerfil();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, perfil?.rol]);

  const abrirCompletarPerfil = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("alumnos")
      .select("id, email, direccion, ciudad, departamento")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setAlumnoId(data.id);
      setPerfilEmail(data.email || "");
      setPerfilDireccion(data.direccion || "");
      setPerfilCiudad(data.ciudad || "");
      setPerfilDepartamento(data.departamento || "");
    }
    setPerfilOpen(true);
  };

  const handleCambioPassword = async () => {
    if (!nuevaPassword || !confirmarPassword) {
      setCambioError("Completa todos los campos.");
      return;
    }
    if (nuevaPassword.length < 6) {
      setCambioError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      setCambioError("Las contraseñas no coinciden.");
      return;
    }
    setCambioLoading(true);
    setCambioError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: nuevaPassword,
      data: { debe_cambiar_password: false },
    });
    if (updateError) {
      setCambioError(updateError.message);
      setCambioLoading(false);
      return;
    }
    setCambioLoading(false);
    setCambioOpen(false);
    if (user?.user_metadata?.debe_completar_perfil === true && perfil?.rol === "alumno") {
      abrirCompletarPerfil();
    }
  };

  const handleGuardarPerfil = async () => {
    if (!perfilEmail.trim() || !perfilDepartamento || !perfilCiudad || !perfilDireccion) {
      setPerfilError("Correo, departamento, ciudad y dirección son obligatorios.");
      return;
    }
    setPerfilLoading(true);
    setPerfilError("");
    const supabase = createClient();

    const updatePayload: Record<string, string | null> = {
      email: perfilEmail.trim().toLowerCase(),
      direccion: perfilDireccion.trim() || null,
      ciudad: perfilCiudad.trim() || null,
      departamento: perfilDepartamento || null,
    };

    if (!alumnoId) {
      setPerfilError("No se encontró el perfil del alumno.");
      setPerfilLoading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("alumnos")
      .update(updatePayload)
      .eq("id", alumnoId);

    if (dbError) {
      setPerfilError(dbError.message);
      setPerfilLoading(false);
      return;
    }

    await supabase.auth.updateUser({ data: { debe_completar_perfil: false } });
    setPerfilLoading(false);
    setPerfilOpen(false);
  };

  const abrirMiCuenta = () => {
    setCuentaNombre(perfil?.nombre || "");
    setCuentaTelefono(perfil?.telefono || "");
    setCuentaPass1("");
    setCuentaPass2("");
    setCuentaError("");
    setCuentaOk("");
    setCuentaOpen(true);
  };

  const handleGuardarCuenta = async () => {
    setCuentaError("");
    setCuentaOk("");

    if (!cuentaNombre.trim()) {
      setCuentaError("El nombre es obligatorio.");
      return;
    }
    if (cuentaPass1 && cuentaPass1.length < 6) {
      setCuentaError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (cuentaPass1 && cuentaPass1 !== cuentaPass2) {
      setCuentaError("Las contraseñas no coinciden.");
      return;
    }

    setCuentaLoading(true);
    const supabase = createClient();

    // Actualizar nombre y teléfono en perfiles
    const { error: dbErr } = await supabase
      .from("perfiles")
      .update({
        nombre: cuentaNombre.trim(),
        telefono: cuentaTelefono.trim() || null,
      })
      .eq("id", user!.id);

    if (dbErr) {
      setCuentaError(dbErr.message);
      setCuentaLoading(false);
      return;
    }

    // Cambiar contraseña solo si se ingresó una nueva
    if (cuentaPass1) {
      const { error: passErr } = await supabase.auth.updateUser({
        password: cuentaPass1,
        data: { debe_cambiar_password: false },
      });
      if (passErr) {
        setCuentaError(passErr.message);
        setCuentaLoading(false);
        return;
      }
    }

    setCuentaLoading(false);
    setCuentaOk("Datos actualizados correctamente.");
    setCuentaPass1("");
    setCuentaPass2("");
  };

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2">
            Error de autenticación
          </h2>
          <p className="text-sm text-[#86868b] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#0071e3] text-white rounded-lg text-sm hover:bg-[#0077ED] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const nombre = perfil?.nombre || user.user_metadata?.nombre || "Usuario";

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] transition-colors duration-300 flex">
      <Sidebar rol={perfil?.rol} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <header className="bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-30">
          <div className="px-4 sm:px-6 h-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Abrir menú"
              >
                <Menu size={16} className="text-[#1d1d1f] dark:text-[#f5f5f7]" />
              </button>
              <div>
                <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{nombre}</span>
                {escuelaNombre && (
                  <span className="text-xs text-[#86868b] ml-2 hidden sm:inline">
                    {escuelaNombre}
                    {sedeNombre && sedeNombre !== "Sede 1" && (
                      <span className="text-[#0071e3]"> · {sedeNombre}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {perfil?.rol && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium hidden sm:inline">
                  {perfil.rol.replace("_", " ")}
                </span>
              )}
              <button
                onClick={abrirMiCuenta}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Mi cuenta"
                aria-label="Mi cuenta"
              >
                <UserCircle size={16} className="text-[#1d1d1f] dark:text-[#f5f5f7]" />
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {darkMode ? (
                  <Sun size={16} className="text-[#f5f5f7]" />
                ) : (
                  <Moon size={16} className="text-[#1d1d1f]" />
                )}
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs text-[#86868b] hover:text-red-500 transition-colors"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* ========== Modal 1: Cambio de contraseña obligatorio ========== */}
      {cambioOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-[#0071e3]/10 flex items-center justify-center mb-3">
                <KeyRound size={22} className="text-[#0071e3]" />
              </div>
              <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Cambia tu contraseña
              </h2>
              <p className="text-sm text-[#86868b] mt-1">
                Por seguridad debes establecer una nueva contraseña antes de continuar.
              </p>
            </div>
            {cambioError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4 text-center">
                {cambioError}
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showNueva ? "text" : "password"}
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                    className={`${inputCls} pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNueva(!showNueva)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b]"
                  >
                    {showNueva ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirmar ? "text" : "password"}
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className={`${inputCls} pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmar(!showConfirmar)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b]"
                  >
                    {showConfirmar ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleCambioPassword}
                disabled={cambioLoading}
                className="w-full py-2.5 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors disabled:opacity-50 font-medium mt-1"
              >
                {cambioLoading ? "Guardando..." : "Establecer nueva contraseña"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Modal 3: Mi Cuenta ========== */}
      {cuentaOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 flex items-center justify-center">
                  <UserCircle size={20} className="text-[#0071e3]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Mi cuenta</h2>
                  <p className="text-xs text-[#86868b]">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setCuentaOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[#86868b]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {cuentaError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4 text-center">
                {cuentaError}
              </p>
            )}
            {cuentaOk && (
              <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg mb-4 text-center">
                {cuentaOk}
              </p>
            )}

            <div className="space-y-4">
              {/* ── Datos personales ── */}
              <div>
                <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider mb-2">Datos personales</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Nombre completo *</label>
                    <input
                      type="text"
                      value={cuentaNombre}
                      onChange={(e) => setCuentaNombre(e.target.value)}
                      placeholder="Tu nombre"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Teléfono</label>
                    <input
                      type="tel"
                      value={cuentaTelefono}
                      onChange={(e) => setCuentaTelefono(e.target.value)}
                      placeholder="Número de teléfono"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* ── Cambiar contraseña ── */}
              <div>
                <p className="text-xs font-medium text-[#86868b] uppercase tracking-wider mb-2">Cambiar contraseña</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Nueva contraseña</label>
                    <div className="relative">
                      <input
                        type={showCuentaPass1 ? "text" : "password"}
                        value={cuentaPass1}
                        onChange={(e) => setCuentaPass1(e.target.value)}
                        placeholder="Dejar vacío para no cambiar"
                        className={`${inputCls} pr-9`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCuentaPass1(!showCuentaPass1)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b]"
                      >
                        {showCuentaPass1 ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {cuentaPass1 && (
                    <div>
                      <label className={labelCls}>Confirmar contraseña</label>
                      <div className="relative">
                        <input
                          type={showCuentaPass2 ? "text" : "password"}
                          value={cuentaPass2}
                          onChange={(e) => setCuentaPass2(e.target.value)}
                          placeholder="Repite la contraseña"
                          className={`${inputCls} pr-9`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCuentaPass2(!showCuentaPass2)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b]"
                        >
                          {showCuentaPass2 ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setCuentaOpen(false)}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCuenta}
                  disabled={cuentaLoading}
                  className="flex-1 py-2.5 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors disabled:opacity-50 font-medium"
                >
                  {cuentaLoading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== Modal 2: Completar perfil (alumnos) ========== */}
      {perfilOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                <UserCheck size={22} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Completa tu perfil
              </h2>
              <p className="text-sm text-[#86868b] mt-1">
                Necesitamos algunos datos adicionales para continuar.
              </p>
            </div>
            {perfilError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4 text-center">
                {perfilError}
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Correo electrónico *</label>
                <input
                  type="email"
                  value={perfilEmail}
                  onChange={(e) => setPerfilEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Dirección *</label>
                <input
                  type="text"
                  value={perfilDireccion}
                  onChange={(e) => setPerfilDireccion(e.target.value)}
                  placeholder="Calle 123 # 45-67"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Departamento *</label>
                <select
                  value={perfilDepartamento}
                  onChange={(e) => setPerfilDepartamento(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Selecciona un departamento</option>
                  {DEPARTAMENTOS_COLOMBIA.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Ciudad *</label>
                <input
                  type="text"
                  value={perfilCiudad}
                  onChange={(e) => setPerfilCiudad(e.target.value)}
                  placeholder="Nombre de tu ciudad"
                  className={inputCls}
                />
              </div>
              <button
                onClick={handleGuardarPerfil}
                disabled={perfilLoading}
                className="w-full py-2.5 bg-[#0071e3] text-white text-sm rounded-lg hover:bg-[#0077ED] transition-colors disabled:opacity-50 font-medium mt-1"
              >
                {perfilLoading ? "Guardando..." : "Guardar información"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DashboardLayout: envuelve todo con AuthProvider.
   AuthProvider hace las llamadas a Supabase UNA SOLA VEZ
   y las 12+ páginas del dashboard leen del contexto sin costo.
───────────────────────────────────────────────────────────── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardInner>{children}</DashboardInner>
    </AuthProvider>
  );
}
