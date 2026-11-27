import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSchoolSignupEmail, notifySchoolSignup } from "./school-signup-notification";

const data = {
  escuelaId: "school-1",
  escuela: "Escuela <Andes>",
  nombre: "Ana",
  email: "ana@example.com",
  registeredAt: new Date("2026-11-27T15:00:00Z"),
};

describe("school signup notification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("escapes user data in the HTML body", () => {
    const email = buildSchoolSignupEmail(data);
    expect(email.subject).toBe("Nueva escuela registrada: Escuela <Andes>");
    expect(email.html).toContain("Escuela &lt;Andes&gt;");
    expect(email.html).not.toContain("<Andes>");
    expect(email.text).toContain("Correo: ana@example.com");
  });

  it("skips sending when no API key is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn();
    await expect(notifySchoolSignup(data, fetchMock)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends to the default recipient", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SCHOOL_SIGNUP_NOTIFY_EMAIL", undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(notifySchoolSignup(data, fetchMock)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["carlospt@live.com"]);
    expect(body.reply_to).toBe("ana@example.com");
  });

  it("never throws when the provider fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    await expect(notifySchoolSignup(data, fetchMock)).resolves.toBe(false);
  });
});
