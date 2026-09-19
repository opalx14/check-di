import { generateKeyPairSync, sign } from "node:crypto";

import { describe, expect, test } from "bun:test";
import { PublicKey } from "@solana/web3.js";

import { getSampleBatch } from "@/lib/db/sample-batch";
import {
  buildTraceEventHash,
  confirmTraceEvent,
  confirmTraceEventWithExternalSignature,
  type ConfirmTraceEventInput,
  verifyTraceChain,
  verifyTraceEvent,
} from "@/lib/traceability/server";

describe("Check-Di traceability vertical slice", () => {
  test("builds a five-stage batch with a valid hash/signature chain", () => {
    const batch = getSampleBatch("DUR-260830-01");

    expect(batch).not.toBeNull();
    expect(batch?.events).toHaveLength(5);
    expect(batch?.chainVerification.valid).toBe(true);
    expect(batch?.events[0]?.previousEventHash).toBe("GENESIS");

    for (let index = 1; index < (batch?.events.length ?? 0); index += 1) {
      expect(batch?.events[index]?.previousEventHash).toBe(
        batch?.events[index - 1]?.eventHash,
      );
    }
  });

  test("uses real SHA-256 event hashes and Ed25519 signatures", () => {
    const batch = getSampleBatch("DUR-260830-01");
    const event = batch?.events[1];

    expect(event?.eventHash).toMatch(/^[a-f0-9]{64}$/);
    expect(event?.signature?.length).toBeGreaterThan(60);
    expect(event?.signerPublicKey?.length).toBeGreaterThan(40);
  });

  test("detects a modified historical event", () => {
    const batch = getSampleBatch("DUR-260830-01");
    expect(batch).not.toBeNull();

    const tamperedEvents = batch!.events.map((event) => ({ ...event }));
    tamperedEvents[1] = {
      ...tamperedEvents[1],
      summary: "Nội dung đã bị sửa sau khi xác nhận.",
    };

    const verification = verifyTraceChain(tamperedEvents);

    expect(verification.valid).toBe(false);
    expect(verification.checks[1]?.hashValid).toBe(false);
  });

  test("accepts Supabase timestamptz normalization for legacy +07 signed events", () => {
    const batch = getSampleBatch("DUR-260830-01");
    const source = batch?.events[0];
    expect(source).toBeDefined();

    const hydrated = {
      ...source!,
      occurredAt: "2026-08-29T23:40:00+00:00",
    };
    const verification = verifyTraceEvent(hydrated);

    expect(verification.hashValid).toBe(true);
    expect(verification.signatureValid).toBe(true);
    expect(verification.hashMode).toBe("legacy-vn-offset");
  });

  test("accepts Supabase timestamptz normalization for UTC ISO signed events", () => {
    const input: ConfirmTraceEventInput = {
      id: "evt-supabase-time-normalization",
      batchId: "batch-time-normalization",
      stage: "production",
      organizationId: "org-time-normalization",
      organizationName: "Time Normalization Farm",
      location: "Long An",
      occurredAt: "2026-09-19T03:00:00.000Z",
      summary: "Timestamp normalization compatibility test",
      documents: [],
      metrics: {},
      aiValidations: [],
    };
    const signed = confirmTraceEvent(input, "GENESIS");
    const hydrated = {
      ...signed,
      occurredAt: "2026-09-19T03:00:00+00:00",
    };

    const verification = verifyTraceEvent(hydrated);
    expect(verification.hashValid).toBe(true);
    expect(verification.signatureValid).toBe(true);
    expect(verification.hashMode).toBe("utc-iso");

    expect(
      verifyTraceEvent({
        ...hydrated,
        occurredAt: "2026-09-19T03:01:00+00:00",
      }).hashValid,
    ).toBe(false);
  });

  test("accepts a Phantom-style Solana base58 Ed25519 signer", () => {
    const batch = getSampleBatch("DUR-260830-01");
    const source = batch?.events[0];
    expect(source).toBeDefined();

    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const rawPublicKey = Buffer.from(
      publicKey.export({ format: "der", type: "spki" }),
    ).subarray(-32);
    const signerPublicKey = new PublicKey(rawPublicKey).toBase58();
    const input = {
      id: "evt-phantom-test",
      batchId: source!.batchId,
      stage: source!.stage,
      organizationId: source!.organizationId,
      organizationName: source!.organizationName,
      location: source!.location,
      occurredAt: source!.occurredAt,
      summary: "Phantom signer verification test",
      documents: [],
      metrics: {},
      aiValidations: [],
    };
    const eventHash = buildTraceEventHash(input, "GENESIS");
    const signature = sign(
      null,
      Buffer.from(eventHash, "hex"),
      privateKey,
    ).toString("base64url");
    const event = confirmTraceEventWithExternalSignature(
      input,
      "GENESIS",
      signerPublicKey,
      signature,
    );

    expect(event.signerPublicKey).toBe(signerPublicKey);
    expect(verifyTraceEvent(event)).toEqual({
      hashValid: true,
      signatureValid: true,
    });
  });

  test("confirms and verifies trace event with UTF-8 event hash signature (Phantom wallet format)", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const rawPublicKey = Buffer.from(
      publicKey.export({ format: "der", type: "spki" }),
    ).subarray(-32);
    const signerPublicKey = new PublicKey(rawPublicKey).toBase58();

    const input: ConfirmTraceEventInput = {
      id: "evt-test-utf8",
      batchId: "batch-test",
      stage: "production",
      organizationId: "org-test",
      organizationName: "Test Farm",
      location: "Lam Dong",
      occurredAt: "2026-03-20T08:00:00Z",
      summary: "Harvest complete",
      documents: [],
      documentEvidence: [],
      metrics: {},
      aiValidations: [],
    };
    const eventHash = buildTraceEventHash(input, "GENESIS");
    const signature = sign(
      null,
      Buffer.from(eventHash, "utf8"),
      privateKey,
    ).toString("base64url");
    const event = confirmTraceEventWithExternalSignature(
      input,
      "GENESIS",
      signerPublicKey,
      signature,
    );

    expect(event.signerPublicKey).toBe(signerPublicKey);
    expect(verifyTraceEvent(event)).toEqual({
      hashValid: true,
      signatureValid: true,
    });
  });

  test("runs deterministic AI checks for packing and chronology", () => {
    const batch = getSampleBatch("DUR-260830-01");
    const validations = batch?.events.flatMap((event) => event.aiValidations ?? []) ?? [];

    expect(validations).toHaveLength(2);
    expect(validations.every((validation) => validation.status === "matched")).toBe(true);
  });
});
