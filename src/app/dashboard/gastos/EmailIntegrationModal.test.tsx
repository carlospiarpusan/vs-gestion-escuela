import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import EmailIntegrationModal from "./EmailIntegrationModal";
import { emptyEmailIntegrationForm } from "./constants";
vi.mock("@/lib/supabase", () => ({ createClient: () => ({}) }));
vi.mock("@/hooks/useDeviceVariant", () => ({ useIsMobileVariant: () => false }));
const network = vi.fn();
const props = () => ({
  open: true,
  onClose: vi.fn(),
  emailIntegration: null,
  emailForm: {
    ...emptyEmailIntegrationForm,
    sede_id: "school-branch",
    from_filter: "proveedor@example.com",
  },
  setEmailForm: vi.fn(),
  sedesOptions: [{ id: "school-branch", nombre: "Principal" }],
  emailError: "",
  emailSaving: false,
  onSave: vi.fn(),
  onEmailAddressChange: vi.fn(),
  oauthProviders: { gmail_google: true, outlook_microsoft: true },
});
beforeEach(() => {
  network.mockReset();
  vi.stubGlobal("fetch", network);
});
afterEach(() => {
  vi.unstubAllGlobals();
});
it("shows real Google and Microsoft connection buttons without asking for their passwords", () => {
  render(<EmailIntegrationModal {...props()} />);
  expect(screen.getByRole("button", { name: "Conectar Google" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Conectar Microsoft / Hotmail" })).toBeEnabled();
  expect(screen.queryByText("App password *")).not.toBeInTheDocument();
});
it.each([
  ["Google", "gmail_google"],
  ["Microsoft / Hotmail", "outlook_microsoft"],
])(
  "starts %s with the selected sede and filters, and shows server failures",
  async (name, provider) => {
    network.mockResolvedValue(
      new Response(JSON.stringify({ error: "Configuración pendiente" }), { status: 400 })
    );
    render(<EmailIntegrationModal {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: `Conectar ${name}` }));
    await screen.findByText("Configuración pendiente");
    const body = JSON.parse(network.mock.calls[0][1].body);
    expect(body).toMatchObject({
      provider,
      sede_id: "school-branch",
      from_filter: "proveedor@example.com",
    });
    expect(body).not.toHaveProperty("imap_password");
    expect(body.import_only_unseen).toBe(false);
    expect(body.auto_sync).toBe(true);
  }
);
it("explains missing provider configuration and disables unavailable connections", () => {
  render(
    <EmailIntegrationModal
      {...props()}
      oauthProviders={{ gmail_google: false, outlook_microsoft: false }}
    />
  );
  expect(screen.getByRole("button", { name: "Conectar Google" })).toBeDisabled();
  expect(screen.getByText(/Conexión pendiente de configuración/)).toBeInTheDocument();
});
it("can replace a connected Google mailbox without restricting the account selector to its address", async () => {
  network.mockResolvedValue(
    new Response(JSON.stringify({ error: "Respuesta de prueba" }), { status: 400 })
  );
  const current = props();
  render(
    <EmailIntegrationModal
      {...current}
      emailForm={{ ...current.emailForm, correo: "anterior@gmail.com" }}
      emailIntegration={{
        id: "connection",
        escuela_id: "school",
        sede_id: "school-branch",
        created_by: null,
        updated_by: null,
        provider: "gmail_google",
        correo: "anterior@gmail.com",
        imap_host: "",
        imap_port: 993,
        imap_secure: true,
        imap_user: "",
        mailbox: "INBOX",
        from_filter: null,
        subject_filter: null,
        import_only_unseen: false,
        auto_sync: true,
        activa: true,
        last_uid: null,
        last_synced_at: null,
        last_error: null,
        created_at: "2026-10-19T00:00:00Z",
        updated_at: "2026-10-19T00:00:00Z",
        has_password: false,
      }}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Cambiar cuenta de Google" }));
  await screen.findByText("Respuesta de prueba");
  const body = JSON.parse(network.mock.calls[0][1].body);
  expect(body).toMatchObject({ provider: "gmail_google", sede_id: "school-branch" });
  expect(body).not.toHaveProperty("correo");
  expect(body).not.toHaveProperty("login_hint");
});
it("requires a destination sede", () => {
  const current = props();
  render(<EmailIntegrationModal {...current} emailForm={{ ...current.emailForm, sede_id: "" }} />);
  expect(screen.getByRole("button", { name: "Conectar Google" })).toBeDisabled();
  expect(screen.getByText(/Selecciona la sede contable/)).toBeInTheDocument();
});
it("preserves manual IMAP setup for other providers", () => {
  const current = props();
  render(<EmailIntegrationModal {...current} />);
  fireEvent.click(screen.getByRole("button", { name: "Usar otro correo (IMAP)" }));
  expect(screen.getByText("App password *")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Conectar correo" }));
  expect(current.onSave).toHaveBeenCalledTimes(1);
});
it("prevents closing the dialog while the authorization request is pending", async () => {
  network.mockReturnValue(new Promise(() => {}));
  const current = props();
  render(<EmailIntegrationModal {...current} />);
  fireEvent.click(screen.getByRole("button", { name: "Conectar Google" }));
  await waitFor(() => expect(network).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(current.onClose).not.toHaveBeenCalled();
});
