import "server-only";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import {
  buildDashboardListInvalidationTags,
  buildFinanceInvalidationTags,
  buildDashboardInvalidationTags,
  buildBroadDashboardInvalidationTags,
} from "@/lib/server-cache-tags";

export class StudentRecordError extends Error {
  constructor(
    message: string,
    public status = 409
  ) {
    super(message);
  }
}

export function invalidateStudentRecordCaches(escuelaId: string, sedeId: string) {
  try {
    const scope = { escuelaId, sedeId };
    revalidateServerReadCache([
      ...["alumnos", "contratos", "cartera"].flatMap((name) =>
        buildDashboardListInvalidationTags(name, scope)
      ),
      ...(["income", "expense", "portfolio", "cash", "reports"] as const).flatMap((kind) =>
        buildFinanceInvalidationTags(kind, scope)
      ),
      ...buildDashboardInvalidationTags("admin", scope),
      ...buildBroadDashboardInvalidationTags(scope),
    ]);
  } catch {
    /* The write has committed; cache failures must not report a failed save. */
  }
}
