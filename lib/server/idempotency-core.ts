import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const MAX_CANONICAL_DEPTH = 64;
const MAX_CANONICAL_NODES = 100_000;
const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7e]{8,200}$/u;

type CanonicalState = {
  nodes: number;
  ancestors: WeakSet<object>;
};

export class CanonicalJsonError extends TypeError {
  readonly code = "INVALID_CANONICAL_JSON";

  constructor() {
    super("Value must be bounded, acyclic JSON data");
    this.name = "CanonicalJsonError";
  }
}

export class IdempotencyKeyError extends TypeError {
  readonly code = "INVALID_IDEMPOTENCY_KEY";

  constructor() {
    super("Idempotency key must contain 8-200 visible ASCII characters");
    this.name = "IdempotencyKeyError";
  }
}

function hasLoneSurrogate(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function encodeString(value: string) {
  if (hasLoneSurrogate(value)) throw new CanonicalJsonError();
  return JSON.stringify(value);
}

function visitNode(state: CanonicalState, depth: number) {
  state.nodes += 1;
  if (depth > MAX_CANONICAL_DEPTH || state.nodes > MAX_CANONICAL_NODES) {
    throw new CanonicalJsonError();
  }
}

function canonicalize(value: unknown, state: CanonicalState, depth: number): string {
  visitNode(state, depth);
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return encodeString(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new CanonicalJsonError();
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value !== "object") throw new CanonicalJsonError();

  if (state.ancestors.has(value)) throw new CanonicalJsonError();
  state.ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const parts: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) throw new CanonicalJsonError();
        parts.push(canonicalize(value[index], state, depth + 1));
      }
      return `[${parts.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new CanonicalJsonError();
    if (Object.getOwnPropertySymbols(value).length > 0) throw new CanonicalJsonError();

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (Reflect.ownKeys(record).length !== keys.length) throw new CanonicalJsonError();
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new CanonicalJsonError();
      return `${encodeString(key)}:${canonicalize(descriptor.value, state, depth + 1)}`;
    });
    return `{${parts.join(",")}}`;
  } finally {
    state.ancestors.delete(value);
  }
}

export function canonicalJson(value: unknown): string {
  return canonicalize(value, { nodes: 0, ancestors: new WeakSet() }, 0);
}

export function hashCanonicalRequest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function validateSecret(secret: string) {
  const bytes = Buffer.byteLength(secret, "utf8");
  if (bytes < 32 || bytes > 4096) throw new TypeError("Idempotency hashing secret is invalid");
}

export function hashIdempotencyKey(rawKey: string, secret: string): string {
  if (!IDEMPOTENCY_KEY_PATTERN.test(rawKey)) throw new IdempotencyKeyError();
  validateSecret(secret);
  return createHmac("sha256", secret)
    .update("ksops:idempotency-key:v1\0", "utf8")
    .update(rawKey, "utf8")
    .digest("hex");
}

export function equalHexDigest(first: string, second: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(first) || !/^[a-f0-9]{64}$/u.test(second)) return false;
  return timingSafeEqual(Buffer.from(first, "hex"), Buffer.from(second, "hex"));
}
