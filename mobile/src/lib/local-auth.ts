import * as SecureStore from "expo-secure-store";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { setActiveSession } from "./session-scope";

const SIGNED_OUT_KEY = "condusoft-mobile-local-sign-out";
let blocked = false;
let logout: Promise<void> | null = null;

export function isLocalSessionBlocked() {
  return blocked;
}

function sessionStorageKey() {
  // Matches the SDK default used by ./supabase (no custom storageKey).
  const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return `sb-${project}-auth-token`;
}

async function eraseStoredSession() {
  const key = sessionStorageKey();
  let failure: unknown;
  for (const suffix of ["", "-code-verifier", "-user"]) {
    try {
      await SecureStore.deleteItemAsync(`${key}${suffix}`);
    } catch (error) {
      failure ??= error;
    }
  }
  if (failure) throw failure;
}

export async function readPersistedOfflineSession(error: unknown): Promise<Session | null> {
  const failure = error as { name?: string; message?: string; status?: number } | null;
  if (failure?.status === 401 || failure?.status === 403) return null;
  if (
    !failure ||
    !(
      /network|fetch|offline|connection/i.test(failure.message ?? "") ||
      failure.name === "AuthRetryableFetchError"
    )
  )
    return null;
  if (blocked || (await SecureStore.getItemAsync(SIGNED_OUT_KEY)) === "true") return null;
  const stored = await SecureStore.getItemAsync(sessionStorageKey());
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Session;
    if (
      typeof value?.user?.id !== "string" ||
      !value.user.id ||
      typeof value.access_token !== "string" ||
      !value.access_token ||
      typeof value.refresh_token !== "string"
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

export async function restoreLocalAuthPolicy() {
  blocked = (await SecureStore.getItemAsync(SIGNED_OUT_KEY)) === "true";
  if (blocked) {
    setActiveSession(null);
    await supabase.auth.stopAutoRefresh();
    await eraseStoredSession();
  }
}

export function signOutLocally(online: boolean) {
  if (logout) return logout;
  blocked = true;
  setActiveSession(null);
  logout = (async () => {
    // Persist intent before touching the SDK: a refresh already in flight must
    // not resurrect this session after a restart, even if revocation fails.
    let failure: unknown;
    try {
      await SecureStore.setItemAsync(SIGNED_OUT_KEY, "true");
    } catch (error) {
      failure = error;
    }
    try {
      await supabase.auth.stopAutoRefresh();
      if (online) {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) throw error;
      }
    } catch (error) {
      failure ??= error;
    } finally {
      await eraseStoredSession();
      // With no stored token this clears SDK state without requiring a network
      // logout. The durable marker also blocks late auth events in the provider.
      try {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) failure ??= error;
      } catch (error) {
        failure ??= error;
      } finally {
        await eraseStoredSession();
      }
    }
    if (failure) throw failure;
  })().finally(() => {
    logout = null;
  });
  return logout;
}

export async function prepareSignIn() {
  if (logout) await logout.catch(() => undefined);
  if (blocked || (await SecureStore.getItemAsync(SIGNED_OUT_KEY)) === "true") {
    await eraseStoredSession();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    await SecureStore.deleteItemAsync(SIGNED_OUT_KEY);
    blocked = false;
  }
  await supabase.auth.startAutoRefresh();
}
