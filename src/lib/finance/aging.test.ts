import { describe, expect, it } from "vitest";
import { PAYABLE_BUCKET_LABELS, RECEIVABLE_BUCKET_LABELS, sumBucketTotal } from "@/lib/finance/aging";

describe("finance aging helpers", () => {
  it("suma solo el bucket solicitado", () => {
    const rows = [
      { bucket: RECEIVABLE_BUCKET_LABELS.overdueCritical, total: 120000 },
      { bucket: RECEIVABLE_BUCKET_LABELS.overdueMedium, total: 45000 },
      { bucket: RECEIVABLE_BUCKET_LABELS.overdueCritical, total: "30000" },
    ];

    expect(sumBucketTotal(rows, RECEIVABLE_BUCKET_LABELS.overdueCritical)).toBe(150000);
    expect(sumBucketTotal(rows, RECEIVABLE_BUCKET_LABELS.overdueMedium)).toBe(45000);
  });

  it("expone etiquetas estables para cuentas por pagar", () => {
    expect(PAYABLE_BUCKET_LABELS).toEqual({
      overdue: "Vencido",
      dueSoon: "Proximo a vencer",
      current: "Al dia",
    });
  });
});
