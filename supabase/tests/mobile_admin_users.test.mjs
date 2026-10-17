// node --test supabase/tests/mobile_admin_users.test.mjs (Node 24+)
// Runs the real handler and installed Supabase SDK with an in-memory HTTP transport.
// No env files, credentials, network access, or remote databases are used.
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { beforeEach, after, test } from "node:test";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const clone = (value) => structuredClone(value);
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const uuidFields = new Set([
  "id",
  "command_id",
  "user_id",
  "escuela_id",
  "sede_id",
  "entity_id",
  "actor_id",
]);
let state;
let handler;
const originalFetch = globalThis.fetch;
const originalDeno = globalThis.Deno;
const originalError = console.error;
globalThis.Deno = {
  env: {
    get: (name) =>
      ({
        SUPABASE_URL: "https://mobile-test.invalid",
        SUPABASE_ANON_KEY: "test-anon",
        SUPABASE_SERVICE_ROLE_KEY: "test-service",
      })[name],
  },
  serve: (callback) => {
    handler = callback;
  },
};
console.error = (...args) => {
  state?.errors.push(args);
};

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input instanceof Request ? input.url : input);
  assert.equal(url.origin, "https://mobile-test.invalid", "No network targets are allowed");
  const method = init.method || "GET";
  const headers = new Headers(init.headers);
  const body = init.body ? JSON.parse(init.body) : undefined;
  const table = url.pathname.startsWith("/rest/v1/") ? url.pathname.split("/").at(-1) : null;
  const call = { url, method, headers, body, table };
  state.calls.push(call);
  const failureIndex = state.failures.findIndex((failure) => failure.when(call));
  if (failureIndex >= 0) {
    const [failure] = state.failures.splice(failureIndex, 1);
    return response({ code: failure.code || "TEST_ERROR", message: "Injected failure" }, 400);
  }
  if (url.pathname === "/auth/v1/user") {
    const id = headers.get("Authorization")?.replace("Bearer ", "");
    return state.auth.has(id)
      ? response(state.auth.get(id))
      : response({ message: "No user" }, 401);
  }
  if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
    if (state.beforeAuthCreate) await state.beforeAuthCreate();
    if ([...state.auth.values()].some((user) => user.email === body.email)) {
      return response({ msg: "User already registered", code: "email_exists" }, 422);
    }
    const user = { id: uid(state.nextId++), email: body.email, user_metadata: body.user_metadata };
    state.auth.set(user.id, user);
    state.createdUsers.push(clone(user));
    return response(user);
  }
  if (url.pathname.startsWith("/auth/v1/admin/users/") && method === "DELETE") {
    const id = url.pathname.split("/").at(-1);
    state.auth.delete(id);
    state.deletedUsers.push(id);
    state.db.perfiles = state.db.perfiles.filter((p) => p.id !== id);
    for (const entity of ["alumnos", "instructores"])
      state.db[entity] = state.db[entity].filter((r) => r.user_id !== id);
    return response({ id });
  }
  assert(table && state.db[table], `Unexpected request: ${method} ${url.pathname}`);
  assert.equal(
    headers.get("apikey"),
    "test-service",
    "Database operations must use the configured service client"
  );
  const matches = (row) =>
    [...url.searchParams].every(([key, filter]) => {
      if (["select", "limit", "order"].includes(key)) return true;
      assert(filter.startsWith("eq."), `Unsupported filter ${filter}`);
      const value = filter.slice(3);
      if (key === "result") return JSON.stringify(row[key]) === JSON.stringify(JSON.parse(value));
      return uuidFields.has(key)
        ? String(row[key]).toLowerCase() === value.toLowerCase()
        : String(row[key]) === value;
    });
  let rows;
  if (method === "POST") {
    const incoming = Array.isArray(body) ? body : [body];
    const key = table === "mobile_command_log" ? "command_id" : "id";
    if (incoming.some((r) => state.db[table].some((old) => old[key] === r[key]))) {
      return response({ code: "23505", message: "duplicate key" }, 409);
    }
    rows = clone(incoming);
    state.db[table].push(...rows);
  } else {
    rows = state.db[table].filter(matches);
    if (method === "PATCH") rows.forEach((row) => Object.assign(row, clone(body)));
    else if (method === "DELETE")
      state.db[table] = state.db[table].filter((row) => !rows.includes(row));
    else assert.equal(method, "GET");
  }
  if (url.searchParams.has("order")) {
    const [key, direction] = url.searchParams.get("order").split(".");
    rows = [...rows].sort(
      (a, b) => (Number(a[key]) - Number(b[key])) * (direction === "desc" ? -1 : 1)
    );
  }
  if (url.searchParams.has("limit")) rows = rows.slice(0, Number(url.searchParams.get("limit")));
  if (method !== "GET" && !headers.get("Prefer")?.includes("return=representation")) {
    return new Response(null, { status: method === "POST" ? 201 : 204 });
  }
  const columns = url.searchParams.get("select");
  const projected = rows.map((row) =>
    !columns || columns === "*"
      ? clone(row)
      : Object.fromEntries(columns.split(",").map((key) => [key.trim(), row[key.trim()] ?? null]))
  );
  if (headers.get("Accept")?.includes("vnd.pgrst.object")) {
    return projected.length === 1
      ? response(projected[0])
      : response(
          {
            code: "PGRST116",
            details: `The result contains ${projected.length} rows`,
            message: "Expected one row",
          },
          406
        );
  }
  return response(projected);
};

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === "npm:@supabase/supabase-js@2" ? "@supabase/supabase-js" : specifier,
      context
    );
  },
});
await import("../functions/mobile-admin-users/index.ts");
hooks.deregister();

beforeEach(() => {
  state = {
    db: {
      escuelas: [{ id: uid(1) }, { id: uid(2) }],
      sedes: [
        { id: uid(11), escuela_id: uid(1), es_principal: true },
        { id: uid(12), escuela_id: uid(1) },
        { id: uid(21), escuela_id: uid(2), es_principal: true },
      ],
      perfiles: [],
      alumnos: [],
      instructores: [],
      mobile_command_log: [],
    },
    auth: new Map(),
    calls: [],
    createdUsers: [],
    deletedUsers: [],
    failures: [],
    errors: [],
    nextId: 1000,
  };
  for (const [n, rol, escuela, sede] of [
    [101, "admin_escuela", 1, 11],
    [102, "admin_sede", 1, 11],
    [103, "administrativo", 1, 11],
    [104, "recepcion", 1, 11],
    [105, "instructor", 1, 11],
    [106, "alumno", 1, 11],
    [107, "secretaria", 1, 11],
    [108, "super_admin", null, null],
    [109, "admin_escuela", 2, 21],
    [110, "admin_sede", 1, null],
    [111, "administrativo", 1, 12],
  ])
    profile(n, rol, escuela, sede);
});
after(() => {
  globalThis.fetch = originalFetch;
  globalThis.Deno = originalDeno;
  console.error = originalError;
});

function profile(n, rol = "alumno", escuela = 1, sede = 11, extra = {}) {
  const row = {
    id: uid(n),
    rol,
    escuela_id: escuela ? uid(escuela) : null,
    sede_id: sede ? uid(sede) : null,
    nombre: `Profile ${n}`,
    email: `${n}@test.invalid`,
    cedula: String(n),
    activo: true,
    ...extra,
  };
  state.db.perfiles.push(row);
  state.auth.set(row.id, { id: row.id, email: row.email });
  return row;
}
const student = (extra = {}) => ({
  id: uid(201),
  nombre: "Demo",
  apellidos: "Student",
  dni: "12345678",
  telefono: "3000000000",
  ...extra,
});
const instructor = (extra = {}) => student({ id: uid(301), licencia: "LICENSE", ...extra });
const staff = (extra = {}) => ({
  id: uid(401),
  nombre: "Staff",
  cedula: "87654321",
  rol: "administrativo",
  ...extra,
});
async function request(action, payload, actor = 102, command = 901) {
  const body = { action, payload, ...(command === null ? {} : { command_id: uid(command) }) };
  const result = await handler(
    new Request("https://mobile-test.invalid/functions/v1/mobile-admin-users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(actor === null ? {} : { Authorization: `Bearer ${uid(actor)}` }),
      },
      body: JSON.stringify(body),
    })
  );
  return { status: result.status, body: await result.json() };
}
function rejected(result, pattern) {
  assert.equal(result.status, 400);
  assert.match(result.body.error, pattern);
}
function noAccountsCreated() {
  assert.equal(state.createdUsers.length, 0);
}

test("strict TypeScript check of the deployable handler", () => {
  const source = fileURLToPath(
    new URL("../functions/mobile-admin-users/index.ts", import.meta.url)
  );
  const virtual = fileURLToPath(new URL("./mobile-admin-deno-test.d.ts", import.meta.url));
  const options = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: ["node"],
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...args) =>
    name === virtual
      ? ts.createSourceFile(
          name,
          "declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): void };",
          options.target
        )
      : getSourceFile(name, ...args);
  host.resolveModuleNames = (names, containingFile) =>
    names.map(
      (name) =>
        ts.resolveModuleName(
          name === "npm:@supabase/supabase-js@2" ? "@supabase/supabase-js" : name,
          containingFile,
          options,
          host
        ).resolvedModule
    );
  const program = ts.createProgram([source, virtual], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (name) => name,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => "\n",
    })
  );
});

for (const actor of [101, 102, 103, 104, 107, 108])
  test(`student creation and replay for authorized actor ${actor}`, async () => {
    const payload = student({ escuela_id: uid(1), sede_id: uid(11) });
    const first = await request("create_student", payload, actor);
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.row.escuela_id, uid(1));
    assert.notEqual(first.body.row.user_id, uid(actor));
    const replay = await request(
      "create_student",
      Object.fromEntries(Object.entries(payload).reverse()),
      actor
    );
    assert.deepEqual(replay, first, "JSON key order is not part of command identity");
    assert.equal(state.createdUsers.length, 1);
    assert.equal(state.db.alumnos.length, 1);
    assert.equal(state.db.mobile_command_log.length, 1);
  });

for (const actor of [105, 106])
  test(`non-admin role ${actor} cannot create or replay`, async () => {
    assert.equal((await request("create_student", student())).status, 200);
    const before = clone(state.db);
    rejected(await request("create_student", student(), actor), /permisos/);
    assert.deepEqual(state.db, before);
  });

test("missing and inactive sessions cannot act", async () => {
  assert.equal((await request("create_student", student(), null)).status, 401);
  state.db.perfiles.find((p) => p.id === uid(102)).activo = false;
  rejected(await request("create_student", student()), /inactivo/);
  noAccountsCreated();
});

for (const [payload, actor, error] of [
  [student({ escuela_id: uid(2), sede_id: uid(21) }), 102, /otra escuela/],
  [student({ sede_id: uid(12) }), 102, /otra sede/],
  [student({ escuela_id: uid(1), sede_id: uid(21) }), 101, /no pertenece/],
  [student({ escuela_id: uid(1), sede_id: uid(21) }), 108, /no pertenece/],
  [student({ escuela_id: uid(999), sede_id: uid(11) }), 108, /validar la escuela/],
  [student({ sede_id: uid(11) }), 110, /otra sede/],
])
  test(`reject requested scope ${actor}/${payload.escuela_id}/${payload.sede_id}`, async () => {
    rejected(await request("create_student", payload, actor), error);
    noAccountsCreated();
    assert.equal(state.db.mobile_command_log.length, 0);
  });

test("school admin may create in another branch of their school", async () => {
  const result = await request("create_student", student({ sede_id: uid(12) }), 101);
  assert.equal(result.status, 200);
  assert.equal(result.body.row.sede_id, uid(12));
});

test("existing entity ids are scoped and checked against the requested identity", async () => {
  state.db.alumnos.push({ ...student(), escuela_id: uid(2), sede_id: uid(21), user_id: uid(999) });
  rejected(await request("create_student", student()), /otra escuela/);
  state.db.alumnos[0].escuela_id = uid(1);
  state.db.alumnos[0].sede_id = uid(12);
  rejected(await request("create_student", student()), /otra sede/);
  state.db.alumnos[0].sede_id = uid(11);
  state.db.alumnos[0].dni = "different";
  rejected(await request("create_student", student()), /identidad/);
  noAccountsCreated();
});

for (const [extra, error] of [
  [{ escuela_id: uid(2), sede_id: uid(21) }, /otra escuela/],
  [{ sede_id: uid(12) }, /otra sede/],
  [{ rol: "instructor" }, /otro rol/],
  [{ activo: false }, /inactiva/],
])
  test(`account reuse rejects ${JSON.stringify(extra)}`, async () => {
    profile(501, "alumno", 1, 11, { cedula: "12345678", ...extra });
    const before = clone(state.db.perfiles);
    rejected(await request("create_student", student()), error);
    assert.deepEqual(state.db.perfiles, before);
    noAccountsCreated();
  });

test("even school/super admins cannot transfer accounts during create", async () => {
  profile(501, "alumno", 1, 12, { cedula: "12345678" });
  for (const actor of [101, 108])
    rejected(
      await request("create_student", student({ escuela_id: uid(1), sede_id: uid(11) }), actor),
      /registro existente pertenece/
    );
  noAccountsCreated();
});

test("reuse an active unlinked student only within the same scope without editing their profile", async () => {
  const original = clone(profile(501, "alumno", 1, 11, { cedula: "12345678" }));
  const result = await request("create_student", student());
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.row.user_id, original.id);
  assert.deepEqual(
    state.db.perfiles.find((p) => p.id === original.id),
    original
  );
  noAccountsCreated();
});

test("linked or ambiguous cedulas and mismatched emails are rejected", async () => {
  profile(501, "alumno", 1, 11, { cedula: "12345678" });
  rejected(
    await request("create_student", student({ email: "other@test.invalid" })),
    /correo no coincide/
  );
  state.db.alumnos.push({ id: uid(202), user_id: uid(501), escuela_id: uid(1), sede_id: uid(11) });
  rejected(await request("create_student", student()), /ya esta vinculada/);
  profile(502, "alumno", 1, 11, { cedula: "12345678" });
  rejected(await request("create_student", student()), /consultar la cuenta/);
  noAccountsCreated();
});

test("retry collisions never disclose or overwrite another actor/type/payload", async () => {
  assert.equal((await request("create_student", student())).status, 200);
  const before = clone(state.db);
  for (const result of [
    await request("create_student", student(), 103),
    await request("create_student", student({ nombre: "Changed" })),
    await request("create_instructor", instructor()),
  ])
    rejected(result, /comando ya esta en uso/);
  assert.deepEqual(state.db, before);
  assert.equal(state.createdUsers.length, 1);
});

test("replay checks current actor and entity scope, not only the cached result", async () => {
  assert.equal((await request("create_student", student())).status, 200);
  state.db.perfiles.find((p) => p.id === uid(102)).sede_id = uid(12);
  rejected(await request("create_student", student()), /otra sede/);
  state.db.perfiles.find((p) => p.id === uid(102)).sede_id = uid(11);
  state.db.alumnos[0].sede_id = uid(12);
  rejected(await request("create_student", student()), /otra sede/);
});

test("parallel retries reserve before Auth writes and create only one account", async () => {
  const entered = Promise.withResolvers();
  const release = Promise.withResolvers();
  state.beforeAuthCreate = async () => {
    entered.resolve();
    await release.promise;
  };
  const first = request("create_student", student());
  await entered.promise;
  const pending = await request("create_student", student());
  assert.equal(pending.status, 409);
  release.resolve();
  const saved = await first;
  assert.equal(saved.status, 200);
  assert.deepEqual(await request("create_student", student()), saved);
  assert.equal(state.createdUsers.length, 1);
});

test("recover final log failure without deleting the committed student or duplicating Auth", async () => {
  state.failures.push({ when: (c) => c.table === "mobile_command_log" && c.method === "PATCH" });
  assert.equal((await request("create_student", student())).status, 409);
  assert.equal(state.db.alumnos.length, 1);
  assert.equal(state.deletedUsers.length, 0);
  const retried = await request("create_student", student());
  assert.equal(retried.status, 200, JSON.stringify(retried.body));
  assert.equal(state.createdUsers.length, 1);
});

test("command-only creates use a stable entity id", async () => {
  const payload = student();
  delete payload.id;
  state.failures.push({ when: (c) => c.table === "mobile_command_log" && c.method === "PATCH" });
  assert.equal((await request("create_student", payload)).status, 409);
  assert.equal((await request("create_student", payload)).body.row.id, uid(901));
  assert.equal(state.createdUsers.length, 1);
});

for (const table of ["escuelas", "sedes", "alumnos", "perfiles", "mobile_command_log"])
  test(`query failure is closed: ${table}`, async () => {
    if (table === "mobile_command_log") {
      assert.equal((await request("create_student", student())).status, 200);
    }
    const createdBefore = state.createdUsers.length;
    state.failures.push({
      when: (c) =>
        c.table === table &&
        c.method === "GET" &&
        (table !== "perfiles" || c.url.searchParams.has("cedula")),
    });
    assert.equal((await request("create_student", student())).status, 400);
    assert.equal(state.createdUsers.length, createdBefore);
  });

test("failed claim performs no Auth writes", async () => {
  state.failures.push({ when: (c) => c.table === "mobile_command_log" && c.method === "POST" });
  rejected(await request("create_student", student()), /reservar/);
  noAccountsCreated();
});

test("failed student insert cleans only the newly created user and permits a retry", async () => {
  state.failures.push({ when: (c) => c.table === "alumnos" && c.method === "POST" });
  rejected(await request("create_student", student()), /crear el alumno/);
  assert.equal(state.deletedUsers.length, 1);
  assert.equal(state.db.mobile_command_log.length, 0);
  assert.equal((await request("create_student", student())).status, 200);
});

test("failed reuse never deletes or mutates the existing account", async () => {
  const before = clone(profile(501, "alumno", 1, 11, { cedula: "12345678" }));
  state.failures.push({ when: (c) => c.table === "alumnos" && c.method === "POST" });
  rejected(await request("create_student", student()), /crear el alumno/);
  assert.deepEqual(
    state.db.perfiles.find((p) => p.id === before.id),
    before
  );
  assert.equal(state.deletedUsers.length, 0);
});

test("unconfirmed cleanup retains the reservation and never creates another user", async () => {
  state.failures.push(
    { when: (c) => c.table === "alumnos" && c.method === "POST" },
    { when: (c) => c.url.pathname.startsWith("/auth/v1/admin/users/") && c.method === "DELETE" }
  );
  rejected(await request("create_student", student()), /revertir/);
  assert.equal(state.db.mobile_command_log.length, 1);
  assert.equal((await request("create_student", student())).status, 409);
  assert.equal(state.createdUsers.length, 1);
});

test("instructor create/replay and scoped account reuse", async () => {
  rejected(await request("create_instructor", instructor(), 104), /permisos/);
  profile(501, "instructor", 1, 11, { cedula: "12345678" });
  const saved = await request("create_instructor", instructor());
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.row.user_id, uid(501));
  assert.deepEqual(await request("create_instructor", instructor()), saved);
  rejected(
    await request("create_instructor", instructor({ id: uid(302) }), 102, 902),
    /ya esta vinculada/
  );
});

test("staff create/replay retains branch administrator permissions", async () => {
  const saved = await request("create_staff_user", staff());
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.deepEqual(await request("create_staff_user", staff()), saved);
  assert.equal(state.createdUsers.length, 1);
  rejected(
    await request("create_staff_user", staff({ rol: "super_admin" }), 102, 902),
    /Rol no soportado/
  );
  rejected(await request("create_staff_user", staff(), 103, 903), /permisos/);
});

test("staff reuse by id or cedula cannot transfer, reactivate, or overwrite a different role", async () => {
  const existing = profile(501, "administrativo", 2, 21, { cedula: "87654321" });
  const before = clone(existing);
  rejected(await request("create_staff_user", staff()), /otra escuela/);
  rejected(await request("create_staff_user", staff({ id: existing.id })), /otra escuela/);
  Object.assign(existing, { escuela_id: uid(1), sede_id: uid(11), rol: "admin_escuela" });
  rejected(await request("create_staff_user", staff({ id: existing.id })), /identidad/);
  Object.assign(existing, before, { escuela_id: uid(1), sede_id: uid(11), activo: false });
  rejected(await request("create_staff_user", staff()), /inactiva/);
  noAccountsCreated();
});

test("school-admin creation is super-only, validates school, and replays without another Auth user", async () => {
  const payload = {
    escuela_id: uid(2),
    nombre: "School admin",
    email: "admin@test.invalid",
    password: "Secret1234",
  };
  rejected(await request("create_admin_escuela", payload, 101), /permisos/);
  rejected(
    await request("create_admin_escuela", { ...payload, escuela_id: uid(999) }, 108),
    /validar la escuela/
  );
  const saved = await request("create_admin_escuela", payload, 108);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.row.sede_id, uid(21));
  assert.deepEqual(await request("create_admin_escuela", payload, 108), saved);
  assert.equal(state.createdUsers.length, 1);
});

test("delete validates hierarchy and scope even for records with missing school/sede", async () => {
  rejected(await request("delete_user", { user_id: uid(101) }), /administrador de escuela/);
  profile(501, "alumno", null, null);
  rejected(await request("delete_user", { user_id: uid(501) }), /escuela valida/);
  rejected(await request("delete_user", { user_id: uid(108) }), /super administrador/);
  rejected(await request("delete_user", { user_id: uid(102) }), /propia cuenta/);
  rejected(await request("delete_user", { user_id: uid(111) }), /otra sede/);
  const deleted = await request("delete_user", { user_id: uid(105) });
  assert.equal(deleted.status, 200);
  assert.deepEqual(state.deletedUsers, [uid(105)]);
});

test("legacy optional command id remains supported", async () => {
  assert.equal((await request("create_student", student(), 102, null)).status, 200);
  assert.equal(state.db.mobile_command_log.length, 0);
});

for (const [action, payload, actor, table] of [
  ["create_instructor", instructor(), 102, "instructores"],
  ["create_staff_user", staff(), 102, "perfiles"],
  [
    "create_admin_escuela",
    { escuela_id: uid(1), nombre: "Admin", email: "admin@test.invalid", password: "Secret1234" },
    108,
    "perfiles",
  ],
])
  test(`recover final confirmation failure: ${action}`, async () => {
    state.failures.push({
      when: (c) =>
        c.table === "mobile_command_log" && c.method === "PATCH" && Boolean(c.body?.result),
    });
    assert.equal((await request(action, payload, actor)).status, 409);
    const user = state.createdUsers[0];
    assert(user);
    assert.equal(state.deletedUsers.length, 0);
    assert(state.db[table].some((r) => r.user_id === user.id || r.id === user.id));
    const retried = await request(action, payload, actor);
    assert.equal(retried.status, 200, JSON.stringify(retried.body));
    assert.equal(state.createdUsers.length, 1);
    assert.deepEqual(await request(action, payload, actor), retried);
  });

test("same-scope staff reuse preserves profile, role, credentials, and status", async () => {
  const before = clone(profile(501, "administrativo", 1, 11, { cedula: "87654321" }));
  const reused = await request("create_staff_user", staff());
  assert.equal(reused.status, 200, JSON.stringify(reused.body));
  assert.deepEqual(reused.body.row, before);
  assert.deepEqual(
    state.db.perfiles.find((p) => p.id === before.id),
    before
  );
  assert.deepEqual(await request("create_staff_user", staff()), reused);
  noAccountsCreated();
});

test("instructor identifiers and reusable accounts cannot cross branches/schools", async () => {
  state.db.instructores.push({
    ...instructor(),
    escuela_id: uid(2),
    sede_id: uid(21),
    user_id: uid(501),
  });
  rejected(await request("create_instructor", instructor()), /otra escuela/);
  state.db.instructores = [];
  const existing = profile(501, "instructor", 1, 12, { cedula: "12345678" });
  rejected(await request("create_instructor", instructor()), /otra sede/);
  rejected(await request("create_instructor", instructor(), 101), /registro existente pertenece/);
  existing.sede_id = uid(11);
  existing.activo = false;
  rejected(await request("create_instructor", instructor()), /inactiva/);
  noAccountsCreated();
});

test("a command from another school cannot be replayed or replaced", async () => {
  const payload = student({ escuela_id: uid(2), sede_id: uid(21) });
  assert.equal((await request("create_student", payload, 109)).status, 200);
  const before = clone(state.db);
  rejected(await request("create_student", payload, 102), /comando ya esta en uso/);
  assert.deepEqual(state.db, before);
});

test("legacy completed command records remain replayable without Auth writes", async () => {
  const row = { ...student(), escuela_id: uid(1), sede_id: uid(11), user_id: uid(501) };
  state.db.alumnos.push(clone(row));
  const result = { entity_type: "students", row: clone(row) };
  state.db.mobile_command_log.push({
    command_id: uid(901),
    command_type: "students.create",
    actor_id: uid(102),
    entity_id: row.id,
    payload: student(),
    result,
  });
  assert.deepEqual(await request("create_student", student()), { status: 200, body: result });
  noAccountsCreated();
});

test("profile insert failure cleans up its new Auth user and releases the reservation", async () => {
  state.failures.push({ when: (c) => c.table === "perfiles" && c.method === "POST" });
  rejected(await request("create_student", student()), /guardar el perfil/);
  assert.equal(state.deletedUsers.length, 1);
  assert.equal(state.db.mobile_command_log.length, 0);
  assert.equal((await request("create_student", student())).status, 200);
});

test("a failed profile-command link cannot silently create a staff account", async () => {
  state.failures.push({
    when: (c) => c.table === "mobile_command_log" && c.method === "PATCH" && !c.body?.result,
  });
  rejected(await request("create_staff_user", staff()), /vincular el usuario/);
  assert.equal(state.deletedUsers.length, 1);
  assert.equal(state.db.mobile_command_log.length, 0);
});

test("malformed requests and UUIDs cannot reserve commands or create users", async () => {
  for (const body of [
    null,
    [],
    { action: "create_student", payload: [] },
    { action: "create_student", payload: student(), command_id: "bad-id" },
    { action: "create_student", payload: student(), command_id: 42 },
  ]) {
    const res = await handler(
      new Request("https://mobile-test.invalid/functions/v1/mobile-admin-users", {
        method: "POST",
        headers: { Authorization: `Bearer ${uid(102)}` },
        body: JSON.stringify(body),
      })
    );
    assert.equal(res.status, 400);
  }
  noAccountsCreated();
  assert.equal(state.db.mobile_command_log.length, 0);
});

test("self-deletion is rejected even for uppercase UUID input", async () => {
  const actor = state.db.perfiles.find((p) => p.id === uid(102));
  const oldId = actor.id;
  actor.id = "aaaaaaaa-bbbb-4000-8000-cccccccccccc";
  state.auth.set(actor.id, { id: actor.id, email: actor.email });
  state.auth.delete(oldId);
  const res = await handler(
    new Request("https://mobile-test.invalid/functions/v1/mobile-admin-users", {
      method: "POST",
      headers: { Authorization: `Bearer ${actor.id}` },
      body: JSON.stringify({ action: "delete_user", payload: { user_id: actor.id.toUpperCase() } }),
    })
  );
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /propia cuenta/);
  assert.equal(state.deletedUsers.length, 0);
});

function assertPasswordFreeCommandLogs(passwords) {
  for (const command of state.db.mobile_command_log) {
    assert.deepEqual(Object.keys(command.payload), ["_mobile_payload_hmac_sha256"]);
    assert.match(command.payload._mobile_payload_hmac_sha256, /^[0-9a-f]{64}$/);
  }
  const logWrites = state.calls
    .filter((call) => call.table === "mobile_command_log")
    .map((call) => ({ method: call.method, url: call.url.href, body: call.body }));
  const serialized = JSON.stringify({ rows: state.db.mobile_command_log, logWrites });
  assert(!serialized.includes("test-service"), "The private HMAC key must never reach the log");
  assert(
    !serialized.includes('"password"'),
    "Command rows/requests must not include password fields"
  );
  for (const password of passwords) {
    assert(!serialized.includes(password), "Passwords must never be sent to the command log");
  }
}

const passwordCommands = [
  ["create_staff_user", staff({ password: "StaffSecret123!" }), 102],
  [
    "create_admin_escuela",
    {
      escuela_id: uid(1),
      nombre: "Admin",
      email: "admin@test.invalid",
      password: "AdminSecret123!",
    },
    108,
  ],
];

for (const [action, payload, actor] of passwordCommands) {
  test(`HMAC-SHA256 fingerprint replaces the entire stored payload: ${action}`, async () => {
    const before = clone(payload);
    const saved = await request(action, payload, actor);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const expected = createHmac("sha256", "test-service")
      .update(JSON.stringify(payload, Object.keys(payload).sort()))
      .digest("hex");
    assert.deepEqual(state.db.mobile_command_log[0].payload, {
      _mobile_payload_hmac_sha256: expected,
    });
    assert.notEqual(
      expected,
      createHash("sha256")
        .update(JSON.stringify(payload, Object.keys(payload).sort()))
        .digest("hex")
    );
    assertPasswordFreeCommandLogs([payload.password]);
    const authWrite = state.calls.find(
      (call) => call.url.pathname === "/auth/v1/admin/users" && call.method === "POST"
    );
    assert.equal(
      authWrite.body.password,
      payload.password,
      "Auth still receives the original password"
    );
    assert.deepEqual(payload, before, "Input contract is unchanged");
    const reordered = Object.fromEntries(Object.entries(payload).reverse());
    assert.deepEqual(await request(action, reordered, actor), saved);
    const changedPassword = "DifferentSecret456!";
    rejected(
      await request(action, { ...payload, password: changedPassword }, actor),
      /comando ya esta en uso/
    );
    assert.equal(state.createdUsers.length, 1);
    assertPasswordFreeCommandLogs([payload.password, changedPassword]);
  });

  test(`failed confirmation and recovery never log passwords: ${action}`, async () => {
    state.failures.push({
      when: (call) =>
        call.table === "mobile_command_log" &&
        call.method === "PATCH" &&
        Boolean(call.body?.result),
    });
    assert.equal((await request(action, payload, actor)).status, 409);
    assertPasswordFreeCommandLogs([payload.password]);
    assert.equal((await request(action, payload, actor)).status, 200);
    assert.equal(state.createdUsers.length, 1);
    assertPasswordFreeCommandLogs([payload.password]);
  });

  test(`valid legacy retry replaces its plaintext payload without changing the result: ${action}`, async () => {
    const row = profile(
      501,
      action === "create_staff_user" ? "administrativo" : "admin_escuela",
      1,
      11,
      {
        cedula: payload.cedula ?? null,
        email: payload.email ?? "501@test.invalid",
      }
    );
    const result = { entity_type: "staff", row: clone(row) };
    state.db.mobile_command_log.push({
      command_id: uid(901),
      command_type: action === "create_staff_user" ? "staff.create" : "admin_escuela.create",
      actor_id: uid(actor),
      entity_id: row.id,
      payload: clone(payload),
      result,
    });
    assert.deepEqual(await request(action, payload, actor), { status: 200, body: result });
    noAccountsCreated();
    assertPasswordFreeCommandLogs([payload.password]);
  });
}

test("a pending reservation contains only the fingerprint even before Auth completes", async () => {
  const entered = Promise.withResolvers();
  const release = Promise.withResolvers();
  state.beforeAuthCreate = async () => {
    entered.resolve();
    await release.promise;
  };
  const payload = staff({ password: "PendingSecret123!" });
  const pending = request("create_staff_user", payload);
  await entered.promise;
  try {
    assert.equal(state.db.mobile_command_log.length, 1);
    assertPasswordFreeCommandLogs([payload.password]);
    assert.equal((await request("create_staff_user", payload)).status, 409);
    assertPasswordFreeCommandLogs([payload.password]);
  } finally {
    release.resolve();
  }
  assert.equal((await pending).status, 200);
  assertPasswordFreeCommandLogs([payload.password]);
});

test("nested password fields are never logged and remain part of the fingerprint", async () => {
  const payload = staff({
    password: "OuterSecret123!",
    metadata: { password: "NestedSecret456!", items: [{ password: "ArraySecret789!" }] },
  });
  const saved = await request("create_staff_user", payload);
  assert.equal(saved.status, 200);
  assert.deepEqual(
    await request("create_staff_user", {
      ...payload,
      metadata: { items: payload.metadata.items, password: payload.metadata.password },
    }),
    saved
  );
  const changed = clone(payload);
  changed.metadata.items[0].password = "ChangedNested123!";
  rejected(await request("create_staff_user", changed), /comando ya esta en uso/);
  assertPasswordFreeCommandLogs([
    payload.password,
    payload.metadata.password,
    payload.metadata.items[0].password,
    changed.metadata.items[0].password,
  ]);
});

test("legacy payloads are not rewritten by a different owner or changed password", async () => {
  const payload = staff({ password: "LegacySecret123!" });
  const row = profile(501, "administrativo", 1, 11, { cedula: payload.cedula });
  const legacy = {
    command_id: uid(901),
    command_type: "staff.create",
    actor_id: uid(102),
    entity_id: row.id,
    payload: clone(payload),
    result: { entity_type: "staff", row: clone(row) },
  };
  state.db.mobile_command_log.push(clone(legacy));
  rejected(await request("create_staff_user", payload, 101), /comando ya esta en uso/);
  rejected(
    await request("create_staff_user", { ...payload, password: "ChangedSecret456!" }),
    /comando ya esta en uso/
  );
  assert.deepEqual(state.db.mobile_command_log, [legacy]);
  assert(
    !state.calls.some((call) => call.table === "mobile_command_log" && call.method === "PATCH")
  );
  noAccountsCreated();
});

test("failure to replace a legacy payload is reported without repeating Auth writes", async () => {
  const payload = staff({ password: "LegacySecret123!" });
  const row = profile(501, "administrativo", 1, 11, { cedula: payload.cedula });
  const result = { entity_type: "staff", row: clone(row) };
  state.db.mobile_command_log.push({
    command_id: uid(901),
    command_type: "staff.create",
    actor_id: uid(102),
    entity_id: row.id,
    payload: clone(payload),
    result,
  });
  state.failures.push({
    when: (call) =>
      call.table === "mobile_command_log" && call.method === "PATCH" && Boolean(call.body?.payload),
  });
  rejected(await request("create_staff_user", payload), /actualizar la huella/);
  assert.deepEqual(await request("create_staff_user", payload), { status: 200, body: result });
  noAccountsCreated();
  assertPasswordFreeCommandLogs([payload.password]);
});

test("legacy SHA-256 fingerprints upgrade to HMAC only for an identical retry", async () => {
  const payload = staff({ password: "LegacyDigest123!" });
  const row = profile(501, "administrativo", 1, 11, { cedula: payload.cedula });
  const result = { entity_type: "staff", row: clone(row) };
  const legacyPayload = {
    _mobile_payload_sha256: createHash("sha256")
      .update(JSON.stringify(payload, Object.keys(payload).sort()))
      .digest("hex"),
  };
  state.db.mobile_command_log.push({
    command_id: uid(901),
    command_type: "staff.create",
    actor_id: uid(102),
    entity_id: row.id,
    payload: legacyPayload,
    result,
  });
  rejected(
    await request("create_staff_user", { ...payload, password: "ChangedDigest456!" }),
    /comando ya esta en uso/
  );
  assert.deepEqual(state.db.mobile_command_log[0].payload, legacyPayload);
  assert.deepEqual(await request("create_staff_user", payload), { status: 200, body: result });
  assert.deepEqual(state.db.mobile_command_log[0].payload, {
    _mobile_payload_hmac_sha256: createHmac("sha256", "test-service")
      .update(JSON.stringify(payload, Object.keys(payload).sort()))
      .digest("hex"),
  });
  noAccountsCreated();
  assertPasswordFreeCommandLogs([payload.password, "ChangedDigest456!"]);
});

test("a fingerprint from another private key cannot be replayed or overwritten", async () => {
  const payload = staff({ password: "KeyBoundSecret123!" });
  const row = profile(501, "administrativo", 1, 11, { cedula: payload.cedula });
  const command = {
    command_id: uid(901),
    command_type: "staff.create",
    actor_id: uid(102),
    entity_id: row.id,
    payload: {
      _mobile_payload_hmac_sha256: createHmac("sha256", "different-private-key")
        .update(JSON.stringify(payload, Object.keys(payload).sort()))
        .digest("hex"),
    },
    result: { entity_type: "staff", row: clone(row) },
  };
  state.db.mobile_command_log.push(clone(command));
  rejected(await request("create_staff_user", payload), /comando ya esta en uso/);
  assert.deepEqual(state.db.mobile_command_log, [command]);
  noAccountsCreated();
  assertPasswordFreeCommandLogs([payload.password]);
});
