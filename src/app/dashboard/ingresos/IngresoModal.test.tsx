import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import IngresoModal from "./IngresoModal";
import * as constants from "./constants";

vi.mock("@/hooks/useDeviceVariant", () => ({ useIsMobileVariant: () => false }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("large student selector in income forms", () => {
  it("does not rebuild 1000 options while editing unrelated fields", () => {
    const label = vi.spyOn(constants, "formatAlumnoOptionLabel");
    const alumnos = Array.from({ length: 1000 }, (_, index) => ({
      id: `student-${index}`,
      nombre: `Alumno ${index}`,
      apellidos: "Prueba",
      dni: String(index),
    }));
    const props = {
      open: true,
      editing: null,
      error: "",
      form: constants.emptyForm,
      alumnos,
      matriculasDisponibles: [],
      saving: false,
      setForm: vi.fn(),
      onAlumnoChange: vi.fn(),
      onClose: vi.fn(),
      onSave: vi.fn(),
    };
    const view = render(<IngresoModal {...props} />);
    expect(label).toHaveBeenCalledTimes(1000);
    for (let index = 0; index < 10; index += 1) {
      view.rerender(
        <IngresoModal
          {...props}
          form={{ ...props.form, concepto: `Concepto ${index}`, monto: String(index + 1) }}
        />
      );
    }
    expect(label).toHaveBeenCalledTimes(1000);
    expect(
      screen.getByRole("combobox", { name: "Alumno" }).querySelectorAll("option")
    ).toHaveLength(1001);
  });

  it("still updates selection, labels and catalogs when they actually change", () => {
    const alumnos = [{ id: "student", nombre: "Ana", apellidos: "Prueba", dni: "123" }];
    const props = {
      open: true,
      editing: null,
      error: "",
      form: constants.emptyForm,
      alumnos,
      matriculasDisponibles: [],
      saving: false,
      setForm: vi.fn(),
      onAlumnoChange: vi.fn(),
      onClose: vi.fn(),
      onSave: vi.fn(),
    };
    const view = render(<IngresoModal {...props} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Alumno" }), {
      target: { value: "student" },
    });
    expect(props.onAlumnoChange).toHaveBeenCalledWith("student");
    view.rerender(<IngresoModal {...props} form={{ ...props.form, alumno_id: "student" }} />);
    expect(screen.getByRole("combobox", { name: "Alumno" })).toHaveValue("student");
    expect(screen.getByText("Ana Prueba")).toBeDefined();
    view.rerender(
      <IngresoModal
        {...props}
        alumnos={[...alumnos, { id: "new", nombre: "Luis", apellidos: "Nuevo", dni: "456" }]}
      />
    );
    expect(screen.getByRole("option", { name: /Luis Nuevo/ })).toBeDefined();
  });
});
