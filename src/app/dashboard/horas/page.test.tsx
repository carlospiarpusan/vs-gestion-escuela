import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import HorasPage from "./page";

const mock = vi.hoisted(() => ({
  perfil: { id: "actor", rol: "admin_escuela", escuela_id: "school", sede_id: "branch" },
  mobile: true,
  request: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  updateResult: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ perfil: mock.perfil }) }));
vi.mock("@/hooks/useDeviceVariant", () => ({ useIsMobileVariant: () => mock.mobile }));
vi.mock("@/lib/retry", () => ({ fetchJsonWithRetry: mock.request }));
vi.mock("@/lib/dashboard-client-cache", () => ({
  getDashboardListCached: ({ loader }: { loader: () => unknown }) => loader(),
  invalidateDashboardClientCaches: vi.fn(),
}));
vi.mock("@/lib/server-cache-client", () => ({ revalidateTaggedServerCaches: mock.revalidate }));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    from: (table: string) =>
      table === "horas_trabajo"
        ? {
            upsert: mock.upsert,
            delete: () => ({ eq: () => ({ eq: mock.remove }) }),
          }
        : {
            update: (...args: unknown[]) => {
              mock.update(...args);
              return { eq: () => ({ select: () => ({ maybeSingle: mock.updateResult }) }) };
            },
          },
  }),
}));
let blobs: Blob[];
let downloads: string[];
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T15:00:00Z"));
  mock.perfil.rol = "admin_escuela";
  mock.mobile = true;
  mock.request.mockResolvedValue({
    instructores: [
      {
        id: "inst1",
        nombre: "Ana",
        apellidos: "Prueba",
        color: "#000000",
        sede_id: "branch",
        valor_hora: 1000,
      },
    ],
    horas: [{ instructor_id: "inst1", fecha: "2026-10-01", horas: 2 }],
    monthClosures: [],
  });
  mock.upsert.mockResolvedValue({ error: null });
  mock.remove.mockResolvedValue({ error: null });
  mock.updateResult.mockResolvedValue({ data: { id: "inst1" }, error: null });
  mock.revalidate.mockResolvedValue(undefined);
  blobs = [];
  downloads = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return "blob:test";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    downloads.push(this.download);
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function load() {
  render(<HorasPage />);
  return screen.findByRole("textbox", { name: "Ana día 1" });
}

function monthPayload(month: string, hours: number) {
  return {
    instructores: [
      { id: "inst1", nombre: "Ana", apellidos: "Prueba", sede_id: "branch", valor_hora: 1000 },
    ],
    horas: [{ instructor_id: "inst1", fecha: `2026-${month}-01`, horas: hours }],
    monthClosures: [],
  };
}

describe("hours actions", () => {
  it.each(["success", "failure"])(
    "a stale month %s never replaces the latest month",
    async (result) => {
      await load();
      let finish!: (value: ReturnType<typeof monthPayload>) => void;
      let fail!: (error: Error) => void;
      mock.request.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            finish = resolve;
            fail = reject;
          })
      );
      fireEvent.change(screen.getByRole("combobox", { name: "Mes" }), { target: { value: "8" } });
      mock.request.mockResolvedValueOnce(monthPayload("08", 7));
      fireEvent.change(screen.getByRole("combobox", { name: "Mes" }), { target: { value: "7" } });
      const cell = await screen.findByRole("textbox", { name: "Ana día 1" });
      expect(cell).toHaveValue("7");
      await act(async () => {
        if (result === "success") finish(monthPayload("09", 4));
        else fail(Error("old request failed"));
      });
      expect(cell).toHaveValue("7");
      expect(screen.getByRole("combobox", { name: "Mes" })).toHaveValue("7");
      expect(
        screen.queryByText("No se pudieron cargar las horas del mes.")
      ).not.toBeInTheDocument();
      fireEvent.change(cell, { target: { value: "8" } });
      fireEvent.blur(cell);
      await waitFor(() =>
        expect(mock.upsert).toHaveBeenCalledWith(
          expect.objectContaining({ fecha: "2026-08-01", horas: 8 }),
          { onConflict: "instructor_id,fecha" }
        )
      );
      await waitFor(() => expect(cell).toBeEnabled());
    }
  );
  it("an old request cannot unlock the grid while the selected month is loading", async () => {
    await load();
    let finishOld!: (value: ReturnType<typeof monthPayload>) => void;
    let finishNew!: (value: ReturnType<typeof monthPayload>) => void;
    mock.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    mock.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishNew = resolve;
        })
    );
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    await act(async () => finishOld(monthPayload("09", 4)));
    expect(screen.queryByRole("textbox", { name: "Ana día 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar Excel" })).toBeDisabled();
    await act(async () => finishNew(monthPayload("08", 7)));
    expect(screen.getByRole("textbox", { name: "Ana día 1" })).toHaveValue("7");
  });
  it.each(["hours", "rate"])(
    "a pending %s save blocks period changes, export and monthly closure",
    async (kind) => {
      mock.request.mockResolvedValueOnce(monthPayload("09", 2));
      render(<HorasPage />);
      fireEvent.change(screen.getByRole("combobox", { name: "Mes" }), { target: { value: "8" } });
      await screen.findByRole("textbox", { name: "Ana día 1" });
      let finish!: (value: { error: null; data: { id: string } }) => void;
      const mutation = kind === "hours" ? mock.upsert : mock.updateResult;
      mutation.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      const cell =
        kind === "hours"
          ? screen.getByRole("textbox", { name: "Ana día 1" })
          : screen.getByRole("spinbutton", { name: "Valor por hora de Ana" });
      fireEvent.change(cell, { target: { value: kind === "hours" ? "3" : "2000" } });
      fireEvent.blur(cell);
      expect(screen.getByRole("combobox", { name: "Mes" })).toBeDisabled();
      expect(screen.getByRole("combobox", { name: "Año" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Exportar Excel" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Generar gastos del mes" })).toBeDisabled();
      await act(async () => finish({ error: null, data: { id: "inst1" } }));
      expect(screen.getByRole("combobox", { name: "Mes" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Exportar Excel" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Generar gastos del mes" })).toBeEnabled();
    }
  );
  it.each([true, false])(
    "focusing and leaving an unchanged cell never writes (mobile=%s)",
    async (mobile) => {
      mock.mobile = mobile;
      const cell = await load();
      fireEvent.focus(cell);
      fireEvent.blur(cell);
      expect(mock.upsert).not.toHaveBeenCalled();
      expect(mock.remove).not.toHaveBeenCalled();
    }
  );
  it("read-only instructors never write when leaving a cell", async () => {
    mock.perfil.rol = "instructor";
    const cell = await load();
    expect(cell).toHaveAttribute("readonly");
    fireEvent.blur(cell);
    expect(mock.upsert).not.toHaveBeenCalled();
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it("a changed hour sends the correct instructor, date, branch and hours", async () => {
    const cell = await load();
    fireEvent.change(cell, { target: { value: "3" } });
    fireEvent.blur(cell);
    await waitFor(() =>
      expect(mock.upsert).toHaveBeenCalledWith(
        {
          escuela_id: "school",
          sede_id: "branch",
          instructor_id: "inst1",
          fecha: "2026-10-01",
          horas: 3,
        },
        { onConflict: "instructor_id,fecha" }
      )
    );
    await waitFor(() => expect(cell).toBeEnabled());
    expect(cell).toHaveValue("3");
  });
  it("an emptied hour deletes only that instructor's day", async () => {
    const cell = await load();
    fireEvent.change(cell, { target: { value: "" } });
    fireEvent.blur(cell);
    await waitFor(() => expect(mock.remove).toHaveBeenCalledWith("fecha", "2026-10-01"));
    expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("the same value does not cause a redundant write", async () => {
    const cell = await load();
    fireEvent.change(cell, { target: { value: "02" } });
    fireEvent.blur(cell);
    expect(mock.upsert).not.toHaveBeenCalled();
    expect(cell).toHaveValue("2");
  });
  it.each(["rejected promise", "database error"])(
    "%s restores the old hour and allows retry",
    async (failure) => {
      if (failure === "rejected promise") mock.upsert.mockRejectedValueOnce(Error("Network"));
      else mock.upsert.mockResolvedValueOnce({ error: { message: "Permission denied" } });
      const cell = await load();
      fireEvent.change(cell, { target: { value: "3" } });
      fireEvent.blur(cell);
      expect(await screen.findByText(/No se pudo guardar la hora/)).toBeInTheDocument();
      expect(cell).toHaveValue("2");
      expect(cell).toBeEnabled();
      fireEvent.change(cell, { target: { value: "4" } });
      fireEvent.blur(cell);
      await waitFor(() => expect(cell).toBeEnabled());
      expect(mock.upsert).toHaveBeenCalledTimes(2);
      expect(cell).toHaveValue("4");
    }
  );
  it("locks the cell until the current write finishes", async () => {
    let finish!: (value: { error: null }) => void;
    mock.upsert.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const cell = await load();
    fireEvent.change(cell, { target: { value: "3" } });
    fireEvent.blur(cell);
    expect(cell).toBeDisabled();
    fireEvent.blur(cell);
    expect(mock.upsert).toHaveBeenCalledTimes(1);
    await act(async () => finish({ error: null }));
    expect(cell).toBeEnabled();
  });
  it("a rate with zero returned rows is not presented as saved", async () => {
    mock.updateResult.mockResolvedValueOnce({ data: null, error: null });
    await load();
    const rate = screen.getByRole("spinbutton", { name: "Valor por hora de Ana" });
    fireEvent.change(rate, { target: { value: "2000" } });
    fireEvent.blur(rate);
    expect(await screen.findByText("No se pudo guardar el valor por hora.")).toBeInTheDocument();
    expect(rate).toHaveValue(1000);
    expect(rate).toBeEnabled();
  });
  it("rate network failures recover and unchanged rates are not sent", async () => {
    await load();
    const rate = screen.getByRole("spinbutton", { name: "Valor por hora de Ana" });
    fireEvent.blur(rate);
    expect(mock.update).not.toHaveBeenCalled();
    mock.updateResult.mockRejectedValueOnce(Error("network"));
    fireEvent.change(rate, { target: { value: "2000" } });
    fireEvent.blur(rate);
    expect(await screen.findByText("No se pudo guardar el valor por hora.")).toBeInTheDocument();
    expect(rate).toHaveValue(1000);
    expect(rate).toBeEnabled();
  });
  it("Excel creates an actual workbook with the displayed month and totals", async () => {
    await load();
    fireEvent.click(screen.getByRole("button", { name: /Excel|XLS/i }));
    await waitFor(() => expect(downloads).toEqual(["horas-2026-10.xlsx"]));
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blobs[0]);
    });
    const zip = await JSZip.loadAsync(bytes);
    expect(await zip.file("xl/workbook.xml")!.async("string")).toContain("Detalle diario");
    const detail = await zip.file("xl/worksheets/sheet2.xml")!.async("string");
    expect(detail).toContain("Ana Prueba");
    expect(detail).toContain("<v>2000</v>");
    const summary = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(summary).toContain("Octubre 2026");
    expect(blobs[0].type).toContain("spreadsheetml");
  });
  it("an export error is visible and the export control becomes usable again", async () => {
    URL.createObjectURL = vi.fn(() => {
      throw Error("No se pudo descargar");
    });
    await load();
    const button = screen.getByRole("button", { name: /Excel|XLS/i });
    fireEvent.click(button);
    expect(await screen.findByText("No se pudo descargar")).toBeInTheDocument();
    expect(button).toBeEnabled();
  });
});
