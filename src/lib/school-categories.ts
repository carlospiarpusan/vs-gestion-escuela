"use client";

import { fetchJsonWithRetry } from "@/lib/retry";

const categoriesCache = new Map<string, string[]>();
const pendingRequests = new Map<string, Promise<string[]>>();

export async function fetchSchoolCategories(escuelaId: string) {
  const cached = categoriesCache.get(escuelaId);
  if (cached) return cached;

  const pending = pendingRequests.get(escuelaId);
  if (pending) return pending;

  const request = (async () => {
    const payload = await fetchJsonWithRetry<{ categorias: string[] }>(
      `/api/escuelas/categorias?escuela_id=${encodeURIComponent(escuelaId)}`
    );
    const categories = payload.categorias || [];
    categoriesCache.set(escuelaId, categories);
    pendingRequests.delete(escuelaId);
    return categories;
  })().catch((error) => {
    pendingRequests.delete(escuelaId);
    throw error;
  });

  pendingRequests.set(escuelaId, request);
  return request;
}

export function clearSchoolCategoriesCache(escuelaId?: string) {
  if (escuelaId) {
    categoriesCache.delete(escuelaId);
    pendingRequests.delete(escuelaId);
    return;
  }

  categoriesCache.clear();
  pendingRequests.clear();
}
