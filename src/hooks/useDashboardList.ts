"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchJsonWithRetry } from "@/lib/retry";
import {
  getDashboardListCached,
  invalidateDashboardClientCaches,
} from "@/lib/dashboard-client-cache";
import { revalidateTaggedServerCaches } from "@/lib/server-cache-client";
import { buildScopedMutationRevalidationTags } from "@/lib/server-cache-tags";

type ListResponse<T> = {
  totalCount: number;
  rows: T[];
};

type UseDashboardListConfig = {
  /** Resource name used for cache keys and the API endpoint (e.g. "instructores"). */
  resource: string;
  /** API path to fetch from. Defaults to `/api/${resource}`. */
  apiPath?: string;
  /** Rows per page. Defaults to 10. */
  pageSize?: number;
  /** Whether to include finance caches when revalidating after mutations. */
  includeFinance?: boolean;
};

/**
 * Shared hook that extracts the data-fetching, pagination, modal state, and
 * cache-invalidation boilerplate repeated across 7+ dashboard CRUD pages.
 *
 * Pages keep full control over their form, columns, save, and delete logic.
 */
export function useDashboardList<T>(config: UseDashboardListConfig) {
  const { resource, apiPath, pageSize = 10, includeFinance = false } = config;
  const endpoint = apiPath ?? `/api/${resource}`;
  const { perfil } = useAuth();

  // ── List state ──────────────────────────────────────────────────────
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState("");
  const fetchIdRef = useRef(0);

  // ── Modal state ─────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────
  const fetchData = useCallback(
    async (page = 0, search = "") => {
      if (!perfil?.escuela_id) return;

      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setTableError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search.trim()) params.set("q", search.trim());

        const payload = await getDashboardListCached<ListResponse<T>>({
          name: `${resource}-table`,
          scope: {
            id: perfil.id,
            rol: perfil.rol,
            escuelaId: perfil.escuela_id,
            sedeId: perfil.sede_id,
          },
          params,
          loader: () => fetchJsonWithRetry<ListResponse<T>>(`${endpoint}?${params.toString()}`),
        });

        if (fetchId !== fetchIdRef.current) return;

        setData(payload.rows || []);
        setTotalCount(payload.totalCount || 0);
      } catch (fetchError: unknown) {
        if (fetchId !== fetchIdRef.current) return;
        setData([]);
        setTotalCount(0);
        setTableError(
          fetchError instanceof Error
            ? fetchError.message
            : `No se pudieron cargar los ${resource}.`
        );
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [perfil, pageSize, resource, endpoint]
  );

  // Re-fetch whenever page, search, or profile changes.
  useEffect(() => {
    if (!perfil) return;
    void fetchData(currentPage, searchTerm);
  }, [fetchData, perfil, currentPage, searchTerm]);

  // ── Page / search handlers ──────────────────────────────────────────
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(0);
  }, []);

  // ── Modal helpers ───────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: T) => {
    setEditing(row);
    setModalOpen(true);
  }, []);

  const openDelete = useCallback((row: T) => {
    setDeleting(row);
    setDeleteOpen(true);
  }, []);

  // ── Cache invalidation + re-fetch ──────────────────────────────────
  const revalidateAndRefresh = useCallback(async () => {
    invalidateDashboardClientCaches();
    await revalidateTaggedServerCaches(
      buildScopedMutationRevalidationTags({
        scope: {
          escuelaId: perfil?.escuela_id,
          sedeId: perfil?.sede_id,
        },
        includeFinance,
        includeDashboard: true,
      })
    );
    void fetchData(currentPage, searchTerm);
  }, [perfil, includeFinance, fetchData, currentPage, searchTerm]);

  return {
    // Auth
    perfil,

    // List state
    data,
    totalCount,
    currentPage,
    searchTerm,
    loading,
    tableError,
    pageSize,

    // List actions
    fetchData,
    handlePageChange,
    handleSearchChange,

    // Modal state
    modalOpen,
    setModalOpen,
    deleteOpen,
    setDeleteOpen,
    editing,
    setEditing,
    deleting,
    setDeleting,
    saving,
    setSaving,

    // Modal actions
    openCreate,
    openEdit,
    openDelete,

    // After mutation
    revalidateAndRefresh,
  };
}
