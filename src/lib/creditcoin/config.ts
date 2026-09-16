export const CREDITCOIN_CC3_TESTNET_CHAIN_ID = 102031;
export const CREDITCOIN_CC3_TESTNET_RPC = "https://rpc.cc3-testnet.creditcoin.network";
export const ATTESTCOIN_PROOF_API = "https://proof-gen-api.cc3-testnet.creditcoin.network";
export const ATTESTCOIN_SEPOLIA_CHAIN_KEY = 1;
export const ATTESTCOIN_NATIVE_VERIFIER_ADDRESS =
  "0x0000000000000000000000000000000000000FD2";
export const ATTESTCOIN_CHAIN_INFO_ADDRESS =
  "0x0000000000000000000000000000000000000FD3";

export type CreditcoinConfig = {
  creditcoinRpcUrl: string;
  proofApiUrl: string;
  sourceChainKey: number;
  sourceContractAddress?: string;
  registryContractAddress?: string;
};

type EnvLike = Record<string, string | undefined>;

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function isEvmAddress(value: string | undefined): value is string {
  return Boolean(value && /^0x[0-9a-fA-F]{40}$/.test(value));
}

export function getCreditcoinConfig(env: EnvLike = process.env): CreditcoinConfig {
  const sourceContractAddress = env.CHECK_DI_SEPOLIA_SOURCE_CONTRACT;
  const registryContractAddress = env.CHECK_DI_CREDITCOIN_REGISTRY_CONTRACT;

  return {
    creditcoinRpcUrl: trimTrailingSlashes(
      env.CHECK_DI_CREDITCOIN_RPC_URL || CREDITCOIN_CC3_TESTNET_RPC,
    ),
    proofApiUrl: trimTrailingSlashes(
      env.CHECK_DI_ATTESTCOIN_PROOF_API_URL || ATTESTCOIN_PROOF_API,
    ),
    sourceChainKey: parsePositiveInteger(
      env.CHECK_DI_ATTESTCOIN_SOURCE_CHAIN_KEY,
      ATTESTCOIN_SEPOLIA_CHAIN_KEY,
    ),
    sourceContractAddress: isEvmAddress(sourceContractAddress)
      ? sourceContractAddress
      : undefined,
    registryContractAddress: isEvmAddress(registryContractAddress)
      ? registryContractAddress
      : undefined,
  };
}
