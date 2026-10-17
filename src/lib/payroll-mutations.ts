import type { PoolClient } from "pg";
import { ensureSchoolScope, ensureSedeScope } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import type { Nomina, Perfil } from "@/types/database";

type Actor = Pick<Perfil, "id" | "rol" | "escuela_id" | "sede_id" | "activo">;
type Concept = {
  tipo: "devengo" | "deduccion";
  concepto: string;
  descripcion?: string | null;
  valor: number;
};
export type PayrollCreate = {
  escuela_id: string;
  sede_id: string;
  empleado_tipo: "instructor" | "administrativo";
  empleado_id: string;
  empleado_nombre: string;
  periodo_anio: number;
  periodo_mes: number;
  tipo_contrato: "prestacion_servicios" | "contrato_laboral";
  salario_base: number;
  conceptos: Concept[];
  notas?: string | null;
};
export type PayrollUpdate = {
  nomina_id: string;
  estado?: Nomina["estado"];
  fecha_pago?: string | null;
  salario_base?: number;
  conceptos?: Concept[];
  notas?: string | null;
};

export class PayrollMutationError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function assertScope(actor: Actor, schoolId: string, sedeId: string) {
  const error = ensureSchoolScope(actor, schoolId) || ensureSedeScope(actor, sedeId);
  if (error) throw new PayrollMutationError(error, 403);
}

async function transaction<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await getServerDbPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string })?.code === "23505") {
      throw new PayrollMutationError(
        "Ya existe una nómina para este empleado en el periodo seleccionado.",
        409
      );
    }
    throw error;
  } finally {
    client.release();
  }
}

function baseLabel(employeeType: string) {
  return employeeType === "instructor" ? "Honorarios" : "Salario base";
}

function totals(salary: number, concepts: Concept[]) {
  const devengado =
    salary + concepts.filter((c) => c.tipo === "devengo").reduce((sum, c) => sum + c.valor, 0);
  const deducciones = concepts
    .filter((c) => c.tipo === "deduccion")
    .reduce((sum, c) => sum + c.valor, 0);
  return { devengado, deducciones, neto: devengado - deducciones };
}

async function replaceConcepts(
  client: PoolClient,
  id: string,
  employeeType: string,
  salary: number,
  concepts: Concept[]
) {
  await client.query("delete from public.nomina_conceptos where nomina_id=$1", [id]);
  const rows = [
    { tipo: "devengo", concepto: baseLabel(employeeType), descripcion: null, valor: salary },
    ...concepts,
  ];
  await client.query(
    `insert into public.nomina_conceptos(nomina_id,tipo,concepto,descripcion,valor)
    select $1, (c->>'tipo')::public.tipo_concepto_nomina, c->>'concepto', c->>'descripcion', (c->>'valor')::numeric
    from jsonb_array_elements($2::jsonb) c`,
    [id, JSON.stringify(rows)]
  );
}

async function loadPayroll(client: PoolClient, id: string, actor: Actor) {
  const result = await client.query<{ nomina: Nomina }>(
    "select to_jsonb(n) as nomina from public.nominas n where id=$1 for update",
    [id]
  );
  const row = result.rows[0]?.nomina;
  if (!row) throw new PayrollMutationError("Nómina no encontrada.", 404);
  assertScope(actor, row.escuela_id, row.sede_id);
  return row;
}

async function responsePayroll(client: PoolClient, id: string) {
  const result = await client.query<{ nomina: Nomina }>(
    `select to_jsonb(n) || jsonb_build_object('nomina_conceptos',
    coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at,c.id) from public.nomina_conceptos c where c.nomina_id=n.id),'[]'::jsonb)) as nomina
    from public.nominas n where n.id=$1`,
    [id]
  );
  return result.rows[0].nomina;
}

export async function createPayroll(body: PayrollCreate, actor: Actor) {
  assertScope(actor, body.escuela_id, body.sede_id);
  return transaction(async (client) => {
    const sede = await client.query("select id from public.sedes where id=$1 and escuela_id=$2", [
      body.sede_id,
      body.escuela_id,
    ]);
    if (!sede.rows[0]) throw new PayrollMutationError("La sede no pertenece a la escuela.", 400);
    const employee = await client.query<{ nombre: string; sede_id: string | null }>(
      body.empleado_tipo === "instructor"
        ? "select concat_ws(' ',nombre,apellidos) as nombre,sede_id from public.instructores where id=$1 and escuela_id=$2"
        : "select nombre,sede_id from public.perfiles where id=$1 and escuela_id=$2 and rol in ('administrativo','admin_sede','recepcion')",
      [body.empleado_id, body.escuela_id]
    );
    if (!employee.rows[0])
      throw new PayrollMutationError("El empleado no pertenece a la escuela.", 400);
    const employeeScope = ensureSedeScope(actor, employee.rows[0].sede_id || body.sede_id);
    if (employeeScope) throw new PayrollMutationError(employeeScope, 403);
    const total = totals(body.salario_base, body.conceptos);
    const inserted = await client.query<{ id: string }>(
      `insert into public.nominas(
      escuela_id,sede_id,empleado_tipo,empleado_id,empleado_nombre,periodo_anio,periodo_mes,tipo_contrato,
      salario_base,total_devengado,total_deducciones,neto_pagar,estado,notas,created_by)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'borrador',$13,$14) returning id`,
      [
        body.escuela_id,
        body.sede_id,
        body.empleado_tipo,
        body.empleado_id,
        employee.rows[0].nombre,
        body.periodo_anio,
        body.periodo_mes,
        body.tipo_contrato,
        body.salario_base,
        total.devengado,
        total.deducciones,
        total.neto,
        body.notas ?? null,
        actor.id,
      ]
    );
    const id = inserted.rows[0].id;
    await replaceConcepts(client, id, body.empleado_tipo, body.salario_base, body.conceptos);
    return responsePayroll(client, id);
  });
}

export async function updatePayroll(body: PayrollUpdate, actor: Actor) {
  return transaction(async (client) => {
    const payroll = await loadPayroll(client, body.nomina_id, actor);
    if (
      body.estado === undefined &&
      body.fecha_pago === undefined &&
      body.notas === undefined &&
      body.salario_base === undefined &&
      body.conceptos === undefined
    ) {
      throw new PayrollMutationError("No se enviaron cambios.", 400);
    }
    let salary = Number(payroll.salario_base);
    let total = {
      devengado: Number(payroll.total_devengado),
      deducciones: Number(payroll.total_deducciones),
      neto: Number(payroll.neto_pagar),
    };
    if (body.salario_base !== undefined || body.conceptos !== undefined) {
      salary = body.salario_base ?? salary;
      const saved =
        body.conceptos === undefined
          ? await client.query<Concept>(
              "select tipo,concepto,descripcion,valor from public.nomina_conceptos where nomina_id=$1 order by created_at,id",
              [body.nomina_id]
            )
          : null;
      const concepts =
        body.conceptos ??
        (saved?.rows ?? [])
          .filter((c) => !(c.tipo === "devengo" && c.concepto === baseLabel(payroll.empleado_tipo)))
          .map((c) => ({ ...c, valor: Number(c.valor) }));
      total = totals(salary, concepts);
      await replaceConcepts(client, body.nomina_id, payroll.empleado_tipo, salary, concepts);
    }
    await client.query(
      `update public.nominas set estado=$2,fecha_pago=$3,salario_base=$4,
      total_devengado=$5,total_deducciones=$6,neto_pagar=$7,notas=$8 where id=$1`,
      [
        body.nomina_id,
        body.estado ?? payroll.estado,
        body.fecha_pago === undefined ? payroll.fecha_pago : body.fecha_pago,
        salary,
        total.devengado,
        total.deducciones,
        total.neto,
        body.notas === undefined ? payroll.notas : body.notas,
      ]
    );
    return responsePayroll(client, body.nomina_id);
  });
}

export async function deletePayroll(id: string, actor: Actor) {
  return transaction(async (client) => {
    const payroll = await loadPayroll(client, id, actor);
    if (payroll.estado !== "borrador")
      throw new PayrollMutationError("Solo se pueden eliminar nóminas en estado borrador.", 400);
    await client.query("delete from public.nominas where id=$1", [id]);
    return payroll;
  });
}
