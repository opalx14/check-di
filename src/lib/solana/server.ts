import { createPrivateKey, createPublicKey, randomBytes, sign } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  SOLANA_NETWORK,
  SOLANA_RPC_URL,
} from "@/lib/solana/config";
import type { SolanaIntegrityProof, TraceEvent } from "@/types/evidence";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const DEFAULT_FEE_PAYER_FILE = join(process.cwd(), ".data", "solana-devnet-fee-payer.json");
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const MIN_FEE_PAYER_BALANCE = 50_000;
const AIRDROP_LAMPORTS = 100_000_000;
const MAX_LEGACY_TRANSACTION_BYTES = 1232;

export type SolanaAnchorVerification = {
  valid: boolean;
  slot?: number;
  error?: string;
};

type RpcError = {
  code: number;
  message: string;
};

type RpcEnvelope<T> = {
  result?: T;
  error?: RpcError;
};

type FeePayer = {
  seed: Buffer;
  publicKeyBytes: Buffer;
  publicKey: string;
};

function encodeBase58(bytes: Uint8Array) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  if (bytes.length === 0) return "";

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

function decodeBase58(value: string) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const alphabetMap = new Map([...alphabet].map((character, index) => [character, index]));
  if (!value) return Buffer.alloc(0);

  const bytes = [0];
  for (const character of value) {
    const digit = alphabetMap.get(character);
    if (digit === undefined) throw new Error("invalid_base58");

    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      const current = bytes[index] * 58 + carry;
      bytes[index] = current & 0xff;
      carry = current >> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (let index = 0; index < value.length - 1 && value[index] === alphabet[0]; index += 1) {
    bytes.push(0);
  }

  return Buffer.from(bytes.reverse());
}

function encodeShortVec(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid_shortvec_value");

  const output: number[] = [];
  let remaining = value;
  do {
    let element = remaining & 0x7f;
    remaining = Math.floor(remaining / 128);
    if (remaining > 0) element |= 0x80;
    output.push(element);
  } while (remaining > 0);

  return Buffer.from(output);
}

function privateKeyFromSeed(seed: Buffer) {
  if (seed.length !== 32) throw new Error("invalid_fee_payer_seed");
  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
}

function publicKeyBytesFromSeed(seed: Buffer) {
  const publicDer = createPublicKey(privateKeyFromSeed(seed)).export({
    format: "der",
    type: "spki",
  });
  return Buffer.from(publicDer).subarray(-32);
}

function parseConfiguredSeed(value: string) {
  const trimmed = value.trim();
  const seed = /^[0-9a-f]{64}$/i.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");

  if (seed.length !== 32) throw new Error("invalid_configured_fee_payer_seed");
  return seed;
}

async function getOrCreateFeePayer(): Promise<FeePayer> {
  const configuredSeed = process.env.CHECK_DI_SOLANA_FEE_PAYER_SEED;
  let seed: Buffer;

  if (configuredSeed) {
    seed = parseConfiguredSeed(configuredSeed);
  } else {
    const filePath = DEFAULT_FEE_PAYER_FILE;
    try {
      const raw = await readFile(DEFAULT_FEE_PAYER_FILE, "utf8");
      const parsed = JSON.parse(raw) as { version?: number; seed?: string };
      if (parsed.version !== 1 || !parsed.seed) throw new Error("invalid_fee_payer_file");
      seed = Buffer.from(parsed.seed, "base64");
      if (seed.length !== 32) throw new Error("invalid_fee_payer_file");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code && code !== "ENOENT") throw error;
      if (!code && error instanceof SyntaxError) throw error;

      seed = randomBytes(32);
      await mkdir(dirname(filePath), { recursive: true });
      const temporary = `${filePath}.${process.pid}.tmp`;
      await writeFile(
        temporary,
        `${JSON.stringify({ version: 1, network: "devnet", seed: seed.toString("base64") }, null, 2)}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
      await rename(temporary, filePath);
    }
  }

  const publicKeyBytes = publicKeyBytesFromSeed(seed);
  return {
    seed,
    publicKeyBytes,
    publicKey: encodeBase58(publicKeyBytes),
  };
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(SOLANA_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`solana_rpc_http_${response.status}`);
  const payload = (await response.json()) as RpcEnvelope<T>;
  if (payload.error) {
    throw new Error(`solana_rpc_${payload.error.code}:${payload.error.message}`);
  }
  if (payload.result === undefined) throw new Error("solana_rpc_missing_result");
  return payload.result;
}

async function getBalance(publicKey: string) {
  const result = await rpc<{ value: number }>("getBalance", [
    publicKey,
    { commitment: "confirmed" },
  ]);
  return result.value;
}

async function waitForSignature(signature: string, attempts = 24) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await rpc<{
      value: Array<{
        err: unknown;
        confirmationStatus?: "processed" | "confirmed" | "finalized";
      } | null>;
    }>("getSignatureStatuses", [[signature], { searchTransactionHistory: true }]);

    const status = result.value[0];
    if (status?.err) throw new Error("solana_transaction_failed");
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("solana_confirmation_timeout");
}

async function ensureFeePayerBalance(feePayer: FeePayer) {
  const balance = await getBalance(feePayer.publicKey);
  if (balance >= MIN_FEE_PAYER_BALANCE) return;

  if (process.env.CHECK_DI_SOLANA_AUTO_AIRDROP === "false") {
    throw new Error(`devnet_fee_payer_needs_funding:${feePayer.publicKey}`);
  }

  try {
    const signature = await rpc<string>("requestAirdrop", [
      feePayer.publicKey,
      AIRDROP_LAMPORTS,
      { commitment: "confirmed" },
    ]);
    await waitForSignature(signature);
  } catch {
    throw new Error(`devnet_fee_payer_needs_funding:${feePayer.publicKey}`);
  }
}

function buildLegacyMemoMessage({
  payerPublicKey,
  blockhash,
  memo,
}: {
  payerPublicKey: Buffer;
  blockhash: string;
  memo: string;
}) {
  const memoProgram = decodeBase58(MEMO_PROGRAM_ID);
  const blockhashBytes = decodeBase58(blockhash);
  const memoBytes = Buffer.from(memo, "utf8");

  if (payerPublicKey.length !== 32 || memoProgram.length !== 32 || blockhashBytes.length !== 32) {
    throw new Error("invalid_solana_message_key");
  }

  return Buffer.concat([
    Buffer.from([1, 0, 1]),
    encodeShortVec(2),
    payerPublicKey,
    memoProgram,
    blockhashBytes,
    encodeShortVec(1),
    Buffer.from([1]),
    encodeShortVec(0),
    encodeShortVec(memoBytes.length),
    memoBytes,
  ]);
}

function signLegacyTransaction(message: Buffer, seed: Buffer) {
  const signature = sign(null, message, privateKeyFromSeed(seed));
  if (signature.length !== 64) throw new Error("invalid_solana_signature_length");

  const transaction = Buffer.concat([encodeShortVec(1), signature, message]);
  if (transaction.length > MAX_LEGACY_TRANSACTION_BYTES) {
    throw new Error("solana_transaction_too_large");
  }
  return transaction;
}

export function buildIntegrityMemo(publicId: string, event: TraceEvent) {
  if (!event.eventHash || !event.previousEventHash || !event.signerPublicKey) {
    throw new Error("event_missing_integrity_fields");
  }

  return JSON.stringify({
    v: 1,
    app: "check-di",
    batch: publicId,
    event: event.id,
    hash: event.eventHash,
    previous: event.previousEventHash,
    issuer: event.signerPublicKey,
    status: event.status,
  });
}

export function getSolanaExplorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
}

export function isSolanaAutoAnchorEnabled() {
  return process.env.CHECK_DI_SOLANA_AUTO_ANCHOR !== "false";
}

export async function getDevnetFeePayerAddress() {
  const feePayer = await getOrCreateFeePayer();
  return feePayer.publicKey;
}

export async function anchorTraceEventOnDevnet({
  publicId,
  event,
}: {
  publicId: string;
  event: TraceEvent;
}): Promise<SolanaIntegrityProof> {
  if (SOLANA_NETWORK !== "devnet") throw new Error("check_di_anchor_requires_devnet");
  if (event.status !== "confirmed") throw new Error("event_not_confirmed");

  const feePayer = await getOrCreateFeePayer();
  await ensureFeePayerBalance(feePayer);

  const latest = await rpc<{
    context: { slot: number };
    value: { blockhash: string; lastValidBlockHeight: number };
  }>("getLatestBlockhash", [{ commitment: "confirmed" }]);

  const memo = buildIntegrityMemo(publicId, event);
  const message = buildLegacyMemoMessage({
    payerPublicKey: feePayer.publicKeyBytes,
    blockhash: latest.value.blockhash,
    memo,
  });
  const transaction = signLegacyTransaction(message, feePayer.seed);

  const transactionSignature = await rpc<string>("sendTransaction", [
    transaction.toString("base64"),
    {
      encoding: "base64",
      preflightCommitment: "confirmed",
      maxRetries: 3,
    },
  ]);
  await waitForSignature(transactionSignature);

  const transactionResult = await rpc<{ slot: number } | null>("getTransaction", [
    transactionSignature,
    {
      commitment: "confirmed",
      encoding: "json",
      maxSupportedTransactionVersion: 0,
    },
  ]);
  if (!transactionResult) throw new Error("solana_transaction_not_found_after_confirmation");

  const now = new Date().toISOString();
  return {
    network: "devnet",
    kind: "spl-memo",
    programId: MEMO_PROGRAM_ID,
    status: "confirmed",
    transactionSignature,
    slot: transactionResult.slot,
    payerPublicKey: feePayer.publicKey,
    memo,
    explorerUrl: getSolanaExplorerUrl(transactionSignature),
    anchoredAt: now,
    attemptedAt: now,
  };
}

export async function verifySolanaIntegrityProof(
  proof: SolanaIntegrityProof | undefined,
): Promise<SolanaAnchorVerification> {
  if (!proof || proof.status !== "confirmed" || !proof.transactionSignature || !proof.memo) {
    return { valid: false, error: "solana_anchor_missing" };
  }

  try {
    const result = await rpc<{
      slot: number;
      meta: { err: unknown } | null;
      transaction: {
        signatures: string[];
        message: {
          accountKeys: Array<string | { pubkey: string }>;
          instructions: Array<{
            programIdIndex: number;
            data: string;
          }>;
        };
      };
    } | null>("getTransaction", [
      proof.transactionSignature,
      {
        commitment: "confirmed",
        encoding: "json",
        maxSupportedTransactionVersion: 0,
      },
    ]);

    if (!result || result.meta?.err) return { valid: false, error: "solana_transaction_missing_or_failed" };
    if (result.transaction.signatures[0] !== proof.transactionSignature) {
      return { valid: false, error: "solana_signature_mismatch" };
    }

    const accountKeys = result.transaction.message.accountKeys.map((key) =>
      typeof key === "string" ? key : key.pubkey,
    );
    const memoInstruction = result.transaction.message.instructions.find(
      (instruction) => accountKeys[instruction.programIdIndex] === proof.programId,
    );
    if (!memoInstruction) return { valid: false, error: "solana_memo_instruction_missing" };

    const memo = decodeBase58(memoInstruction.data).toString("utf8");
    if (memo !== proof.memo) return { valid: false, error: "solana_memo_mismatch" };

    return { valid: true, slot: result.slot };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "solana_verification_failed",
    };
  }
}

export const SOLANA_MEMO_PROGRAM_ID = MEMO_PROGRAM_ID;
