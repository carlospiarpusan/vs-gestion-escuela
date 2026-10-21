import { NextResponse } from "next/server";
import { APP_TIME_ZONE } from "@/lib/date-utils";
import {
  buildSupabaseAdminClient,
  createAuthUserWithRetryOnCollision,
  ensureNonReservedAuthEmail,
  isAuthUserAlreadyRegisteredError,
  normalizeEmail,
  parseJsonBody,
} from "@/lib/api-auth";
import { publicRegisterSchema } from "@/lib/schemas";
import { getRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { getServerDbPool } from "@/lib/server-db";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import {
  buildDashboardInvalidationTags,
  buildDashboardListInvalidationTags,
} from "@/lib/server-cache-tags";

type ProfessionalPlanDefaultsRow = {
  max_alumnos_default: number | string | null;
  max_sedes_default: number | string | null;
};

function toPositiveInt(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export async function POST(request: Request) {
  let createdAuthUserId: string | null = null;

  try {
    const limiter = await rateLimit(
      getRateLimitKey(request, "api:public-register"),
      6,
      15 * 60 * 1000
    );
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos de registro. Espera unos minutos e intenta de nuevo." },
        { status: 429 }
      );
    }

    const parsedBody = await parseJsonBody(request, publicRegisterSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const nombre = parsedBody.data.nombre.trim();
    const email = normalizeEmail(parsedBody.data.email);
    const escuela = parsedBody.data.escuela.trim();
    const password = parsedBody.data.password;

    if (!nombre || !email || !escuela || !password) {
      return NextResponse.json({ error: "Completa todos los campos." }, { status: 400 });
    }

    const reservedEmailError = ensureNonReservedAuthEmail(email);
    if (reservedEmailError) {
      return NextResponse.json({ error: reservedEmailError }, { status: 400 });
    }

    const supabaseAdmin = buildSupabaseAdminClient();
    const { data: authData, error: authError } = await createAuthUserWithRetryOnCollision(
      supabaseAdmin,
      {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre,
          rol: "admin_escuela",
        },
      },
      { allowOrphanCleanup: true }
    );

    if (authError) {
      if (isAuthUserAlreadyRegisteredError(authError.message)) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con este correo electrónico." },
          { status: 400 }
        );
      }

      console.error("[public-register] auth create user failed", authError);
      return NextResponse.json(
        { error: "No se pudo crear la cuenta en este momento. Intenta de nuevo." },
        { status: 400 }
      );
    }

    createdAuthUserId = authData?.user?.id ?? null;
    if (!createdAuthUserId) {
      return NextResponse.json(
        { error: "No se pudo crear la cuenta en este momento. Intenta de nuevo." },
        { status: 400 }
      );
    }

    const pool = getServerDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const planDefaultsRes = await client.query<ProfessionalPlanDefaultsRow>(
        `
          select max_alumnos_default, max_sedes_default
          from public.planes_config
          where id = 'profesional'
          limit 1
        `
      );

      const professionalDefaults = planDefaultsRes.rows[0];
      const maxAlumnos = toPositiveInt(professionalDefaults?.max_alumnos_default, 500);
      const maxSedes = toPositiveInt(professionalDefaults?.max_sedes_default, 3);

      const schoolRes = await client.query<{ id: string }>(
        `
          insert into public.escuelas (
            nombre,
            email,
            plan,
            estado,
            max_alumnos,
            max_sedes,
            fecha_alta
          )
          values ($1, $2, 'gratuito', 'activa', $3, $4, ((now() AT TIME ZONE '${APP_TIME_ZONE}')::date))
          returning id
        `,
        [escuela, email, maxAlumnos, maxSedes]
      );

      const schoolId = schoolRes.rows[0]?.id;
      if (!schoolId) {
        throw new Error("No se pudo crear la escuela.");
      }

      const branchRes = await client.query<{ id: string }>(
        `
          insert into public.sedes (
            escuela_id,
            nombre,
            email,
            es_principal,
            estado
          )
          values ($1, 'Sede Principal', $2, true, 'activa')
          returning id
        `,
        [schoolId, email]
      );

      const branchId = branchRes.rows[0]?.id ?? null;

      await client.query(
        `
          insert into public.perfiles (
            id,
            escuela_id,
            sede_id,
            nombre,
            email,
            rol,
            activo
          )
          values ($1, $2, $3, $4, $5, 'admin_escuela', true)
        `,
        [createdAuthUserId, schoolId, branchId, nombre, email]
      );

      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setUTCMonth(trialEnd.getUTCMonth() + 3);

      const cycleRes = await client.query<{ id: string }>(
        `
          insert into public.school_subscription_cycles (
            school_id,
            plan_id,
            billing_interval,
            status,
            started_at,
            current_period_start,
            current_period_end,
            trial_ends_at,
            is_current,
            requires_review,
            metadata,
            created_by
          )
          values (
            $1,
            'profesional',
            'trial',
            'trialing',
            $2::timestamptz,
            $2::timestamptz,
            $3::timestamptz,
            $3::timestamptz,
            true,
            false,
            jsonb_build_object('source', 'public_register'),
            $4
          )
          returning id
        `,
        [schoolId, trialStart.toISOString(), trialEnd.toISOString(), createdAuthUserId]
      );

      await client.query(
        `
          insert into public.school_subscription_events (
            school_id,
            subscription_cycle_id,
            event_type,
            summary,
            payload,
            created_by
          )
          values (
            $1,
            $2,
            'trial_started',
            'Se creó una escuela desde el registro público con prueba inicial.',
            jsonb_build_object('source', 'public_register', 'plan_id', 'profesional', 'billing_interval', 'trial'),
            $3
          )
        `,
        [schoolId, cycleRes.rows[0]?.id ?? null, createdAuthUserId]
      );

      await client.query("COMMIT");

      revalidateServerReadCache([
        ...buildDashboardListInvalidationTags("escuelas"),
        ...buildDashboardListInvalidationTags("subscriptions"),
        ...buildDashboardInvalidationTags("superadmin"),
      ]);

      return NextResponse.json({ success: true, escuela_id: schoolId });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (createdAuthUserId) {
      try {
        const supabaseAdmin = buildSupabaseAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        // La limpieza del usuario no debe ocultar el error principal.
      }
    }

    console.error("[public-register] failed", error);
    return NextResponse.json(
      { error: "No se pudo crear la cuenta en este momento. Intenta de nuevo." },
      { status: 400 }
    );
  }
}
