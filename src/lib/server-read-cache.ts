import { revalidateTag, unstable_cache } from "next/cache";

function normalizeCacheKey(key: string | string[]) {
  return Array.isArray(key) ? key : [key];
}

export async function getServerReadCached<T>({
  key,
  ttlMs,
  tags = [],
  bypass = false,
  loader,
}: {
  key: string | string[];
  ttlMs: number;
  tags?: string[];
  bypass?: boolean;
  loader: () => Promise<T>;
}) {
  if (bypass) {
    return loader();
  }

  const cachedLoader = unstable_cache(loader, normalizeCacheKey(key), {
    revalidate: Math.max(1, Math.ceil(ttlMs / 1000)),
    tags,
  });

  return cachedLoader();
}

export function revalidateServerReadCache(tags: string | string[]) {
  const normalizedTags = Array.isArray(tags) ? tags : [tags];

  for (const tag of normalizedTags) {
    if (!tag) continue;
    revalidateTag(tag, "max");
  }
}
