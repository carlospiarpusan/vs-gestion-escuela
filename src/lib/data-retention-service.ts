import type { PoolClient } from "pg";
import { getServerDbPool } from "./server-db";
import type { RetentionCommand, RetentionOverview } from "./data-retention";

export class RetentionError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getServerDbPool().connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505")
      throw new RetentionError("Ya existe una baja abierta para esta escuela.", 409);
    throw error;
  } finally {
    client.release();
  }
}
export async function getRetentionOverview(schoolId: string): Promise<RetentionOverview> {
  const pool = getServerDbPool();
  const school = await pool.query<{ estado: string }>(
    "select estado from public.escuelas where id=$1",
    [schoolId]
  );
  if (!school.rows[0]) throw new RetentionError("Escuela no encontrada.", 404);
  const cases = await pool.query<RetentionOverview["cases"][number]>(
    `select id,cancelled_on::text,review_due_on::text,state,evidence_ref,hold_reason,next_review_on::text
     from public.school_retention_cases where school_id=$1 order by created_at desc,id desc limit 20`,
    [schoolId]
  );
  const job = await pool.query<{ last_checked_at: string }>(
    "select last_checked_at::text from public.school_retention_job_state where id=true"
  );
  const events = await pool.query<RetentionOverview["events"][number]>(
    `select e.action,e.created_at::text from public.school_retention_events e
     join public.school_retention_cases c on c.id=e.case_id where c.school_id=$1
     order by e.created_at desc,e.id desc limit 20`,
    [schoolId]
  );
  return {
    schoolState: school.rows[0].estado,
    cases: cases.rows,
    lastCheckedAt: job.rows[0]?.last_checked_at ?? null,
    events: events.rows,
  };
}
export async function changeRetention(command: RetentionCommand, actorId: string) {
  return transaction(async (client) => {
    const school = await client.query<{ estado: string }>(
      "select estado from public.escuelas where id=$1 for update",
      [command.schoolId]
    );
    if (!school.rows[0]) throw new RetentionError("Escuela no encontrada.", 404);
    if (command.action !== "withdraw" && school.rows[0].estado !== "inactiva")
      throw new RetentionError(
        "La baja definitiva solo se registra para una escuela inactiva. Una suspension no es una cancelacion.",
        409
      );
    let caseId: string;
    let reference: string;
    if (command.action === "record") {
      const valid = await client.query<{ valid: boolean }>(
        `select $1::date >= date '2000-01-01' and $1::date <= (now() at time zone 'America/Bogota')::date as valid`,
        [command.cancelledOn]
      );
      if (!valid.rows[0].valid)
        throw new RetentionError("La fecha de baja no puede ser futura ni anterior a 2000.", 400);
      const created = await client.query<{ id: string }>(
        `insert into public.school_retention_cases (school_id,cancelled_on,state,evidence_ref,created_by)
         values ($1,$2::date,case when ($2::date+interval '6 months')::date <= (now() at time zone 'America/Bogota')::date
         then 'review_due' else 'scheduled' end,$3,$4) returning id`,
        [command.schoolId, command.cancelledOn, command.evidenceRef, actorId]
      );
      caseId = created.rows[0].id;
      reference = command.evidenceRef;
    } else {
      const existing = await client.query<{ id: string; state: string }>(
        "select id,state from public.school_retention_cases where id=$1 and school_id=$2 for update",
        [command.caseId, command.schoolId]
      );
      if (!existing.rows[0] || existing.rows[0].state === "withdrawn")
        throw new RetentionError("La baja ya no esta abierta o no pertenece a esta escuela.", 409);
      caseId = existing.rows[0].id;
      if (command.action === "hold") {
        const valid = await client.query<{ valid: boolean }>(
          `select $1::date > (now() at time zone 'America/Bogota')::date
           and $1::date <= (now() at time zone 'America/Bogota')::date + interval '1 year' as valid`,
          [command.nextReviewOn]
        );
        if (!valid.rows[0].valid)
          throw new RetentionError("La proxima revision debe estar entre manana y un ano.", 400);
        await client.query(
          `update public.school_retention_cases set state='held',hold_reason=$3,next_review_on=$4::date,updated_at=now()
           where id=$1 and school_id=$2`,
          [caseId, command.schoolId, command.reason, command.nextReviewOn]
        );
        reference = command.reason;
      } else {
        await client.query(
          `update public.school_retention_cases set state='withdrawn',hold_reason=null,next_review_on=null,updated_at=now()
           where id=$1 and school_id=$2`,
          [caseId, command.schoolId]
        );
        reference = command.evidenceRef;
      }
    }
    await client.query(
      "insert into public.school_retention_events(case_id,action,actor_id,evidence_ref) values($1,$2,$3,$4)",
      [
        caseId,
        command.action === "record" ? "recorded" : command.action === "hold" ? "held" : "withdrawn",
        actorId,
        reference,
      ]
    );
    return { caseId };
  });
}

export async function runRetentionReview() {
  return transaction(async (client) => {
    const lock = await client.query<{ locked: boolean }>(
      "select pg_try_advisory_xact_lock(36038) as locked"
    );
    if (!lock.rows[0].locked) return { skipped: true };
    await client.query("select public.seed_school_retention_rules()");
    // Lock the school before its case, matching administrative mutations.
    // Reactivation cannot race a decision made by this scheduler.
    await client.query(`select e.id from public.escuelas e where exists
      (select 1 from public.school_retention_cases c where c.school_id=e.id and c.state<>'withdrawn')
      order by e.id for update`);
    const reactivated = await client.query<{ id: string }>(
      `update public.school_retention_cases c set state='withdrawn',hold_reason=null,next_review_on=null,updated_at=now()
       from public.escuelas e where e.id=c.school_id and e.estado<>'inactiva' and c.state<>'withdrawn' returning c.id`
    );
    for (const row of reactivated.rows)
      await client.query(
        "insert into public.school_retention_events(case_id,action) values($1,'reactivated')",
        [row.id]
      );
    const due = await client.query<{ id: string; action: string }>(
      `with candidates as (
        select id,state from public.school_retention_cases where
          (state='scheduled' and review_due_on <= (now() at time zone 'America/Bogota')::date)
          or (state='held' and next_review_on <= (now() at time zone 'America/Bogota')::date) for update
       ) update public.school_retention_cases c set state=case when c.review_due_on <= (now() at time zone 'America/Bogota')::date
           then 'review_due' else 'scheduled' end,hold_reason=null,next_review_on=null,updated_at=now()
         from candidates p where c.id=p.id returning c.id,case when p.state='held' then 'hold_expired' else 'became_due' end as action`
    );
    for (const row of due.rows)
      await client.query(
        "insert into public.school_retention_events(case_id,action) values($1,$2)",
        [row.id, row.action]
      );
    const pending = await client.query<{ total: number }>(
      "select count(*)::int as total from public.school_retention_cases where state='review_due'"
    );
    await client.query(
      `insert into public.school_retention_job_state(id,last_checked_at,due_count) values(true,now(),$1)
      on conflict(id) do update set last_checked_at=excluded.last_checked_at,due_count=excluded.due_count`,
      [pending.rows[0].total]
    );
    return {
      skipped: false,
      due: due.rowCount,
      withdrawn: reactivated.rowCount,
      pending: pending.rows[0].total,
      deleted: 0,
    };
  });
}
