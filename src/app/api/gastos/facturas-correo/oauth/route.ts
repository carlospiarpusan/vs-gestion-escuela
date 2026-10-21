import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  ensureSchoolScope,
  getStaffReadSedeScope,
  ensureSedeScope,
  parseJsonBody,
  resolveEscuelaIdForRequest,
} from "@/lib/api-auth";
import { getAuditedRolesForCapabilityAction } from "@/lib/role-capabilities";
import {
  createMailAuthorization,
  exchangeMailToken,
  mailAccountAddress,
} from "@/lib/email-oauth-providers";
import {
  assertEmailInvoiceSedeScope,
  decryptSecret,
  encryptSecret,
  saveOAuthEmailIntegration,
} from "@/lib/email-invoice-sync";
import { getSiteUrl } from "@/lib/site-metadata";

export const runtime = "nodejs";
const COOKIE = "invoice_mail_oauth";
const PATH = "/api/gastos/facturas-correo/oauth";
const roles = getAuditedRolesForCapabilityAction("automation", "configure");
const inputSchema = z.object({
  provider: z.enum(["gmail_google", "outlook_microsoft"]),
  escuela_id: z.string().uuid().optional(),
  sede_id: z.string().uuid(),
  from_filter: z.string().trim().max(160).default(""),
  subject_filter: z.string().trim().max(160).default(""),
  import_only_unseen: z.boolean().default(false),
  auto_sync: z.boolean().default(true),
});
const stateSchema = z.object({
  state: z.string(),
  verifier: z.string(),
  actor: z.string().uuid(),
  school: z.string().uuid(),
  origin: z.string().url(),
  expires: z.number(),
  input: inputSchema,
});
function trustedOrigin(request: Request) {
  const origin = new URL(request.url).origin;
  const expected = getSiteUrl();
  const host = new URL(origin);
  const hostname = expected.hostname.replace(/^www\./, "");
  if (
    origin === expected.origin ||
    (host.protocol === "https:" && [hostname, `www.${hostname}`].includes(host.hostname)) ||
    (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(host.hostname))
  )
    return origin;
  throw new Error("Abre ConduSoft desde su dominio principal para conectar el correo.");
}
async function validSede(school: string, sede: string) {
  const { data, error } = await buildSupabaseAdminClient()
    .from("sedes")
    .select("id")
    .eq("id", sede)
    .eq("escuela_id", school)
    .maybeSingle();
  return !error && Boolean(data);
}
export async function POST(request: Request) {
  const auth = await authorizeApiRequest(roles, request);
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonBody(request, inputSchema);
  if (!parsed.ok) return parsed.response;
  const school = resolveEscuelaIdForRequest(request, auth.perfil, parsed.data.escuela_id);
  if (
    !school ||
    ensureSchoolScope(auth.perfil, school) ||
    ensureSedeScope(auth.perfil, parsed.data.sede_id)
  )
    return NextResponse.json({ error: "No tienes acceso a esa escuela o sede." }, { status: 403 });
  try {
    const origin = trustedOrigin(request);
    if (request.headers.get("origin") !== origin)
      return NextResponse.json({ error: "Origen de solicitud inválido." }, { status: 403 });
    if (!(await validSede(school, parsed.data.sede_id)))
      return NextResponse.json(
        { error: "La sede no pertenece a la escuela activa." },
        { status: 403 }
      );
    await assertEmailInvoiceSedeScope(school, getStaffReadSedeScope(auth.perfil).sedeId);
    const flow = createMailAuthorization(parsed.data.provider, `${origin}${PATH}`);
    const encrypted = encryptSecret(
      JSON.stringify({
        ...flow,
        url: undefined,
        actor: auth.perfil.id,
        school,
        input: parsed.data,
        origin,
        expires: Date.now() + 10 * 60_000,
      })
    );
    (await cookies()).set(COOKIE, encrypted, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https:"),
      path: PATH,
      maxAge: 600,
    });
    return NextResponse.json({ url: flow.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo conectar el correo." },
      { status: 400 }
    );
  }
}
export async function GET(request: Request) {
  const jar = await cookies();
  const encrypted = jar.get(COOKIE)?.value;
  jar.delete({ name: COOKIE, path: PATH });
  // Providers return through a cross-site GET. The encrypted, browser-bound state
  // below replaces the usual same-origin CSRF check for this callback only.
  const auth = await authorizeApiRequest(roles, { request, skipCsrf: true });
  if (!auth.ok) return auth.response;
  const origin = trustedOrigin(request);
  const destination = new URL("/dashboard/gastos?section=facturas", origin);
  try {
    const query = new URL(request.url).searchParams;
    if (!encrypted) throw new Error("state");
    const state = stateSchema.parse(JSON.parse(decryptSecret(encrypted)));
    if (
      state.expires < Date.now() ||
      state.actor !== auth.perfil.id ||
      state.origin !== origin ||
      state.state !== query.get("state")
    )
      throw new Error("state");
    if (query.has("error") || !query.get("code")) throw new Error("consent");
    if (
      ensureSchoolScope(auth.perfil, state.school) ||
      ensureSedeScope(auth.perfil, state.input.sede_id) ||
      !(await validSede(state.school, state.input.sede_id))
    )
      throw new Error("scope");
    await assertEmailInvoiceSedeScope(state.school, getStaffReadSedeScope(auth.perfil).sedeId);
    const token = await exchangeMailToken(state.input.provider, {
      code: query.get("code")!,
      verifier: state.verifier,
      redirectUri: `${origin}${PATH}`,
    });
    if (!token.refreshToken) throw new Error("refresh");
    const correo = await mailAccountAddress(state.input.provider, token.accessToken);
    await saveOAuthEmailIntegration({
      escuelaId: state.school,
      sedeId: state.input.sede_id,
      actorId: auth.perfil.id,
      provider: state.input.provider,
      correo,
      refreshToken: token.refreshToken,
      fromFilter: state.input.from_filter || null,
      subjectFilter: state.input.subject_filter || null,
      importOnlyUnseen: state.input.import_only_unseen,
      autoSync: state.input.auto_sync,
    });
    destination.searchParams.set("mail", "connected");
  } catch {
    destination.searchParams.set("mail", "failed");
  }
  return NextResponse.redirect(destination, {
    status: 303,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
