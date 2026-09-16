import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";

import { getBase58Encoder } from "@solana/kit";

import type { TraceEvent, TraceEventStatus } from "@/types/evidence";

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

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

export function canonicalEventPayload(input: ConfirmTraceEventInput) {
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
    ...(input.documentEvidence
      ? { documentEvidence: input.documentEvidence }
      : {}),
    metrics: input.metrics ?? {},
    aiValidations: input.aiValidations ?? [],
  };
}

export function buildTraceEventHash(
  input: ConfirmTraceEventInput,
  previousEventHash: string,
) {
  return sha256Hex(
    canonicalize({
      previousEventHash,
      payload: canonicalEventPayload(input),
    }),
  );
}

export function confirmTraceEvent(
  input: ConfirmTraceEventInput,
  previousEventHash: string,
): TraceEvent {
  const eventHash = buildTraceEventHash(input, previousEventHash);

  return {
    ...input,
    previousEventHash,
    eventHash,
    signerPublicKey: exportPublicKey(input.organizationId),
    signature: signEventHash(input.organizationId, eventHash),
    status: input.status ?? "confirmed",
  };
}

export function confirmTraceEventWithExternalSignature(
  input: ConfirmTraceEventInput,
  previousEventHash: string,
  signerPublicKey: string,
  signature: string,
): TraceEvent {
  const eventHash = buildTraceEventHash(input, previousEventHash);
  const candidate: TraceEvent = {
    ...input,
    previousEventHash,
    eventHash,
    signerPublicKey,
    signature,
    status: input.status ?? "confirmed",
  };
  const verification = verifyTraceEvent(candidate);
  if (!verification.signatureValid) {
    throw new Error("external_event_signature_invalid");
  }
  return candidate;
}

function importPublicKey(publicKeyValue: string) {
  try {
    return createPublicKey({
      key: Buffer.from(publicKeyValue, "base64url"),
      format: "der",
      type: "spki",
    });
  } catch {
    const raw = Buffer.from(getBase58Encoder().encode(publicKeyValue));
    if (raw.length !== 32) throw new Error("invalid_ed25519_public_key");
    return createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, raw]),
      format: "der",
      type: "spki",
    });
  }
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
    documentEvidence: event.documentEvidence,
    metrics: event.metrics,
    aiValidations: event.aiValidations,
  });

  const recomputedHash = sha256Hex(
    canonicalize({
      previousEventHash: event.previousEventHash,
      payload,
    }),
  );

  let signatureValid = false;
  try {
    signatureValid = verify(
      null,
      Buffer.from(event.eventHash, "hex"),
      importPublicKey(event.signerPublicKey),
      Buffer.from(event.signature, "base64url"),
    );
  } catch {
    signatureValid = false;
  }

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
