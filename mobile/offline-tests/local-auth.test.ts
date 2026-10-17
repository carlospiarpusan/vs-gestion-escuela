import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as SecureStore from "expo-secure-store";
import { secureStorage } from "./setup";
import { deferred, json, login, session } from "./fixtures";
import { supabase } from "../src/lib/supabase";
import { captureAuthScope } from "../src/lib/session-scope";
import {
  isLocalSessionBlocked,
  prepareSignIn,
  readPersistedOfflineSession,
  restoreLocalAuthPolicy,
  signOutLocally,
} from "../src/lib/local-auth";

const storageKey = "sb-test-auth-token";
const marker = "condusoft-mobile-local-sign-out";
const network = vi.fn<typeof fetch>();

beforeEach(async () => {
  await supabase.auth.initialize();
  await supabase.auth.stopAutoRefresh();
  secureStorage.clear();
  await restoreLocalAuthPolicy();
  network.mockReset();
  network.mockImplementation(() => {
    throw new Error("Unexpected network request");
  });
  vi.stubGlobal("fetch", network);
  secureStorage.set(storageKey, JSON.stringify(session("a")));
  secureStorage.set(`${storageKey}-user`, "private-user");
  secureStorage.set(`${storageKey}-code-verifier`, "verifier");
  login();
});

afterEach(async () => {
  await supabase.auth.stopAutoRefresh();
  vi.restoreAllMocks();
});

describe("durable local sign-out with the installed Supabase SDK", () => {
  it("recovers a persisted identity only for connectivity errors, never after explicit logout", async () => {
    expect(await readPersistedOfflineSession(new TypeError("Network request failed"))).toEqual(
      session("a")
    );
    expect(await readPersistedOfflineSession({ status: 401, message: "Invalid token" })).toBeNull();
    await signOutLocally(false);
    secureStorage.set(storageKey, JSON.stringify(session("a")));
    expect(await readPersistedOfflineSession(new TypeError("Network request failed"))).toBeNull();
  });

  it("attempts credential deletion even if writing the logout marker fails", async () => {
    vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error("Marker write failed"));
    await expect(signOutLocally(false)).rejects.toThrow("Marker write failed");
    expect(secureStorage.has(storageKey)).toBe(false);
    expect(isLocalSessionBlocked()).toBe(true);
  });

  it("closes offline without a network request, deleting the persisted SDK credentials", async () => {
    await signOutLocally(false);
    expect(() => captureAuthScope()).toThrow(/sesion/);
    expect(isLocalSessionBlocked()).toBe(true);
    expect(secureStorage.get(marker)).toBe("true");
    expect(secureStorage.has(storageKey)).toBe(false);
    expect(secureStorage.has(`${storageKey}-user`)).toBe(false);
    expect(secureStorage.has(`${storageKey}-code-verifier`)).toBe(false);
    expect((await supabase.auth.getSession()).data.session).toBeNull();
    expect(network).not.toHaveBeenCalled();
  });

  it("surfaces a Supabase signOut error while still erasing local credentials", async () => {
    network.mockResolvedValue(json({ msg: "Server unavailable" }, 503));
    await expect(signOutLocally(true)).rejects.toMatchObject({ status: 503 });
    expect(secureStorage.has(storageKey)).toBe(false);
    expect(isLocalSessionBlocked()).toBe(true);
    expect((await supabase.auth.getSession()).data.session).toBeNull();
    expect(network).toHaveBeenCalledTimes(1);
    expect(String(network.mock.calls[0][0])).toContain("/logout?scope=local");
  });

  it("blocks late refresh persistence on the next startup, without adopting any account", async () => {
    await signOutLocally(false);
    secureStorage.set(storageKey, JSON.stringify(session("a")));
    await restoreLocalAuthPolicy();
    expect(secureStorage.has(storageKey)).toBe(false);
    expect(isLocalSessionBlocked()).toBe(true);
    expect(network).not.toHaveBeenCalled();
    await prepareSignIn();
    expect(isLocalSessionBlocked()).toBe(false);
    expect(secureStorage.has(marker)).toBe(false);
    expect((await supabase.auth.getSession()).data.session).toBeNull();
  });

  it("invalidates immediately and serializes an explicit new login behind logout", async () => {
    const response = deferred<Response>();
    network.mockReturnValue(response.promise);
    const closing = signOutLocally(true);
    expect(() => captureAuthScope()).toThrow(/sesion/);
    const preparing = prepareSignIn();
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1));
    expect(isLocalSessionBlocked()).toBe(true);
    response.resolve(new Response(null, { status: 204 }));
    await closing;
    await preparing;
    expect(isLocalSessionBlocked()).toBe(false);
    expect(secureStorage.has(storageKey)).toBe(false);
  });

  it("surfaces secure storage failures and retains the durable logout marker", async () => {
    vi.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(
      new Error("SecureStore unavailable")
    );
    await expect(signOutLocally(false)).rejects.toThrow("SecureStore unavailable");
    expect(secureStorage.get(marker)).toBe("true");
    expect(isLocalSessionBlocked()).toBe(true);
  });
});
