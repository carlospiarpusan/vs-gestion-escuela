import { createClient, type Session } from "@supabase/supabase-js";
import type { Perfil } from "./types";

export class SessionChangedError extends Error {
  constructor() {
    super("La sesion o su alcance cambio. Vuelve a abrir la vista.");
  }
}

export type AuthScope = Readonly<{ userId: string; token: string; generation: number }>;
export type OfflineScope = Readonly<{
  auth: AuthScope;
  key: string;
  schoolId: string | null;
  branchId: string | null;
  role: string | null;
  revision: number | null;
}>;

let generation = 0;
let revision = 0;
let auth: AuthScope | null = null;
let dataScope: OfflineScope | null = null;

export function setActiveSession(session: Session | null) {
  if (auth?.userId === session?.user.id && auth?.token === session?.access_token) return false;
  generation += 1;
  auth = session
    ? Object.freeze({ userId: session.user.id, token: session.access_token, generation })
    : null;
  dataScope = null;
  return true;
}

export function captureAuthScope(): AuthScope {
  if (!auth) throw new SessionChangedError();
  return auth;
}

export function isAuthScopeCurrent(scope: AuthScope) {
  return auth === scope;
}

export function assertAuthScope(scope: AuthScope) {
  if (!isAuthScopeCurrent(scope)) throw new SessionChangedError();
}

export function profileCacheScope(scope: AuthScope): OfflineScope {
  return Object.freeze({
    auth: scope,
    key: JSON.stringify([scope.userId, "profile"]),
    schoolId: null,
    branchId: null,
    role: null,
    revision: null,
  });
}

export function activateProfile(scope: AuthScope, profile: Perfil | null) {
  assertAuthScope(scope);
  if (!profile || !profile.activo || profile.id !== scope.userId) {
    dataScope = null;
    return null;
  }
  const key = JSON.stringify([scope.userId, profile.escuela_id, profile.sede_id, profile.rol]);
  if (dataScope?.key !== key) {
    dataScope = Object.freeze({
      auth: scope,
      key,
      schoolId: profile.escuela_id,
      branchId: profile.sede_id,
      role: profile.rol,
      revision: ++revision,
    });
  }
  return dataScope;
}

export function captureOfflineScope() {
  if (!dataScope) throw new SessionChangedError();
  assertOfflineScope(dataScope);
  return dataScope;
}

export function assertOfflineScope(scope: OfflineScope) {
  assertAuthScope(scope.auth);
  if (scope.revision !== null && dataScope !== scope) throw new SessionChangedError();
}

export function isOfflineScopeCurrent(scope: OfflineScope) {
  return isAuthScopeCurrent(scope.auth) && (scope.revision === null || dataScope === scope);
}

// Requests never consult the mutable auth client after capturing their owner.
export function clientForScope(scope: AuthScope | OfflineScope) {
  const owner = "auth" in scope ? scope.auth : scope;
  const assertCurrent = () =>
    "auth" in scope ? assertOfflineScope(scope) : assertAuthScope(scope);
  assertCurrent();
  return createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => owner.token,
      global: {
        fetch: async (input, init) => {
          assertCurrent();
          const controller = new AbortController();
          const callerSignal = init?.signal;
          const cancel = () => controller.abort();
          if (callerSignal?.aborted) cancel();
          else callerSignal?.addEventListener("abort", cancel, { once: true });
          let timer: ReturnType<typeof setTimeout> | undefined;
          const deadline = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              // Settle even if a native transport fails to acknowledge abort.
              reject(new TypeError("Network request timed out after 30 seconds."));
              controller.abort();
            }, 30_000);
          });
          try {
            const response = await Promise.race([
              fetch(input, { ...init, signal: controller.signal }),
              deadline,
            ]);
            assertCurrent();
            return response;
          } finally {
            clearTimeout(timer);
            callerSignal?.removeEventListener("abort", cancel);
          }
        },
      },
    }
  );
}
