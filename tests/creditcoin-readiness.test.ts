import { describe, expect, test } from "bun:test";

import {
  ATTESTCOIN_SEPOLIA_CHAIN_KEY,
  CREDITCOIN_CC3_TESTNET_CHAIN_ID,
  getCreditcoinConfig,
  isEvmAddress,
} from "@/lib/creditcoin/config";
import { checkCreditcoinReadiness } from "@/lib/creditcoin/readiness";

const sourceAddress = "0x1111111111111111111111111111111111111111";
const registryAddress = "0x2222222222222222222222222222222222222222";

function makeFetch(options?: { chainId?: number; attestedHeight?: number }) {
  const chainId = options?.chainId ?? CREDITCOIN_CC3_TESTNET_CHAIN_ID;
  const attestedHeight = options?.attestedHeight ?? 11_600_000;

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/v1/health")) {
      return Response.json({
        status: "healthy",
        cc3_rpc_connected: true,
        eth_rpc_connected: true,
      });
    }
    if (url.endsWith(`/api/v1/attested-height/${ATTESTCOIN_SEPOLIA_CHAIN_KEY}`)) {
      return Response.json({ attestedHeight });
    }
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { method?: string };
      if (body.method === "eth_chainId") {
        return Response.json({ jsonrpc: "2.0", id: 1, result: `0x${chainId.toString(16)}` });
      }
      if (body.method === "eth_blockNumber") {
        return Response.json({ jsonrpc: "2.0", id: 1, result: "0x4f2a10" });
      }
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

describe("Creditcoin / Attestcoin readiness", () => {
  test("uses CC3 testnet and Sepolia Attestcoin defaults without exposing a private key", () => {
    const config = getCreditcoinConfig({});

    expect(config.sourceChainKey).toBe(ATTESTCOIN_SEPOLIA_CHAIN_KEY);
    expect(config.creditcoinRpcUrl).toContain("cc3-testnet.creditcoin.network");
    expect(config.proofApiUrl).toContain("proof-gen-api.cc3-testnet.creditcoin.network");
    expect(config.sourceContractAddress).toBeUndefined();
    expect(config.registryContractAddress).toBeUndefined();
  });

  test("accepts only explicit 20-byte EVM contract addresses", () => {
    expect(isEvmAddress(sourceAddress)).toBe(true);
    expect(isEvmAddress("0x1234")).toBe(false);
    expect(isEvmAddress(undefined)).toBe(false);
  });

  test("separates live network readiness from deployment readiness", async () => {
    const result = await checkCreditcoinReadiness({
      config: getCreditcoinConfig({}),
      fetchImpl: makeFetch(),
    });

    expect(result.networkReady).toBe(true);
    expect(result.contractsConfigured).toBe(false);
    expect(result.ready).toBe(false);
    expect(result.creditcoin.chainId).toBe(CREDITCOIN_CC3_TESTNET_CHAIN_ID);
    expect(result.attestation.attestedHeight).toBeGreaterThan(0);
  });

  test("becomes fully ready when both Check-Di contracts are configured", async () => {
    const result = await checkCreditcoinReadiness({
      config: getCreditcoinConfig({
        CHECK_DI_SEPOLIA_SOURCE_CONTRACT: sourceAddress,
        CHECK_DI_CREDITCOIN_REGISTRY_CONTRACT: registryAddress,
      }),
      fetchImpl: makeFetch(),
    });

    expect(result.networkReady).toBe(true);
    expect(result.contractsConfigured).toBe(true);
    expect(result.ready).toBe(true);
    expect(result.config.sourceContractAddress).toBe(sourceAddress);
    expect(result.config.registryContractAddress).toBe(registryAddress);
  });

  test("fails closed when the RPC is not CC3 testnet", async () => {
    const result = await checkCreditcoinReadiness({
      config: getCreditcoinConfig({
        CHECK_DI_SEPOLIA_SOURCE_CONTRACT: sourceAddress,
        CHECK_DI_CREDITCOIN_REGISTRY_CONTRACT: registryAddress,
      }),
      fetchImpl: makeFetch({ chainId: 1 }),
    });

    expect(result.creditcoin.ok).toBe(false);
    expect(result.networkReady).toBe(false);
    expect(result.ready).toBe(false);
  });
});
