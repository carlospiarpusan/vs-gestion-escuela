import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/buscar-email-cedula
 * Dado un número de cédula, devuelve el email real del usuario en perfiles.
 * Se usa en el login cuando el usuario tiene email real (no @*.local).
 *
 * Body: { cedula: string }
 * Response: { email: string } | { error: string }
 */
export async function POST(request: Request) {
  try {
    const { cedula } = await request.json();
    if (!cedula) {
      return NextResponse.json({ error: "Cédula requerida" }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const trimmedCedula = cedula.trim();

    // 1. Buscar en perfiles por cédula
    const { data } = await supabaseAdmin
      .from("perfiles")
      .select("email, rol, activo")
      .eq("cedula", trimmedCedula)
      .eq("activo", true)
      .maybeSingle();

    if (data?.email) {
      return NextResponse.json({ email: data.email });
    }

    // 2. Fallback: buscar en instructores por DNI → obtener user_id → email del perfil
    const { data: inst } = await supabaseAdmin
      .from("instructores")
      .select("user_id")
      .eq("dni", trimmedCedula)
      .maybeSingle();

    if (inst?.user_id) {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("email")
        .eq("id", inst.user_id)
        .maybeSingle();
      if (perfil?.email) {
        return NextResponse.json({ email: perfil.email });
      }
    }

    // 3. Fallback: buscar en alumnos por DNI
    const { data: alumno } = await supabaseAdmin
      .from("alumnos")
      .select("user_id")
      .eq("dni", trimmedCedula)
      .maybeSingle();

    if (alumno?.user_id) {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("email")
        .eq("id", alumno.user_id)
        .maybeSingle();
      if (perfil?.email) {
        return NextResponse.json({ email: perfil.email });
      }
    }

    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
