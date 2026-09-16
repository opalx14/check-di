import { getCreditcoinConfig, type CreditcoinConfig } from "./config";

export type AttestcoinMerkleSibling = {
  hash: string;
  isLeft: boolean;
};

export type AttestcoinProofData = {
  chainKey: number;
  headerNumber: number;
  txIndex: number;
  txHash: string;
  txBytes: string;
  continuityProof: {
    lowerEndpointDigest: string;
    roots: string[];
  };
  merkleProof: {
    root: string;
    siblings: AttestcoinMerkleSibling[];
  };
  cached?: boolean;
  generatedAt?: string;
};

type FetchLike = typeof fetch;

type ProofBuilderOptions = {
  config?: CreditcoinConfig;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

type WaitOptions = ProofBuilderOptions & {
  pollIntervalMs?: number;
  waitTimeoutMs?: number;
  extraDelayMs?: number;
};

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const BYTES32_RE = /^0x[0-9a-fA-F]{64}$/;
const HEX_BYTES_RE = /^0x(?:[0-9a-fA-F]{2})*$/;

export function normalizeTransactionHash(transactionHash: string): string {
  const trimmed = transactionHash.trim();
  if (!TX_HASH_RE.test(trimmed)) {
    throw new Error("invalid_attestcoin_transaction_hash");
  }
  return trimmed.toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asSafeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function asBytes32(value: unknown): string | undefined {
  return typeof value === "string" && BYTES32_RE.test(value) ? value : undefined;
}

function asHexBytes(value: unknown): string | undefined {
  return typeof value === "string" && HEX_BYTES_RE.test(value) ? value : undefined;
}

async function fetchJson(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const suffix = body ? `: ${body.slice(0, 240)}` : "";
      throw new Error(`attestcoin_proof_api_http_${response.status}${suffix}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function parseAttestcoinProof(
  value: unknown,
  expected: { chainKey: number; transactionHash: string },
): AttestcoinProofData {
  const payload = asRecord(value);
  if (!payload) throw new Error("invalid_attestcoin_proof_payload");

  const chainKey = asSafeInteger(payload.chainKey);
  const headerNumber = asSafeInteger(payload.headerNumber);
  const txIndex = asSafeInteger(payload.txIndex);
  const txHash = typeof payload.txHash === "string" ? payload.txHash : undefined;
  const txBytes = asHexBytes(payload.txBytes);
  const continuity = asRecord(payload.continuityProof);
  const merkle = asRecord(payload.merkleProof);

  if (chainKey !== expected.chainKey) {
    throw new Error("attestcoin_proof_chain_key_mismatch");
  }
  if (!txHash || normalizeTransactionHash(txHash) !== expected.transactionHash) {
    throw new Error("attestcoin_proof_transaction_hash_mismatch");
  }
  if (headerNumber === undefined || txIndex === undefined || !txBytes || txBytes === "0x") {
    throw new Error("invalid_attestcoin_proof_transaction_fields");
  }

  const lowerEndpointDigest = asBytes32(continuity?.lowerEndpointDigest);
  const rootsRaw = continuity?.roots;
  if (!lowerEndpointDigest || !Array.isArray(rootsRaw)) {
    throw new Error("invalid_attestcoin_continuity_proof");
  }
  const roots = rootsRaw.map(asBytes32);
  if (roots.some((root) => !root)) {
    throw new Error("invalid_attestcoin_continuity_roots");
  }

  const merkleRoot = asBytes32(merkle?.root);
  const siblingsRaw = merkle?.siblings;
  if (!merkleRoot || !Array.isArray(siblingsRaw)) {
    throw new Error("invalid_attestcoin_merkle_proof");
  }
  const siblings = siblingsRaw.map((entry) => {
    const record = asRecord(entry);
    const hash = asBytes32(record?.hash);
    const isLeft = record?.isLeft;
    if (!hash || typeof isLeft !== "boolean") {
      throw new Error("invalid_attestcoin_merkle_sibling");
    }
    return { hash, isLeft };
  });

  return {
    chainKey,
    headerNumber,
    txIndex,
    txHash,
    txBytes,
    continuityProof: {
      lowerEndpointDigest,
      roots: roots as string[],
    },
    merkleProof: {
      root: merkleRoot,
      siblings,
    },
    cached: typeof payload.cached === "boolean" ? payload.cached : undefined,
    generatedAt:
      typeof payload.generatedAt === "string" ? payload.generatedAt : undefined,
  };
}

export async function getAttestcoinProof(
  transactionHash: string,
  options?: ProofBuilderOptions,
): Promise<AttestcoinProofData> {
  const config = options?.config ?? getCreditcoinConfig();
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const normalizedHash = normalizeTransactionHash(transactionHash);
  const payload = await fetchJson(
    fetchImpl,
    `${config.proofApiUrl}/api/v1/proof-by-tx/${config.sourceChainKey}/${normalizedHash}`,
    timeoutMs,
  );
  return parseAttestcoinProof(payload, {
    chainKey: config.sourceChainKey,
    transactionHash: normalizedHash,
  });
}

export async function getAttestedHeight(
  options?: ProofBuilderOptions,
): Promise<number> {
  const config = options?.config ?? getCreditcoinConfig();
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const payload = asRecord(
    await fetchJson(
      fetchImpl,
      `${config.proofApiUrl}/api/v1/attested-height/${config.sourceChainKey}`,
      timeoutMs,
    ),
  );
  const height = asSafeInteger(payload?.attestedHeight);
  if (height === undefined) throw new Error("invalid_attestcoin_attested_height");
  return height;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitUntilAttested(
  targetHeight: number,
  options?: WaitOptions,
): Promise<number> {
  if (!Number.isSafeInteger(targetHeight) || targetHeight < 0) {
    throw new Error("invalid_attestcoin_target_height");
  }

  const pollIntervalMs = options?.pollIntervalMs ?? 15_000;
  const waitTimeoutMs = options?.waitTimeoutMs ?? 15 * 60_000;
  const extraDelayMs = options?.extraDelayMs ?? 5_000;
  const startedAt = Date.now();

  while (true) {
    if (Date.now() - startedAt > waitTimeoutMs) {
      throw new Error(`attestcoin_attestation_timeout:${targetHeight}`);
    }

    const latest = await getAttestedHeight(options);
    if (latest >= targetHeight) {
      if (extraDelayMs > 0) await sleep(extraDelayMs);
      return latest;
    }

    await sleep(pollIntervalMs);
  }
}

export function toCheckDiProofInput(proof: AttestcoinProofData) {
  return {
    blockHeight: proof.headerNumber,
    encodedTransaction: proof.txBytes,
    merkleRoot: proof.merkleProof.root,
    siblings: proof.merkleProof.siblings,
    lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest,
    continuityRoots: proof.continuityProof.roots,
  };
}
