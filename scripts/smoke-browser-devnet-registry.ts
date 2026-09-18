import { createHash } from "node:crypto";

import { Keypair, Transaction } from "@solana/web3.js";

import {
  buildTraceEventHash,
  confirmTraceEventWithExternalSignature,
} from "@/lib/traceability/server";
import {
  preparePhantomRegistryTransaction,
  submitPhantomRegistryTransaction,
} from "@/lib/solana/phantom-registry";
import { signBrowserDevnetMessage } from "@/lib/wallet/browser-devnet-wallet";

const seed = createHash("sha256")
  .update("check-di-browser-devnet-registry-live-smoke-v1")
  .digest();
const organization = Keypair.fromSeed(seed);
const publicId = "CHECK-DI-BROWSER-WALLET-SMOKE-01";

const input = {
  id: "evt-browser-wallet-live-smoke-01",
  batchId: "batch-browser-wallet-live-smoke-01",
  stage: "production" as const,
  organizationId: "org-browser-wallet-live-smoke",
  organizationName: "Check-Di Browser Devnet Wallet Smoke",
  location: "Solana Devnet",
  occurredAt: "2026-09-18T16:00:00.000Z",
  summary:
    "Stable live smoke proving the embedded browser Devnet wallet can sign eventHash and the dual-signer Registry transaction without Phantom.",
  documents: [],
  metrics: {},
  aiValidations: [],
};

const eventHash = buildTraceEventHash(input, "GENESIS");
const eventSignature = await signBrowserDevnetMessage(
  organization.secretKey,
  new TextEncoder().encode(eventHash),
);
const event = confirmTraceEventWithExternalSignature(
  input,
  "GENESIS",
  organization.publicKey.toBase58(),
  Buffer.from(eventSignature).toString("base64"),
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
        signerKind: "browser-devnet",
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

// This is the exact signing primitive used by the embedded browser wallet signer:
// keep the server fee-payer signature and add the organization Ed25519 signature.
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
      signerKind: "browser-devnet",
      publicId,
      organization: organization.publicKey.toBase58(),
      eventHash,
      transactionSignature: result.transactionSignature,
      proof: result.proof,
      verification: result.verification,
    },
    null,
    2,
  ),
);

if (!result.verification.valid) process.exitCode = 1;
