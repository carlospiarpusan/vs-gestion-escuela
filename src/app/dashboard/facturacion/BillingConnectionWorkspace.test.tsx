import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BillingConnectionWorkspace from "./BillingConnectionWorkspace";
import { VS_BILLING_SCHOOL } from "@/lib/vs-billing/scope";

const fetchMock = vi.fn();
const key = {
  id: "10000000-0000-4000-8000-000000000001",
  nombre: "vs-facturacion",
  identificador: "cs_vsf_...demo",
  created_at: "2026-01-01T12:00:00Z",
  expires_at: "2099-12-31T12:00:00Z",
  last_used_at: null,
  revoked_at: null,
};
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(response({ empresa: VS_BILLING_SCHOOL, claves: [] }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("conexion de facturacion", () => {
  it("muestra los datos compartidos y excluidos, sin controles de emision", async () => {
    render(<BillingConnectionWorkspace />);
    await screen.findByText(VS_BILLING_SCHOOL.razonSocial);
    expect(screen.getByText("Sin matriculas, cursos ni valores")).toBeInTheDocument();
    expect(screen.getByText("alumnos:leer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Emitir" })).not.toBeInTheDocument();
  });
  it("no genera claves automaticamente ni al abrir la confirmacion", async () => {
    render(<BillingConnectionWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Generar clave" }));
    expect(screen.getByRole("button", { name: "Confirmar nueva clave" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("crea una clave solo tras confirmar y permite ocultarla", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ empresa: VS_BILLING_SCHOOL, claves: [] }))
      .mockResolvedValueOnce(response({ clave: key, token: "FAKE-TEST-TOKEN" }))
      .mockResolvedValueOnce(response({ empresa: VS_BILLING_SCHOOL, claves: [key] }));
    render(<BillingConnectionWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Generar clave" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar nueva clave" }));
    const secret = await screen.findByLabelText("Clave API");
    expect(secret).toHaveValue("FAKE-TEST-TOKEN");
    expect(secret).toHaveAttribute("type", "password");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      nombre: "vs-facturacion",
      confirmar_rotacion: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "Ocultar definitivamente la clave" }));
    expect(screen.queryByLabelText("Clave API")).not.toBeInTheDocument();
  });
  it("pide confirmacion antes de revocar", async () => {
    fetchMock.mockResolvedValue(response({ empresa: VS_BILLING_SCHOOL, claves: [key] }));
    render(<BillingConnectionWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Revocar vs-facturacion" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("button", { name: "Confirmar revocacion" })).not.toBeInTheDocument();
  });
  it("permite generar una clave sin vencimiento mediante eleccion explicita", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ empresa: VS_BILLING_SCHOOL, claves: [] }))
      .mockResolvedValueOnce(
        response({ clave: { ...key, expires_at: null }, token: "FAKE-TEST-TOKEN" })
      )
      .mockResolvedValueOnce(
        response({ empresa: VS_BILLING_SCHOOL, claves: [{ ...key, expires_at: null }] })
      );
    render(<BillingConnectionWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Generar clave" }));
    expect(screen.getByLabelText("Vigencia")).toHaveValue("90");
    fireEvent.change(screen.getByLabelText("Vigencia"), { target: { value: "sin_vencimiento" } });
    expect(screen.getByText(/La clave no caducara por tiempo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar nueva clave" }));
    await screen.findByLabelText("Clave API");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      nombre: "vs-facturacion",
      confirmar_rotacion: true,
      expires_at: null,
    });
    expect(await screen.findByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Sin vencimiento")).toBeInTheDocument();
  });
  it("edita a sin vencimiento sin rotar la clave", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ empresa: VS_BILLING_SCHOOL, claves: [key] }))
      .mockResolvedValueOnce(response({ clave: { ...key, expires_at: null } }))
      .mockResolvedValueOnce(
        response({ empresa: VS_BILLING_SCHOOL, claves: [{ ...key, expires_at: null }] })
      );
    render(<BillingConnectionWorkspace />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Cambiar vigencia de vs-facturacion" })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Fecha y hora de Bogota")).toHaveValue("2099-12-31T07:00");
    fireEvent.change(screen.getByLabelText("Vigencia"), { target: { value: "sin_vencimiento" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar vigencia" }));
    expect(
      await screen.findByText("Vigencia actualizada. La clave sigue siendo la misma.")
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ id: key.id, expires_at: null });
    expect(screen.queryByLabelText("Clave API")).not.toBeInTheDocument();
  });
  it("interpreta la fecha personalizada en Bogota y permite limitar una clave permanente", async () => {
    fetchMock
      .mockResolvedValueOnce(
        response({ empresa: VS_BILLING_SCHOOL, claves: [{ ...key, expires_at: null }] })
      )
      .mockResolvedValueOnce(response({ clave: key }))
      .mockResolvedValueOnce(response({ empresa: VS_BILLING_SCHOOL, claves: [key] }));
    render(<BillingConnectionWorkspace />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Cambiar vigencia de vs-facturacion" })
    );
    expect(screen.getByLabelText("Vigencia")).toHaveValue("sin_vencimiento");
    fireEvent.change(screen.getByLabelText("Vigencia"), { target: { value: "fecha" } });
    fireEvent.change(screen.getByLabelText("Fecha y hora de Bogota"), {
      target: { value: "2099-12-30T23:59" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar vigencia" }));
    await screen.findByText("Vigencia actualizada. La clave sigue siendo la misma.");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      id: key.id,
      expires_at: "2099-12-31T04:59:00.000Z",
    });
  });
  it("cancelar eliminacion no envia cambios y confirmar quita la conexion", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ empresa: VS_BILLING_SCHOOL, claves: [key] }))
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response({ empresa: VS_BILLING_SCHOOL, claves: [] }));
    render(<BillingConnectionWorkspace />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Eliminar conexion vs-facturacion" })
    );
    expect(screen.getByText(/Se conservara el registro de auditoria/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar conexion vs-facturacion" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminacion" }));
    expect(await screen.findByText("Sin claves creadas.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ id: key.id, accion: "eliminar" });
  });
  it("una clave revocada solo puede eliminarse, no editarse", async () => {
    fetchMock.mockResolvedValue(
      response({
        empresa: VS_BILLING_SCHOOL,
        claves: [{ ...key, revoked_at: "2026-01-02T12:00:00Z" }],
      })
    );
    render(<BillingConnectionWorkspace />);
    await screen.findByRole("button", { name: "Eliminar conexion vs-facturacion" });
    expect(
      screen.queryByRole("button", { name: "Cambiar vigencia de vs-facturacion" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Revocar vs-facturacion" })
    ).not.toBeInTheDocument();
  });
  it("un fallo al guardar conserva el formulario y no declara exito", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ empresa: VS_BILLING_SCHOOL, claves: [key] }))
      .mockResolvedValueOnce(response({ error: "No se pudo guardar." }, false));
    render(<BillingConnectionWorkspace />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Cambiar vigencia de vs-facturacion" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar vigencia" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
    expect(screen.getByRole("button", { name: "Guardar vigencia" })).toBeEnabled();
    expect(
      screen.queryByText("Vigencia actualizada. La clave sigue siendo la misma.")
    ).not.toBeInTheDocument();
  });
  it("permite recuperar un fallo sin mostrar datos anteriores", async () => {
    fetchMock.mockResolvedValueOnce(response({ error: "Conexion no disponible." }, false));
    render(<BillingConnectionWorkspace />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Conexion no disponible.");
    fireEvent.click(screen.getByRole("button", { name: "Recargar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(await screen.findByText(VS_BILLING_SCHOOL.razonSocial)).toBeInTheDocument();
  });
});
