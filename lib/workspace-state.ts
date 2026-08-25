export const WORKSPACE_STATE_KEYS = [
  "orders",
  "dispatch",
  "fleet",
  "drivers",
  "ticket-catalog",
  "bookings",
  "contract-catalog",
  "contracts",
  "customers",
  "maintenance",
  "maintenance-checklists",
  "finance",
  "paid-invoices",
  "reports",
] as const;

export type WorkspaceStateKey = (typeof WORKSPACE_STATE_KEYS)[number];

export function decodeWorkspaceStateKey(value: unknown): WorkspaceStateKey | null {
  if (typeof value !== "string") return null;
  return (WORKSPACE_STATE_KEYS as readonly string[]).includes(value)
    ? value as WorkspaceStateKey
    : null;
}

export function isJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 2_000 && value.every((item) => isJsonValue(item, depth + 1));
  if (typeof value !== "object") return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length <= 2_000
    && entries.every(([key, item]) => key.length <= 160 && isJsonValue(item, depth + 1));
}
