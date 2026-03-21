"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  MoreHorizontal,
  UserCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardUserHub from "@/components/dashboard/DashboardUserHub";

import ErrorBoundary from "@/components/dashboard/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";
import { createClient } from "@/lib/supabase";
import { canAccessDashboardPath, getDashboardFallbackPath } from "@/lib/access-control";
import { getDashboardPageMeta, getDashboardPrimaryMobileModules } from "@/lib/dashboard-nav";
import { renderDashboardIcon } from "@/components/dashboard/dashboard-icons";
import { getPasswordValidationError } from "@/lib/password-policy";
import { DEPARTAMENTOS_COLOMBIA } from "@/lib/colombia";
import {
  THEME_CHANGE_EVENT,
  applyThemePreference,
  getStoredThemePreference,
  normalizeThemePreference,
  type ThemePreference,
} from "@/lib/theme-service";

const inputCls = "apple-input";
const labelCls = "apple-label";
const modalOverlayCls =
  "fixed inset-0 z-[100] flex items-end justify-center apple-overlay p-0 sm:items-center sm:p-4";
const modalCardCls =
  "apple-panel w-full max-w-xl rounded-t-[2rem] p-5 sm:max-h-[90vh] sm:rounded-[2rem] sm:p-6 max-h-[92vh] overflow-y-auto";
const modalErrorCls =
  "mb-4 rounded-2xl border border-red-200/70 bg-red-50/80 px-3 py-2 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400";
const visibilityToggleCls =
  "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--gray-500)] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]";

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobileVariant();
  const { user, perfil, loading, error, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [darkMode, setDarkMode] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [connectionBanner, setConnectionBanner] = useState<"online" | "offline" | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadOfflineRef = useRef(false);

  const [cambioOpen, setCambioOpen] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [cambioError, setCambioError] = useState("");
  const [cambioLoading, setCambioLoading] = useState(false);

  const [perfilOpen, setPerfilOpen] = useState(false);
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [perfilEmail, setPerfilEmail] = useState("");
  const [perfilDireccion, setPerfilDireccion] = useState("");
  const [perfilCiudad, setPerfilCiudad] = useState("");
  const [perfilDepartamento, setPerfilDepartamento] = useState("");
  const [perfilError, setPerfilError] = useState("");
  const [perfilLoading, setPerfilLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.user_metadata?.debe_cambiar_password === true) {
      setCambioOpen(true);
    } else if (user.user_metadata?.debe_completar_perfil === true && perfil?.rol === "alumno") {
      void abrirCompletarPerfil();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, perfil?.rol]);

  useEffect(() => {
    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const handleOffline = () => {
      hadOfflineRef.current = true;
      clearReconnectTimer();
      setConnectionBanner("offline");
    };

    const handleOnline = () => {
      if (!hadOfflineRef.current) return;

      clearReconnectTimer();
      setConnectionBanner("online");
      reconnectTimerRef.current = setTimeout(() => {
        setConnectionBanner(null);
        hadOfflineRef.current = false;
      }, 3000);
    };

    if (!window.navigator.onLine) {
      handleOffline();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      clearReconnectTimer();
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    const initialTheme = getStoredThemePreference();
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setDarkMode(initialTheme === "dark");
    setThemeReady(true);

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<ThemePreference>;
      setDarkMode(normalizeThemePreference(customEvent.detail) === "dark");
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    applyThemePreference(darkMode ? "dark" : "light");
  }, [darkMode, themeReady]);

  useEffect(() => {
    if (!perfil?.rol) return;
    if (!canAccessDashboardPath(perfil.rol, pathname)) {
      router.replace(getDashboardFallbackPath(perfil.rol));
    }
  }, [pathname, perfil?.rol, router]);

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

    const passwordError = getPasswordValidationError(nuevaPassword);
    if (passwordError) {
      setCambioError(passwordError);
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
      void abrirCompletarPerfil();
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

    if (!alumnoId) {
      setPerfilError("No se encontró el perfil del alumno.");
      setPerfilLoading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("alumnos")
      .update({
        email: perfilEmail.trim().toLowerCase(),
        direccion: perfilDireccion.trim() || null,
        ciudad: perfilCiudad.trim() || null,
        departamento: perfilDepartamento || null,
      })
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

  if (loading) {
    return (
      <div className="apple-shell flex min-h-screen items-center justify-center px-4">
        <div className="apple-panel flex items-center gap-3 px-5 py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--blue-apple)] border-t-transparent" />
          <div>
            <p className="text-foreground text-sm font-semibold">Cargando panel</p>
            <p className="apple-copy text-xs">Preparando tu espacio de trabajo.</p>
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
          <h2 className="text-foreground mb-2 text-lg font-semibold">Error de autenticación</h2>
          <p className="apple-copy mb-5 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="apple-button-primary text-sm">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const nombre = perfil?.nombre || user.user_metadata?.nombre || "Usuario";
  const currentPageMeta = getDashboardPageMeta(pathname);
  const mobilePrimaryNav = getDashboardPrimaryMobileModules(perfil?.rol);

  return (
    <div
      className={`apple-shell flex min-h-screen transition-colors duration-300 ${
        isMobile ? "dashboard-mobile-shell overflow-visible" : "lg:h-dvh lg:overflow-hidden"
      }`}
    >
      <Sidebar
        rol={perfil?.rol}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        scopeControl={undefined}
        footer={() => (
          <DashboardUserHub
            name={nombre}
            darkMode={darkMode}
            onToggleTheme={() => setDarkMode((prev) => !prev)}
            onLogout={logout}
          />
        )}
      />

      <div
        className={`dashboard-scroll-shell relative flex min-w-0 flex-1 flex-col overflow-x-hidden ${
          isMobile
            ? "h-[100dvh] min-h-[100dvh] overflow-y-auto"
            : "min-h-screen lg:h-dvh lg:overflow-y-auto"
        } ${isMobile ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]" : ""}`}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-8rem] left-[-10rem] h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--blue-apple)_12%,transparent)] blur-3xl" />
          <div className="absolute right-[-6rem] bottom-[-9rem] h-80 w-80 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-900/20" />
        </div>

        {connectionBanner && (
          <div className={`relative z-20 ${isMobile ? "px-3 pt-3" : "px-3 pt-4 sm:px-6 sm:pt-5"}`}>
            <div
              className={`mx-auto flex w-full max-w-[1520px] items-center gap-3 border px-4 py-3 text-sm shadow-sm ${
                isMobile ? "rounded-[20px]" : "rounded-[24px]"
              } ${
                connectionBanner === "offline"
                  ? "border-amber-200 bg-amber-50/90 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                  : "border-emerald-200 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              }`}
            >
              {connectionBanner === "offline" ? <WifiOff size={16} /> : <Wifi size={16} />}
              <p>
                {connectionBanner === "offline"
                  ? "Sin conexión. La información puede quedar desactualizada hasta que vuelva la red."
                  : "Conexión restablecida. Ya puedes seguir trabajando con normalidad."}
              </p>
            </div>
          </div>
        )}

        <main
          className={`relative z-10 flex-1 ${
            isMobile ? "px-3 pt-4" : "px-3 pt-5 pb-6 sm:px-6 sm:pb-8"
          }`}
        >
          <div className="mx-auto w-full max-w-[1520px]">
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          </div>
        </main>

        {isMobile && (
          <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <nav className="apple-toolbar mx-auto flex max-w-[560px] items-center justify-between rounded-[26px] px-3 py-2 shadow-[0_22px_44px_rgba(15,23,42,0.18)]">
              {mobilePrimaryNav.map((item) => {
                const active = currentPageMeta.module?.id === item.id;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-semibold transition-colors ${
                      active
                        ? "bg-[linear-gradient(135deg,var(--brand-600),var(--brand-500))] text-white shadow-[0_12px_22px_rgba(37,99,235,0.24)]"
                        : "text-[var(--gray-500)] dark:text-[var(--gray-600)]"
                    }`}
                  >
                    {renderDashboardIcon(item.icon, 18)}
                    <span className="truncate">{item.shortLabel}</span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={`ml-2 flex w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-semibold transition-colors ${
                  sidebarOpen
                    ? "bg-[linear-gradient(135deg,var(--brand-600),var(--brand-500))] text-white"
                    : "text-[var(--gray-500)] dark:text-[var(--gray-600)]"
                }`}
              >
                <MoreHorizontal size={18} />
                <span>Más</span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {cambioOpen && (
        <div className={modalOverlayCls}>
          <div className={modalCardCls}>
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--blue-apple)_10%,transparent)]">
                <KeyRound size={22} className="text-[var(--blue-apple)]" />
              </div>
              <h2 className="text-foreground text-lg font-semibold">Cambia tu contraseña</h2>
              <p className="apple-copy mt-1 text-sm">
                Por seguridad debes establecer una nueva contraseña antes de continuar.
              </p>
            </div>
            {cambioError && <p className={modalErrorCls}>{cambioError}</p>}
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showNueva ? "text" : "password"}
                    value={nuevaPassword}
                    onChange={(event) => setNuevaPassword(event.target.value)}
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
                    onChange={(event) => setConfirmarPassword(event.target.value)}
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

      {perfilOpen && (
        <div className={modalOverlayCls}>
          <div className={modalCardCls}>
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <UserCheck size={22} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-foreground text-lg font-semibold">Completa tu perfil</h2>
              <p className="apple-copy mt-1 text-sm">
                Necesitamos algunos datos adicionales para continuar.
              </p>
            </div>
            {perfilError && <p className={modalErrorCls}>{perfilError}</p>}
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Correo electrónico *</label>
                <input
                  type="email"
                  value={perfilEmail}
                  onChange={(event) => setPerfilEmail(event.target.value)}
                  placeholder="tu@email.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Dirección *</label>
                <input
                  type="text"
                  value={perfilDireccion}
                  onChange={(event) => setPerfilDireccion(event.target.value)}
                  placeholder="Calle 123 # 45-67"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Departamento *</label>
                <select
                  value={perfilDepartamento}
                  onChange={(event) => setPerfilDepartamento(event.target.value)}
                  className="apple-select"
                >
                  <option value="">Selecciona un departamento</option>
                  {DEPARTAMENTOS_COLOMBIA.map((departamento) => (
                    <option key={departamento} value={departamento}>
                      {departamento}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Ciudad *</label>
                <input
                  type="text"
                  value={perfilCiudad}
                  onChange={(event) => setPerfilCiudad(event.target.value)}
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
