import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useDraftForm } from "./useDraftForm";

const auth = vi.hoisted(() => ({
  user: { id: "user-a" },
  perfil: { id: "user-a", escuela_id: "school-a", sede_id: "branch-a" },
  activeEscuelaId: "school-a",
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));
const initial = { concepto: "" };
const useTestDraft = () => useDraftForm("draft:test", initial, { persist: true });
beforeEach(() => {
  auth.user.id = "user-a";
  auth.perfil.sede_id = "branch-a";
  auth.activeEscuelaId = "school-a";
});
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

it.each(["getter", "removeItem"])(
  "limpiar un borrador no falla despues de guardar si localStorage bloquea %s",
  (failure) => {
    const { result } = renderHook(useTestDraft);
    act(() => result.current.setValue({ concepto: "Ingreso guardado" }));
    if (failure === "getter")
      vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
        throw new DOMException("Storage blocked", "SecurityError");
      });
    else
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new DOMException("Storage blocked", "SecurityError");
      });
    expect(() => act(() => result.current.clearDraft())).not.toThrow();
    expect(result.current.value).toEqual(initial);
  }
);

it("recupera el borrador propio al volver y lo elimina al guardar", () => {
  const first = renderHook(useTestDraft);
  act(() => first.result.current.setValue({ concepto: "Anterior" }));
  first.unmount();
  const second = renderHook(useTestDraft);
  expect(second.result.current.hasStoredDraft()).toBe(true);
  act(() => second.result.current.restoreDraft());
  expect(second.result.current.value.concepto).toBe("Anterior");
  act(() => second.result.current.clearDraft({ concepto: "Nuevo" }));
  expect(second.result.current.hasStoredDraft()).toBe(false);
  expect(second.result.current.value.concepto).toBe("Nuevo");
});

it.each(["user", "school", "branch", "record"])(
  "no muestra ni restaura datos al cambiar %s",
  (scope) => {
    const { result, rerender } = renderHook(
      ({ id }) => useDraftForm("draft:test", initial, { persist: true, contextId: id }),
      { initialProps: { id: "student-a" } }
    );
    act(() => result.current.setValue({ concepto: "Dato privado" }));
    if (scope === "user") auth.user.id = "user-b";
    if (scope === "school") auth.activeEscuelaId = "school-b";
    if (scope === "branch") auth.perfil.sede_id = "branch-b";
    rerender({ id: scope === "record" ? "student-b" : "student-a" });
    expect(result.current.value).toEqual(initial);
    expect(result.current.hasStoredDraft()).toBe(false);
    act(() => result.current.restoreDraft());
    expect(result.current.value).toEqual(initial);
  }
);

it("ignora borradores antiguos sin propietario", () => {
  window.localStorage.setItem("draft:test", JSON.stringify({ concepto: "Otra cuenta" }));
  const { result } = renderHook(useTestDraft);
  act(() => result.current.restoreDraft());
  expect(result.current.value).toEqual(initial);
});

it("descarta borradores vencidos", () => {
  const { result } = renderHook(useTestDraft);
  act(() => result.current.setValue({ concepto: "Vencido" }));
  const key = window.localStorage.key(0)!;
  const stored = JSON.parse(window.localStorage.getItem(key)!);
  window.localStorage.setItem(
    key,
    JSON.stringify({ ...stored, savedAt: Date.now() - 8 * 86400000 })
  );
  act(() => result.current.restoreDraft());
  expect(result.current.value).toEqual(initial);
});
