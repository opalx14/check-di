import { Transaction } from "@solana/web3.js";

import {
  getBrowserDevnetWalletMetadata,
  getUnlockedBrowserDevnetWallet,
  type BrowserDevnetWalletSigner,
} from "@/lib/wallet/browser-devnet-wallet";

export type CheckDiClientWalletSigner = {
  kind: "phantom" | "browser-devnet";
  publicKey: string;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
};

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey?: { toString(): string } }>;
  signMessage(message: Uint8Array): Promise<{
    signature: Uint8Array;
    publicKey?: { toString(): string };
  }>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
};

function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const typedWindow = window as Window & {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  };
  const provider = typedWindow.phantom?.solana ?? typedWindow.solana;
  return provider?.isPhantom ? provider : null;
}

export function hasPhantomProvider() {
  return Boolean(getPhantomProvider());
}

export async function connectPhantomSigner(): Promise<CheckDiClientWalletSigner> {
  const provider = getPhantomProvider();
  if (!provider) throw new Error("phantom_not_available");
  const connection = await provider.connect();
  const publicKey =
    connection.publicKey?.toString() ?? provider.publicKey?.toString();
  if (!publicKey) throw new Error("wallet_public_key_missing");

  return {
    kind: "phantom",
    publicKey,
    async signMessage(message) {
      const signed = await provider.signMessage(message);
      return signed.signature;
    },
    async signTransaction(transaction) {
      return provider.signTransaction(transaction);
    },
  };
}

export async function resolveOrganizationWalletSigner(input: {
  organizationId: string;
  expectedPublicKey: string;
}): Promise<CheckDiClientWalletSigner> {
  const unlockedBrowserWallet = getUnlockedBrowserDevnetWallet(
    input.organizationId,
  );
  if (
    unlockedBrowserWallet &&
    unlockedBrowserWallet.publicKey === input.expectedPublicKey
  ) {
    return unlockedBrowserWallet;
  }

  const browserMetadata = await getBrowserDevnetWalletMetadata(
    input.organizationId,
  ).catch(() => null);
  if (
    browserMetadata &&
    browserMetadata.publicKey === input.expectedPublicKey
  ) {
    throw new Error("browser_wallet_locked");
  }

  const phantom = getPhantomProvider();
  if (phantom) {
    const signer = await connectPhantomSigner();
    if (signer.publicKey !== input.expectedPublicKey) {
      throw new Error("wallet_public_key_mismatch");
    }
    return signer;
  }

  if (browserMetadata) {
    throw new Error("browser_wallet_public_key_mismatch");
  }

  throw new Error("wallet_signer_not_available");
}

export function asCheckDiClientWalletSigner(
  signer: BrowserDevnetWalletSigner,
): CheckDiClientWalletSigner {
  return signer;
}
