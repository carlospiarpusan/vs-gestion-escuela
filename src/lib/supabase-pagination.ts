type PaginatedSupabaseResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function fetchAllSupabaseRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PaginatedSupabaseResult<T>>,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  return rows;
}
