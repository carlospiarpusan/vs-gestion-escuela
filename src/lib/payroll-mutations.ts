import type { PoolClient } from "pg";
import { ensureSchoolScope, ensureSedeScope } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import type { EstadoPagoGasto, Nomina, Perfil } from "@/types/database";

type Actor = Pick<Perfil, "id" | "rol" | "escuela_id" | "sede_id" | "activo">;
type Concept = {
  tipo: "devengo" | "deduccion";
  concepto: string;
  descripcion?: string | null;
  valor: number;
};
type PayrollCreate = {
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
type PayrollUpdate = {
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
  let discardConnection = false;
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discardConnection = true;
    }
    if ((error as { code?: string })?.code === "23505") {
      throw new PayrollMutationError(
        "Ya existe una nómina para este empleado en el periodo seleccionado.",
        409
      );
    }
    throw error;
  } finally {
    client.release(discardConnection);
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
    await syncPayrollExpense(client, body.nomina_id, actor.id);
    return responsePayroll(client, body.nomina_id);
  });
}

async function syncPayrollExpense(client: PoolClient, id: string, actorId: string) {
  const { rows } = await client.query<Nomina & { gasto_id: string | null }>(
    "select * from public.nominas where id=$1",
    [id]
  );
  const payroll = rows[0];
  // The hours closure uses the same month lock, so it cannot create a second
  // expense while payroll is adopting or creating the original movement.
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `cierre-horas:${payroll.escuela_id}:${payroll.periodo_anio}:${payroll.periodo_mes}`,
  ]);
  let expenseId = payroll.gasto_id;
  if (!expenseId && payroll.estado !== "borrador" && payroll.empleado_tipo === "instructor") {
    // Only an explicit closure link is safe to reuse. Never infer a duplicate
    // from the employee name or amount of an unrelated historic expense.
    const closure = await client.query<{ gasto_id: string }>(
      "select gasto_id from public.cierres_horas_instructores where escuela_id=$1 and instructor_id=$2 and periodo_anio=$3 and periodo_mes=$4 and gasto_id is not null for update",
      [payroll.escuela_id, payroll.empleado_id, payroll.periodo_anio, payroll.periodo_mes]
    );
    expenseId = closure.rows[0]?.gasto_id || null;
  }
  if (!expenseId && (payroll.estado === "borrador" || payroll.estado === "anulada")) return;
  const expense = expenseId
    ? (
        await client.query<{ estado_pago: EstadoPagoGasto; fecha: string; monto: string }>(
          `select estado_pago,fecha::text,monto::text from public.gastos
           where id=$1 and escuela_id=$2 for update`,
          [expenseId, payroll.escuela_id]
        )
      ).rows[0]
    : null;
  if (expenseId && !expense)
    throw new PayrollMutationError("No se encontró el gasto vinculado de la nómina.", 409);

  // Approval can adopt a paid hours closure. Use the original payment so the
  // payroll view cannot offer to pay it again or rewrite its recorded date.
  const adoptPayment =
    expense?.estado_pago === "pagado" &&
    payroll.estado !== "anulada" &&
    (!payroll.gasto_id || payroll.estado !== "pagada");
  if (adoptPayment && Number(expense.monto) !== Number(payroll.neto_pagar))
    throw new PayrollMutationError(
      "El neto de la nómina debe coincidir con el gasto de horas ya pagado.",
      409
    );

  const payrollState = adoptPayment ? "pagada" : payroll.estado;
  const paymentDate = adoptPayment ? expense.fecha : payroll.fecha_pago;
  const state =
    payrollState === "pagada" ? "pagado" : payrollState === "aprobada" ? "pendiente" : "anulado";
  const note = `NOMINA|id=${payroll.id}`;
  if (expenseId) {
    await client.query(
      `update public.gastos set monto=$1,estado_pago=$2,fecha=coalesce($3::date,fecha),
       notas=case when notas like 'NOMINA|id=%' then notas else concat($6::text,E'\\n',notas) end
       where id=$4 and escuela_id=$5`,
      [
        payroll.neto_pagar,
        state,
        state === "pagado" ? paymentDate : null,
        expenseId,
        payroll.escuela_id,
        note,
      ]
    );
  } else {
    const date =
      paymentDate || `${payroll.periodo_anio}-${String(payroll.periodo_mes).padStart(2, "0")}-01`;
    const result = await client.query<{ id: string }>(
      `insert into public.gastos(escuela_id,sede_id,user_id,categoria,concepto,monto,metodo_pago,proveedor,fecha,fecha_vencimiento,estado_pago,recurrente,notas)
      values($1,$2,$3,'nominas',$4,$5,'transferencia',$6,$7,$7,$8,false,$9) returning id`,
      [
        payroll.escuela_id,
        payroll.sede_id,
        actorId,
        `Nómina ${payroll.periodo_mes}/${payroll.periodo_anio} — ${payroll.empleado_nombre}`,
        payroll.neto_pagar,
        payroll.empleado_nombre,
        date,
        state,
        note,
      ]
    );
    expenseId = result.rows[0].id;
  }
  await client.query("update public.nominas set gasto_id=$2,estado=$3,fecha_pago=$4 where id=$1", [
    id,
    expenseId,
    payrollState,
    paymentDate,
  ]);
}

export async function deletePayroll(id: string, actor: Actor) {
  return transaction(async (client) => {
    const payroll = await loadPayroll(client, id, actor);
    if (payroll.estado !== "borrador" || payroll.gasto_id)
      throw new PayrollMutationError("Solo se pueden eliminar nóminas en estado borrador.", 400);
    await client.query("delete from public.nominas where id=$1", [id]);
    return payroll;
  });
}
