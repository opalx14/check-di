import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";

import type { TraceEvent, TraceEventStatus } from "@/types/evidence";

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }

  return value;
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function createDemoPrivateKey(organizationId: string) {
  const seed = createHash("sha256")
    .update(`check-di-demo-ed25519:${organizationId}`, "utf8")
    .digest();

  return createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
}

function exportPublicKey(organizationId: string): string {
  const publicKey = createPublicKey(createDemoPrivateKey(organizationId));
  return publicKey.export({ format: "der", type: "spki" }).toString("base64url");
}

function signEventHash(organizationId: string, eventHash: string): string {
  return sign(
    null,
    Buffer.from(eventHash, "hex"),
    createDemoPrivateKey(organizationId),
  ).toString("base64url");
}

export type ConfirmTraceEventInput = Omit<
  TraceEvent,
  | "previousEventHash"
  | "eventHash"
  | "signerPublicKey"
  | "signature"
  | "status"
> & {
  organizationId: string;
  status?: TraceEventStatus;
};

function canonicalEventPayload(input: ConfirmTraceEventInput) {
  return {
    id: input.id,
    batchId: input.batchId,
    stage: input.stage,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    location: input.location,
    occurredAt: input.occurredAt,
    summary: input.summary,
    documents: input.documents ?? [],
    metrics: input.metrics ?? {},
    aiValidations: input.aiValidations ?? [],
  };
}

export function confirmTraceEvent(
  input: ConfirmTraceEventInput,
  previousEventHash: string,
): TraceEvent {
  const payload = canonicalEventPayload(input);
  const eventHash = sha256Hex(
    canonicalize({
      previousEventHash,
      payload,
    }),
  );

  return {
    ...input,
    previousEventHash,
    eventHash,
    signerPublicKey: exportPublicKey(input.organizationId),
    signature: signEventHash(input.organizationId, eventHash),
    status: input.status ?? "confirmed",
  };
}

function importPublicKey(publicKeyBase64Url: string) {
  return createPublicKey({
    key: Buffer.from(publicKeyBase64Url, "base64url"),
    format: "der",
    type: "spki",
  });
}

export function verifyTraceEvent(event: TraceEvent): {
  hashValid: boolean;
  signatureValid: boolean;
} {
  if (
    !event.previousEventHash ||
    !event.eventHash ||
    !event.signerPublicKey ||
    !event.signature ||
    !event.organizationId
  ) {
    return { hashValid: false, signatureValid: false };
  }

  const payload = canonicalEventPayload({
    id: event.id,
    batchId: event.batchId,
    stage: event.stage,
    organizationId: event.organizationId,
    organizationName: event.organizationName,
    location: event.location,
    occurredAt: event.occurredAt,
    summary: event.summary,
    documents: event.documents,
    metrics: event.metrics,
    aiValidations: event.aiValidations,
  });

  const recomputedHash = sha256Hex(
    canonicalize({
      previousEventHash: event.previousEventHash,
      payload,
    }),
  );

  const signatureValid = verify(
    null,
    Buffer.from(event.eventHash, "hex"),
    importPublicKey(event.signerPublicKey),
    Buffer.from(event.signature, "base64url"),
  );

  return {
    hashValid: recomputedHash === event.eventHash,
    signatureValid,
  };
}

export function verifyTraceChain(events: TraceEvent[]) {
  const checks = events.map((event, index) => {
    const expectedPreviousHash = index === 0 ? "GENESIS" : events[index - 1]?.eventHash;
    const eventCheck = verifyTraceEvent(event);
    const linkValid = event.previousEventHash === expectedPreviousHash;

    return {
      eventId: event.id,
      stage: event.stage,
      linkValid,
      ...eventCheck,
      valid: linkValid && eventCheck.hashValid && eventCheck.signatureValid,
    };
  });

  return {
    valid: checks.every((check) => check.valid),
    checks,
  };
}
