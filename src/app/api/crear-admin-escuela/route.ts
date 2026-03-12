import { NextResponse } from "next/server";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  ensureNonReservedAuthEmail,
  isAuthUserAlreadyRegisteredError,
  normalizeEmail,
  parseJsonBody,
} from "@/lib/api-auth";
import { createAdminEscuelaSchema } from "@/lib/schemas";
import { getRateLimitKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const authz = await authorizeApiRequest(["super_admin"]);
    if (!authz.ok) return authz.response;

    const limiter = rateLimit(
      getRateLimitKey(request, "api:create-admin-escuela", authz.perfil.id),
      10,
      15 * 60 * 1000
    );
    if (!limiter.ok) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });
    }

    const parsedBody = await parseJsonBody(request, createAdminEscuelaSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const escuela_id = parsedBody.data.escuela_id;
    const nombre = parsedBody.data.nombre.trim();
    const email = normalizeEmail(parsedBody.data.email);
    const password = parsedBody.data.password;

    if (!escuela_id || !nombre || !email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const reservedEmailError = ensureNonReservedAuthEmail(email);
    if (reservedEmailError) {
      return NextResponse.json({ error: reservedEmailError }, { status: 400 });
    }

    const supabaseAdmin = buildSupabaseAdminClient();
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        rol: "admin_escuela",
      },
    };

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser(createUserPayload);

    if (authError) {
      if (isAuthUserAlreadyRegisteredError(authError.message)) {
        return NextResponse.json(
          { error: "El correo ya está registrado. Usa un correo diferente." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "No se pudo crear el usuario administrador." },
        { status: 400 }
      );
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "No se pudo crear el usuario administrador." },
        { status: 400 }
      );
    }

    const { error: perfilError } = await supabaseAdmin.from("perfiles").upsert(
      {
        id: userId,
        escuela_id,
        sede_id: null,
        nombre,
        email,
        rol: "admin_escuela",
        activo: true,
      },
      { onConflict: "id" }
    );

    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "No se pudo guardar el perfil del administrador." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
