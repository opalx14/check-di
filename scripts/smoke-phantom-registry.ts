import { createHash, createPrivateKey, sign } from "node:crypto";

import { Keypair, Transaction } from "@solana/web3.js";

import {
  buildTraceEventHash,
  confirmTraceEventWithExternalSignature,
} from "@/lib/traceability/server";
import {
  preparePhantomRegistryTransaction,
  submitPhantomRegistryTransaction,
} from "@/lib/solana/phantom-registry";

const PKCS8_ED25519_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex",
);
const seed = createHash("sha256")
  .update("check-di-phantom-registry-live-smoke-v1")
  .digest();
const organization = Keypair.fromSeed(seed);
const privateKey = createPrivateKey({
  key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
  format: "der",
  type: "pkcs8",
});

const publicId = "CHECK-DI-PHANTOM-SMOKE-01";
const input = {
  id: "evt-phantom-live-smoke-01",
  batchId: "batch-phantom-live-smoke-01",
  stage: "production" as const,
  organizationId: "org-phantom-live-smoke",
  organizationName: "Check-Di Phantom Smoke Organization",
  location: "Devnet",
  occurredAt: "2026-08-31T15:00:00.000Z",
  summary: "Stable live smoke for Phantom-style organization signing.",
  documents: [],
  metrics: {},
  aiValidations: [],
};
const eventHash = buildTraceEventHash(input, "GENESIS");
const signature = sign(
  null,
  Buffer.from(eventHash, "hex"),
  privateKey,
).toString("base64url");
const event = confirmTraceEventWithExternalSignature(
  input,
  "GENESIS",
  organization.publicKey.toBase58(),
  signature,
);

const prepared = await preparePhantomRegistryTransaction({
  publicId,
  event,
  walletPublicKey: organization.publicKey.toBase58(),
});

if (prepared.alreadyAnchored) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        reused: true,
        publicId,
        organization: organization.publicKey.toBase58(),
        registryAddress: prepared.registryAddress,
        eventPda: prepared.eventPda,
        proof: prepared.proof,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const transaction = Transaction.from(
  Buffer.from(prepared.transactionBase64, "base64"),
);
transaction.partialSign(organization);
const result = await submitPhantomRegistryTransaction({
  publicId,
  event,
  walletPublicKey: organization.publicKey.toBase58(),
  signedTransactionBase64: transaction
    .serialize({ requireAllSignatures: true, verifySignatures: true })
    .toString("base64"),
});

console.log(
  JSON.stringify(
    {
      ok: result.verification.valid,
      reused: result.reused,
      publicId,
      organization: organization.publicKey.toBase58(),
      transactionSignature: result.transactionSignature,
      proof: result.proof,
      verification: result.verification,
    },
    null,
    2,
  ),
);

if (!result.verification.valid) process.exitCode = 1;
