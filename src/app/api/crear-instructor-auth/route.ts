import { NextResponse } from "next/server";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  ensureNonReservedAuthEmail,
  ensureSchoolScope,
  ensureSedeScope,
  findAuthUserByEmail,
  normalizeCedula,
  normalizeEmail,
  parseJsonBody,
  isAuthUserAlreadyRegisteredError,
} from "@/lib/api-auth";
import { createInstructorSchema } from "@/lib/schemas";
import { getRateLimitKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const authz = await authorizeApiRequest(["super_admin", "admin_escuela", "admin_sede", "administrativo"]);
    if (!authz.ok) return authz.response;

    const limiter = rateLimit(
      getRateLimitKey(request, "api:create-instructor-auth", authz.perfil.id),
      20,
      15 * 60 * 1000
    );
    if (!limiter.ok) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });
    }

    const parsedBody = await parseJsonBody(request, createInstructorSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const nombre = parsedBody.data.nombre.trim();
    const email = normalizeEmail(parsedBody.data.email);
    const dni = normalizeCedula(parsedBody.data.dni);
    const escuela_id = parsedBody.data.escuela_id;
    const sede_id = parsedBody.data.sede_id;

    if (!nombre || !dni || !escuela_id || !sede_id) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const reservedEmailError = ensureNonReservedAuthEmail(email);
    if (reservedEmailError) {
      return NextResponse.json({ error: reservedEmailError }, { status: 400 });
    }

    const schoolScopeError = ensureSchoolScope(authz.perfil, escuela_id);
    if (schoolScopeError) {
      return NextResponse.json({ error: schoolScopeError }, { status: 403 });
    }

    const sedeScopeError = ensureSedeScope(authz.perfil, sede_id);
    if (sedeScopeError) {
      return NextResponse.json({ error: sedeScopeError }, { status: 403 });
    }

    const supabaseAdmin = buildSupabaseAdminClient();
    const { data: perfilConCedula } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .eq("cedula", dni)
      .maybeSingle();

    if (perfilConCedula) {
      return NextResponse.json(
        { error: "La cédula o correo ya tiene una cuenta registrada." },
        { status: 400 }
      );
    }

    const authEmail = email || `${dni}@instructor.local`;
    const authPassword = dni;
    const existingUser = await findAuthUserByEmail(supabaseAdmin, authEmail);

    if (existingUser) {
      const { data: perfilExistente } = await supabaseAdmin
        .from("perfiles")
        .select("id, escuela_id")
        .eq("id", existingUser.id)
        .maybeSingle();

      if (perfilExistente || email) {
        return NextResponse.json(
          { error: "La cédula o correo ya tiene una cuenta registrada." },
          { status: 400 }
        );
      }

      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: authPassword,
      email_confirm: true,
      user_metadata: {
        nombre,
        rol: "instructor",
        debe_cambiar_password: true,
      },
    });

    if (authError || !authData?.user) {
      if (isAuthUserAlreadyRegisteredError(authError?.message)) {
        return NextResponse.json(
          { error: "La cédula o correo ya tiene una cuenta registrada." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "No se pudo crear el usuario instructor." },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    const { error: perfilError } = await supabaseAdmin.from("perfiles").upsert(
      {
        id: userId,
        escuela_id,
        sede_id,
        nombre,
        email: authEmail,
        rol: "instructor",
        cedula: dni,
        activo: true,
      },
      { onConflict: "id" }
    );

    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "No se pudo guardar el perfil del usuario." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
