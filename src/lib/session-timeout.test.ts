import { describe, expect, it } from "vitest";

import {
  buildIdleLogoutHref,
  getIdleLogoutDeadline,
  normalizeIdleLogoutMinutes,
} from "@/lib/session-timeout";

describe("session-timeout", () => {
  it("usa 30 minutos por defecto cuando el valor no es valido", () => {
    expect(normalizeIdleLogoutMinutes(undefined)).toBe(30);
    expect(normalizeIdleLogoutMinutes("")).toBe(30);
    expect(normalizeIdleLogoutMinutes("nope")).toBe(30);
  });

  it("respeta los limites configurados", () => {
    expect(normalizeIdleLogoutMinutes("1")).toBe(5);
    expect(normalizeIdleLogoutMinutes("45")).toBe(45);
    expect(normalizeIdleLogoutMinutes("999999")).toBe(24 * 60);
  });

  it("calcula la expiracion desde la referencia dada", () => {
    expect(getIdleLogoutDeadline(1_000)).toBe(1_801_000);
  });

  it("construye la redireccion por inactividad", () => {
    expect(buildIdleLogoutHref()).toBe("/login?reason=inactive");
  });
});
