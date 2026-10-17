import { afterEach, expect, it, vi } from "vitest";
import {
  applyThemePreference,
  getStoredThemePreference,
  THEME_CHANGE_EVENT,
  toggleThemePreference,
} from "./theme-service";
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});
it("lee y cambia el tema cuando el almacenamiento funciona", () => {
  expect(toggleThemePreference("light")).toBe("dark");
  expect(getStoredThemePreference()).toBe("dark");
  expect(document.documentElement).toHaveClass("dark");
});
it("leer el tema no rompe el dashboard si el navegador bloquea localStorage", () => {
  document.documentElement.classList.add("dark");
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  expect(() => getStoredThemePreference()).not.toThrow();
  expect(getStoredThemePreference()).toBe("dark");
});
it("aplica y comunica el tema aunque no pueda guardar la preferencia", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  const listener = vi.fn();
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  try {
    expect(() => applyThemePreference("dark")).not.toThrow();
    expect(document.documentElement).toHaveClass("dark");
    expect(listener).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
  }
});
