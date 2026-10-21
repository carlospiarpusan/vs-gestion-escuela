import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AnsvFields from "./AnsvFields";
import { calculateAnsv } from "@/lib/ansv";

const props = {
  birth: "1986-01-01",
  sex: "M",
  date: "2026-09-01",
  categories: ["A2", "B1"],
  category: "",
  onCategory: vi.fn(),
};
it("avisa inmediatamente de un nacimiento que produce edad incorrecta para ANSV", () => {
  render(<AnsvFields {...props} categories={["B1"]} category="B1" birth="2019-11-20" sex="F" />);
  expect(screen.getByRole("status")).toHaveTextContent(
    /Revisa la fecha de nacimiento.*al menos 16 años/
  );
});
it("exige escoger la categoría principal de un combo y muestra ambos valores", () => {
  const view = render(<AnsvFields {...props} />);
  const select = screen.getByRole("combobox", { name: /Categoría principal para ANSV/ });
  expect(select).toBeRequired();
  expect(select).toHaveValue("");
  fireEvent.change(select, { target: { value: "A2" } });
  expect(props.onCategory).toHaveBeenCalledWith("A2");
  view.rerender(<AnsvFields {...props} category="A2" />);
  expect(screen.getByRole("status")).toHaveTextContent("ANSV A2: $9.500");
  expect(screen.getByText("A2: $9.500 · B1: $9.400")).toBeInTheDocument();
});
it("muestra el importe histórico del contrato aunque cambie la ficha del alumno", () => {
  const saved = calculateAnsv(
    {
      fechaNacimiento: props.birth,
      sexo: props.sex,
      fechaMatricula: props.date,
      categorias: props.categories,
      categoria: "A2",
    },
    "2026-10-19"
  );
  render(<AnsvFields {...props} birth="2006-01-01" saved={saved} category="A2" />);
  expect(screen.getByRole("status")).toHaveTextContent("$9.500 COP · 40 años");
});
