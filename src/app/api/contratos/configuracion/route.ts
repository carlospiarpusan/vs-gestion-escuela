import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getDashboardSchoolIdFromRequest } from "@/lib/dashboard-scope";

/* ------------------------------------------------------------------ */
/*  GET  /api/contratos/configuracion                                  */
/*  Devuelve config + plantillas de contrato de la escuela             */
/* ------------------------------------------------------------------ */
export async function GET(request: Request) {
  const authz = await authorizeApiRequest(["super_admin", "admin_escuela"]);
  if (!authz.ok) return authz.response;

  const escuelaId =
    authz.perfil.rol === "super_admin"
      ? getDashboardSchoolIdFromRequest(request)
      : authz.perfil.escuela_id;

  if (!escuelaId) {
    return NextResponse.json({ error: "Escuela no seleccionada." }, { status: 400 });
  }

  try {
    const pool = getServerDbPool();

    const [configRes, plantillasRes] = await Promise.all([
      pool.query(`select * from configuracion_contratos_escuela where escuela_id = $1`, [
        escuelaId,
      ]),
      pool.query(
        `select id, tipo_plantilla, titulo, html_plantilla, updated_at
         from plantillas_contrato_escuela
         where escuela_id = $1
         order by tipo_plantilla`,
        [escuelaId]
      ),
    ]);

    return NextResponse.json({
      configuracion: configRes.rows[0] || null,
      plantillas: plantillasRes.rows,
    });
  } catch (error) {
    console.error("Error al cargar configuración de contratos:", error);
    return NextResponse.json({ error: "No se pudo cargar la configuración." }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PUT  /api/contratos/configuracion                                  */
/*  Upsert config de contrato de la escuela                            */
/* ------------------------------------------------------------------ */
export async function PUT(request: Request) {
  const authz = await authorizeApiRequest(["super_admin", "admin_escuela"]);
  if (!authz.ok) return authz.response;

  const escuelaId =
    authz.perfil.rol === "super_admin"
      ? getDashboardSchoolIdFromRequest(request)
      : authz.perfil.escuela_id;

  if (!escuelaId) {
    return NextResponse.json({ error: "Escuela no seleccionada." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const pool = getServerDbPool();

    // Upsert configuracion_contratos_escuela
    if (body.configuracion) {
      const c = body.configuracion;
      await pool.query(
        `insert into configuracion_contratos_escuela (
          escuela_id, nombre_legal_escuela, nit_escuela,
          representante_legal_nombre, representante_legal_tipo_documento,
          representante_legal_numero_documento, representante_legal_lugar_expedicion,
          direccion_legal_escuela, telefono_legal_escuela, ciudad_firma,
          pie_direccion, pie_telefonos, pie_correo, cargo_firmante, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
        on conflict (escuela_id) do update set
          nombre_legal_escuela = excluded.nombre_legal_escuela,
          nit_escuela = excluded.nit_escuela,
          representante_legal_nombre = excluded.representante_legal_nombre,
          representante_legal_tipo_documento = excluded.representante_legal_tipo_documento,
          representante_legal_numero_documento = excluded.representante_legal_numero_documento,
          representante_legal_lugar_expedicion = excluded.representante_legal_lugar_expedicion,
          direccion_legal_escuela = excluded.direccion_legal_escuela,
          telefono_legal_escuela = excluded.telefono_legal_escuela,
          ciudad_firma = excluded.ciudad_firma,
          pie_direccion = excluded.pie_direccion,
          pie_telefonos = excluded.pie_telefonos,
          pie_correo = excluded.pie_correo,
          cargo_firmante = excluded.cargo_firmante,
          updated_at = now()`,
        [
          escuelaId,
          c.nombre_legal_escuela || "",
          c.nit_escuela || null,
          c.representante_legal_nombre || null,
          c.representante_legal_tipo_documento || null,
          c.representante_legal_numero_documento || null,
          c.representante_legal_lugar_expedicion || null,
          c.direccion_legal_escuela || null,
          c.telefono_legal_escuela || null,
          c.ciudad_firma || null,
          c.pie_direccion || null,
          c.pie_telefonos || null,
          c.pie_correo || null,
          c.cargo_firmante || "Representante legal",
        ]
      );
    }

    // Upsert plantillas
    if (body.plantillas && Array.isArray(body.plantillas)) {
      for (const p of body.plantillas) {
        if (!p.tipo_plantilla || !p.html_plantilla) continue;
        await pool.query(
          `insert into plantillas_contrato_escuela (escuela_id, tipo_plantilla, titulo, html_plantilla, updated_at)
           values ($1, $2, $3, $4, now())
           on conflict (escuela_id, tipo_plantilla) do update set
             titulo = excluded.titulo,
             html_plantilla = excluded.html_plantilla,
             updated_at = now()`,
          [escuelaId, p.tipo_plantilla, p.titulo || p.tipo_plantilla, p.html_plantilla]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al guardar configuración de contratos:", error);
    return NextResponse.json({ error: "No se pudo guardar la configuración." }, { status: 500 });
  }
}
