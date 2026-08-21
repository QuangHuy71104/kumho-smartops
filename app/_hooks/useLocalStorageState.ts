"use client";

import {
  type SetStateAction,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

const LOCAL_STORAGE_EVENT = "ksops:local-storage";
const memoryFallback = new Map<string, string | null>();

export type StorageDecoder<T> = (value: unknown) => T | null;

type LocalStorageOptions<T> = {
  key: string;
  initialValue: T;
  decode: StorageDecoder<T>;
};

function readRawValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  if (memoryFallback.has(key)) return memoryFallback.get(key) ?? null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function decodeRawValue<T>(
  rawValue: string | null,
  initialValue: T,
  decode: StorageDecoder<T>,
): T {
  if (rawValue === null) return initialValue;

  try {
    return decode(JSON.parse(rawValue)) ?? initialValue;
  } catch {
    return initialValue;
  }
}

function notifyLocalSubscribers(key: string) {
  window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: key }));
}

function writeRawValue(key: string, rawValue: string) {
  try {
    window.localStorage.setItem(key, rawValue);
    memoryFallback.delete(key);
  } catch {
    memoryFallback.set(key, rawValue);
  }

  notifyLocalSubscribers(key);
}

function removeRawValue(key: string) {
  try {
    window.localStorage.removeItem(key);
    memoryFallback.delete(key);
  } catch {
    memoryFallback.set(key, null);
  }

  notifyLocalSubscribers(key);
}

/**
 * Hydration-safe localStorage state with runtime decoding and same-tab updates.
 * The in-memory fallback preserves demo behavior when browser storage is blocked.
 */
export function useLocalStorageState<T>({
  key,
  initialValue,
  decode,
}: LocalStorageOptions<T>) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        memoryFallback.delete(key);
        onStoreChange();
      }
    };
    const handleLocalStorage = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) onStoreChange();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LOCAL_STORAGE_EVENT, handleLocalStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LOCAL_STORAGE_EVENT, handleLocalStorage);
    };
  }, [key]);

  const getSnapshot = useCallback(() => readRawValue(key), [key]);
  const getServerSnapshot = useCallback(() => null, []);
  const rawValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = useMemo(
    () => decodeRawValue(rawValue, initialValue, decode),
    [decode, initialValue, rawValue],
  );

  const setValue = useCallback((nextValue: SetStateAction<T>) => {
    const currentValue = decodeRawValue(readRawValue(key), initialValue, decode);
    const resolvedValue = typeof nextValue === "function"
      ? (nextValue as (current: T) => T)(currentValue)
      : nextValue;
    writeRawValue(key, JSON.stringify(resolvedValue));
  }, [decode, initialValue, key]);

  const resetValue = useCallback(() => removeRawValue(key), [key]);

  return [value, setValue, resetValue] as const;
}
