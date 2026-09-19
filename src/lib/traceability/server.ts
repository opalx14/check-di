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

export type TraceEventHashVerificationMode =
  | "exact"
  | "utc-iso"
  | "utc-z-no-ms"
  | "legacy-vn-offset"
  | "legacy-vn-offset-ms";

function buildEventHashCandidate(
  event: TraceEvent,
  occurredAt: string,
) {
  return buildTraceEventHash(
    {
      id: event.id,
      batchId: event.batchId,
      stage: event.stage,
      organizationId: event.organizationId,
      organizationName: event.organizationName,
      location: event.location,
      occurredAt,
      summary: event.summary,
      documents: event.documents,
      documentEvidence: event.documentEvidence,
      metrics: event.metrics,
      aiValidations: event.aiValidations,
    },
    event.previousEventHash ?? "",
  );
}

function formatFixedOffsetTimestamp(
  date: Date,
  offsetMinutes: number,
  includeMilliseconds: boolean,
) {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const iso = shifted.toISOString();
  const base = includeMilliseconds ? iso.slice(0, 23) : iso.slice(0, 19);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");
  return `${base}${sign}${hours}:${minutes}`;
}

function verifyEventHash(event: TraceEvent): {
  hashValid: boolean;
  hashMode?: TraceEventHashVerificationMode;
} {
  if (!event.previousEventHash || !event.eventHash) {
    return { hashValid: false };
  }

  const candidates: Array<{
    mode: TraceEventHashVerificationMode;
    occurredAt: string;
  }> = [{ mode: "exact", occurredAt: event.occurredAt }];

  const parsed = new Date(event.occurredAt);
  if (!Number.isNaN(parsed.getTime())) {
    const utcIso = parsed.toISOString();
    candidates.push({ mode: "utc-iso", occurredAt: utcIso });
    candidates.push({
      mode: "utc-z-no-ms",
      occurredAt: utcIso.replace(/\.000Z$/, "Z"),
    });
    candidates.push({
      mode: "legacy-vn-offset",
      occurredAt: formatFixedOffsetTimestamp(parsed, 7 * 60, false),
    });
    candidates.push({
      mode: "legacy-vn-offset-ms",
      occurredAt: formatFixedOffsetTimestamp(parsed, 7 * 60, true),
    });
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.occurredAt)) continue;
    seen.add(candidate.occurredAt);
    if (buildEventHashCandidate(event, candidate.occurredAt) === event.eventHash) {
      return candidate.mode === "exact"
        ? { hashValid: true }
        : {
            hashValid: true,
            hashMode: candidate.mode,
          };
    }
  }

  return { hashValid: false };
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
  hashMode?: TraceEventHashVerificationMode;
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

  const hashCheck = verifyEventHash(event);

  let signatureValid = false;
  try {
    const key = importPublicKey(event.signerPublicKey);
    const signatureBytes = Buffer.from(event.signature, "base64url");
    try {
      signatureValid = verify(
        null,
        Buffer.from(event.eventHash, "hex"),
        key,
        signatureBytes,
      );
    } catch {
      signatureValid = false;
    }

    if (!signatureValid) {
      try {
        signatureValid = verify(
          null,
          Buffer.from(event.eventHash, "utf8"),
          key,
          signatureBytes,
        );
      } catch {
        signatureValid = false;
      }
    }
  } catch {
    signatureValid = false;
  }

  return {
    ...hashCheck,
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
