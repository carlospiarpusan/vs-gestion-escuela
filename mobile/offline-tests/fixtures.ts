import type { Session } from "@supabase/supabase-js";
import type { Perfil } from "../src/lib/types";
import {
  activateProfile,
  captureAuthScope,
  captureOfflineScope,
  setActiveSession,
} from "../src/lib/session-scope";

export function session(id: string): Session {
  return {
    access_token: `token-${id}`,
    refresh_token: `refresh-${id}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" },
  };
}

export function profile(id = "a", changes: Partial<Perfil> = {}): Perfil {
  return {
    id,
    escuela_id: "school-a",
    sede_id: "branch-a",
    rol: "admin_escuela",
    activo: true,
    nombre: id,
    email: `${id}@example.test`,
    ...changes,
  };
}

export function login(id = "a", changes: Partial<Perfil> = {}) {
  setActiveSession(session(id));
  activateProfile(captureAuthScope(), profile(id, changes));
  return captureOfflineScope();
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

export function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
