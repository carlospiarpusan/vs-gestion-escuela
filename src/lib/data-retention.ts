import { z } from "zod";
import { isValidDateOnly } from "./date-utils";

const date = z.string().refine(isValidDateOnly, "Selecciona una fecha valida.");
const evidence = z.string().trim().min(5).max(500);
export const retentionCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("record"),
    schoolId: z.uuid(),
    cancelledOn: date,
    evidenceRef: evidence,
    confirmed: z.literal(true),
  }),
  z.strictObject({
    action: z.literal("hold"),
    schoolId: z.uuid(),
    caseId: z.uuid(),
    reason: evidence,
    nextReviewOn: date,
  }),
  z.strictObject({
    action: z.literal("withdraw"),
    schoolId: z.uuid(),
    caseId: z.uuid(),
    evidenceRef: evidence,
  }),
]);
export type RetentionCommand = z.infer<typeof retentionCommandSchema>;
export type RetentionCase = {
  id: string;
  cancelled_on: string;
  review_due_on: string;
  state: "scheduled" | "review_due" | "held" | "withdrawn";
  evidence_ref: string;
  hold_reason: string | null;
  next_review_on: string | null;
};
export type RetentionOverview = {
  schoolState: string;
  cases: RetentionCase[];
  lastCheckedAt: string | null;
  events: Array<{ action: string; created_at: string }>;
};
export const RETENTION_LABELS: Record<RetentionCase["state"], string> = {
  scheduled: "En conservacion",
  review_due: "Revision de eliminacion pendiente",
  held: "Conservacion justificada",
  withdrawn: "Baja retirada",
};
export const RETENTION_EVENT_LABELS: Record<string, string> = {
  recorded: "Baja registrada",
  became_due: "Revision vencida",
  held: "Conservacion justificada",
  hold_expired: "Nueva revision de conservacion",
  withdrawn: "Baja retirada",
  reactivated: "Escuela reactivada; plazo retirado",
};
