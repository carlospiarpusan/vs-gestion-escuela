import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { nombre, email, dni, escuela_id, sede_id } = await request.json();

    if (!nombre || !dni || !escuela_id || !sede_id) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
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

    // Email de auth: real si tiene, si no usa cedula@alumno.local
    const authEmail = email?.trim() ? email.trim().toLowerCase() : `${dni}@alumno.local`;
    const authPassword = dni; // Contraseña inicial = número de cédula

    // Verificar si ya existe un usuario con ese email
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = listData?.users?.find((u) => u.email === authEmail);

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

      // Usuario huérfano: eliminar y recrear
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    }

    // Crear usuario en Supabase Auth
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

    // Crear perfil del alumno
    const { error: perfilError } = await supabaseAdmin.from("perfiles").upsert(
      {
        id: userId,
        escuela_id,
        sede_id,
        nombre,
        email: authEmail,
        rol: "alumno",
        cedula: dni.trim(),
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
