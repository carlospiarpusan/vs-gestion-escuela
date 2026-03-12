const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const ESCUELA_ID = process.env.IMPORT_ESCUELA_ID || "a5320c4a-3bf6-4da5-b365-da17d7001d4f";
const ACTOR_USER_ID = process.env.IMPORT_USER_ID || "0840c179-b432-4f1a-afe2-6174e5cf33af";

function loadEnv() {
  for (const filename of [".env.local", ".env"]) {
    const envPath = path.join(__dirname, "..", filename);
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function main() {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL para ejecutar el backfill de tramitador.");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const insertSql = `
      insert into public.gastos (
        escuela_id,
        sede_id,
        user_id,
        categoria,
        concepto,
        monto,
        metodo_pago,
        proveedor,
        numero_factura,
        fecha,
        recurrente,
        notas
      )
      select
        m.escuela_id,
        m.sede_id,
        $2::uuid,
        'tramitador',
        'Tramitador — ' || trim(concat_ws(' ', a.nombre, a.apellidos)),
        m.tramitador_valor,
        'transferencia',
        m.tramitador_nombre,
        null,
        coalesce(m.fecha_inscripcion::date, current_date),
        false,
        concat(
          'TRAMITADOR_BACKFILL|',
          coalesce(m.numero_contrato, m.id::text),
          '|matricula_',
          m.id,
          '|fuente_',
          coalesce(nullif(split_part(coalesce(m.notas, ''), '|', 1), ''), 'sin_origen')
        )
      from public.matriculas_alumno m
      join public.alumnos a on a.id = m.alumno_id
      where m.escuela_id = $1::uuid
        and coalesce(m.tramitador_valor, 0) > 0
        and not exists (
          select 1
          from public.gastos g
          where g.escuela_id = m.escuela_id
            and g.categoria = 'tramitador'
            and (
              (
                m.numero_contrato is not null
                and coalesce(g.notas, '') ilike '%' || m.numero_contrato || '%'
              )
              or (
                lower(coalesce(g.concepto, '')) = lower('Tramitador — ' || trim(concat_ws(' ', a.nombre, a.apellidos)))
                and lower(coalesce(g.proveedor, '')) = lower(coalesce(m.tramitador_nombre, ''))
                and abs(coalesce(g.monto, 0) - coalesce(m.tramitador_valor, 0)) < 1
                and g.fecha = coalesce(m.fecha_inscripcion::date, g.fecha)
              )
            )
        )
      returning id, concepto, monto, fecha, proveedor, notas;
    `;

    const insertRes = await client.query(insertSql, [ESCUELA_ID, ACTOR_USER_ID]);

    const [matriculasRes, gastosRes] = await Promise.all([
      client.query(
        `
          select count(*)::int as total
          from public.matriculas_alumno
          where escuela_id = $1::uuid
            and coalesce(tramitador_valor, 0) > 0
        `,
        [ESCUELA_ID]
      ),
      client.query(
        `
          select count(*)::int as total
          from public.gastos
          where escuela_id = $1::uuid
            and categoria = 'tramitador'
        `,
        [ESCUELA_ID]
      ),
    ]);

    console.log(JSON.stringify({
      inserted: insertRes.rowCount,
      sample: insertRes.rows.slice(0, 10),
      totals: {
        matriculas_con_tramitador: matriculasRes.rows[0]?.total ?? 0,
        gastos_tramitador: gastosRes.rows[0]?.total ?? 0,
      },
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
