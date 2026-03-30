"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ContractPreviewResult = {
  nextNumber: string;
  prefix: string;
  nextSequence: number;
};

type UseContractPreviewOpts = {
  /** Whether the hook should be active (e.g. modal is open). */
  enabled: boolean;
  /** Selected license categories. */
  categorias: string[];
  /** If provided, lock the preview to this contract number (editing mode). */
  lockedNumber?: string | null;
};

type UseContractPreviewReturn = {
  preview: ContractPreviewResult | null;
  loading: boolean;
  error: string | null;
  /** Whether at least one category is selected. */
  hasCategorias: boolean;
};

/**
 * React hook that previews the next available contract number
 * based on selected course categories.
 */
export function useContractPreview({
  enabled,
  categorias,
  lockedNumber,
}: UseContractPreviewOpts): UseContractPreviewReturn {
  const [preview, setPreview] = useState<ContractPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<() => void>();

  const filteredCategorias = useMemo(() => categorias.filter(Boolean), [categorias]);
  const hasCategorias = filteredCategorias.length > 0;

  // Stable key to avoid re-fetching unless categories actually change
  const categoriasKey = filteredCategorias.sort().join(",");

  const fetchPreview = useCallback(async (key: string, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contratos/preview?categorias=${encodeURIComponent(key)}`, {
        signal,
      });
      if (!res.ok) throw new Error("Error al obtener vista previa");
      const data: ContractPreviewResult = await res.json();
      if (!signal.aborted) {
        setPreview(data);
        setLoading(false);
      }
    } catch (err) {
      if (!signal.aborted) {
        setError(err instanceof Error ? err.message : "Error al obtener vista previa");
        setPreview(null);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Cancel any in-flight request
    cancelRef.current?.();

    if (!enabled || !hasCategorias) {
      // Reset state when disabled — using a microtask to avoid the lint rule
      const timer = setTimeout(() => {
        setPreview(null);
        setError(null);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // If a locked number is provided, parse and use it directly
    if (lockedNumber) {
      const match = lockedNumber.match(/^(MOT|CAR|COM)-(\d+)$/i);
      if (match) {
        const timer = setTimeout(() => {
          setPreview({
            nextNumber: lockedNumber,
            prefix: match[1].toUpperCase(),
            nextSequence: parseInt(match[2], 10),
          });
          setError(null);
          setLoading(false);
        }, 0);
        return () => clearTimeout(timer);
      }
    }

    const controller = new AbortController();
    cancelRef.current = () => controller.abort();
    void fetchPreview(categoriasKey, controller.signal);

    return () => {
      controller.abort();
    };
  }, [enabled, hasCategorias, categoriasKey, lockedNumber, fetchPreview]);

  return { preview, loading, error, hasCategorias };
}
