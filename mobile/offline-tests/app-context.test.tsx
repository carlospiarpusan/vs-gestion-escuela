import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLayoutEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Perfil } from "../src/lib/types";
import { deferred, profile, session } from "./fixtures";
import { AppProvider, useApp } from "../src/context/app-context";
import {
  activateProfile,
  captureAuthScope,
  isAuthScopeCurrent,
  setActiveSession,
} from "../src/lib/session-scope";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  profile: vi.fn(),
  subscription: vi.fn(),
  pending: vi.fn(),
  drain: vi.fn(),
  cale: vi.fn(),
  restore: vi.fn(),
  persisted: vi.fn(),
  blocked: vi.fn(),
  signOut: vi.fn(),
  network: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));
vi.mock("../src/lib/data", () => ({
  loadMyProfile: mocks.profile,
  loadMySubscriptionAccess: mocks.subscription,
  getPendingMutationCount: mocks.pending,
  drainPendingMutations: mocks.drain,
  syncCaleBank: mocks.cale,
}));
vi.mock("../src/lib/local-auth", () => ({
  restoreLocalAuthPolicy: mocks.restore,
  isLocalSessionBlocked: mocks.blocked,
  signOutLocally: mocks.signOut,
  readPersistedOfflineSession: mocks.persisted,
}));
vi.mock("@react-native-community/netinfo", () => ({
  default: { addEventListener: mocks.network },
}));

let authCallback: (event: string, next: Session | null) => unknown;
let networkCallback: (state: { isConnected: boolean; isInternetReachable: boolean }) => void;
let app: ReturnType<typeof useApp>;
let setDraft: (value: string) => void;
let nextProfile: Perfil;

function Probe() {
  const value = useApp();
  const [draft, changeDraft] = useState("empty");
  useLayoutEffect(() => {
    app = value;
    setDraft = changeDraft;
  }, [value]);
  return (
    <div data-testid="state">
      {JSON.stringify({
        ready: value.ready,
        session: value.session?.user.id,
        profile: value.profile?.id,
        role: value.profile?.rol,
        access: value.subscriptionAccess?.school_id,
        pending: value.pendingCount,
        draft,
      })}
    </div>
  );
}

beforeEach(() => {
  setActiveSession(null);
  nextProfile = profile();
  mocks.getSession.mockResolvedValue({ data: { session: session("a") }, error: null });
  mocks.onAuthStateChange.mockImplementation((cb) => {
    authCallback = cb;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
  mocks.profile.mockImplementation(async () => {
    activateProfile(captureAuthScope(), nextProfile);
    return nextProfile;
  });
  mocks.subscription.mockResolvedValue({ school_id: "school-a" });
  mocks.pending.mockResolvedValue(4);
  mocks.restore.mockResolvedValue(undefined);
  mocks.persisted.mockResolvedValue(null);
  mocks.blocked.mockReturnValue(false);
  mocks.network.mockImplementation((cb) => {
    networkCallback = cb;
    cb({ isConnected: false, isInternetReachable: false });
    return vi.fn();
  });
  mocks.signOut.mockImplementation(async () => {
    setActiveSession(null);
    mocks.blocked.mockReturnValue(true);
  });
  mocks.drain.mockResolvedValue(0);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("bounded reconnect retries", () => {
  async function startOnline() {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(app.ready).toBe(true));
    vi.useFakeTimers();
    await act(async () => {
      networkCallback({ isConnected: true, isInternetReachable: true });
    });
    expect(mocks.drain).toHaveBeenCalledTimes(1);
  }

  it("retries pending operations only three times after the initial attempt", async () => {
    mocks.drain.mockRejectedValue(new Error("Network timed out"));
    await startOnline();
    for (const delay of [15_000, 30_000, 45_000]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay);
      });
    }
    expect(mocks.drain).toHaveBeenCalledTimes(4);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000);
    });
    expect(mocks.drain).toHaveBeenCalledTimes(4);
    expect(app.pendingCount).toBe(4);
  });

  it("stops retrying as soon as pending operations are synchronized", async () => {
    mocks.drain.mockRejectedValueOnce(new Error("Network timed out"));
    mocks.drain.mockImplementationOnce(async () => {
      mocks.pending.mockResolvedValue(0);
      return 1;
    });
    await startOnline();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(mocks.drain).toHaveBeenCalledTimes(2);
    expect(app.pendingCount).toBe(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000);
    });
    expect(mocks.drain).toHaveBeenCalledTimes(2);
  });

  it.each(["offline", "logout"])("cancels scheduled retries on %s", async (transition) => {
    mocks.drain.mockRejectedValue(new Error("Network timed out"));
    await startOnline();
    await act(async () => {
      if (transition === "logout") await app.signOut();
      else networkCallback({ isConnected: false, isInternetReachable: false });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000);
    });
    expect(mocks.drain).toHaveBeenCalledTimes(1);
  });

  it("does not retry while a previous synchronization is still running", async () => {
    const pending = deferred<number>();
    mocks.drain.mockReturnValueOnce(pending.promise);
    await startOnline();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000);
    });
    expect(mocks.drain).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(mocks.drain).toHaveBeenCalledTimes(2);
  });
});

describe("Android app session transitions", () => {
  it("restores only a persisted account when an expired token cannot refresh offline", async () => {
    mocks.getSession.mockImplementation(async () => {
      authCallback("INITIAL_SESSION", null);
      return { data: { session: null }, error: new Error("Network unavailable") };
    });
    mocks.persisted.mockResolvedValue(session("a"));
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(app.ready).toBe(true));
    expect(app.session?.user.id).toBe("a");
    expect(app.profile?.id).toBe("a");
  });

  it("does no async/auth/data work within onAuthStateChange's lock", async () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(app.ready).toBe(true));
    const calls = mocks.profile.mock.calls.length;
    const authCalls = mocks.getSession.mock.calls.length;
    nextProfile = profile("b");
    await act(async () => {
      expect(authCallback("SIGNED_IN", session("b"))).toBeUndefined();
      expect(mocks.profile).toHaveBeenCalledTimes(calls);
      expect(mocks.getSession).toHaveBeenCalledTimes(authCalls);
    });
    await waitFor(() => expect(app.profile?.id).toBe("b"));
  });

  it("does not let a late initial getSession overwrite a newer auth event", async () => {
    const initial = deferred<{ data: { session: Session }; error: null }>();
    mocks.getSession.mockReturnValue(initial.promise);
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(mocks.onAuthStateChange).toHaveBeenCalled());
    nextProfile = profile("b");
    await act(async () => {
      authCallback("SIGNED_IN", session("b"));
    });
    await waitFor(() => expect(app.profile?.id).toBe("b"));
    await act(async () => {
      initial.resolve({ data: { session: session("a") }, error: null });
    });
    expect(app.session?.user.id).toBe("b");
  });

  it("does not publish a late previous user's profile", async () => {
    const first = deferred<Perfil>();
    mocks.profile.mockImplementationOnce(() => first.promise);
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(mocks.profile).toHaveBeenCalledTimes(1));
    nextProfile = profile("b");
    await act(async () => {
      authCallback("SIGNED_IN", session("b"));
    });
    await waitFor(() => expect(app.profile?.id).toBe("b"));
    await act(async () => {
      first.resolve(profile());
    });
    expect(app.profile?.id).toBe("b");
    expect(app.ready).toBe(true);
  });

  it("does not clear a newer account when the initial session read rejects late", async () => {
    const initial = deferred<never>();
    mocks.getSession.mockReturnValue(initial.promise);
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(mocks.onAuthStateChange).toHaveBeenCalled());
    nextProfile = profile("b");
    await act(async () => {
      authCallback("SIGNED_IN", session("b"));
    });
    await waitFor(() => expect(app.profile?.id).toBe("b"));
    await act(async () => {
      initial.reject(new Error("Late storage error"));
    });
    expect(app.session?.user.id).toBe("b");
    expect(app.profile?.id).toBe("b");
  });

  it("clears profile, subscription, pending count and screen state immediately on sign-out", async () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(app.pendingCount).toBe(4));
    act(() => {
      setDraft("private draft");
    });
    await act(async () => {
      await app.signOut();
    });
    expect(app.session).toBeNull();
    expect(app.profile).toBeNull();
    expect(app.subscriptionAccess).toBeNull();
    expect(app.pendingCount).toBe(0);
    expect(screen.getByTestId("state").textContent).not.toContain("private draft");
    await act(async () => {
      authCallback("TOKEN_REFRESHED", session("a"));
    });
    expect(app.session).toBeNull();
  });

  it("propagates a logout error to cuenta while isolating the closed account", async () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(app.profile?.id).toBe("a"));
    mocks.signOut.mockImplementationOnce(() => {
      setActiveSession(null);
      return Promise.reject(new Error("Supabase logout failed"));
    });
    await act(async () => {
      await expect(app.signOut()).rejects.toThrow("Supabase logout failed");
    });
    expect(app.session).toBeNull();
    expect(app.profile).toBeNull();
    expect(mocks.signOut).toHaveBeenCalledWith(false);
  });

  it("remounts account-owned screen state when school/role changes for the same user", async () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(app.pendingCount).toBe(4));
    act(() => {
      setDraft("old school private draft");
    });
    nextProfile = profile("a", { escuela_id: "school-b", rol: "alumno" });
    await act(async () => {
      await app.refreshProfile();
    });
    expect(app.profile?.rol).toBe("alumno");
    expect(screen.getByTestId("state").textContent).not.toContain("old school private draft");
  });

  it("ignores a subscription completed after logout", async () => {
    const access = deferred<{ school_id: string }>();
    mocks.subscription.mockReturnValueOnce(access.promise);
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => expect(mocks.subscription).toHaveBeenCalledTimes(1));
    const owner = captureAuthScope();
    await act(async () => {
      await app.signOut();
    });
    await act(async () => {
      access.resolve({ school_id: "school-a" });
    });
    expect(isAuthScopeCurrent(owner)).toBe(false);
    expect(app.subscriptionAccess).toBeNull();
    expect(app.pendingCount).toBe(0);
  });
});
