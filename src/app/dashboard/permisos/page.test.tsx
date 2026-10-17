import { render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Page from "./page";
import {
  AUDITED_ROLE_ORDER,
  getDefaultCapability,
  getCapabilityScopeLabel,
  getCapabilityStateLabel,
} from "@/lib/role-capabilities";

const mock = vi.hoisted(() => ({ rol: "super_admin" }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ perfil: { rol: mock.rol } }) }));
afterEach(() => vi.unstubAllGlobals());
it.each(AUDITED_ROLE_ORDER)(
  "%s sees the current permissions, with no ineffective edit controls",
  (rol) => {
    mock.rol = rol;
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<Page />);
    const row = screen.getByRole("row", { name: /^Horas / });
    const cells = within(row).getAllByRole("cell");
    AUDITED_ROLE_ORDER.forEach((role, index) => {
      const expected = getDefaultCapability(role, "hours");
      expect(cells[index + 1]).toHaveTextContent(getCapabilityScopeLabel(expected.scope));
      expect(cells[index + 1]).toHaveTextContent(getCapabilityStateLabel(expected.state));
    });
    expect(
      screen.queryByRole("button", { name: /editar|guardar|restaurar/i })
    ).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  }
);
