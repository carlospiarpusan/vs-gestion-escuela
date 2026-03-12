"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function readStoredDraft<T>(storageKey: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

interface UseDraftFormOptions {
  persist?: boolean;
}

export function useDraftForm<T>(
  storageKey: string,
  initialValue: T,
  options: UseDraftFormOptions = {}
) {
  const initialValueRef = useRef(initialValue);
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    if (!options.persist || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Ignorar fallos de almacenamiento local sin romper la UI.
    }
  }, [options.persist, storageKey, value]);

  const restoreDraft = useCallback(
    (fallbackValue?: T) => {
      const storedDraft = readStoredDraft<T>(storageKey);
      const nextValue = storedDraft ?? fallbackValue ?? initialValueRef.current;
      setValue(nextValue);
      return storedDraft !== null;
    },
    [storageKey]
  );

  const clearDraft = useCallback(
    (nextValue?: T) => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
      setValue(nextValue ?? initialValueRef.current);
    },
    [storageKey]
  );

  const hasStoredDraft = useCallback(() => readStoredDraft<T>(storageKey) !== null, [storageKey]);

  return {
    value,
    setValue,
    restoreDraft,
    clearDraft,
    hasStoredDraft,
  };
}
