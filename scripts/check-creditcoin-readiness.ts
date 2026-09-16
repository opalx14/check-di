import { checkCreditcoinReadiness } from "../src/lib/creditcoin/readiness";

const readiness = await checkCreditcoinReadiness();

console.log(
  JSON.stringify(
    {
      ...readiness,
      nextAction: readiness.networkReady
        ? readiness.contractsConfigured
          ? "Run a real Sepolia emit -> Attestcoin proof -> Creditcoin execute smoke."
          : "Deploy CheckDiSourceRegistry on Sepolia and CheckDiAttestedRegistry on CC3, then configure their public addresses."
        : "Fix CC3 / Attestcoin network connectivity before deployment.",
    },
    null,
    2,
  ),
);

if (!readiness.networkReady) {
  process.exitCode = 1;
}
