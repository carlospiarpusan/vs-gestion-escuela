import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import type { DashboardInitialAuthState } from "@/lib/dashboard-auth-state";
import {
  readClientResourceCache,
  writeClientResourceCache,
  invalidateClientResourceCache,
} from "@/lib/client-resource-cache";
import { IDLE_LOGOUT_TIMEOUT_MS } from "@/lib/session-timeout";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  single: vi.fn(),
  listener: null as null | ((event: string, session: unknown) => void),
}));
vi.mock("next/navigation", () => {
  const router = { replace: mocks.replace, push: mocks.push };
  return { useRouter: () => router };
});
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
      onAuthStateChange: (listener: typeof mocks.listener) => {
        mocks.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () =>
            table === "perfiles"
              ? mocks.single()
              : Promise.resolve({ data: { nombre: "Escuela" } }),
        }),
        order: () => ({ limit: async () => ({ data: [] }) }),
      }),
    }),
    rpc: async () => ({ data: null }),
  }),
}));
const user = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "test@example.com",
  user_metadata: {},
};
const state = {
  user,
  perfil: {
    ...user,
    nombre: "Perfil inicial",
    rol: "admin_escuela",
    activo: true,
    telefono: null,
    avatar_url: null,
    ultimo_acceso: null,
    created_at: "2026-10-15T00:00:00.000Z",
    escuela_id: "10000000-0000-4000-8000-000000000002",
    sede_id: null,
  },
  escuelaNombre: "Escuela",
  sedeNombre: null,
  subscriptionAccess: null,
  schoolOptions: [],
  activeEscuelaId: "10000000-0000-4000-8000-000000000002",
} as DashboardInitialAuthState;
function Consumer() {
  const auth = useAuth();
  return (
    <>
      <p data-testid="profile">{auth.perfil?.nombre ?? "Sin perfil"}</p>
      <button onClick={() => void auth.refreshProfile()}>Recargar</button>
      <button onClick={() => void auth.logout()}>Salir</button>
    </>
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  window.localStorage.clear();
  invalidateClientResourceCache("");
  mocks.getSession.mockResolvedValue({ data: { session: { user } } });
  mocks.signOut.mockImplementation(async () => {
    mocks.listener?.("SIGNED_OUT", null);
    return { error: null };
  });
  mocks.single.mockResolvedValue({ data: state.perfil, error: null });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each(["getter", "setItem"])(
  "mantiene la sesion y el cierre por inactividad con localStorage bloqueado (%s)",
  async (failure) => {
    if (failure === "getter")
      vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
        throw new DOMException("Blocked", "SecurityError");
      });
    else
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Blocked", "SecurityError");
      });
    const view = render(
      <AuthProvider initialState={state}>
        <Consumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("profile")).toHaveTextContent("Perfil inicial");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_LOGOUT_TIMEOUT_MS + 1);
    });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/login?reason=inactive");
    view.unmount();
  }
);

it("maneja un error devuelto por signOut aunque no lance una excepcion", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.signOut.mockResolvedValue({ error: new Error("Network unavailable") });
  const view = render(
    <AuthProvider initialState={state}>
      <Consumer />
    </AuthProvider>
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salir" }));
  });
  expect(mocks.replace).toHaveBeenCalledWith("/");
  view.unmount();
});

it.each(["admin_escuela", "super_admin"])(
  "descarta la carga de un perfil %s que termina despues del cierre de sesion",
  async (rol) => {
    let finish!: (result: unknown) => void;
    mocks.single.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const view = render(
      <AuthProvider initialState={state}>
        <Consumer />
      </AuthProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Recargar" }));
    });
    act(() => mocks.listener?.("SIGNED_OUT", null));
    await act(async () => {
      finish({ data: { ...state.perfil, rol, nombre: "Perfil obsoleto" }, error: null });
    });
    expect(screen.getByTestId("profile")).toHaveTextContent("Sin perfil");
    expect(mocks.replace).toHaveBeenCalledWith("/login");
    view.unmount();
  }
);

it("una recarga vigente conserva el resultado nuevo", async () => {
  mocks.single.mockResolvedValue({
    data: { ...state.perfil, nombre: "Perfil actualizado" },
    error: null,
  });
  const view = render(
    <AuthProvider initialState={state}>
      <Consumer />
    </AuthProvider>
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Recargar" }));
  });
  expect(screen.getByTestId("profile")).toHaveTextContent("Perfil actualizado");
  view.unmount();
});

it("borra el perfil y la cache anteriores durante un cambio de cuenta en otra pestana", async () => {
  let finish!: (value: unknown) => void;
  mocks.single.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const view = render(
    <AuthProvider initialState={state}>
      <Consumer />
    </AuthProvider>
  );
  writeClientResourceCache("finance-income:test", { titular: "Cuenta anterior" }, 60_000, {
    persistToSession: false,
  });
  const nextUser = { ...user, id: "20000000-0000-4000-8000-000000000001" };
  await act(async () => {
    mocks.listener?.("SIGNED_IN", { user: nextUser });
  });
  expect(screen.getByTestId("profile")).toHaveTextContent("Sin perfil");
  expect(readClientResourceCache("finance-income:test")).toBeNull();
  await act(async () => {
    finish({ data: { ...state.perfil, id: nextUser.id, nombre: "Cuenta nueva" }, error: null });
  });
  expect(screen.getByTestId("profile")).toHaveTextContent("Cuenta nueva");
  view.unmount();
});

it("el cierre de sesion elimina los datos cacheados de la cuenta", () => {
  const view = render(
    <AuthProvider initialState={state}>
      <Consumer />
    </AuthProvider>
  );
  writeClientResourceCache("finance-income:test", { titular: "Cuenta anterior" }, 60_000, {
    persistToSession: false,
  });
  act(() => mocks.listener?.("SIGNED_OUT", null));
  expect(readClientResourceCache("finance-income:test")).toBeNull();
  view.unmount();
});
