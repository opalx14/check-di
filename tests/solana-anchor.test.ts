import { describe, expect, test } from "bun:test";

import { getSampleBatch } from "@/lib/db/sample-batch";
import {
  buildIntegrityMemo,
  getSolanaExplorerUrl,
  verifySolanaIntegrityProof,
} from "@/lib/solana/server";

describe("Check-Di Solana integrity anchor", () => {
  test("builds a minimal memo from confirmed integrity fields", () => {
    const batch = getSampleBatch("DUR-260830-01");
    if (!batch) throw new Error("sample_batch_missing");

    const event = batch.events[0];
    const memo = JSON.parse(buildIntegrityMemo(batch.publicId, event)) as Record<string, string | number>;

    expect(memo.v).toBe(1);
    expect(memo.app).toBe("check-di");
    expect(memo.batch).toBe(batch.publicId);
    expect(memo.event).toBe(event.id);
    expect(memo.hash).toBe(event.eventHash);
    expect(memo.previous).toBe("GENESIS");
    expect(memo.issuer).toBe(event.signerPublicKey);
    expect(memo.status).toBe("confirmed");
  });

  test("does not claim an anchor is valid when no confirmed Devnet proof exists", async () => {
    expect(await verifySolanaIntegrityProof(undefined)).toEqual({
      valid: false,
      error: "solana_anchor_missing",
    });
  });

  test("builds an explicit Devnet explorer URL", () => {
    expect(getSolanaExplorerUrl("abc123")).toBe(
      "https://explorer.solana.com/tx/abc123?cluster=devnet",
    );
  });
});
