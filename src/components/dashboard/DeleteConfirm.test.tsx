import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import DeleteConfirm from "./DeleteConfirm";

it("mantiene visible una eliminacion pendiente al pulsar Escape, el fondo o cerrar", () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const view = render(<DeleteConfirm open loading onClose={onClose} onConfirm={onConfirm} />);
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.click(screen.getByRole("dialog"));
  fireEvent.click(screen.getByRole("button", { name: "Cerrar modal" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(onClose).not.toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();
  view.rerender(<DeleteConfirm open loading={false} onClose={onClose} onConfirm={onConfirm} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("permite cancelar y confirmar cuando no hay una eliminacion pendiente", () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(<DeleteConfirm open onClose={onClose} onConfirm={onConfirm} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
