import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDraftForm } from "./useDraftForm";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

it.each(["getter", "removeItem"])(
  "limpiar un borrador no falla despues de guardar si localStorage bloquea %s",
  (failure) => {
    const { result } = renderHook(() => useDraftForm("draft:test", { concepto: "" }));
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
    expect(result.current.value).toEqual({ concepto: "" });
  }
);

it("limpia el borrador guardado y respeta los valores de reinicio", () => {
  const { result } = renderHook(() => useDraftForm("draft:test", { concepto: "" }));
  window.localStorage.setItem("draft:test", JSON.stringify({ concepto: "Anterior" }));
  act(() => result.current.restoreDraft());
  expect(result.current.value.concepto).toBe("Anterior");
  act(() => result.current.clearDraft({ concepto: "Nuevo" }));
  expect(window.localStorage.getItem("draft:test")).toBeNull();
  expect(result.current.value.concepto).toBe("Nuevo");
});
