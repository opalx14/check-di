import {
  getAttestcoinProof,
  toCheckDiProofInput,
  waitUntilAttested,
} from "../src/lib/creditcoin/proof-builder";

const args = process.argv.slice(2);
const transactionHash = args.find((arg) => !arg.startsWith("--"));
const heightArg = args.find((arg) => arg.startsWith("--height="));
const printFullJson = args.includes("--json");

if (!transactionHash) {
  console.error(
    "Usage: bun run creditcoin:proof -- <sepolia-tx-hash> [--height=<source-block>] [--json]",
  );
  process.exit(1);
}

const targetHeight = heightArg ? Number(heightArg.slice("--height=".length)) : undefined;
if (targetHeight !== undefined && (!Number.isSafeInteger(targetHeight) || targetHeight < 0)) {
  console.error("Invalid --height value; expected a non-negative integer block height.");
  process.exit(1);
}

if (targetHeight !== undefined) {
  console.log(`Waiting for Attestcoin proof service to ingest source block ${targetHeight}...`);
  const latest = await waitUntilAttested(targetHeight);
  console.log(`Attestcoin source height ready at ${latest}.`);
}

const proof = await getAttestcoinProof(transactionHash);
const contractInput = toCheckDiProofInput(proof);

if (printFullJson) {
  console.log(JSON.stringify({ proof, contractInput }, null, 2));
} else {
  console.log(
    JSON.stringify(
      {
        chainKey: proof.chainKey,
        sourceBlock: proof.headerNumber,
        txIndex: proof.txIndex,
        txHash: proof.txHash,
        cached: proof.cached,
        continuityRoots: proof.continuityProof.roots.length,
        merkleSiblings: proof.merkleProof.siblings.length,
        proofReadyFor: "CheckDiAttestedRegistry.executeJourneyProof",
      },
      null,
      2,
    ),
  );
}
