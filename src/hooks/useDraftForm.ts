"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { useAuth } from "@/hooks/useAuth";

const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function readStoredDraft<T>(storageKey: string | null) {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (
      stored?.version !== 1 ||
      stored.owner !== storageKey ||
      !Number.isFinite(stored.savedAt) ||
      Date.now() - stored.savedAt > MAX_DRAFT_AGE_MS ||
      stored.savedAt > Date.now() + 300_000
    ) {
      window.localStorage.removeItem(storageKey);
      return null;
    }
    return stored.value as T;
  } catch {
    return null;
  }
}

interface UseDraftFormOptions {
  persist?: boolean;
  contextId?: string | null;
}

export function useDraftForm<T>(
  storageKey: string,
  initialValue: T,
  options: UseDraftFormOptions = {}
) {
  const { user, perfil, activeEscuelaId } = useAuth();
  const ownerId = user?.id || perfil?.id;
  const schoolId = activeEscuelaId ?? perfil?.escuela_id ?? null;
  const branchId = perfil?.sede_id ?? null;
  const keyForContext = useCallback(
    (contextId?: string | null) =>
      ownerId
        ? `draft:v2:${JSON.stringify([ownerId, schoolId, branchId, storageKey, contextId ?? null])}`
        : null,
    [ownerId, schoolId, branchId, storageKey]
  );
  const scopedKey = keyForContext(options.contextId);
  const [defaultValue] = useState(() => initialValue);
  const [state, setState] = useState({ owner: scopedKey, value: initialValue, changed: false });
  const value = state.owner === scopedKey ? state.value : defaultValue;
  const setValue = useCallback(
    (next: SetStateAction<T>, contextId?: string | null) => {
      const targetKey = contextId === undefined ? scopedKey : keyForContext(contextId);
      setState((current) => ({
        owner: targetKey,
        changed: true,
        value:
          typeof next === "function"
            ? (next as (previous: T) => T)(
                current.owner === targetKey ? current.value : defaultValue
              )
            : next,
      }));
    },
    [scopedKey, keyForContext, defaultValue]
  );

  useEffect(() => {
    if (
      !options.persist ||
      !state.changed ||
      !scopedKey ||
      state.owner !== scopedKey ||
      typeof window === "undefined"
    )
      return;

    try {
      window.localStorage.setItem(
        scopedKey,
        JSON.stringify({ version: 1, owner: scopedKey, savedAt: Date.now(), value })
      );
    } catch {
      // Ignorar fallos de almacenamiento local sin romper la UI.
    }
  }, [options.persist, scopedKey, state.owner, state.changed, value]);

  const restoreDraft = useCallback(
    (fallbackValue?: T, contextId?: string | null) => {
      const storedDraft = readStoredDraft<T>(
        contextId === undefined ? scopedKey : keyForContext(contextId)
      );
      const nextValue = storedDraft ?? fallbackValue ?? defaultValue;
      setValue(nextValue, contextId);
      return storedDraft !== null;
    },
    [scopedKey, keyForContext, setValue, defaultValue]
  );

  const clearDraft = useCallback(
    (nextValue?: T) => {
      try {
        if (scopedKey && typeof window !== "undefined") {
          window.localStorage.removeItem(scopedKey);
        }
      } catch {
        // A local draft cleanup failure must not turn a completed save into an error.
      }
      setState({ owner: scopedKey, value: nextValue ?? defaultValue, changed: false });
    },
    [scopedKey, defaultValue]
  );

  const hasStoredDraft = useCallback(() => readStoredDraft<T>(scopedKey) !== null, [scopedKey]);

  return {
    value,
    setValue,
    restoreDraft,
    clearDraft,
    hasStoredDraft,
  };
}
