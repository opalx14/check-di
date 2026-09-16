import { describe, expect, test } from "bun:test";

import { getCreditcoinConfig } from "@/lib/creditcoin/config";
import {
  getAttestcoinProof,
  normalizeTransactionHash,
  parseAttestcoinProof,
  toCheckDiProofInput,
  waitUntilAttested,
} from "@/lib/creditcoin/proof-builder";

const TX_HASH = `0x${"ab".repeat(32)}`;
const ROOT = `0x${"11".repeat(32)}`;
const LOWER = `0x${"22".repeat(32)}`;
const SIBLING = `0x${"33".repeat(32)}`;

function proofFixture(overrides?: Record<string, unknown>) {
  return {
    chainKey: 1,
    headerNumber: 11_613_300,
    txIndex: 4,
    txHash: TX_HASH,
    txBytes: "0x1234",
    continuityProof: {
      lowerEndpointDigest: LOWER,
      roots: [ROOT],
    },
    merkleProof: {
      root: ROOT,
      siblings: [{ hash: SIBLING, isLeft: true }],
    },
    cached: true,
    generatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Attestcoin proof builder client", () => {
  test("normalizes an exact EVM transaction hash and rejects malformed input", () => {
    expect(normalizeTransactionHash(TX_HASH.toUpperCase().replace("0X", "0x"))).toBe(TX_HASH);
    expect(() => normalizeTransactionHash("0x1234")).toThrow(
      "invalid_attestcoin_transaction_hash",
    );
  });

  test("validates the proof response before creating Creditcoin call input", () => {
    const proof = parseAttestcoinProof(proofFixture(), {
      chainKey: 1,
      transactionHash: TX_HASH,
    });

    expect(proof.headerNumber).toBe(11_613_300);
    expect(proof.merkleProof.siblings).toEqual([{ hash: SIBLING, isLeft: true }]);
    expect(toCheckDiProofInput(proof)).toEqual({
      blockHeight: 11_613_300,
      encodedTransaction: "0x1234",
      merkleRoot: ROOT,
      siblings: [{ hash: SIBLING, isLeft: true }],
      lowerEndpointDigest: LOWER,
      continuityRoots: [ROOT],
    });
  });

  test("rejects a proof for another source chain or transaction", () => {
    expect(() =>
      parseAttestcoinProof(proofFixture({ chainKey: 2 }), {
        chainKey: 1,
        transactionHash: TX_HASH,
      }),
    ).toThrow("attestcoin_proof_chain_key_mismatch");

    expect(() =>
      parseAttestcoinProof(proofFixture({ txHash: `0x${"cd".repeat(32)}` }), {
        chainKey: 1,
        transactionHash: TX_HASH,
      }),
    ).toThrow("attestcoin_proof_transaction_hash_mismatch");
  });

  test("fetches the official proof-by-tx path and validates the response", async () => {
    let requestedUrl = "";
    const fetchImpl = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return Response.json(proofFixture());
    }) as typeof fetch;

    const proof = await getAttestcoinProof(TX_HASH, {
      config: getCreditcoinConfig({}),
      fetchImpl,
    });

    expect(requestedUrl).toEndWith(`/api/v1/proof-by-tx/1/${TX_HASH}`);
    expect(proof.txHash).toBe(TX_HASH);
  });

  test("waits until the proof service has ingested the target attested height", async () => {
    const heights = [100, 104, 105];
    let calls = 0;
    const fetchImpl = (async () => {
      const height = heights[Math.min(calls, heights.length - 1)];
      calls += 1;
      return Response.json({ attestedHeight: height });
    }) as typeof fetch;

    const latest = await waitUntilAttested(105, {
      config: getCreditcoinConfig({}),
      fetchImpl,
      pollIntervalMs: 1,
      waitTimeoutMs: 100,
      extraDelayMs: 0,
    });

    expect(latest).toBe(105);
    expect(calls).toBe(3);
  });
});
