export async function revalidateTaggedServerCaches(tags: string[]) {
  const normalizedTags = Array.from(new Set(tags.filter(Boolean)));
  if (normalizedTags.length === 0) return;

  try {
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: normalizedTags }),
      cache: "no-store",
    });
  } catch (error) {
    console.warn("[cache] No se pudo revalidar cache server-side", error);
  }
}
