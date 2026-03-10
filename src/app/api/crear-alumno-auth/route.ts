import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  authorizeApiRequest,
  ensureSchoolScope,
  ensureSedeScope,
  findAuthUserByEmail,
  normalizeCedula,
  normalizeEmail,
  normalizeText,
} from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const authz = await authorizeApiRequest(["super_admin", "admin_escuela", "admin_sede", "administrativo", "recepcion"]);
    if (!authz.ok) return authz.response;

    const body = await request.json();
    const nombre = normalizeText(body.nombre);
    const email = normalizeEmail(body.email);
    const dni = normalizeCedula(body.dni);
    const escuela_id = normalizeText(body.escuela_id);
    const sede_id = normalizeText(body.sede_id);

    if (!nombre || !dni || !escuela_id || !sede_id) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const schoolScopeError = ensureSchoolScope(authz.perfil, escuela_id);
    if (schoolScopeError) {
      return NextResponse.json({ error: schoolScopeError }, { status: 403 });
    }

    const sedeScopeError = ensureSedeScope(authz.perfil, sede_id);
    if (sedeScopeError) {
      return NextResponse.json({ error: sedeScopeError }, { status: 403 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authEmail = email || `${dni}@alumno.local`;
    const authPassword = dni;
    const existingUser = await findAuthUserByEmail(supabaseAdmin, authEmail);

    if (existingUser) {
      const { data: perfilExistente } = await supabaseAdmin
        .from("perfiles")
        .select("id, escuela_id")
        .eq("id", existingUser.id)
        .maybeSingle();

      if (perfilExistente?.escuela_id) {
        return NextResponse.json(
          { error: "La cédula o correo ya tiene una cuenta activa." },
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
        rol: "alumno",
        debe_cambiar_password: true,
        debe_completar_perfil: true,
      },
    });

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: authError?.message || "Error al crear el usuario" },
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
        rol: "alumno",
        cedula: dni,
        activo: true,
      },
      { onConflict: "id" }
    );

    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: perfilError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
