import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LoginScreen from "../app/login";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), replace: vi.fn() }));

vi.mock("expo-router", () => ({
  Redirect: () => null,
  router: { replace: mocks.replace, push: vi.fn() },
}));
vi.mock("../src/context/app-context", () => ({
  useApp: () => ({ session: null, ready: true }),
}));
vi.mock("../src/lib/data", () => ({ signInWithIdentifier: mocks.signIn }));
vi.mock("../src/components/public-legal-links", () => ({ PublicLegalLinks: () => null }));
vi.mock("lucide-react-native", () => ({ Eye: () => null, EyeOff: () => null }));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("react-native", () => ({
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ScrollView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  StyleSheet: { create: (styles: unknown) => styles },
  Pressable: ({
    children,
    onPress,
    disabled,
    accessibilityLabel,
  }: {
    children: ReactNode;
    onPress: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
  }) => (
    <button disabled={disabled} aria-label={accessibilityLabel} onClick={onPress}>
      {children}
    </button>
  ),
  TextInput: ({
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    autoCapitalize,
    autoCorrect,
    autoComplete,
  }: {
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    autoCapitalize?: string;
    autoCorrect?: boolean;
    autoComplete?: string;
  }) => (
    <input
      value={value}
      onChange={(event) => onChangeText(event.target.value)}
      placeholder={placeholder}
      type={secureTextEntry ? "password" : "text"}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      data-native-auto-correct={String(autoCorrect)}
    />
  ),
}));

beforeEach(() => mocks.signIn.mockReset());
afterEach(cleanup);

it("keeps credentials unchanged when revealing and submitting the password", async () => {
  mocks.signIn.mockResolvedValue(undefined);
  render(<LoginScreen />);
  const identifier = screen.getByPlaceholderText(
    "correo@escuela.com o 12345678"
  ) as HTMLInputElement;
  const password = screen.getByPlaceholderText("Tu contraseña") as HTMLInputElement;
  for (const field of [identifier, password]) {
    expect(field.getAttribute("autocapitalize")).toBe("none");
    expect(field.getAttribute("data-native-auto-correct")).toBe("false");
  }
  expect(password.autocomplete).toBe("current-password");
  fireEvent.change(identifier, { target: { value: "Cuenta@Escuela.com" } });
  fireEvent.change(password, { target: { value: "  MiClave!123  " } });
  expect(password.type).toBe("password");
  fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
  expect(password.type).toBe("text");
  expect(password.value).toBe("  MiClave!123  ");
  fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
  expect(password.type).toBe("password");
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/(protected)/dashboard"));
  expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith("Cuenta@Escuela.com", "  MiClave!123  ");
});

it("keeps sign-in and registration while removing technical promotional text", () => {
  render(<LoginScreen />);
  expect(screen.getByText("Condu")).toBeDefined();
  expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeDefined();
  expect(screen.getByRole("button", { name: "Entrar" })).toBeDefined();
  expect(screen.queryByText("Acceso móvil")).toBeNull();
  expect(screen.queryByText(/navegación se ajusta/)).toBeNull();
});

it("allows correcting credentials after an authentication failure", async () => {
  mocks.signIn.mockRejectedValueOnce(new Error("Invalid login credentials"));
  mocks.signIn.mockResolvedValueOnce(undefined);
  render(<LoginScreen />);
  fireEvent.change(screen.getByPlaceholderText("correo@escuela.com o 12345678"), {
    target: { value: "cuenta@escuela.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Tu contraseña"), {
    target: { value: "incorrecta" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  await screen.findByText("Invalid login credentials");
  expect(mocks.replace).not.toHaveBeenCalled();
  fireEvent.change(screen.getByPlaceholderText("Tu contraseña"), {
    target: { value: "Correcta!123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledTimes(1));
  expect(mocks.signIn).toHaveBeenLastCalledWith("cuenta@escuela.com", "Correcta!123");
});
