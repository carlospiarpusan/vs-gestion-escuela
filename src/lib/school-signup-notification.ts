const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_NOTIFY_TO = "carlospt@live.com";
const DEFAULT_FROM = "ConduSoft <onboarding@resend.dev>";

export type SchoolSignupNotification = {
  escuelaId: string;
  escuela: string;
  nombre: string;
  email: string;
  registeredAt?: Date;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseRecipients(value: string | undefined) {
  return (value ?? DEFAULT_NOTIFY_TO)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildSchoolSignupEmail(data: SchoolSignupNotification) {
  const when = (data.registeredAt ?? new Date()).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const rows: Array<[string, string]> = [
    ["Escuela", data.escuela],
    ["Administrador", data.nombre],
    ["Correo", data.email],
    ["Fecha", when],
    ["ID", data.escuelaId],
  ];

  return {
    subject: `Nueva escuela registrada: ${data.escuela}`,
    text: rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
    html: `<h2 style="font-family:sans-serif">Nueva escuela registrada</h2><table style="font-family:sans-serif;font-size:14px">${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:2px 12px 2px 0;color:#666">${label}</td><td>${escapeHtml(value)}</td></tr>`
      )
      .join("")}</table>`,
  };
}

/**
 * Avisa por correo que una escuela se registró. Nunca lanza: un fallo del
 * proveedor de correo no debe afectar el registro.
 */
export async function notifySchoolSignup(
  data: SchoolSignupNotification,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[school-signup-notification] RESEND_API_KEY no configurada; aviso omitido");
    return false;
  }

  const to = parseRecipients(process.env.SCHOOL_SIGNUP_NOTIFY_EMAIL);
  if (to.length === 0) return false;

  const message = buildSchoolSignupEmail(data);

  try {
    const response = await fetchImpl(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATIONS_FROM_EMAIL?.trim() || DEFAULT_FROM,
        to,
        reply_to: data.email,
        ...message,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(
        "[school-signup-notification] envío fallido",
        response.status,
        await response.text().catch(() => "")
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[school-signup-notification] envío fallido", error);
    return false;
  }
}
