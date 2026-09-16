import { createHash } from "node:crypto";

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  getBatchRegistryHash,
  getEventRegistryStateOnDevnet,
  getOrganizationHash,
  getRegistryExplorerUrl,
  getRegistryTransactionExplorerUrl,
  initializeBatchRegistryOnDevnet,
  verifyEventRegistryOnDevnet,
} from "@/lib/solana/registry";
import {
  CHECK_DI_REGISTRY_PROGRAM_ID,
  SOLANA_RPC_URL,
} from "@/lib/solana/config";
import { getDevnetFeePayerKeypairBytes } from "@/lib/solana/server";
import type { SolanaIntegrityProof, TraceEvent } from "@/types/evidence";

const PROGRAM_ID = new PublicKey(CHECK_DI_REGISTRY_PROGRAM_ID);

function instructionDiscriminator(name: string) {
  return createHash("sha256")
    .update(`global:${name}`)
    .digest()
    .subarray(0, 8);
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

function eventHashBytes(event: TraceEvent) {
  if (!event.eventHash) throw new Error("event_missing_hash");
  const bytes = Buffer.from(event.eventHash, "hex");
  if (bytes.length !== 32) throw new Error("invalid_event_hash");
  return bytes;
}

function previousHashBytes(event: TraceEvent) {
  if (!event.previousEventHash || event.previousEventHash === "GENESIS") {
    return Buffer.alloc(32);
  }
  const bytes = Buffer.from(event.previousEventHash, "hex");
  if (bytes.length !== 32) throw new Error("invalid_previous_event_hash");
  return bytes;
}

function occurredAtSeconds(event: TraceEvent) {
  const value = Math.floor(new Date(event.occurredAt).getTime() / 1000);
  if (!Number.isFinite(value)) throw new Error("invalid_event_occurred_at");
  return value;
}

async function feePayerKeypair() {
  return Keypair.fromSecretKey(
    Uint8Array.from(await getDevnetFeePayerKeypairBytes()),
  );
}

function deriveAddresses(
  publicId: string,
  feePayer: PublicKey,
  event: TraceEvent,
) {
  const [registry] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("batch", "utf8"),
      feePayer.toBuffer(),
      getBatchRegistryHash(publicId),
    ],
    PROGRAM_ID,
  );
  const [eventPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("event", "utf8"), registry.toBuffer(), eventHashBytes(event)],
    PROGRAM_ID,
  );
  return { registry, eventPda };
}

function buildAppendInstruction(input: {
  publicId: string;
  event: TraceEvent;
  feePayer: PublicKey;
  organization: PublicKey;
  version?: number;
}) {
  const { registry, eventPda } = deriveAddresses(
    input.publicId,
    input.feePayer,
    input.event,
  );
  const data = Buffer.concat([
    instructionDiscriminator("append_event"),
    eventHashBytes(input.event),
    previousHashBytes(input.event),
    getOrganizationHash(input.event.organizationId),
    encodeU32(input.version ?? 1),
    encodeI64(occurredAtSeconds(input.event)),
  ]);

  return {
    registry,
    eventPda,
    instruction: new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: registry, isSigner: false, isWritable: true },
        { pubkey: eventPda, isSigner: false, isWritable: true },
        { pubkey: input.feePayer, isSigner: true, isWritable: true },
        { pubkey: input.organization, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    }),
  };
}

function assertWalletSignedEvent(event: TraceEvent, walletPublicKey: string) {
  if (event.status !== "confirmed") throw new Error("event_not_confirmed");
  if (!event.signerPublicKey) throw new Error("event_signer_missing");

  const linkedWallet = new PublicKey(walletPublicKey);
  const eventSigner = new PublicKey(event.signerPublicKey);
  if (!eventSigner.equals(linkedWallet)) {
    throw new Error("wallet_public_key_mismatch");
  }
  return linkedWallet;
}

function buildProof(input: {
  event: TraceEvent;
  feePayer: PublicKey;
  organization: PublicKey;
  registry: PublicKey;
  eventPda: PublicKey;
  transactionSignature?: string;
  slot?: number;
  anchoredAt?: string;
}): SolanaIntegrityProof {
  const attemptedAt = new Date().toISOString();
  return {
    network: "devnet",
    kind: "check-di-registry",
    programId: CHECK_DI_REGISTRY_PROGRAM_ID,
    status: "confirmed",
    transactionSignature: input.transactionSignature,
    slot: input.slot,
    payerPublicKey: input.feePayer.toBase58(),
    organizationPublicKey: input.organization.toBase58(),
    registryAddress: input.registry.toBase58(),
    eventPda: input.eventPda.toBase58(),
    explorerUrl: input.transactionSignature
      ? getRegistryTransactionExplorerUrl(input.transactionSignature)
      : undefined,
    registryExplorerUrl: getRegistryExplorerUrl(input.registry.toBase58()),
    eventExplorerUrl: getRegistryExplorerUrl(input.eventPda.toBase58()),
    anchoredAt: input.anchoredAt ?? attemptedAt,
    attemptedAt,
  };
}

export async function preparePhantomRegistryTransaction(input: {
  publicId: string;
  event: TraceEvent;
  walletPublicKey: string;
}) {
  const feePayer = await feePayerKeypair();
  const organization = assertWalletSignedEvent(
    input.event,
    input.walletPublicKey,
  );
  const { registry, eventPda, instruction } = buildAppendInstruction({
    publicId: input.publicId,
    event: input.event,
    feePayer: feePayer.publicKey,
    organization,
  });

  const existing = await getEventRegistryStateOnDevnet(input.publicId, input.event);
  if (existing) {
    const verification = await verifyEventRegistryOnDevnet(
      input.publicId,
      input.event,
      { authorityPublicKey: feePayer.publicKey.toBase58() },
    );
    if (!verification.valid) throw new Error("existing_registry_proof_invalid");
    return {
      alreadyAnchored: true as const,
      registryAddress: registry.toBase58(),
      eventPda: eventPda.toBase58(),
      proof: buildProof({
        event: input.event,
        feePayer: feePayer.publicKey,
        organization,
        registry,
        eventPda,
      }),
    };
  }

  const initialized = await initializeBatchRegistryOnDevnet(input.publicId);
  const previousHash = previousHashBytes(input.event).toString("hex");
  const expectedHead =
    initialized.state.eventCount === 0
      ? Buffer.alloc(32).toString("hex")
      : initialized.state.lastEventHash;
  if (previousHash !== expectedHead) {
    throw new Error("registry_chain_head_not_ready");
  }

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const latest = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: feePayer.publicKey,
    recentBlockhash: latest.blockhash,
  }).add(instruction);
  transaction.partialSign(feePayer);

  return {
    alreadyAnchored: false as const,
    transactionBase64: transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64"),
    walletPublicKey: organization.toBase58(),
    registryAddress: registry.toBase58(),
    eventPda: eventPda.toBase58(),
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  };
}

function assertPreparedTransaction(input: {
  transaction: Transaction;
  publicId: string;
  event: TraceEvent;
  feePayer: PublicKey;
  organization: PublicKey;
}) {
  if (!input.transaction.feePayer?.equals(input.feePayer)) {
    throw new Error("phantom_transaction_fee_payer_mismatch");
  }
  if (input.transaction.instructions.length !== 1) {
    throw new Error("phantom_transaction_instruction_count_invalid");
  }

  const expected = buildAppendInstruction({
    publicId: input.publicId,
    event: input.event,
    feePayer: input.feePayer,
    organization: input.organization,
  }).instruction;
  const actual = input.transaction.instructions[0];
  if (!actual.programId.equals(expected.programId)) {
    throw new Error("phantom_transaction_program_mismatch");
  }
  if (!Buffer.from(actual.data).equals(Buffer.from(expected.data))) {
    throw new Error("phantom_transaction_data_mismatch");
  }
  if (actual.keys.length !== expected.keys.length) {
    throw new Error("phantom_transaction_accounts_mismatch");
  }
  for (let index = 0; index < expected.keys.length; index += 1) {
    const actualKey = actual.keys[index];
    const expectedKey = expected.keys[index];
    if (
      !actualKey.pubkey.equals(expectedKey.pubkey) ||
      actualKey.isSigner !== expectedKey.isSigner ||
      actualKey.isWritable !== expectedKey.isWritable
    ) {
      throw new Error("phantom_transaction_accounts_mismatch");
    }
  }
  if (!input.transaction.verifySignatures()) {
    throw new Error("phantom_transaction_signature_invalid");
  }
}

export async function submitPhantomRegistryTransaction(input: {
  publicId: string;
  event: TraceEvent;
  walletPublicKey: string;
  signedTransactionBase64: string;
}) {
  const feePayer = await feePayerKeypair();
  const organization = assertWalletSignedEvent(
    input.event,
    input.walletPublicKey,
  );
  const { registry, eventPda } = deriveAddresses(
    input.publicId,
    feePayer.publicKey,
    input.event,
  );

  const transaction = Transaction.from(
    Buffer.from(input.signedTransactionBase64, "base64"),
  );
  assertPreparedTransaction({
    transaction,
    publicId: input.publicId,
    event: input.event,
    feePayer: feePayer.publicKey,
    organization,
  });

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    maxRetries: 3,
    preflightCommitment: "confirmed",
    skipPreflight: false,
  });
  await connection.confirmTransaction(signature, "confirmed");

  const verification = await verifyEventRegistryOnDevnet(
    input.publicId,
    input.event,
    { authorityPublicKey: feePayer.publicKey.toBase58() },
  );
  if (!verification.valid) {
    throw new Error(`phantom_registry_verification_failed:${verification.error ?? "checks_failed"}`);
  }

  const transactionInfo = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  const anchoredAt = transactionInfo?.blockTime
    ? new Date(transactionInfo.blockTime * 1000).toISOString()
    : new Date().toISOString();

  return {
    reused: false as const,
    transactionSignature: signature,
    verification,
    proof: buildProof({
      event: input.event,
      feePayer: feePayer.publicKey,
      organization,
      registry,
      eventPda,
      transactionSignature: signature,
      slot: transactionInfo?.slot,
      anchoredAt,
    }),
  };
}
