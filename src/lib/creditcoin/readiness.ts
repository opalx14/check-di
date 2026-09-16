import {
  CREDITCOIN_CC3_TESTNET_CHAIN_ID,
  getCreditcoinConfig,
  type CreditcoinConfig,
} from "./config";

type FetchLike = typeof fetch;

type ProbeState = {
  ok: boolean;
  detail: string;
};

export type CreditcoinReadiness = {
  ready: boolean;
  networkReady: boolean;
  contractsConfigured: boolean;
  checkedAt: string;
  config: {
    sourceChainKey: number;
    sourceContractAddress?: string;
    registryContractAddress?: string;
  };
  proofApi: ProbeState & {
    status?: string;
    cc3RpcConnected?: boolean;
    ethRpcConnected?: boolean;
  };
  attestation: ProbeState & {
    attestedHeight?: number;
  };
  creditcoin: ProbeState & {
    chainId?: number;
    blockNumber?: number;
  };
};

async function fetchJson(
  fetchImpl: FetchLike,
  input: string,
  init?: RequestInit,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetchImpl(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function parseHexInteger(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) return undefined;
  const parsed = Number.parseInt(value.slice(2), 16);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

async function probeProofApi(
  config: CreditcoinConfig,
  fetchImpl: FetchLike,
): Promise<CreditcoinReadiness["proofApi"]> {
  try {
    const payload = asRecord(await fetchJson(fetchImpl, `${config.proofApiUrl}/api/v1/health`));
    const status = typeof payload?.status === "string" ? payload.status : undefined;
    const cc3RpcConnected =
      typeof payload?.cc3_rpc_connected === "boolean" ? payload.cc3_rpc_connected : undefined;
    const ethRpcConnected =
      typeof payload?.eth_rpc_connected === "boolean" ? payload.eth_rpc_connected : undefined;
    const ok = status === "healthy" && cc3RpcConnected === true && ethRpcConnected === true;
    return {
      ok,
      detail: ok ? "Attestcoin proof service healthy" : "Attestcoin proof service is not fully healthy",
      status,
      cc3RpcConnected,
      ethRpcConnected,
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "Attestcoin proof service probe failed",
    };
  }
}

async function probeAttestation(
  config: CreditcoinConfig,
  fetchImpl: FetchLike,
): Promise<CreditcoinReadiness["attestation"]> {
  try {
    const payload = asRecord(
      await fetchJson(
        fetchImpl,
        `${config.proofApiUrl}/api/v1/attested-height/${config.sourceChainKey}`,
      ),
    );
    const attestedHeight =
      typeof payload?.attestedHeight === "number" ? payload.attestedHeight : undefined;
    const ok = Number.isSafeInteger(attestedHeight) && Number(attestedHeight) > 0;
    return {
      ok,
      detail: ok
        ? `Source chain ${config.sourceChainKey} attested through block ${attestedHeight}`
        : `No advancing attested height for source chain ${config.sourceChainKey}`,
      attestedHeight,
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "Attestation height probe failed",
    };
  }
}

async function rpcCall(
  config: CreditcoinConfig,
  fetchImpl: FetchLike,
  method: string,
): Promise<unknown> {
  const payload = asRecord(
    await fetchJson(fetchImpl, config.creditcoinRpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
    }),
  );
  if (payload?.error) {
    throw new Error(`CC3 RPC ${method} returned an error`);
  }
  return payload?.result;
}

async function probeCreditcoin(
  config: CreditcoinConfig,
  fetchImpl: FetchLike,
): Promise<CreditcoinReadiness["creditcoin"]> {
  try {
    const [chainIdRaw, blockNumberRaw] = await Promise.all([
      rpcCall(config, fetchImpl, "eth_chainId"),
      rpcCall(config, fetchImpl, "eth_blockNumber"),
    ]);
    const chainId = parseHexInteger(chainIdRaw);
    const blockNumber = parseHexInteger(blockNumberRaw);
    const ok = chainId === CREDITCOIN_CC3_TESTNET_CHAIN_ID && Number.isSafeInteger(blockNumber);
    return {
      ok,
      detail: ok
        ? `Creditcoin CC3 testnet reachable at block ${blockNumber}`
        : `Unexpected Creditcoin chain id: ${chainId ?? "unknown"}`,
      chainId,
      blockNumber,
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "Creditcoin RPC probe failed",
    };
  }
}

export async function checkCreditcoinReadiness(options?: {
  config?: CreditcoinConfig;
  fetchImpl?: FetchLike;
}): Promise<CreditcoinReadiness> {
  const config = options?.config ?? getCreditcoinConfig();
  const fetchImpl = options?.fetchImpl ?? fetch;

  const [proofApi, attestation, creditcoin] = await Promise.all([
    probeProofApi(config, fetchImpl),
    probeAttestation(config, fetchImpl),
    probeCreditcoin(config, fetchImpl),
  ]);

  const networkReady = proofApi.ok && attestation.ok && creditcoin.ok;
  const contractsConfigured = Boolean(
    config.sourceContractAddress && config.registryContractAddress,
  );

  return {
    ready: networkReady && contractsConfigured,
    networkReady,
    contractsConfigured,
    checkedAt: new Date().toISOString(),
    config: {
      sourceChainKey: config.sourceChainKey,
      sourceContractAddress: config.sourceContractAddress,
      registryContractAddress: config.registryContractAddress,
    },
    proofApi,
    attestation,
    creditcoin,
  };
}
