import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardNavLink from "./DashboardNavLink";
import Sidebar from "./Sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    onClick,
    ...props
  }: ComponentProps<"a"> & { prefetch?: boolean | null }) => (
    <a
      {...props}
      href={href}
      data-prefetch={prefetch === false ? "off" : "auto"}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    />
  ),
}));

afterEach(cleanup);

describe("dashboard navigation prefetch", () => {
  it("applies intent-only loading to the actual role-filtered sidebar", () => {
    render(
      <Sidebar
        rol="admin_escuela"
        open
        collapsed={false}
        onClose={vi.fn()}
        onToggleCollapse={vi.fn()}
      />
    );
    const moduleLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/dashboard"));
    expect(moduleLinks.length).toBeGreaterThan(4);
    for (const link of moduleLinks) expect(link).toHaveAttribute("data-prefetch", "off");
    const students = moduleLinks.find(
      (link) => link.getAttribute("href") === "/dashboard/alumnos"
    )!;
    fireEvent.focus(students);
    expect(students).toHaveAttribute("data-prefetch", "auto");
    for (const link of moduleLinks.filter((link) => link !== students))
      expect(link).toHaveAttribute("data-prefetch", "off");
  });

  it("does not preload the menu on initial render", () => {
    render(
      <>
        <DashboardNavLink href="/dashboard/alumnos">Alumnos</DashboardNavLink>
        <DashboardNavLink href="/dashboard/horas">Horas</DashboardNavLink>
      </>
    );
    for (const link of screen.getAllByRole("link"))
      expect(link).toHaveAttribute("data-prefetch", "off");
  });

  it.each(["mouseEnter", "focus", "touchStart"] as const)(
    "warms only the intended route on %s",
    (event) => {
      const handler = vi.fn();
      const close = vi.fn();
      render(
        <>
          <DashboardNavLink
            href="/dashboard/alumnos"
            onClick={close}
            onMouseEnter={handler}
            onFocus={handler}
            onTouchStart={handler}
          >
            Alumnos
          </DashboardNavLink>
          <DashboardNavLink href="/dashboard/horas">Horas</DashboardNavLink>
        </>
      );
      const link = screen.getByRole("link", { name: "Alumnos" });
      fireEvent[event](link);
      expect(link).toHaveAttribute("data-prefetch", "auto");
      expect(screen.getByRole("link", { name: "Horas" })).toHaveAttribute("data-prefetch", "off");
      expect(handler).toHaveBeenCalledTimes(1);
      fireEvent.click(link, { ctrlKey: true });
      expect(close).toHaveBeenCalledTimes(1);
      expect(link).toHaveAttribute("href", "/dashboard/alumnos");
    }
  );

  it("does not reuse a prior route's intent when a link changes destination", () => {
    const view = render(<DashboardNavLink href="/dashboard/alumnos">Abrir</DashboardNavLink>);
    fireEvent.focus(screen.getByRole("link"));
    view.rerender(<DashboardNavLink href="/dashboard/horas">Abrir</DashboardNavLink>);
    expect(screen.getByRole("link")).toHaveAttribute("data-prefetch", "off");
  });
});
