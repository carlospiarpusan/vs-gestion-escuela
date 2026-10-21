import { revalidateTag, unstable_cache } from "next/cache";
import { expandMutationCacheTags } from "@/lib/server-cache-tags";

function normalizeCacheKey(key: string | string[]) {
  return ["school-domain-tags-v2", ...(Array.isArray(key) ? key : [key])];
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
  const normalizedTags = expandMutationCacheTags(Array.isArray(tags) ? tags : [tags]);

  for (const tag of normalizedTags) {
    if (!tag) continue;
    revalidateTag(tag, { expire: 0 });
  }
}
