import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

describe("Modal portal", () => {
  it("renders outside the page stacking context and cleans up on close", () => {
    const view = render(
      <main style={{ position: "relative", zIndex: 10 }}>
        <Modal open title="Formulario" onClose={vi.fn()}>
          <button>Guardar</button>
        </Modal>
      </main>
    );
    const dialog = screen.getByRole("dialog", { name: "Formulario" });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass("z-[100]");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeVisible();
    view.unmount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Escape, overlay and close button behavior", () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Formulario" onClose={onClose}>
        <button>Guardar</button>
      </Modal>
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar modal" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("does not mount a closed modal or react to Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open={false} title="Formulario" onClose={onClose}>
        Contenido
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
