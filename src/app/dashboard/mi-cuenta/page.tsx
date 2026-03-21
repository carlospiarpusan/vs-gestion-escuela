"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Mail, Moon, Phone, ShieldCheck, Sun, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import PageScaffold from "@/components/dashboard/PageScaffold";
import SummaryRow from "@/components/dashboard/SummaryRow";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { DEPARTAMENTOS_COLOMBIA } from "@/lib/colombia";
import {
  canManageFullStudentProfile,
  loadAccountProfile,
  saveAccountProfile,
  type AccountProfileDraft,
} from "@/lib/account-service";
import { getStoredThemePreference, toggleThemePreference } from "@/lib/theme-service";
import { getPasswordValidationError } from "@/lib/password-policy";

const inputCls = "apple-input";
const labelCls = "apple-label";

const emptyDraft: AccountProfileDraft = {
  nombre: "",
  telefono: "",
  email: "",
  ciudad: "",
  departamento: "",
  direccion: "",
  fechaNacimiento: "",
  nuevaPassword: "",
  confirmarPassword: "",
};

function AccountSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="apple-panel px-5 py-5 sm:px-7 sm:py-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-[#111214] dark:text-[#f5f5f7]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[#66707a] dark:text-[#aeb6bf]">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function MiCuentaPage() {
  const { user, perfil, escuelaNombre, sedeNombre, refreshProfile } = useAuth();
  const [draft, setDraft] = useState<AccountProfileDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const isAlumno = canManageFullStudentProfile(perfil?.rol);

  useEffect(() => {
    setDarkMode(getStoredThemePreference() === "dark");
  }, []);

  useEffect(() => {
    if (!perfil || !user) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const payload = await loadAccountProfile(supabase, perfil, user);
        if (!cancelled) {
          setDraft(payload.draft);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "No se pudo cargar tu cuenta.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [perfil, user]);

  const summaryItems = useMemo(
    () => [
      {
        id: "nombre",
        label: "Usuario",
        value: perfil?.nombre || "Sin nombre",
        detail: perfil?.rol ? perfil.rol.replace(/_/g, " ") : "Sin rol",
        icon: <UserCircle2 size={18} />,
        tone: "primary" as const,
      },
      {
        id: "contacto",
        label: "Correo",
        value: user?.email || perfil?.email || "Sin correo",
        detail: "Tu correo principal de acceso a la plataforma.",
        icon: <Mail size={18} />,
        tone: "default" as const,
      },
      {
        id: "telefono",
        label: "Teléfono",
        value: draft.telefono || "No registrado",
        detail: "Usado para contacto operativo y seguimiento.",
        icon: <Phone size={18} />,
        tone: "success" as const,
      },
      {
        id: "seguridad",
        label: "Tema actual",
        value: darkMode ? "Oscuro" : "Claro",
        detail: escuelaNombre
          ? `${escuelaNombre}${sedeNombre ? ` · ${sedeNombre}` : ""}`
          : "Preferencias del panel",
        icon: darkMode ? <Moon size={18} /> : <Sun size={18} />,
        tone: "warning" as const,
      },
    ],
    [darkMode, draft.telefono, escuelaNombre, perfil?.email, perfil?.nombre, perfil?.rol, sedeNombre, user?.email]
  );

  const handleProfileSave = async () => {
    if (!perfil || !user) return;

    if (!draft.nombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }

    if (!draft.email.trim()) {
      toast.error("El correo es obligatorio.");
      return;
    }

    setSavingProfile(true);
    try {
      const supabase = createClient();
      const emailChanged = draft.email.trim().toLowerCase() !== (user.email || "").toLowerCase();
      await saveAccountProfile({
        supabase,
        perfil,
        user,
        draft,
      });

      await refreshProfile();
      toast.success(
        emailChanged
          ? "Cuenta actualizada. Si cambiaste el correo, revisa tu bandeja para confirmar el cambio."
          : "Cuenta actualizada correctamente."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la cuenta.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!draft.nuevaPassword) {
      toast.error("Escribe una nueva contraseña.");
      return;
    }

    const passwordError = getPasswordValidationError(draft.nuevaPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (draft.nuevaPassword !== draft.confirmarPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: draft.nuevaPassword,
        data: { debe_cambiar_password: false },
      });

      if (error) {
        throw new Error(error.message);
      }

      setDraft((prev) => ({
        ...prev,
        nuevaPassword: "",
        confirmarPassword: "",
      }));
      toast.success("Contraseña actualizada correctamente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!perfil || !user) return null;

  return (
    <PageScaffold
      eyebrow="Cuenta"
      title="Mi cuenta"
      description="Administra tus datos personales, la seguridad de acceso y las preferencias visuales del panel."
      actions={
        <button
          type="button"
          onClick={handleProfileSave}
          disabled={loading || savingProfile}
          className="apple-button-primary text-sm disabled:opacity-50"
        >
          {savingProfile ? "Guardando..." : "Guardar cambios"}
        </button>
      }
      aside={
        <div className="apple-panel-muted rounded-[22px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8591]">
            Estado de cuenta
          </p>
          <p className="mt-2 text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
            {perfil.activo ? "Cuenta activa" : "Cuenta inactiva"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#66707a] dark:text-[#aeb6bf]">
            {perfil.ultimo_acceso
              ? `Último acceso: ${new Date(perfil.ultimo_acceso).toLocaleString("es-CO")}`
              : "Aún no se registra un último acceso visible."}
          </p>
        </div>
      }
    >
      <SummaryRow items={summaryItems} columns={4} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <AccountSection
            title="Datos personales"
            description="Mantén actualizada la información principal con la que tu equipo y la plataforma te identifican."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Nombre completo</label>
                <input
                  value={draft.nombre}
                  onChange={(event) => setDraft((prev) => ({ ...prev, nombre: event.target.value }))}
                  className={inputCls}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input
                  value={draft.telefono}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, telefono: event.target.value }))
                  }
                  className={inputCls}
                  placeholder="Número principal"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Correo electrónico</label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                  className={inputCls}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
          </AccountSection>

          {isAlumno && (
            <AccountSection
              title="Información del alumno"
              description="Estos datos completan tu ficha personal y facilitan la gestión académica y administrativa."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={draft.fechaNacimiento}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, fechaNacimiento: event.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Departamento</label>
                  <select
                    value={draft.departamento}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, departamento: event.target.value }))
                    }
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
                  <label className={labelCls}>Ciudad</label>
                  <input
                    value={draft.ciudad}
                    onChange={(event) => setDraft((prev) => ({ ...prev, ciudad: event.target.value }))}
                    className={inputCls}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Dirección</label>
                  <input
                    value={draft.direccion}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, direccion: event.target.value }))
                    }
                    className={inputCls}
                    placeholder="Dirección principal"
                  />
                </div>
              </div>
            </AccountSection>
          )}
        </div>

        <div className="space-y-6">
          <AccountSection
            title="Seguridad"
            description="Cambia tu contraseña desde aquí. La actualización se aplica al acceso principal de la cuenta."
          >
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Nueva contraseña</label>
                <input
                  type="password"
                  value={draft.nuevaPassword}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, nuevaPassword: event.target.value }))
                  }
                  className={inputCls}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className={labelCls}>Confirmar contraseña</label>
                <input
                  type="password"
                  value={draft.confirmarPassword}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, confirmarPassword: event.target.value }))
                  }
                  className={inputCls}
                  placeholder="Repite la contraseña"
                />
              </div>
              <button
                type="button"
                onClick={handlePasswordSave}
                disabled={savingPassword}
                className="apple-button-secondary w-full justify-center text-sm disabled:opacity-50"
              >
                <KeyRound size={16} />
                {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </AccountSection>

          <AccountSection
            title="Preferencias"
            description="Controla la apariencia general del panel sin salir de tu espacio de trabajo."
          >
            <div className="rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
                    Apariencia del panel
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#66707a] dark:text-[#aeb6bf]">
                    Cambia entre modo claro y oscuro. La preferencia se guarda para toda la plataforma.
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-[18px] ${
                    darkMode
                      ? "bg-[#0071e3]/12 text-[#69a9ff]"
                      : "bg-[#0f172a]/8 text-[#0f172a] dark:bg-white/[0.08] dark:text-[#f5f5f7]"
                  }`}
                >
                  {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextTheme = toggleThemePreference(darkMode ? "dark" : "light");
                  setDarkMode(nextTheme === "dark");
                }}
                className="apple-button-secondary mt-4 w-full justify-center text-sm"
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                {darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              </button>
            </div>

            <div className="mt-4 rounded-[20px] border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    Revisión de cuenta
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-700 dark:text-emerald-300">
                    Mantener tus datos y tu acceso al día ayuda a que la plataforma funcione con menos errores y más contexto operativo.
                  </p>
                </div>
              </div>
            </div>
          </AccountSection>
        </div>
      </div>
    </PageScaffold>
  );
}
