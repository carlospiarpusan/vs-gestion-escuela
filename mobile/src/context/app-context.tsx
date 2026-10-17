import type { PropsWithChildren } from "react";
import { createContext, Fragment, use, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "@/lib/supabase";
import {
  drainPendingMutations,
  getPendingMutationCount,
  loadMyProfile,
  loadMySubscriptionAccess,
  syncCaleBank,
} from "@/lib/data";
import { useEvent } from "@/hooks/use-event";
import { initOfflineDb } from "@/lib/offline";
import {
  captureAuthScope,
  captureOfflineScope,
  isAuthScopeCurrent,
  isOfflineScopeCurrent,
  setActiveSession,
  type AuthScope,
} from "@/lib/session-scope";
import {
  isLocalSessionBlocked,
  readPersistedOfflineSession,
  restoreLocalAuthPolicy,
  signOutLocally,
} from "@/lib/local-auth";
import type { Perfil, SchoolSubscriptionAccess } from "@/lib/types";

type AppContextValue = {
  ready: boolean;
  session: Session | null;
  profile: Perfil | null;
  subscriptionAccess: SchoolSubscriptionAccess | null;
  isOnline: boolean;
  syncing: boolean;
  pendingCount: number;
  refreshProfile: () => Promise<void>;
  syncNow: () => Promise<void>;
  signOut: () => Promise<void>;
  syncCaleNow: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [subscriptionAccess, setSubscriptionAccess] = useState<SchoolSubscriptionAccess | null>(
    null
  );
  const [isOnline, setIsOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const profileRequest = useRef(0);
  const busy = useRef<{ owner: AuthScope; count: number } | null>(null);
  const [reconnectRetries, setReconnectRetries] = useState(0);

  const acceptSession = useEvent((nextSession: Session | null) => {
    const next = isLocalSessionBlocked() ? null : nextSession;
    if (!setActiveSession(next) && next) return;
    profileRequest.current += 1;
    busy.current = null;
    setSession(next);
    setProfile(null);
    setSubscriptionAccess(null);
    setPendingCount(0);
    setSyncing(false);
    setReady(!next);
  });

  const refreshPending = useEvent(async () => {
    let scope;
    try {
      scope = captureOfflineScope();
    } catch {
      return;
    }
    const count = await getPendingMutationCount();
    if (isOfflineScopeCurrent(scope)) setPendingCount(count);
  });

  const refreshProfile = useEvent(async () => {
    let owner;
    try {
      owner = captureAuthScope();
    } catch {
      return;
    }
    const request = ++profileRequest.current;
    const current = () => isAuthScopeCurrent(owner) && request === profileRequest.current;
    try {
      const nextProfile = await loadMyProfile();
      if (!current()) return;
      setProfile(nextProfile);
      setSubscriptionAccess(null);
      setPendingCount(0);
      if (nextProfile) {
        const scope = captureOfflineScope();
        const access = nextProfile.escuela_id
          ? await loadMySubscriptionAccess().catch(() => null)
          : null;
        if (!current() || !isOfflineScopeCurrent(scope)) return;
        setSubscriptionAccess(access);
        await refreshPending();
      }
    } catch {
      if (!current()) return;
      setProfile(null);
      setSubscriptionAccess(null);
      setPendingCount(0);
    }
  });

  const runBusy = useEvent(async (work: () => Promise<unknown>) => {
    const owner = captureAuthScope();
    if (busy.current?.owner !== owner) busy.current = { owner, count: 0 };
    busy.current.count += 1;
    setSyncing(true);
    try {
      await work();
    } finally {
      if (isAuthScopeCurrent(owner) && busy.current?.owner === owner) {
        busy.current.count -= 1;
        setSyncing(busy.current.count > 0);
      }
    }
  });

  const syncNow = useEvent(async () => {
    if (!session || !isOnline) {
      await refreshPending();
      return;
    }
    const owner = captureAuthScope();
    await runBusy(async () => {
      try {
        await drainPendingMutations();
      } finally {
        if (isAuthScopeCurrent(owner)) {
          await refreshProfile();
          await refreshPending();
        }
      }
    });
  });

  const syncCaleNow = useEvent(async () => {
    if (!session || !isOnline) return;
    await runBusy(syncCaleBank);
  });

  const signOut = useEvent(async () => {
    // Invalidate requests and unmount account-owned screens before any await.
    const closing = signOutLocally(isOnline);
    acceptSession(null);
    await closing;
  });

  useEffect(() => {
    let mounted = true;
    let receivedAuthEvent = false;
    let unsubscribeAuth: (() => void) | undefined;
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      if (mounted) setIsOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    });

    void (async () => {
      await initOfflineDb();
      await restoreLocalAuthPolicy();
      if (!mounted) return;
      let authEvent = 0;
      const subscription = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!mounted) return;
        // An expired persisted session may fail refresh offline. Startup below
        // can still recover that exact account; an explicit SIGNED_OUT cannot.
        if (event === "INITIAL_SESSION" && !nextSession) return;
        receivedAuthEvent = true;
        authEvent += 1;
        // No auth calls, promises, or data loads here: Supabase holds its lock.
        acceptSession(nextSession);
      });
      unsubscribeAuth = () => subscription.data.subscription.unsubscribe();
      const beforeRead = authEvent;
      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession();
      const restored = initialSession ?? (await readPersistedOfflineSession(error));
      if (!mounted || beforeRead !== authEvent) return;
      if (error && !restored) throw error;
      acceptSession(restored);
    })().catch(() => {
      if (mounted && !receivedAuthEvent) acceptSession(null);
    });

    return () => {
      mounted = false;
      unsubscribeNetwork();
      unsubscribeAuth?.();
      setActiveSession(null);
    };
  }, [acceptSession]);

  useEffect(() => {
    if (!session) return;
    const owner = captureAuthScope();
    let mounted = true;
    void refreshProfile().finally(() => {
      if (mounted && isAuthScopeCurrent(owner)) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [session, refreshProfile]);

  useEffect(() => {
    setReconnectRetries(0);
    if (!ready || !session || !isOnline) return;
    void syncNow().catch(() => undefined);
  }, [ready, session, isOnline, syncNow]);

  useEffect(() => {
    if (!ready || !session || !isOnline || syncing || pendingCount === 0) return;
    if (reconnectRetries >= 3) return;
    const owner = captureAuthScope();
    const timer = setTimeout(
      () => {
        if (!isAuthScopeCurrent(owner)) return;
        setReconnectRetries((count) => count + 1);
        void syncNow().catch(() => undefined);
      },
      15_000 * (reconnectRetries + 1)
    );
    return () => clearTimeout(timer);
  }, [ready, session, isOnline, syncing, pendingCount, reconnectRetries, syncNow]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      session,
      profile,
      subscriptionAccess,
      isOnline,
      syncing,
      pendingCount,
      refreshProfile,
      syncNow,
      syncCaleNow,
      signOut,
    }),
    [
      ready,
      session,
      profile,
      subscriptionAccess,
      isOnline,
      syncing,
      pendingCount,
      refreshProfile,
      syncNow,
      syncCaleNow,
      signOut,
    ]
  );

  // Screens also hold lists, summaries and form drafts outside this context.
  const viewKey = JSON.stringify([
    session?.user.id,
    profile?.escuela_id,
    profile?.sede_id,
    profile?.rol,
  ]);
  return (
    <AppContext.Provider value={value}>
      <Fragment key={viewKey}>{children}</Fragment>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = use(AppContext);
  if (!context) throw new Error("useApp debe usarse dentro de AppProvider.");
  return context;
}
