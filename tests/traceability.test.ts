import { describe, expect, test } from "bun:test";

import { getSampleBatch } from "@/lib/db/sample-batch";
import { verifyTraceChain } from "@/lib/traceability/server";

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

  test("runs deterministic AI checks for packing and chronology", () => {
    const batch = getSampleBatch("DUR-260830-01");
    const validations = batch?.events.flatMap((event) => event.aiValidations ?? []) ?? [];

    expect(validations).toHaveLength(2);
    expect(validations.every((validation) => validation.status === "matched")).toBe(true);
  });
});
