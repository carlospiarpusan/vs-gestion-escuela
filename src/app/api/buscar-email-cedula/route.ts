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

    // Buscar perfil cuya cédula coincida y que tenga email real (no @*.local)
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select("email, rol, activo")
      .eq("cedula", cedula.trim())
      .not("email", "like", "%@alumno.local")
      .not("email", "like", "%@instructor.local")
      .not("email", "like", "%@administrativo.local")
      .eq("activo", true)
      .maybeSingle();

    if (error || !data) {
      // No exponer si el usuario existe o no
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
