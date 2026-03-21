"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthUserSnapshot } from "@/lib/dashboard-auth-state";
import type { Perfil, Rol } from "@/types/database";

export type AccountProfileDraft = {
  nombre: string;
  telefono: string;
  email: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  fechaNacimiento: string;
  nuevaPassword: string;
  confirmarPassword: string;
};

export type StudentProfileDraft = Pick<
  AccountProfileDraft,
  "ciudad" | "departamento" | "direccion" | "fechaNacimiento"
>;

export type AccountProfileLoad = {
  draft: AccountProfileDraft;
  alumnoId: string | null;
};

type AlumnoAccountRow = {
  id: string;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  departamento: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
};

type SaveAccountProfileInput = {
  supabase: SupabaseClient;
  perfil: Perfil;
  user: AuthUserSnapshot;
  draft: AccountProfileDraft;
};

export async function loadAccountProfile(
  supabase: SupabaseClient,
  perfil: Perfil,
  user: AuthUserSnapshot | null
): Promise<AccountProfileLoad> {
  const baseDraft: AccountProfileDraft = {
    nombre: perfil.nombre || "",
    telefono: perfil.telefono || "",
    email: user?.email || perfil.email || "",
    ciudad: "",
    departamento: "",
    direccion: "",
    fechaNacimiento: "",
    nuevaPassword: "",
    confirmarPassword: "",
  };

  if (perfil.rol !== "alumno") {
    return {
      draft: baseDraft,
      alumnoId: null,
    };
  }

  const { data, error } = await supabase
    .from("alumnos")
    .select("id, email, telefono, ciudad, departamento, direccion, fecha_nacimiento")
    .eq("user_id", perfil.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const alumno = (data as AlumnoAccountRow | null) ?? null;

  return {
    alumnoId: alumno?.id ?? null,
    draft: {
      ...baseDraft,
      email: alumno?.email || baseDraft.email,
      telefono: alumno?.telefono || baseDraft.telefono,
      ciudad: alumno?.ciudad || "",
      departamento: alumno?.departamento || "",
      direccion: alumno?.direccion || "",
      fechaNacimiento: alumno?.fecha_nacimiento || "",
    },
  };
}

export async function saveAccountProfile({
  supabase,
  perfil,
  user,
  draft,
}: SaveAccountProfileInput) {
  const normalizedEmail = draft.email.trim().toLowerCase();
  const normalizedPhone = draft.telefono.trim();
  const normalizedName = draft.nombre.trim();

  const { error: perfilError } = await supabase
    .from("perfiles")
    .update({
      nombre: normalizedName,
      telefono: normalizedPhone || null,
      email: normalizedEmail,
    })
    .eq("id", perfil.id);

  if (perfilError) {
    throw new Error(perfilError.message);
  }

  if (perfil.rol === "alumno") {
    const { data: alumnoData, error: alumnoLookupError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("user_id", perfil.id)
      .maybeSingle();

    if (alumnoLookupError) {
      throw new Error(alumnoLookupError.message);
    }

    if (alumnoData?.id) {
      const { error: alumnoError } = await supabase
        .from("alumnos")
        .update({
          email: normalizedEmail || null,
          telefono: normalizedPhone || null,
          ciudad: draft.ciudad.trim() || null,
          departamento: draft.departamento.trim() || null,
          direccion: draft.direccion.trim() || null,
          fecha_nacimiento: draft.fechaNacimiento || null,
        })
        .eq("id", alumnoData.id);

      if (alumnoError) {
        throw new Error(alumnoError.message);
      }
    }
  }

  const metadata: Record<string, unknown> = {
    ...(user.user_metadata || {}),
    nombre: normalizedName,
  };

  const shouldUpdateAuthEmail = normalizedEmail && normalizedEmail !== (user.email || "").toLowerCase();

  if (shouldUpdateAuthEmail) {
    const { error: authEmailError } = await supabase.auth.updateUser({
      email: normalizedEmail,
      data: metadata,
    });

    if (authEmailError) {
      throw new Error(authEmailError.message);
    }
  } else {
    const { error: authMetadataError } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (authMetadataError) {
      throw new Error(authMetadataError.message);
    }
  }
}

export function canManageFullStudentProfile(rol: Rol | null | undefined) {
  return rol === "alumno";
}
