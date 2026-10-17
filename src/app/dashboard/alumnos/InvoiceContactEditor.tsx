"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  BILLING_DEPARTMENTS,
  BILLING_RESPONSIBILITIES,
  COLOMBIA_MUNICIPALITIES,
  studentBillingContactSchema,
} from "@/lib/student-billing-contact";
import type { z } from "zod";
import { studentBillingFormDefaults } from "@/lib/student-billing-defaults";
import {
  getStudentInvoiceIssues,
  INVOICE_FIELD_LABELS,
  type InvoiceContactSnapshot,
} from "@/lib/vs-billing/student-invoice-data";

const control =
  "w-full min-w-0 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm";
type Contact = z.infer<typeof studentBillingContactSchema>;
export default function InvoiceContactEditor({
  contact,
  disabled,
  onSave,
  onSaved,
  onBusy,
  onReload,
}: {
  contact: InvoiceContactSnapshot;
  disabled: boolean;
  onSave: (value: Contact) => Promise<InvoiceContactSnapshot>;
  onSaved: (value: InvoiceContactSnapshot) => void;
  onBusy: (busy: boolean) => void;
  onReload: () => Promise<void>;
}) {
  const [initialContact] = useState(() => studentBillingFormDefaults(contact));
  const profile = initialContact.datos_facturacion;
  const [email, setEmail] = useState(
    contact.email?.endsWith(".local") ? "" : (contact.email ?? "")
  );
  const [phone, setPhone] = useState(contact.telefono ?? "");
  const [address, setAddress] = useState(contact.direccion ?? "");
  const [department, setDepartment] = useState(initialContact.departamento);
  const [city, setCity] = useState(profile.cityCode);
  const [country, setCountry] = useState(profile.country);
  const [personType, setPersonType] = useState(profile.personType);
  const [regime, setRegime] = useState(profile.taxRegime);
  const [responsibility, setResponsibility] = useState(profile.responsibilities);
  const [taxScheme, setTaxScheme] = useState(profile.taxScheme);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const lock = useRef(false);
  const municipalities = useMemo(
    () => Object.entries(COLOMBIA_MUNICIPALITIES).filter(([, pair]) => pair[1] === department),
    [department]
  );
  async function save() {
    if (lock.current || disabled) return;
    const municipality = COLOMBIA_MUNICIPALITIES[city];
    const value = {
      email,
      telefono: phone,
      direccion: address,
      departamento: department,
      ciudad: municipality?.[0] ?? "",
      datos_facturacion: {
        country,
        cityCode: city,
        personType,
        responsibilities: responsibility,
        taxRegime: regime,
        taxScheme,
      },
    };
    const parsed = studentBillingContactSchema.safeParse(value);
    if (!parsed.success) {
      setError(
        "Completa los campos y verifica que municipio, departamento y perfil fiscal sean coherentes."
      );
      setValidationErrors(
        getStudentInvoiceIssues({ ...contact, ...value }).map(
          (issue) => `${INVOICE_FIELD_LABELS[issue.field] ?? issue.field}: ${issue.message}`
        )
      );
      return;
    }
    lock.current = true;
    setSaving(true);
    onBusy(true);
    setError("");
    setValidationErrors([]);
    try {
      onSaved(await onSave(parsed.data));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudieron guardar los datos.");
    } finally {
      lock.current = false;
      setSaving(false);
      onBusy(false);
    }
  }
  async function reload() {
    if (lock.current || disabled) return;
    lock.current = true;
    setReloading(true);
    onBusy(true);
    setError("");
    try {
      await onReload();
    } catch {
      setError("No se pudieron recargar los datos.");
    } finally {
      lock.current = false;
      setReloading(false);
      onBusy(false);
    }
  }
  return (
    <section
      className="space-y-4 border-y border-[var(--surface-border)] py-4"
      aria-label="Datos del alumno para facturar"
    >
      <h4 className="text-sm font-semibold">Datos del alumno</h4>
      <fieldset
        disabled={disabled || saving || reloading}
        className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <label className="space-y-1 text-sm">
          Correo electronico del alumno
          <input
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={control}
          />
        </label>
        <label className="space-y-1 text-sm">
          Telefono
          <input
            type="tel"
            autoComplete="tel"
            maxLength={30}
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={control}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          Direccion
          <input
            autoComplete="street-address"
            maxLength={200}
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={control}
          />
        </label>
        <label className="space-y-1 text-sm">
          Pais
          <select
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={control}
          >
            <option value="">Seleccionar pais</option>
            <option value="CO">Colombia</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Departamento
          <select
            required
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setCity("");
            }}
            className={control}
          >
            <option value="">Seleccionar departamento</option>
            {BILLING_DEPARTMENTS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Municipio
          <select
            required
            disabled={!department || disabled || saving || reloading}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={control}
          >
            <option value="">Seleccionar municipio</option>
            {municipalities.map(([code, pair]) => (
              <option key={code} value={code}>
                {pair[0]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Tipo de persona
          <select
            required
            value={personType}
            onChange={(e) => setPersonType(e.target.value)}
            className={control}
          >
            <option value="">Seleccionar tipo</option>
            <option value="2">Persona natural</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Regimen fiscal
          <select
            required
            value={regime}
            onChange={(e) => {
              setRegime(e.target.value);
              if (e.target.value === "simple") setResponsibility("O-47");
              else if (responsibility === "O-47") setResponsibility("");
            }}
            className={control}
          >
            <option value="">Seleccionar regimen</option>
            <option value="ordinario">Regimen ordinario</option>
            <option value="especial">Regimen tributario especial</option>
            <option value="simple">Regimen SIMPLE</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Responsabilidad fiscal
          <select
            required
            value={responsibility}
            onChange={(e) => {
              setResponsibility(e.target.value);
              if (e.target.value === "O-47") setRegime("simple");
              else if (regime === "simple") setRegime("");
            }}
            className={control}
          >
            <option value="">Seleccionar responsabilidad</option>
            {BILLING_RESPONSIBILITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Tratamiento tributario
          <select
            required
            value={taxScheme}
            onChange={(e) => setTaxScheme(e.target.value)}
            className={control}
          >
            <option value="">Seleccionar tratamiento</option>
            <option value="ZZ">No aplica</option>
          </select>
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {validationErrors.length > 0 && (
        <ul className="list-inside list-disc text-sm text-red-600">
          {validationErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || saving || reloading}
          onClick={() => void save()}
          className="apple-button-primary"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Guardando datos..." : "Guardar datos"}
        </button>
        <button
          type="button"
          disabled={disabled || saving || reloading}
          onClick={() => void reload()}
          className="apple-button-secondary"
        >
          {reloading ? "Recargando datos..." : "Recargar datos"}
        </button>
      </div>
    </section>
  );
}
