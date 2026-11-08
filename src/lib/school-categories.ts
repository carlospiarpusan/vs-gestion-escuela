"use client";

import { fetchJsonWithRetry } from "@/lib/retry";
import { normalizeStoredCourseCategories } from "@/lib/course-categories";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const categoriesCache = new Map<string, { value: string[]; expiresAt: number }>();
const pendingRequests = new Map<string, Promise<string[]>>();

export async function fetchSchoolCategories(escuelaId: string) {
  const cached = categoriesCache.get(escuelaId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) categoriesCache.delete(escuelaId);

  const pending = pendingRequests.get(escuelaId);
  if (pending) return pending;

  const request = (async () => {
    const payload = await fetchJsonWithRetry<{ categorias: string[] }>(
      `/api/escuelas/categorias?escuela_id=${encodeURIComponent(escuelaId)}`
    );
    const categories = normalizeStoredCourseCategories(payload.categorias || []);
    if (categoriesCache.size >= MAX_CACHE_SIZE) {
      const firstKey = categoriesCache.keys().next().value;
      if (firstKey !== undefined) categoriesCache.delete(firstKey);
    }
    categoriesCache.set(escuelaId, { value: categories, expiresAt: Date.now() + CACHE_TTL_MS });
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
