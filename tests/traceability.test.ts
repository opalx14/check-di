import { generateKeyPairSync, sign } from "node:crypto";

import { describe, expect, test } from "bun:test";
import { PublicKey } from "@solana/web3.js";

import { getSampleBatch } from "@/lib/db/sample-batch";
import {
  buildTraceEventHash,
  confirmTraceEventWithExternalSignature,
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

  test("runs deterministic AI checks for packing and chronology", () => {
    const batch = getSampleBatch("DUR-260830-01");
    const validations = batch?.events.flatMap((event) => event.aiValidations ?? []) ?? [];

    expect(validations).toHaveLength(2);
    expect(validations.every((validation) => validation.status === "matched")).toBe(true);
  });
});
