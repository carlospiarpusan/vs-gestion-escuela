"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";
import { LogOut, Sun, Moon, Menu, AlertCircle, KeyRound, Eye, EyeOff, UserCheck, UserCircle, PanelLeftOpen } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { canAccessDashboardPath, getDashboardFallbackPath } from "@/lib/access-control";
import ErrorBoundary from "@/components/dashboard/ErrorBoundary";

const DEPARTAMENTOS_COLOMBIA = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá",
  "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba",
  "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
  "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda",
  "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca",
  "Vaupés", "Vichada", "Bogotá D.C.",
].sort();

const inputCls = "apple-input";
const labelCls = "apple-label";
const modalOverlayCls =
  "fixed inset-0 z-[100] flex items-end sm:items-center justify-center apple-overlay p-0 sm:p-4";
const modalCardCls =
  "apple-panel w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-5 sm:p-6 max-h-[90vh] overflow-y-auto";
const modalErrorCls =
  "mb-4 rounded-2xl border border-red-200/70 bg-red-50/80 px-3 py-2 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400";
const modalSuccessCls =
  "mb-4 rounded-2xl border border-green-200/70 bg-green-50/80 px-3 py-2 text-center text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400";
const visibilityToggleCls =
  "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#86868b] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]";

/* ─────────────────────────────────────────────────────────────
   DashboardInner: consume el AuthContext que provee el padre.
   Todas las páginas hijas también leerán del mismo contexto
   sin costo adicional de red.
───────────────────────────────────────────────────────────── */
function DashboardInner({ children }: { children: React.ReactNode }) {
  // Lee del contexto — sin llamadas extra a Supabase
  const { user, perfil, escuelaNombre, sedeNombre, loading, error, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [darkMode, setDarkMode] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    const storedTheme = window.localStorage.getItem("theme");
    const shouldUseDark = storedTheme === "dark";
    setDarkMode(shouldUseDark);
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode, themeReady]);

  useEffect(() => {
    if (!perfil?.rol) return;
    if (!canAccessDashboardPath(perfil.rol, pathname)) {
      router.replace(getDashboardFallbackPath(perfil.rol));
    }
  }, [pathname, perfil?.rol, router]);

  if (loading) {
    return (
      <div className="apple-shell flex min-h-screen items-center justify-center px-4">
        <div className="apple-panel flex items-center gap-3 px-5 py-4">
          <div className="h-8 w-8 rounded-full border-2 border-[#0071e3] border-t-transparent animate-spin" />
          <div>
            <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Cargando panel</p>
            <p className="text-xs text-[#86868b]">Preparando tu espacio de trabajo.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="apple-shell flex min-h-screen items-center justify-center p-4">
        <div className="apple-panel max-w-md px-6 py-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100/80 dark:bg-red-950/40">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Error de autenticación
          </h2>
          <p className="mb-5 text-sm text-[#86868b]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="apple-button-primary text-sm"
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
    <div className="apple-shell flex min-h-screen transition-colors duration-300">
      <Sidebar rol={perfil?.rol} open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-10rem] top-[-8rem] h-72 w-72 rounded-full bg-[#0071e3]/10 blur-3xl" />
          <div className="absolute bottom-[-9rem] right-[-6rem] h-80 w-80 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-900/20" />
        </div>

        <div className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
          <header className="apple-toolbar mx-auto w-full max-w-[1520px] rounded-[28px] px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="apple-icon-button lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu size={16} />
              </button>
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="apple-icon-button hidden lg:flex"
                  aria-label="Mostrar menú"
                  title="Mostrar menú"
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{nombre}</span>
                  {perfil?.rol && (
                    <span className="apple-badge hidden sm:inline-flex">
                      {perfil.rol.replace("_", " ")}
                    </span>
                  )}
                </div>
                {escuelaNombre && (
                  <span className="mt-1 block truncate text-xs text-[#86868b]">
                    {escuelaNombre}
                    {sedeNombre && sedeNombre !== "Sede 1" && (
                      <span className="text-[#0071e3]"> · {sedeNombre}</span>
                    )}
                  </span>
                )}
              </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={abrirMiCuenta}
                className="apple-icon-button"
                title="Mi cuenta"
                aria-label="Mi cuenta"
              >
                <UserCircle size={16} />
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="apple-icon-button"
                title={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
              >
                {darkMode ? (
                  <Sun size={16} />
                ) : (
                  <Moon size={16} />
                )}
              </button>
              <button
                onClick={logout}
                className="apple-button-ghost text-xs hover:text-red-500"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
            </div>
          </header>
        </div>

        <main className="relative z-10 flex-1 px-3 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5">
          <div className="mx-auto w-full max-w-[1520px]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      {/* ========== Modal 1: Cambio de contraseña obligatorio ========== */}
      {cambioOpen && (
        <div className={modalOverlayCls}>
          <div className={modalCardCls}>
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0071e3]/10">
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
              <p className={modalErrorCls}>
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
                    className={visibilityToggleCls}
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
                    className={visibilityToggleCls}
                  >
                    {showConfirmar ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleCambioPassword}
                disabled={cambioLoading}
                className="apple-button-primary mt-1 w-full text-sm disabled:opacity-50"
              >
                {cambioLoading ? "Guardando..." : "Establecer nueva contraseña"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Modal 3: Mi Cuenta ========== */}
      {cuentaOpen && (
        <div className={modalOverlayCls}>
          <div className={modalCardCls}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0071e3]/10">
                  <UserCircle size={20} className="text-[#0071e3]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Mi cuenta</h2>
                  <p className="text-xs text-[#86868b]">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setCuentaOpen(false)}
                className="apple-icon-button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="apple-divider mb-5" />

            {cuentaError && (
              <p className={modalErrorCls}>
                {cuentaError}
              </p>
            )}
            {cuentaOk && (
              <p className={modalSuccessCls}>
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
                        className={visibilityToggleCls}
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
                            className={visibilityToggleCls}
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
                  className="apple-button-secondary flex-1 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCuenta}
                  disabled={cuentaLoading}
                  className="apple-button-primary flex-1 text-sm disabled:opacity-50"
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
        <div className={modalOverlayCls}>
          <div className={modalCardCls}>
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
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
              <p className={modalErrorCls}>
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
                className="apple-button-primary mt-1 w-full text-sm disabled:opacity-50"
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
