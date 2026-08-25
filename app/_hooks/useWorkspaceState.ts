"use client";

import { type SetStateAction, useCallback, useEffect } from "react";
import type { WorkspaceStateKey } from "../../lib/workspace-state";
import { useLocalStorageState, type StorageDecoder } from "./useLocalStorageState";

type WorkspaceStateOptions<T> = {
  stateKey: WorkspaceStateKey;
  cacheKey: string;
  initialValue: T;
  decode: StorageDecoder<T>;
};

const writeQueues = new Map<WorkspaceStateKey, Promise<void>>();

async function writeWorkspaceState<T>(stateKey: WorkspaceStateKey, data: T) {
  const previous = writeQueues.get(stateKey) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    const response = await fetch(`/api/v1/workspace-state/${encodeURIComponent(stateKey)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) throw new Error(`WORKSPACE_STATE_WRITE_${response.status}`);
  });
  writeQueues.set(stateKey, next);
  try {
    await next;
  } finally {
    if (writeQueues.get(stateKey) === next) writeQueues.delete(stateKey);
  }
}

export function useWorkspaceState<T>({
  stateKey,
  cacheKey,
  initialValue,
  decode,
}: WorkspaceStateOptions<T>) {
  const [value, setCachedValue, resetCachedValue] = useLocalStorageState({
    key: cacheKey,
    initialValue,
    decode,
  });

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/v1/workspace-state/${encodeURIComponent(stateKey)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json() as { data?: unknown };
      if (body.data === null || body.data === undefined) {
        await writeWorkspaceState(stateKey, initialValue);
        return;
      }
      const decoded = decode(body.data);
      if (decoded !== null) setCachedValue(decoded);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [decode, initialValue, setCachedValue, stateKey]);

  const setValue = useCallback((nextValue: SetStateAction<T>) => {
    setCachedValue((current) => {
      const resolved = typeof nextValue === "function"
        ? (nextValue as (value: T) => T)(current)
        : nextValue;
      void writeWorkspaceState(stateKey, resolved).catch(() => undefined);
      return resolved;
    });
  }, [setCachedValue, stateKey]);

  const resetValue = useCallback(() => {
    resetCachedValue();
    void writeWorkspaceState(stateKey, initialValue).catch(() => undefined);
  }, [initialValue, resetCachedValue, stateKey]);

  return [value, setValue, resetValue] as const;
}
