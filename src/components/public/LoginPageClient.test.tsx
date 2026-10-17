import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPassword, replace, refresh, push } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/auth-navigation", () => ({ navigateAfterSignIn: replace }));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}));
import LoginPageClient from "./LoginPageClient";

function submit(identifier = "admin@example.com") {
  render(<LoginPageClient />);
  fireEvent.change(screen.getByLabelText("Correo o cédula"), { target: { value: identifier } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("login navigation", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("navigates only once after a successful sign-in", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    submit();
    await waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute("href", "/registro");
  });

  it("resuelve el acceso por cédula en el servidor sin consultar correos en el navegador", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    submit("12345678");
    await waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("/api/public/login");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      cedula: "12345678",
      password: "test-password",
    });
  });
  it("muestra un fallo de cédula sin navegar ni reintentar", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "Cédula o contraseña incorrectos." }, { status: 401 })
      );
    vi.stubGlobal("fetch", fetch);
    submit("12345678");
    expect(await screen.findByText("Cédula o contraseña incorrectos.")).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("stays on login and re-enables the form for incorrect credentials", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login" } });
    submit();
    expect(await screen.findByText("Correo o contraseña incorrectos.")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
  it("el correo de instructor no se interpreta como cedula", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login" } });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    submit("  Instructor@Example.test  ");
    expect(await screen.findByText("Correo o contraseña incorrectos.")).toBeVisible();
    expect(signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email: "instructor@example.test",
      password: "test-password",
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText("Cédula o contraseña incorrectos.")).not.toBeInTheDocument();
  });
});
