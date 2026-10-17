import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getServerDbPool } from "./server-db";

export const documentCredentials = z.object({
  cedula: z
    .string()
    .trim()
    .min(5)
    .max(30)
    .regex(/^[^\u0000-\u001f@]+$/),
  password: z.string().min(1).max(256),
});
export const LOGIN_HEADERS = { "Cache-Control": "private, no-store", Pragma: "no-cache" };
export const DOCUMENT_LOGIN_ERROR = "Cédula o contraseña incorrectos.";

type LoginResult = { ok: true; session: Session } | { ok: false; error: string; status: number };
type PasswordAuth = Pick<SupabaseClient["auth"], "signInWithPassword" | "signOut">;

export async function signInWithDocument(
  auth: PasswordAuth,
  { cedula, password }: z.infer<typeof documentCredentials>
): Promise<LoginResult> {
  const deny = (): LoginResult => ({ ok: false, error: DOCUMENT_LOGIN_ERROR, status: 401 });
  const pool = getServerDbPool();
  const profiles = await pool.query<{ id: string; email: string | null; activo: boolean }>(
    "select id,email,activo from public.perfiles where lower(cedula)=lower($1) limit 2",
    [cedula]
  );
  if (profiles.rows.length > 1 || (profiles.rows[0] && !profiles.rows[0].activo)) return deny();
  const profile = profiles.rows[0];
  // A public document number must not unlock email accounts using that same default password.
  if (
    profile?.email &&
    !/@(alumno|instructor|administrativo)\.local$/i.test(profile.email) &&
    password.trim().toLowerCase() === cedula.toLowerCase()
  )
    return deny();
  const candidates = profile?.email
    ? [profile.email]
    : ["alumno", "instructor", "administrativo"].map(
        (role) => `${cedula.toLowerCase()}@${role}.local`
      );
  for (const email of candidates) {
    const { data, error } = await auth.signInWithPassword({ email, password });
    if (error) {
      if (error.status === 429)
        return { ok: false, error: "Demasiados intentos. Intenta más tarde.", status: 429 };
      if (error.status && error.status >= 500)
        return {
          ok: false,
          error: "No se pudo conectar al servicio de acceso. Intenta de nuevo.",
          status: 503,
        };
      continue;
    }
    if (!data.user || !data.session) continue;
    const active = await pool.query<{ id: string }>(
      "select id from public.perfiles where id=$1 and activo=true",
      [data.user.id]
    );
    if (!active.rows[0] || (profile && profile.id !== data.user.id)) {
      await auth.signOut({ scope: "local" });
      return deny();
    }
    return { ok: true, session: data.session };
  }
  return deny();
}
