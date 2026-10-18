import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SchoolRetentionPanel from "./SchoolRetentionPanel";

const schoolId = "10000000-0000-4000-8000-000000000001";
const fetcher = vi.fn();
const data = { schoolState: "inactiva", cases: [], events: [], lastCheckedAt: null };
beforeEach(() => {
  fetcher.mockReset();
  fetcher.mockImplementation(async () => Response.json(data));
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => vi.unstubAllGlobals());
it("solo permite registrar una baja documentada y confirmada", async () => {
  const changed = vi.fn();
  render(<SchoolRetentionPanel schoolId={schoolId} canManage onChanged={changed} />);
  const save = await screen.findByRole("button", { name: "Registrar baja" });
  expect(save).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Referencia del soporte de cancelacion"), {
    target: { value: "ticket-demo" },
  });
  expect(save).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(save).toBeEnabled();
  fireEvent.click(save);
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  const writes = fetcher.mock.calls.filter((call) => call[1]?.method === "POST");
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0][1].body)).toMatchObject({
    action: "record",
    schoolId,
    evidenceRef: "ticket-demo",
    confirmed: true,
  });
});
it.each(["activa", "suspendida"])(
  "no muestra alta de baja para una escuela %s",
  async (schoolState) => {
    fetcher.mockImplementation(async () => Response.json({ ...data, schoolState }));
    render(<SchoolRetentionPanel schoolId={schoolId} canManage onChanged={vi.fn()} />);
    await screen.findByText("Sin baja definitiva registrada.");
    expect(screen.queryByRole("button", { name: "Registrar baja" })).toBeNull();
  }
);
it("el administrador de escuela solo ve la informacion", async () => {
  fetcher.mockImplementation(async () =>
    Response.json({
      ...data,
      cases: [
        {
          id: schoolId,
          state: "review_due",
          cancelled_on: "2026-01-01",
          review_due_on: "2026-07-01",
          evidence_ref: "ticket-demo",
        },
      ],
    })
  );
  render(<SchoolRetentionPanel schoolId={schoolId} canManage={false} onChanged={vi.fn()} />);
  await screen.findByText("Revision de eliminacion pendiente");
  expect(screen.queryByRole("button", { name: "Retirar baja" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Justificar conservacion" })).toBeNull();
});
it("un fallo conserva el soporte escrito y nunca muestra un exito falso", async () => {
  fetcher.mockImplementation(async (_url, options) =>
    options?.method === "POST"
      ? Response.json({ error: "La escuela fue reactivada" }, { status: 409 })
      : Response.json(data)
  );
  const changed = vi.fn();
  render(<SchoolRetentionPanel schoolId={schoolId} canManage onChanged={changed} />);
  await screen.findByRole("button", { name: "Registrar baja" });
  fireEvent.change(screen.getByLabelText("Referencia del soporte de cancelacion"), {
    target: { value: "ticket-demo" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Registrar baja" }));
  await screen.findByText("La escuela fue reactivada");
  expect(screen.getByLabelText("Referencia del soporte de cancelacion")).toHaveValue("ticket-demo");
  expect(changed).not.toHaveBeenCalled();
});
it("guarda la fecha seleccionada con el evento nativo de entrada", async () => {
  const changed = vi.fn();
  render(<SchoolRetentionPanel schoolId={schoolId} canManage onChanged={changed} />);
  await screen.findByRole("button", { name: "Registrar baja" });
  fireEvent.input(screen.getByLabelText("Fecha de baja definitiva"), {
    target: { value: "2026-08-31" },
  });
  fireEvent.change(screen.getByLabelText("Referencia del soporte de cancelacion"), {
    target: { value: "ticket-demo" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Registrar baja" }));
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  const write = fetcher.mock.calls.find((call) => call[1]?.method === "POST");
  expect(JSON.parse(write![1].body).cancelledOn).toBe("2026-08-31");
});
it("exige soporte y fecha para justificar una conservacion adicional", async () => {
  fetcher.mockImplementation(async () =>
    Response.json({
      ...data,
      cases: [
        {
          id: schoolId,
          state: "review_due",
          cancelled_on: "2026-01-01",
          review_due_on: "2026-07-01",
          evidence_ref: "ticket-demo",
        },
      ],
    })
  );
  const changed = vi.fn();
  render(<SchoolRetentionPanel schoolId={schoolId} canManage onChanged={changed} />);
  const hold = await screen.findByRole("button", { name: "Justificar conservacion" });
  expect(hold).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Justificacion o soporte de la decision"), {
    target: { value: "Conservacion de soportes" },
  });
  expect(hold).toBeDisabled();
  fireEvent.input(screen.getByLabelText("Proxima revision de conservacion"), {
    target: { value: "2027-01-20" },
  });
  expect(hold).toBeEnabled();
  fireEvent.click(hold);
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  const write = fetcher.mock.calls.find((call) => call[1]?.method === "POST");
  expect(JSON.parse(write![1].body)).toEqual({
    action: "hold",
    schoolId,
    caseId: schoolId,
    reason: "Conservacion de soportes",
    nextReviewOn: "2027-01-20",
  });
});
