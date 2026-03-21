export const RECEIVABLE_BUCKET_LABELS = {
  overdueCritical: "Vencido > 60 dias",
  overdueMedium: "Mora 31-60 dias",
  current: "Al dia / hasta 30 dias",
} as const;

export const PAYABLE_BUCKET_LABELS = {
  overdue: "Vencido",
  dueSoon: "Proximo a vencer",
  current: "Al dia",
} as const;

export type AgingBucketLike = {
  bucket: string;
  total: number | string | null;
};

export function sumBucketTotal<T extends AgingBucketLike>(rows: T[], bucket: string) {
  return rows
    .filter((row) => row.bucket === bucket)
    .reduce((sum, row) => sum + Number(row.total || 0), 0);
}
