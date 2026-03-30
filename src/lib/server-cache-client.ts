const REVALIDATION_BATCH_WINDOW_MS = 80;

const queuedTags = new Set<string>();
let pendingFlush: {
  promise: Promise<void>;
  resolve: () => void;
  timerId: ReturnType<typeof setTimeout>;
} | null = null;

async function flushQueuedRevalidations() {
  const normalizedTags = Array.from(queuedTags);
  queuedTags.clear();

  if (normalizedTags.length === 0) return;

  try {
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: normalizedTags }),
      cache: "no-store",
      keepalive: true,
    });
  } catch (error) {
    console.warn("[cache] No se pudo revalidar cache server-side", error);
  }
}

export async function revalidateTaggedServerCaches(tags: string[]) {
  const normalizedTags = Array.from(new Set(tags.filter(Boolean)));
  if (normalizedTags.length === 0) return;

  normalizedTags.forEach((tag) => queuedTags.add(tag));

  if (!pendingFlush) {
    let resolvePromise = () => {};
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    const timerId = setTimeout(async () => {
      const activeFlush = pendingFlush;
      pendingFlush = null;
      try {
        await flushQueuedRevalidations();
      } finally {
        activeFlush?.resolve();
      }
    }, REVALIDATION_BATCH_WINDOW_MS);

    pendingFlush = {
      promise,
      resolve: resolvePromise,
      timerId,
    };
  }

  return pendingFlush.promise;
}
