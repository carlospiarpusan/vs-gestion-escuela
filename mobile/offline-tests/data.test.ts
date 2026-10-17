import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { database } from "./setup";
import { deferred, json, login, profile, session } from "./fixtures";
import {
  drainPendingMutations,
  evaluateOfflinePractice,
  loadDashboardSummary,
  loadModuleRows,
  loadWorkHours,
  loadMyProfile,
  loadMySubscriptionAccess,
  queueModuleMutation,
  submitCaleAttempt,
  syncCaleBank,
  signInWithIdentifier,
} from "../src/lib/data";
import {
  countPendingMutations,
  enqueueMutation,
  getSyncState,
  initOfflineDb,
  listPendingMutations,
  readEntityRows,
  upsertEntityRow,
} from "../src/lib/offline";
import {
  captureAuthScope,
  clientForScope,
  profileCacheScope,
  setActiveSession,
} from "../src/lib/session-scope";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  setSession: vi.fn(),
  startAutoRefresh: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({ supabase: { auth } }));
const examIds = Array.from({ length: 40 }, (_, index) => `q-${index}`);
const examAnswers = Object.fromEntries(examIds.map((id) => [id, "a"]));
const network = vi.fn<typeof fetch>();
const offline = () => {
  throw new TypeError("Failed to fetch: offline");
};

beforeAll(initOfflineDb);
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  for (const table of [
    "entity_cache_v2",
    "pending_mutations_v2",
    "sync_state_v2",
    "cale_bank_cache_v2",
  ])
    database.exec(`delete from ${table}`);
  setActiveSession(null);
  network.mockReset();
  auth.signInWithPassword.mockReset();
  auth.setSession.mockReset().mockResolvedValue({ error: null });
  auth.startAutoRefresh.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", network);
});

describe("in-flight module read deduplication", () => {
  it("shares simultaneous reads but always refetches a later refresh", async () => {
    login();
    const pending = deferred<Response>();
    network.mockReturnValueOnce(pending.promise);
    const reads = [
      loadModuleRows("students"),
      loadModuleRows("students"),
      loadModuleRows("students"),
    ];
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1));
    pending.resolve(json([{ id: "student-a", nombre: "Fixture" }]));
    const results = await Promise.all(reads);
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
    network.mockResolvedValueOnce(json([{ id: "student-updated" }]));
    expect((await loadModuleRows("students")).rows).toEqual([{ id: "student-updated" }]);
    expect(network).toHaveBeenCalledTimes(2);
  });

  it.each([
    { user: "b", change: {} },
    { user: "a", change: { sede_id: "branch-b" } },
    { user: "a", change: { rol: "recepcion" as const } },
  ])("never shares a pending request across scopes: %j", async ({ user, change }) => {
    login();
    const pending = deferred<Response>();
    network.mockReturnValueOnce(pending.promise);
    const previous = loadModuleRows("students").catch((error) => error);
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1));
    login(user, change);
    network.mockResolvedValueOnce(json([{ id: "student-b" }]));
    expect((await loadModuleRows("students")).rows).toEqual([{ id: "student-b" }]);
    pending.resolve(json([{ id: "student-a" }]));
    expect(await previous).toBeInstanceOf(Error);
    expect((await readEntityRows("students")).map((row) => row.entityId)).toEqual(["student-b"]);
  });

  it("does not reuse a rejected read when the user retries", async () => {
    login();
    network.mockImplementationOnce(offline);
    await expect(loadModuleRows("students")).rejects.toThrow();
    network.mockResolvedValueOnce(json([{ id: "retry" }]));
    expect((await loadModuleRows("students")).rows).toEqual([{ id: "retry" }]);
    expect(network).toHaveBeenCalledTimes(2);
  });
});

describe("work hours from the actual daily register", () => {
  const period = { mode: "month" as const, date: "2026-10-14" };
  const row = {
    id: "h1",
    fecha: "2026-10-02",
    horas: "7.5",
    instructor_id: "instructor-a",
    escuela_id: "school-a",
    sede_id: "branch-a",
  };
  it("looks up the instructor by account and filters actual hours by owner, school and dates", async () => {
    login("a", { rol: "instructor" });
    network.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/instructores")) {
        expect(url.searchParams.get("user_id")).toBe("eq.a");
        expect(url.searchParams.get("escuela_id")).toBe("eq.school-a");
        return json([{ id: "instructor-a" }]);
      }
      expect(url.pathname).toMatch(/\/horas_trabajo$/);
      expect(url.searchParams.getAll("fecha")).toEqual(["gte.2026-10-01", "lt.2026-11-01"]);
      expect(url.searchParams.get("instructor_id")).toBe("in.(instructor-a)");
      return json([row]);
    });
    expect((await loadWorkHours(period)).rows).toEqual([row]);
    expect(network).toHaveBeenCalledTimes(2);
  });
  it("pages every record instead of returning only the latest 50", async () => {
    login();
    network.mockImplementation(async (input) => {
      const url = new URL(String(input));
      return json(
        url.searchParams.get("offset") === "0"
          ? Array.from({ length: 500 }, (_, index) => ({ ...row, id: `h-${index}` }))
          : [{ ...row, id: "last" }]
      );
    });
    expect((await loadWorkHours({ mode: "year", date: "2026-10-14" })).rows).toHaveLength(501);
    expect(network).toHaveBeenCalledTimes(2);
    expect(new URL(String(network.mock.calls[1][0])).searchParams.get("offset")).toBe("500");
  });
  it("builds the instructor home from own monthly hours, never obsolete class counts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T21:00:00Z"));
    login("a", { rol: "instructor" });
    network.mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/instructores")) return json([{ id: "instructor-a" }]);
      expect(url.pathname).toMatch(/\/horas_trabajo$/);
      expect(url.searchParams.getAll("fecha")).toEqual(["gte.2026-10-01", "lt.2026-11-01"]);
      return json([row]);
    });
    expect(await loadDashboardSummary(profile("a", { rol: "instructor" }))).toMatchObject({
      headline: "Mis horas del mes",
      stats: [
        { id: "hours", value: "7,5" },
        { id: "days", value: "1" },
      ],
    });
    expect(network).toHaveBeenCalledTimes(2);
  });
  it("blocks retired Classes links and new mutations before contacting the network", async () => {
    login();
    await expect(loadModuleRows("classes")).rejects.toThrow(/no esta disponible/);
    await expect(queueModuleMutation("classes.create", { fecha: "2026-10-14" })).rejects.toThrow(
      /no se puede modificar/
    );
    expect(network).not.toHaveBeenCalled();
    expect(await countPendingMutations()).toBe(0);
  });
  it("does not hide a missing instructor link or authorization failure behind zero", async () => {
    login("a", { rol: "instructor" });
    network.mockResolvedValue(json([]));
    await expect(loadWorkHours(period)).rejects.toThrow(/vinculada/);
    network.mockResolvedValue(json({ message: "permission denied", code: "42501" }, 403));
    await expect(loadWorkHours(period)).rejects.toMatchObject({ code: "42501" });
  });
  it("uses only the cache for the same account and period, never the former classes snapshot", async () => {
    login();
    await upsertEntityRow("hours", { id: "old-class", fecha: "2026-10-02" });
    network.mockResolvedValue(json([row]));
    await loadWorkHours(period);
    network.mockImplementation(offline);
    expect(await loadWorkHours(period)).toMatchObject({ rows: [row], fromCache: true });
    await expect(loadWorkHours({ mode: "month", date: "2026-09-14" })).rejects.toBeDefined();
    login("b");
    await expect(loadWorkHours(period)).rejects.toBeDefined();
  });
  it("rejects a changed session before persisting a late response", async () => {
    login();
    const pending = deferred<Response>();
    network.mockReturnValue(pending.promise);
    const read = loadWorkHours(period);
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1));
    login("b");
    pending.resolve(json([row]));
    await expect(read).rejects.toThrow(/sesion/);
    expect(await readEntityRows("work-hours:v1:2026-10-01:2026-11-01")).toEqual([]);
  });
  it("limits branch staff and denies students before requesting any rows", async () => {
    login("a", { rol: "admin_sede" });
    network.mockImplementation(async (input) => {
      expect(new URL(String(input)).searchParams.get("sede_id")).toBe("eq.branch-a");
      return json([row]);
    });
    await loadWorkHours(period);
    login("b", { rol: "alumno" });
    await expect(loadWorkHours(period)).rejects.toThrow(/acceso/);
    expect(network).toHaveBeenCalledTimes(1);
  });
});

describe("password sign-in", () => {
  it("resuelve la cedula con correo real en el servidor y conserva la contrasena exacta", async () => {
    network.mockResolvedValue(
      json({ session: { access_token: "test-access", refresh_token: "test-refresh" } })
    );
    await signInWithIdentifier("  12345678  ", "  MiClave!123  ");
    expect(network).toHaveBeenCalledTimes(1);
    const [url, options] = network.mock.calls[0];
    expect(String(url)).toBe("https://condusoft.co/api/public/mobile-login");
    expect(JSON.parse(String(options?.body))).toEqual({
      cedula: "12345678",
      password: "  MiClave!123  ",
    });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(auth.setSession).toHaveBeenCalledExactlyOnceWith({
      access_token: "test-access",
      refresh_token: "test-refresh",
    });
  });
  it("no prueba correos inventados ni acepta una sesion al fallar la cedula", async () => {
    network.mockResolvedValue(json({ error: "Cédula o contraseña incorrectos." }, 401));
    await expect(signInWithIdentifier("12345678", "incorrecta")).rejects.toThrow(
      "Cédula o contraseña incorrectos."
    );
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(auth.setSession).not.toHaveBeenCalled();
  });
  it("rechaza respuestas incompletas y no persiste tokens invalidos", async () => {
    network.mockResolvedValue(json({ ok: true }));
    await expect(signInWithIdentifier("12345678", "Test-password")).rejects.toThrow(/verificar/);
    expect(auth.setSession).not.toHaveBeenCalled();
  });
  it("no oculta el limite de intentos ni reintenta credenciales", async () => {
    network.mockResolvedValue(json({ error: "Demasiados intentos. Intenta más tarde." }, 429));
    await expect(signInWithIdentifier("12345678", "Test-password")).rejects.toThrow(/Demasiados/);
    expect(network).toHaveBeenCalledTimes(1);
    expect(auth.setSession).not.toHaveBeenCalled();
  });
  it("permite reintentar si el servicio queda colgado, sin aceptar una sesion tardia", async () => {
    vi.useFakeTimers();
    const pending = deferred<Response>();
    network.mockReturnValue(pending.promise);
    const read = signInWithIdentifier("12345678", "Test-password");
    const rejected = expect(read).rejects.toThrow(/tardó demasiado/);
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
    pending.resolve(json({ session: { access_token: "late", refresh_token: "late" } }));
    await vi.advanceTimersByTimeAsync(0);
    expect(auth.setSession).not.toHaveBeenCalled();
  });
  it("normalizes the email and preserves the exact password sent to Auth", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    await signInWithIdentifier("  Cuenta@Escuela.com  ", "  MiClave!123  ");
    expect(auth.signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email: "cuenta@escuela.com",
      password: "  MiClave!123  ",
    });
  });

  it("preserves an Auth failure without accepting a session", async () => {
    const error = new Error("Invalid login credentials");
    auth.signInWithPassword.mockResolvedValue({ error });
    await expect(signInWithIdentifier("cuenta@escuela.com", "incorrecta")).rejects.toBe(error);
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(() => captureAuthScope()).toThrow();
  });
});

describe("owned reads and pinned requests", () => {
  it("bounds a stalled native request even when fetch ignores abort", async () => {
    login();
    network.mockReturnValue(new Promise<Response>(() => undefined));
    vi.useFakeTimers();
    const request = clientForScope(captureAuthScope()).rpc("mobile_dashboard_summary").then();
    await vi.advanceTimersByTimeAsync(0);
    expect(network).toHaveBeenCalledTimes(1);
    const signal = network.mock.calls[0][1]?.signal;
    await vi.advanceTimersByTimeAsync(29_999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await request).error?.message).toContain("timed out after 30 seconds");
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the deadline when a request succeeds", async () => {
    login();
    network.mockResolvedValue(json({ ok: true }));
    vi.useFakeTimers();
    const result = await clientForScope(captureAuthScope()).rpc("mobile_dashboard_summary");
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ ok: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves caller cancellation and clears the deadline", async () => {
    login();
    const caller = new AbortController();
    network.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Cancelled", "AbortError"))
          );
        })
    );
    vi.useFakeTimers();
    const request = clientForScope(captureAuthScope())
      .rpc("mobile_dashboard_summary")
      .abortSignal(caller.signal)
      .then();
    await vi.advanceTimersByTimeAsync(0);
    caller.abort();
    expect((await request).error?.message).toContain("Cancelled");
    expect(network.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("loads only the exact cached profile, including when the network returns an error result", async () => {
    login();
    network.mockResolvedValueOnce(json(profile()));
    expect(await loadMyProfile()).toEqual(profile());
    network.mockImplementation(offline);
    expect(await loadMyProfile()).toEqual(profile());
    login("b");
    await upsertEntityRow("my-profile", profile(), "a", profileCacheScope(captureAuthScope()));
    expect(await loadMyProfile()).toBeNull();
  });

  it("removes a revoked/missing profile from offline availability", async () => {
    login();
    network.mockResolvedValueOnce(json(profile()));
    await loadMyProfile();
    network.mockResolvedValueOnce(json(null));
    expect(await loadMyProfile()).toBeNull();
    network.mockImplementation(offline);
    expect(await loadMyProfile()).toBeNull();
  });

  it("does not fall back after authorization denial", async () => {
    login();
    network.mockResolvedValueOnce(json(profile()));
    await loadMyProfile();
    network.mockResolvedValueOnce(json({ code: "42501", message: "permission denied" }, 403));
    await expect(loadMyProfile()).rejects.toMatchObject({ code: "42501" });
    network.mockImplementation(offline);
    expect(await loadMyProfile()).toBeNull();
  });

  it("isolates summary and subscription by user, school and role", async () => {
    login();
    const summary = { headline: "A private summary", stats: [], highlights: [], note: "" };
    network.mockResolvedValueOnce(json(summary));
    expect(await loadDashboardSummary(profile())).toMatchObject(summary);
    network.mockResolvedValueOnce(json({ school_id: "school-a", can_write: true }));
    await loadMySubscriptionAccess();
    network.mockImplementation(offline);
    expect(await loadDashboardSummary(profile())).toMatchObject(summary);
    expect(await loadMySubscriptionAccess()).toMatchObject({ can_write: true });
    login("b");
    await expect(loadDashboardSummary(profile("b"))).rejects.toBeDefined();
    expect(await loadMySubscriptionAccess()).toBeNull();
    login("a", { rol: "alumno" });
    expect(await loadMySubscriptionAccess()).toBeNull();
    await expect(loadDashboardSummary(profile())).rejects.toThrow(/sesion/);
  });

  it("ignores a subscription response for a different school", async () => {
    login();
    network.mockResolvedValue(json({ school_id: "school-b", can_write: true }));
    expect(await loadMySubscriptionAccess()).toBeNull();
    expect(await readEntityRows("subscription-access")).toEqual([]);
  });

  it.each(["module", "profile", "summary", "subscription", "cale", "attempt"])(
    "rejects a late %s response after account replacement",
    async (kind) => {
      login();
      const response = deferred<Response>();
      network.mockReturnValue(response.promise);
      const operations = {
        module: () => loadModuleRows("students"),
        profile: () => loadMyProfile(),
        summary: () => loadDashboardSummary(profile()),
        subscription: () => loadMySubscriptionAccess(),
        cale: () => syncCaleBank(),
        attempt: () =>
          submitCaleAttempt({
            questionIds: examIds,
            answers: examAnswers,
            elapsedSeconds: 1,
            offline: false,
          }),
      };
      const result = operations[kind as keyof typeof operations]();
      const rejected = expect(result).rejects.toThrow(/sesion/);
      await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1));
      expect(new Headers(network.mock.calls[0][1]?.headers).get("Authorization")).toBe(
        "Bearer token-a"
      );
      login("b");
      response.resolve(json(kind === "profile" ? profile() : [{ id: "a-private" }]));
      await rejected;
      expect(await readEntityRows("students")).toEqual([]);
      expect(await readEntityRows("dashboard-summary")).toEqual([]);
      expect(await getSyncState("cale_bank_updated_at")).toBeNull();
    }
  );

  it("refuses dispatch if the session switches after a PostgREST builder was made", async () => {
    login();
    const client = clientForScope(captureAuthScope());
    const request = client.rpc("mobile_apply_income_command", {});
    login("b");
    const result = await request;
    expect(result.error).toBeTruthy();
    expect(network).not.toHaveBeenCalled();
  });
});

describe("owned offline queue replay", () => {
  it.each([true, false])(
    "rejects incomplete, unrelated or invalid answers before queueing or sending (offline=%s)",
    async (offline) => {
      login();
      const invalidAnswers: Record<string, string>[] = [
        {},
        { other: "a" },
        { ...examAnswers, [examIds[39]]: "invalid" },
        Object.fromEntries(examIds.slice(0, 39).map((id) => [id, "a"])),
      ];
      for (const answers of invalidAnswers) {
        await expect(
          submitCaleAttempt({ questionIds: examIds, answers, elapsedSeconds: 1, offline })
        ).rejects.toThrow("Responde las 40 preguntas");
      }
      expect(await countPendingMutations()).toBe(0);
      expect(network).not.toHaveBeenCalled();
    }
  );

  it("lets the same owner explicitly retry evaluation after token renewal", async () => {
    login("a", { rol: "alumno" });
    const answers = { ...examAnswers };
    await evaluateOfflinePractice(examIds, answers);
    setActiveSession(null);
    login("a", { rol: "alumno" });
    await evaluateOfflinePractice(examIds, answers);
    await submitCaleAttempt({ questionIds: examIds, answers, elapsedSeconds: 1, offline: true });
    expect(await countPendingMutations()).toBe(1);
  });

  it.each([true, false])(
    "does not reassign a CALE submission after evaluation (offline=%s)",
    async (offline) => {
      login();
      const answers = { ...examAnswers };
      await evaluateOfflinePractice(examIds, answers);
      login("b");
      await expect(
        submitCaleAttempt({ questionIds: examIds, answers, elapsedSeconds: 1, offline })
      ).rejects.toThrow(/sesion/);
      expect(await countPendingMutations()).toBe(0);
      expect(network).not.toHaveBeenCalled();
    }
  );

  it("gives separate ids to blank-id forms, freezing their original school and branch", async () => {
    login();
    const first = await queueModuleMutation("income.create", {
      id: "",
      escuela_id: "",
      sede_id: "",
      monto: 1,
    });
    const second = await queueModuleMutation("income.create", { id: "", monto: 2 });
    expect(first.id).not.toBe(second.id);
    expect(first.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(first.payload).toMatchObject({ escuela_id: "school-a", sede_id: "branch-a" });
    expect(await countPendingMutations()).toBe(2);
    await expect(queueModuleMutation("income.update", { id: "" })).rejects.toThrow(/identificador/);
    expect(await countPendingMutations()).toBe(2);
  });

  it("resumes a same-user drain after a token change without overlapping replay", async () => {
    login();
    const queued = await queueModuleMutation("income.create", { monto: 1 });
    const oldResponse = deferred<Response>();
    network.mockImplementation(async (url, options) => {
      if (String(url).includes("perfiles")) return json(profile());
      return new Headers(options?.headers).get("Authorization") === "Bearer token-a"
        ? oldResponse.promise
        : json({});
    });
    const first = drainPendingMutations();
    const firstRejected = expect(first).rejects.toThrow(/sesion/);
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(2));
    setActiveSession({ ...session("a"), access_token: "new-token-a" });
    const second = drainPendingMutations();
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(3));
    oldResponse.resolve(json({}));
    await firstRejected;
    expect(await second).toBe(0);
    const commands = network.mock.calls.filter(([url]) => String(url).includes("rpc/"));
    expect(commands.map(([, options]) => JSON.parse(String(options?.body)).p_command_id)).toEqual([
      queued.id,
      queued.id,
    ]);
    expect(new Headers(commands[1][1]?.headers).get("Authorization")).toBe("Bearer new-token-a");
  });

  it("pins edge-function queued commands to their original actor", async () => {
    login();
    await queueModuleMutation("students.create", { nombre: "Student" });
    network.mockImplementation(async (url) =>
      String(url).includes("perfiles") ? json(profile()) : json({})
    );
    expect(await drainPendingMutations()).toBe(0);
    expect(network.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining("perfiles"),
      expect.stringContaining("/functions/v1/mobile-admin-users"),
    ]);
    for (const [, options] of network.mock.calls)
      expect(new Headers(options?.headers).get("Authorization")).toBe("Bearer token-a");
  });

  it("pins CALE commands to the student and refuses a staff account", async () => {
    login();
    await expect(
      queueModuleMutation("exams.submit", {
        questionIds: ["q"],
        answers: { q: "a" },
        elapsedSeconds: 2,
      })
    ).rejects.toThrow(/Solo el alumno/);
    login("a", { rol: "alumno" });
    await queueModuleMutation("exams.submit", {
      questionIds: ["q"],
      answers: { q: "a" },
      elapsedSeconds: 2,
    });
    network.mockImplementation(async (url) =>
      String(url).includes("perfiles") ? json(profile("a", { rol: "alumno" })) : json({})
    );
    expect(await drainPendingMutations()).toBe(0);
    expect(network.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining("perfiles"),
      expect.stringContaining("/rpc/mobile_submit_cale_attempt"),
    ]);
    for (const [, options] of network.mock.calls)
      expect(new Headers(options?.headers).get("Authorization")).toBe("Bearer token-a");
  });

  it("keeps optimistic operations visible after a remote snapshot and after logout/login", async () => {
    login();
    const pending = await queueModuleMutation("income.create", { concepto: "Offline", monto: 7 });
    network.mockResolvedValue(json([]));
    expect((await loadModuleRows("income")).rows).toEqual([
      expect.objectContaining({ id: pending.entityId, monto: 7, _pending: true }),
    ]);
    setActiveSession(null);
    login("b");
    expect(await countPendingMutations()).toBe(0);
    login();
    network.mockImplementation(offline);
    expect((await loadModuleRows("income")).rows[0]).toMatchObject({
      id: pending.entityId,
      monto: 7,
    });
  });

  it("drains only the owner's commands, with captured credentials and original command ids", async () => {
    login();
    const a = await queueModuleMutation("income.create", { monto: 11 });
    login("b");
    const b = await queueModuleMutation("income.create", { monto: 22 });
    network.mockImplementation(async (url) =>
      String(url).includes("perfiles") ? json(profile("b")) : json({})
    );
    expect(await drainPendingMutations()).toBe(0);
    const calls = network.mock.calls.filter(([url]) => String(url).includes("rpc/"));
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0][1]?.body)).p_command_id).toBe(b.id);
    expect(new Headers(calls[0][1]?.headers).get("Authorization")).toBe("Bearer token-b");
    login();
    expect((await listPendingMutations())[0]).toMatchObject({ id: a.id, status: "pending" });
  });

  it("stops after an account changes in flight, retaining uncertain commands for the original owner", async () => {
    login();
    const first = await queueModuleMutation("income.create", { monto: 1 });
    const second = await queueModuleMutation("income.create", { monto: 2 });
    const response = deferred<Response>();
    network.mockImplementation(async (url) =>
      String(url).includes("perfiles") ? json(profile()) : response.promise
    );
    const drain = drainPendingMutations();
    const rejected = expect(drain).rejects.toThrow(/sesion/);
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(2));
    login("b");
    response.resolve(json({ entity_type: "income", row: { id: first.entityId } }));
    await rejected;
    expect(await readEntityRows("income")).toEqual([]);
    login();
    expect(await listPendingMutations()).toEqual([
      expect.objectContaining({ id: first.id, status: "syncing" }),
      expect.objectContaining({ id: second.id, status: "pending" }),
    ]);
    network.mockImplementation(async (url) =>
      String(url).includes("perfiles") ? json(profile()) : json({})
    );
    expect(await drainPendingMutations()).toBe(0);
    const replayed = network.mock.calls
      .filter(([url]) => String(url).includes("rpc/"))
      .map(([, options]) => JSON.parse(String(options?.body)).p_command_id);
    expect(replayed).toEqual([first.id, first.id, second.id]);
  });

  it("single-flights overlapping drains", async () => {
    login();
    await queueModuleMutation("income.create", { monto: 1 });
    const response = deferred<Response>();
    network.mockImplementation(async (url) =>
      String(url).includes("perfiles") ? json(profile()) : response.promise
    );
    const first = drainPendingMutations();
    const second = drainPendingMutations();
    await vi.waitFor(() =>
      expect(network.mock.calls.filter(([url]) => String(url).includes("rpc/"))).toHaveLength(1)
    );
    response.resolve(json({}));
    expect(await Promise.all([first, second])).toEqual([0, 0]);
    expect(network.mock.calls.filter(([url]) => String(url).includes("rpc/"))).toHaveLength(1);
  });

  it("does not replay old-school commands after online profile verification changes scope", async () => {
    login();
    await queueModuleMutation("income.create", { monto: 1 });
    network.mockResolvedValue(json(profile("a", { escuela_id: "school-b" })));
    expect(await drainPendingMutations()).toBe(0);
    expect(network.mock.calls.filter(([url]) => String(url).includes("rpc/"))).toHaveLength(0);
    login();
    expect(await countPendingMutations()).toBe(1);
  });

  it("requires an online profile even if a valid cached profile exists", async () => {
    login();
    network.mockResolvedValueOnce(json(profile()));
    await loadMyProfile();
    await queueModuleMutation("income.create", { monto: 1 });
    network.mockImplementation(offline);
    await expect(drainPendingMutations()).rejects.toThrow(/verificar/);
    expect((await listPendingMutations())[0].status).toBe("pending");
  });

  it("does not mark unknown commands applied or bypass a failed command", async () => {
    login();
    await enqueueMutation({
      id: "unknown",
      entityId: "unknown",
      type: "unknown.create",
      payload: {},
      status: "pending",
      error: null,
    });
    await queueModuleMutation("income.create", { monto: 1 });
    network.mockResolvedValue(json(profile()));
    expect(await drainPendingMutations()).toBe(2);
    expect((await listPendingMutations()).map((row) => row.status)).toEqual(["failed", "pending"]);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("rejects a mutation explicitly targeting another school", async () => {
    login();
    await expect(queueModuleMutation("income.create", { escuela_id: "school-b" })).rejects.toThrow(
      /escuela/
    );
    expect(await countPendingMutations()).toBe(0);
  });
});

it.each([true, false])("refuses fewer than 40 distinct questions (offline=%s)", async (offline) => {
  login();
  for (const questionIds of [examIds.slice(0, 39), [...examIds.slice(0, 39), examIds[0]]]) {
    await expect(
      submitCaleAttempt({ questionIds, answers: examAnswers, elapsedSeconds: 1, offline })
    ).rejects.toThrow("Responde las 40 preguntas");
  }
  expect(await countPendingMutations()).toBe(0);
  expect(network).not.toHaveBeenCalled();
});
