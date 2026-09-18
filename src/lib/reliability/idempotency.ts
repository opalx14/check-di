import { createHash } from "node:crypto";

type IdempotencyEntry<T> = {
  fingerprint: string;
  expiresAt: number;
  promise: Promise<T>;
};

type IdempotencyStore = Map<string, IdempotencyEntry<unknown>>;

const STORE_SYMBOL = Symbol.for("check-di.idempotency-store");
const DEFAULT_TTL_MS = 15 * 60 * 1000;

function store() {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_SYMBOL]?: IdempotencyStore;
  };
  globalStore[STORE_SYMBOL] ??= new Map();
  return globalStore[STORE_SYMBOL];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function fingerprintIdempotentRequest(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

export function getIdempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key")?.trim();
  if (!value) return null;
  if (
    value.length > 128 ||
    value.length < 8 ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    throw new Error("invalid_idempotency_key");
  }
  return value;
}

export async function runIdempotent<T>(input: {
  scope: string;
  key: string | null;
  fingerprint: string;
  operation: () => Promise<T>;
  ttlMs?: number;
}): Promise<{ value: T; replayed: boolean }> {
  if (!input.key) {
    return { value: await input.operation(), replayed: false };
  }

  const now = Date.now();
  const cache = store();
  for (const [entryKey, entry] of cache.entries()) {
    if (entry.expiresAt <= now) cache.delete(entryKey);
  }

  const cacheKey = `${input.scope}:${input.key}`;
  const existing = cache.get(cacheKey) as IdempotencyEntry<T> | undefined;
  if (existing) {
    if (existing.fingerprint !== input.fingerprint) {
      throw new Error("idempotency_key_reused_with_different_request");
    }
    return { value: await existing.promise, replayed: true };
  }

  const promise = input.operation();
  cache.set(cacheKey, {
    fingerprint: input.fingerprint,
    expiresAt: now + Math.max(1_000, input.ttlMs ?? DEFAULT_TTL_MS),
    promise,
  });

  try {
    return { value: await promise, replayed: false };
  } catch (error) {
    cache.delete(cacheKey);
    throw error;
  }
}

export function resetIdempotencyStoreForTests() {
  store().clear();
}
