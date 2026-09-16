import { createHash } from "node:crypto";

import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  createTransactionMessage,
  devnet,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type AccountSignerMeta,
  type Address,
  type Instruction,
  type InstructionWithSigners,
  type KeyPairSigner,
} from "@solana/kit";

import {
  CHECK_DI_REGISTRY_PROGRAM_ID,
  SOLANA_RPC_URL,
} from "@/lib/solana/config";
import { getDevnetFeePayerKeypairBytes } from "@/lib/solana/server";
import type { TraceEvent } from "@/types/evidence";

const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");
const PROGRAM_ADDRESS = address(CHECK_DI_REGISTRY_PROGRAM_ID);
const addressEncoder = getAddressEncoder();
const RPC_RETRY_ATTEMPTS = 6;
const RPC_RETRY_BASE_DELAY_MS = 700;

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || message.includes("Too Many Requests");
}

async function withRpcRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < RPC_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === RPC_RETRY_ATTEMPTS - 1) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RPC_RETRY_BASE_DELAY_MS * 2 ** attempt),
      );
    }
  }

  throw lastError;
}

export type RegistryStatus = "active" | "revoked" | "superseded";

export type BatchRegistryState = {
  address: string;
  authority: string;
  batchHash: string;
  lastEventHash: string;
  eventCount: number;
  status: RegistryStatus;
  createdAt: number;
  updatedAt: number;
  bump: number;
};

export type EventRegistryState = {
  address: string;
  registry: string;
  authority: string;
  organization: string;
  eventHash: string;
  previousEventHash: string;
  organizationHash: string;
  version: number;
  status: RegistryStatus;
  occurredAt: number;
  anchoredAt: number;
  bump: number;
};

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest();
}

function instructionDiscriminator(name: string) {
  return sha256(`global:${name}`).subarray(0, 8);
}

function accountDiscriminator(name: string) {
  return sha256(`account:${name}`).subarray(0, 8);
}

function encodeU32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

function encodeI64(value: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64LE(BigInt(value));
  return buffer;
}

function statusFromByte(value: number): RegistryStatus {
  if (value === 0) return "active";
  if (value === 1) return "revoked";
  if (value === 2) return "superseded";
  throw new Error(`unknown_registry_status:${value}`);
}

export function getBatchRegistryHash(publicId: string) {
  return sha256(`check-di-batch:${publicId.trim().toUpperCase()}`);
}

export function getOrganizationHash(organizationId: string) {
  return sha256(`check-di-organization:${organizationId}`);
}

function getOrganizationSignerSeed(organizationId: string) {
  return sha256(`check-di-demo-ed25519:${organizationId}`);
}

function normalizePreviousHash(value: string | undefined) {
  if (!value || value === "GENESIS") return Buffer.alloc(32);
  const hash = Buffer.from(value, "hex");
  if (hash.length !== 32) throw new Error("invalid_previous_event_hash");
  return hash;
}

function eventHashBytes(event: TraceEvent) {
  if (!event.eventHash) throw new Error("event_missing_hash");
  const hash = Buffer.from(event.eventHash, "hex");
  if (hash.length !== 32) throw new Error("invalid_event_hash");
  return hash;
}

async function getFeePayerSigner() {
  return createKeyPairSignerFromBytes(await getDevnetFeePayerKeypairBytes());
}

async function getOrganizationSigner(organizationId: string) {
  return createKeyPairSignerFromPrivateKeyBytes(getOrganizationSignerSeed(organizationId));
}

function getExternalOrganizationAddress(event: TraceEvent): Address | null {
  if (!event.signerPublicKey) return null;
  try {
    return address(event.signerPublicKey);
  } catch {
    return null;
  }
}

async function getExpectedOrganizationAddress(event: TraceEvent) {
  return (
    getExternalOrganizationAddress(event) ??
    (await getOrganizationSigner(event.organizationId)).address
  );
}

export async function deriveBatchRegistryAddress(publicId: string, authority: Address) {
  const [registry, bump] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: [
      "batch",
      addressEncoder.encode(authority),
      getBatchRegistryHash(publicId),
    ],
  });

  return { registry, bump };
}

export async function deriveEventRegistryAddress(
  registry: Address,
  eventHash: Uint8Array,
) {
  const [event, bump] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: ["event", addressEncoder.encode(registry), eventHash],
  });

  return { event, bump };
}

async function waitForSignature(signature: string, attempts = 30) {
  const rpc = createSolanaRpc(devnet(SOLANA_RPC_URL));

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await withRpcRetry(() =>
      rpc
        .getSignatureStatuses([signature as never], {
          searchTransactionHistory: true,
        })
        .send(),
    );
    const status = result.value[0];

    if (status?.err) throw new Error("registry_transaction_failed");
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error("registry_confirmation_timeout");
}

async function sendInstruction(
  instruction: Instruction & InstructionWithSigners,
  feePayer: KeyPairSigner,
) {
  const rpc = createSolanaRpc(devnet(SOLANA_RPC_URL));
  const latest = await withRpcRetry(() =>
    rpc.getLatestBlockhash({ commitment: "confirmed" }).send(),
  );

  const emptyMessage = createTransactionMessage({ version: 0 });
  const feePayerMessage = setTransactionMessageFeePayerSigner(
    feePayer,
    emptyMessage,
  );
  const lifetimeMessage = setTransactionMessageLifetimeUsingBlockhash(
    latest.value,
    feePayerMessage,
  );
  const message = appendTransactionMessageInstruction(
    instruction,
    lifetimeMessage,
  );

  const signed = await signTransactionMessageWithSigners(message);
  const wireTransaction = getBase64EncodedWireTransaction(signed);
  const signature = await withRpcRetry(() =>
    rpc
      .sendTransaction(wireTransaction, {
        encoding: "base64",
        maxRetries: 3n,
        preflightCommitment: "confirmed",
        skipPreflight: false,
      })
      .send(),
  );

  await waitForSignature(signature);
  return signature;
}

export async function initializeBatchRegistryOnDevnet(publicId: string) {
  const feePayer = await getFeePayerSigner();
  const batchHash = getBatchRegistryHash(publicId);
  const { registry, bump } = await deriveBatchRegistryAddress(
    publicId,
    feePayer.address,
  );

  const existing = await fetchRawAccount(registry);
  if (existing) {
    return {
      registry,
      bump,
      transactionSignature: undefined,
      reused: true as const,
      state: decodeBatchRegistry(registry, existing),
    };
  }

  const authorityMeta: AccountSignerMeta = {
    address: feePayer.address,
    role: AccountRole.WRITABLE_SIGNER,
    signer: feePayer,
  };
  const instruction: Instruction & InstructionWithSigners = {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: registry, role: AccountRole.WRITABLE },
      authorityMeta,
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: Buffer.concat([
      instructionDiscriminator("initialize_batch"),
      batchHash,
    ]),
  };

  const transactionSignature = await sendInstruction(instruction, feePayer);
  const account = await fetchRawAccount(registry);
  if (!account) throw new Error("batch_registry_missing_after_initialize");

  return {
    registry,
    bump,
    transactionSignature,
    reused: false as const,
    state: decodeBatchRegistry(registry, account),
  };
}

export async function appendEventRegistryOnDevnet(
  publicId: string,
  event: TraceEvent,
  version = 1,
) {
  if (event.status !== "confirmed") throw new Error("event_not_confirmed");

  const feePayer = await getFeePayerSigner();
  if (getExternalOrganizationAddress(event)) {
    throw new Error("organization_wallet_transaction_required");
  }
  const organization = await getOrganizationSigner(event.organizationId);
  const { registry } = await deriveBatchRegistryAddress(publicId, feePayer.address);
  const eventHash = eventHashBytes(event);
  const previousEventHash = normalizePreviousHash(event.previousEventHash);
  const organizationHash = getOrganizationHash(event.organizationId);
  const { event: eventAddress, bump } = await deriveEventRegistryAddress(
    registry,
    eventHash,
  );

  const existing = await fetchRawAccount(eventAddress);
  if (existing) {
    return {
      registry,
      event: eventAddress,
      bump,
      organization: organization.address,
      transactionSignature: undefined,
      reused: true as const,
      state: decodeEventRegistry(eventAddress, existing),
    };
  }

  const occurredAt = Math.floor(new Date(event.occurredAt).getTime() / 1000);
  if (!Number.isFinite(occurredAt)) throw new Error("invalid_event_occurred_at");

  const authorityMeta: AccountSignerMeta = {
    address: feePayer.address,
    role: AccountRole.WRITABLE_SIGNER,
    signer: feePayer,
  };
  const organizationMeta: AccountSignerMeta = {
    address: organization.address,
    role: AccountRole.READONLY_SIGNER,
    signer: organization,
  };
  const instruction: Instruction & InstructionWithSigners = {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: registry, role: AccountRole.WRITABLE },
      { address: eventAddress, role: AccountRole.WRITABLE },
      authorityMeta,
      organizationMeta,
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: Buffer.concat([
      instructionDiscriminator("append_event"),
      eventHash,
      previousEventHash,
      organizationHash,
      encodeU32(version),
      encodeI64(occurredAt),
    ]),
  };

  const transactionSignature = await sendInstruction(instruction, feePayer);
  const [account, registryAccount] = await Promise.all([
    fetchRawAccount(eventAddress),
    fetchRawAccount(registry),
  ]);
  if (!account) throw new Error("event_registry_missing_after_append");
  if (!registryAccount) throw new Error("batch_registry_missing_after_append");

  return {
    registry,
    event: eventAddress,
    bump,
    organization: organization.address,
    transactionSignature,
    reused: false as const,
    state: decodeEventRegistry(eventAddress, account),
    registryState: decodeBatchRegistry(registry, registryAccount),
  };
}

export async function setEventRegistryStatusOnDevnet(
  publicId: string,
  event: TraceEvent,
  newStatus: Extract<RegistryStatus, "revoked" | "superseded">,
) {
  if (event.status !== "confirmed") {
    throw new Error("event_status_transition_invalid");
  }

  const feePayer = await getFeePayerSigner();
  const { registry } = await deriveBatchRegistryAddress(publicId, feePayer.address);
  const { event: eventAddress } = await deriveEventRegistryAddress(
    registry,
    eventHashBytes(event),
  );
  const existing = await fetchRawAccount(eventAddress);
  if (!existing) throw new Error("registry_event_missing");
  const current = decodeEventRegistry(eventAddress, existing);
  if (current.status === newStatus) {
    return {
      registry,
      event: eventAddress,
      transactionSignature: undefined,
      reused: true as const,
      state: current,
    };
  }
  if (current.status !== "active") throw new Error("registry_event_not_active");

  const authorityMeta: AccountSignerMeta = {
    address: feePayer.address,
    role: AccountRole.READONLY_SIGNER,
    signer: feePayer,
  };
  const statusByte = newStatus === "revoked" ? 1 : 2;
  const instruction: Instruction & InstructionWithSigners = {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: registry, role: AccountRole.READONLY },
      { address: eventAddress, role: AccountRole.WRITABLE },
      authorityMeta,
    ],
    data: Buffer.concat([
      instructionDiscriminator("set_event_status"),
      Buffer.from([statusByte]),
    ]),
  };

  const transactionSignature = await sendInstruction(instruction, feePayer);
  const updated = await fetchRawAccount(eventAddress);
  if (!updated) throw new Error("registry_event_missing_after_status_update");
  const state = decodeEventRegistry(eventAddress, updated);
  if (state.status !== newStatus) {
    throw new Error("registry_event_status_mismatch");
  }

  return {
    registry,
    event: eventAddress,
    transactionSignature,
    reused: false as const,
    state,
  };
}

export async function getBatchRegistryStateOnDevnet(publicId: string) {
  const feePayer = await getFeePayerSigner();
  const { registry } = await deriveBatchRegistryAddress(publicId, feePayer.address);
  const account = await fetchRawAccount(registry);
  return account ? decodeBatchRegistry(registry, account) : null;
}

export async function getEventRegistryStateOnDevnet(
  publicId: string,
  event: TraceEvent,
) {
  const feePayer = await getFeePayerSigner();
  const { registry } = await deriveBatchRegistryAddress(publicId, feePayer.address);
  const { event: eventAddress } = await deriveEventRegistryAddress(
    registry,
    eventHashBytes(event),
  );
  const account = await fetchRawAccount(eventAddress);
  return account ? decodeEventRegistry(eventAddress, account) : null;
}

export async function verifyEventRegistryOnDevnet(
  publicId: string,
  event: TraceEvent,
  options?: {
    authorityPublicKey?: string;
  },
) {
  try {
    const authority = options?.authorityPublicKey
      ? address(options.authorityPublicKey)
      : (await getFeePayerSigner()).address;
    const expectedBatchHash = getBatchRegistryHash(publicId).toString("hex");
    const expectedEventHash = eventHashBytes(event).toString("hex");
    const expectedPreviousHash = normalizePreviousHash(event.previousEventHash).toString("hex");
    const expectedOrganizationHash = getOrganizationHash(event.organizationId).toString("hex");
    const organization = await getExpectedOrganizationAddress(event);
    const { registry } = await deriveBatchRegistryAddress(publicId, authority);
    const { event: eventAddress } = await deriveEventRegistryAddress(
      registry,
      Buffer.from(expectedEventHash, "hex"),
    );

    const [registryAccount, eventAccount] = await Promise.all([
      fetchRawAccount(registry),
      fetchRawAccount(eventAddress),
    ]);
    if (!registryAccount || !eventAccount) {
      return {
        valid: false,
        registry,
        eventPda: eventAddress,
        error: "registry_account_missing",
      };
    }

    const registryState = decodeBatchRegistry(registry, registryAccount);
    const eventState = decodeEventRegistry(eventAddress, eventAccount);
    const expectedLifecycleStatus: RegistryStatus =
      event.status === "revoked" || event.status === "superseded"
        ? event.status
        : "active";
    const checks = {
      authority: registryState.authority === authority,
      batchHash: registryState.batchHash === expectedBatchHash,
      registryLink: eventState.registry === registry,
      eventAuthority: eventState.authority === authority,
      organization: eventState.organization === organization,
      eventHash: eventState.eventHash === expectedEventHash,
      previousEventHash: eventState.previousEventHash === expectedPreviousHash,
      organizationHash: eventState.organizationHash === expectedOrganizationHash,
      lifecycleStatus: eventState.status === expectedLifecycleStatus,
    };

    return {
      valid: Object.values(checks).every(Boolean),
      registry,
      eventPda: eventAddress,
      organization,
      checks,
      registryState,
      eventState,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "registry_verification_failed",
    };
  }
}

export function getRegistryExplorerUrl(addressValue: string) {
  return `https://explorer.solana.com/address/${encodeURIComponent(addressValue)}?cluster=devnet`;
}

export function getRegistryTransactionExplorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
}

async function fetchRawAccount(accountAddress: Address) {
  const rpc = createSolanaRpc(devnet(SOLANA_RPC_URL));
  const result = await withRpcRetry(() =>
    rpc
      .getAccountInfo(accountAddress, {
        commitment: "confirmed",
        encoding: "base64",
      })
      .send(),
  );

  if (!result.value) return null;
  const [data] = result.value.data;
  return Buffer.from(data, "base64");
}

function decodeAddress(bytes: Buffer) {
  // Address encoder is intentionally one-way in this module; importing the decoder
  // keeps account parsing explicit and avoids treating arbitrary bytes as trusted text.
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = [0];

  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      const value = digits[index] * 256 + carry;
      digits[index] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let result = "";
  for (let index = 0; index < bytes.length - 1 && bytes[index] === 0; index += 1) {
    result += alphabet[0];
  }
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    result += alphabet[digits[index]];
  }
  return result;
}

function assertDiscriminator(data: Buffer, accountName: string) {
  const expected = accountDiscriminator(accountName);
  if (!data.subarray(0, 8).equals(expected)) {
    throw new Error(`invalid_${accountName.toLowerCase()}_discriminator`);
  }
}

export function decodeBatchRegistry(
  accountAddress: Address,
  data: Buffer,
): BatchRegistryState {
  assertDiscriminator(data, "BatchRegistry");
  let offset = 8;
  const authority = decodeAddress(data.subarray(offset, (offset += 32)));
  const batchHash = data.subarray(offset, (offset += 32)).toString("hex");
  const lastEventHash = data.subarray(offset, (offset += 32)).toString("hex");
  const eventCount = data.readUInt32LE(offset);
  offset += 4;
  const status = statusFromByte(data[offset]);
  offset += 1;
  const createdAt = Number(data.readBigInt64LE(offset));
  offset += 8;
  const updatedAt = Number(data.readBigInt64LE(offset));
  offset += 8;
  const bump = data[offset];

  return {
    address: accountAddress,
    authority,
    batchHash,
    lastEventHash,
    eventCount,
    status,
    createdAt,
    updatedAt,
    bump,
  };
}

export function decodeEventRegistry(
  accountAddress: Address,
  data: Buffer,
): EventRegistryState {
  assertDiscriminator(data, "EventProof");
  let offset = 8;
  const registry = decodeAddress(data.subarray(offset, (offset += 32)));
  const authority = decodeAddress(data.subarray(offset, (offset += 32)));
  const organization = decodeAddress(data.subarray(offset, (offset += 32)));
  const eventHash = data.subarray(offset, (offset += 32)).toString("hex");
  const previousEventHash = data.subarray(offset, (offset += 32)).toString("hex");
  const organizationHash = data.subarray(offset, (offset += 32)).toString("hex");
  const version = data.readUInt32LE(offset);
  offset += 4;
  const status = statusFromByte(data[offset]);
  offset += 1;
  const occurredAt = Number(data.readBigInt64LE(offset));
  offset += 8;
  const anchoredAt = Number(data.readBigInt64LE(offset));
  offset += 8;
  const bump = data[offset];

  return {
    address: accountAddress,
    registry,
    authority,
    organization,
    eventHash,
    previousEventHash,
    organizationHash,
    version,
    status,
    occurredAt,
    anchoredAt,
    bump,
  };
}
