import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { escuela_id, nombre, email, password } = await request.json();

    if (!escuela_id || !nombre || !email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuración del servidor incompleta (SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let userId: string;

    // Intentar crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      const emailYaRegistrado =
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already been registered") ||
        authError.message.toLowerCase().includes("already exists");

      if (!emailYaRegistrado) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      // Buscar el usuario existente en auth.users
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const existingAuthUser = listData?.users?.find((u) => u.email === email);

      if (!existingAuthUser) {
        return NextResponse.json(
          { error: "El correo ya está registrado. Usa un correo diferente." },
          { status: 400 }
        );
      }

      // Verificar si tiene perfil activo vinculado a otra escuela
      const { data: perfilExistente } = await supabaseAdmin
        .from("perfiles")
        .select("id, escuela_id, rol")
        .eq("id", existingAuthUser.id)
        .maybeSingle();

      if (perfilExistente && perfilExistente.escuela_id) {
        // Usuario activo con perfil en otra escuela → no podemos reutilizarlo
        return NextResponse.json(
          { error: "El correo ya está en uso por otro administrador. Usa un correo diferente." },
          { status: 400 }
        );
      }

      // Usuario huérfano (sin perfil o sin escuela asignada): eliminarlo y recrearlo limpio
      await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);

      const { data: newAuthData, error: newAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (newAuthError || !newAuthData?.user) {
        return NextResponse.json(
          { error: newAuthError?.message || "Error al crear el usuario" },
          { status: 400 }
        );
      }

      userId = newAuthData.user.id;
    } else {
      userId = authData.user.id;
    }

    // Upsert perfil con rol admin_escuela
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
      // Rollback: eliminar el usuario recién creado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: perfilError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
