import { describe, expect, test } from "bun:test";

import {
  fingerprintIdempotentRequest,
  getIdempotencyKey,
  resetIdempotencyStoreForTests,
  runIdempotent,
} from "../src/lib/reliability/idempotency";

describe("mutation idempotency", () => {
  test("replays the first result for the same scope, key and payload", async () => {
    resetIdempotencyStoreForTests();
    let calls = 0;
    const fingerprint = fingerprintIdempotentRequest({
      publicId: "BATCH-01",
      productName: "Sầu riêng",
    });

    const first = await runIdempotent({
      scope: "create-batch:user-1",
      key: "create-batch:test-001",
      fingerprint,
      operation: async () => {
        calls += 1;
        return { id: "batch-1" };
      },
    });
    const second = await runIdempotent({
      scope: "create-batch:user-1",
      key: "create-batch:test-001",
      fingerprint,
      operation: async () => {
        calls += 1;
        return { id: "batch-2" };
      },
    });

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.value).toEqual({ id: "batch-1" });
    expect(calls).toBe(1);
  });

  test("rejects reusing a key with a different request fingerprint", async () => {
    resetIdempotencyStoreForTests();
    await runIdempotent({
      scope: "create-event:user-1:batch-1",
      key: "create-event:test-001",
      fingerprint: fingerprintIdempotentRequest({ summary: "first" }),
      operation: async () => ({ id: "event-1" }),
    });

    await expect(
      runIdempotent({
        scope: "create-event:user-1:batch-1",
        key: "create-event:test-001",
        fingerprint: fingerprintIdempotentRequest({ summary: "changed" }),
        operation: async () => ({ id: "event-2" }),
      }),
    ).rejects.toThrow("idempotency_key_reused_with_different_request");
  });

  test("removes failed operations so a retry can execute again", async () => {
    resetIdempotencyStoreForTests();
    let calls = 0;
    const input = {
      scope: "confirm-event:user-1:batch-1:event-1",
      key: "confirm-event:test-001",
      fingerprint: fingerprintIdempotentRequest({ eventId: "event-1" }),
    };

    await expect(
      runIdempotent({
        ...input,
        operation: async () => {
          calls += 1;
          throw new Error("temporary_failure");
        },
      }),
    ).rejects.toThrow("temporary_failure");

    const retry = await runIdempotent({
      ...input,
      operation: async () => {
        calls += 1;
        return "ok";
      },
    });

    expect(retry.value).toBe("ok");
    expect(retry.replayed).toBe(false);
    expect(calls).toBe(2);
  });

  test("normalizes object key ordering for fingerprints", () => {
    expect(
      fingerprintIdempotentRequest({ b: 2, nested: { y: 2, x: 1 }, a: 1 }),
    ).toBe(
      fingerprintIdempotentRequest({ a: 1, nested: { x: 1, y: 2 }, b: 2 }),
    );
  });

  test("validates Idempotency-Key syntax", () => {
    expect(
      getIdempotencyKey(
        new Request("https://check-di.test", {
          headers: { "idempotency-key": "create-batch:abc_123" },
        }),
      ),
    ).toBe("create-batch:abc_123");

    expect(() =>
      getIdempotencyKey(
        new Request("https://check-di.test", {
          headers: { "idempotency-key": "bad key" },
        }),
      ),
    ).toThrow("invalid_idempotency_key");
  });
});
