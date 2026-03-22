"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, FileSearch, Pencil, Shield, XCircle } from "lucide-react";

const TIPOS = [
  {
    value: "acceso" as const,
    label: "Acceso",
    description: "Quiero conocer que datos mios tiene la plataforma.",
    icon: <FileSearch size={20} />,
  },
  {
    value: "rectificacion" as const,
    label: "Rectificacion",
    description: "Quiero corregir o actualizar mis datos personales.",
    icon: <Pencil size={20} />,
  },
  {
    value: "cancelacion" as const,
    label: "Cancelacion",
    description: "Quiero que eliminen mis datos personales.",
    icon: <XCircle size={20} />,
  },
  {
    value: "oposicion" as const,
    label: "Oposicion",
    description: "Quiero que dejen de usar mis datos para cierto fin.",
    icon: <Shield size={20} />,
  },
];

type TipoArco = (typeof TIPOS)[number]["value"];

export default function ArcoForm() {
  const [tipo, setTipo] = useState<TipoArco | "">("");
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [escuelaNombre, setEscuelaNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!tipo || !nombre.trim() || !dni.trim() || !email.trim() || !descripcion.trim()) {
      setError("Todos los campos marcados con * son obligatorios.");
      return;
    }

    if (descripcion.trim().length < 10) {
      setError("La descripcion debe tener al menos 10 caracteres.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/arco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          nombre: nombre.trim(),
          dni: dni.trim(),
          email: email.trim(),
          telefono: telefono.trim() || null,
          descripcion: descripcion.trim(),
          escuela_nombre: escuelaNombre.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Error al enviar la solicitud.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <main className="apple-auth-shell px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="apple-auth-card px-6 py-10 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle size={32} />
            </div>
            <h1 className="text-foreground mt-6 text-2xl font-semibold">Solicitud registrada</h1>
            <p className="apple-copy mt-4 text-sm leading-7 sm:text-base">
              Tu solicitud ha sido recibida correctamente. Segun la Ley 1581 de 2012, tienes derecho
              a recibir una respuesta en un plazo maximo de <strong>15 dias habiles</strong>. Te
              contactaremos al correo <strong>{email}</strong>.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link href="/" className="apple-button-secondary text-sm">
                Volver al inicio
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setTipo("");
                  setNombre("");
                  setDni("");
                  setEmail("");
                  setTelefono("");
                  setEscuelaNombre("");
                  setDescripcion("");
                }}
                className="apple-button-primary text-sm"
              >
                Enviar otra solicitud
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const inputCls = "apple-input";

  return (
    <main className="apple-auth-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link href="/" className="apple-button-secondary text-xs font-medium">
          &larr; Volver al inicio
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="apple-auth-card px-6 py-8 sm:px-8 sm:py-10">
            <span className="apple-badge">Derechos ARCO</span>
            <h1 className="text-foreground mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
              Proteccion de datos personales
            </h1>
            <p className="apple-copy mt-3 text-sm leading-7">
              Conforme a la Ley 1581 de 2012, puedes ejercer tus derechos de Acceso, Rectificacion,
              Cancelacion u Oposicion sobre tus datos personales registrados en nuestra plataforma.
            </p>

            {/* Tipo de solicitud */}
            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold tracking-wider text-[#86868b] uppercase">
                Tipo de solicitud *
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      tipo === t.value
                        ? "border-[#0071e3] bg-[#0071e3]/5 dark:border-[#69a9ff]/50 dark:bg-[#0071e3]/10"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-[#1d1d1f] dark:hover:border-gray-600"
                    }`}
                  >
                    <div
                      className={`mt-0.5 ${
                        tipo === t.value ? "text-[#0071e3] dark:text-[#69a9ff]" : "text-[#86868b]"
                      }`}
                    >
                      {t.icon}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          tipo === t.value
                            ? "text-[#0071e3] dark:text-[#69a9ff]"
                            : "text-foreground"
                        }`}
                      >
                        {t.label}
                      </p>
                      <p className="mt-0.5 text-xs text-[#86868b]">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Datos del solicitante */}
            <div className="mt-6 space-y-4">
              <p className="text-xs font-semibold tracking-wider text-[#86868b] uppercase">
                Datos del solicitante
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="apple-label">Nombre completo *</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={inputCls}
                    placeholder="Tu nombre y apellidos"
                  />
                </div>
                <div>
                  <label className="apple-label">Cedula / Documento *</label>
                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className={inputCls}
                    placeholder="Numero de documento"
                  />
                </div>
                <div>
                  <label className="apple-label">Correo electronico *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="apple-label">Telefono</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className={inputCls}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <label className="apple-label">Escuela de conduccion (si aplica)</label>
                <input
                  type="text"
                  value={escuelaNombre}
                  onChange={(e) => setEscuelaNombre(e.target.value)}
                  className={inputCls}
                  placeholder="Nombre de la escuela donde te registraste"
                />
              </div>

              <div>
                <label className="apple-label">Descripcion de tu solicitud *</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={4}
                  className="apple-textarea"
                  placeholder="Describe en detalle que datos necesitas consultar, corregir, eliminar o para que no deseas que se utilicen."
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Link href="/" className="apple-button-secondary text-sm">
                Cancelar
              </Link>
              <button
                onClick={handleSubmit}
                disabled={saving || !tipo}
                className="apple-button-primary text-sm disabled:opacity-50"
              >
                {saving ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>

          {/* Sidebar informativo */}
          <aside className="apple-panel h-fit px-5 py-6 sm:px-6">
            <p className="apple-kicker">Tus derechos</p>
            <div className="mt-4 space-y-3">
              <article className="apple-panel-muted rounded-[22px] px-4 py-4">
                <h2 className="text-foreground text-sm font-semibold">Ley 1581 de 2012</h2>
                <p className="apple-copy mt-2 text-sm leading-6">
                  Como titular de datos personales tienes derecho a conocer, actualizar, rectificar
                  y solicitar la supresion de tus datos.
                </p>
              </article>
              <article className="apple-panel-muted rounded-[22px] px-4 py-4">
                <h2 className="text-foreground text-sm font-semibold">Plazo de respuesta</h2>
                <p className="apple-copy mt-2 text-sm leading-6">
                  La ley otorga un plazo maximo de 15 dias habiles para atender tu solicitud,
                  prorrogables por 8 dias habiles adicionales.
                </p>
              </article>
              <article className="apple-panel-muted rounded-[22px] px-4 py-4">
                <h2 className="text-foreground text-sm font-semibold">Autoridad competente</h2>
                <p className="apple-copy mt-2 text-sm leading-6">
                  Si no recibes respuesta oportuna puedes acudir ante la Superintendencia de
                  Industria y Comercio (SIC).
                </p>
              </article>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
