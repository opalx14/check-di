import { Keypair, Transaction } from "@solana/web3.js";

const DB_NAME = "check-di-browser-wallets";
const DB_VERSION = 1;
const STORE_NAME = "wallets";
const PBKDF2_ITERATIONS = 210_000;
const VAULT_VERSION = 1;

const unlockedWallets = new Map<string, Keypair>();

export type BrowserDevnetWalletMetadata = {
  organizationId: string;
  publicKey: string;
  createdAt: string;
  version: number;
};

type BrowserDevnetWalletVault = BrowserDevnetWalletMetadata & {
  saltBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
};

export type BrowserDevnetWalletSigner = {
  kind: "browser-devnet";
  publicKey: string;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
};

function bytesToBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function toArrayBuffer(value: Uint8Array) {
  return Uint8Array.from(value).buffer;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function requireBrowserCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("browser_wallet_crypto_unavailable");
  }
  return globalThis.crypto;
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array) {
  if (passphrase.length < 8) {
    throw new Error("browser_wallet_passphrase_too_short");
  }
  const cryptoApi = requireBrowserCrypto();
  const baseKey = await cryptoApi.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBrowserWalletSecret(
  secretKey: Uint8Array,
  passphrase: string,
  salt = requireBrowserCrypto().getRandomValues(new Uint8Array(16)),
  iv = requireBrowserCrypto().getRandomValues(new Uint8Array(12)),
) {
  const key = await deriveEncryptionKey(passphrase, salt);
  const ciphertext = await requireBrowserCrypto().subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(secretKey),
  );
  return {
    saltBase64: bytesToBase64(salt),
    ivBase64: bytesToBase64(iv),
    ciphertextBase64: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBrowserWalletSecret(
  encrypted: {
    saltBase64: string;
    ivBase64: string;
    ciphertextBase64: string;
  },
  passphrase: string,
) {
  try {
    const salt = base64ToBytes(encrypted.saltBase64);
    const iv = base64ToBytes(encrypted.ivBase64);
    const ciphertext = base64ToBytes(encrypted.ciphertextBase64);
    const key = await deriveEncryptionKey(passphrase, salt);
    const plaintext = await requireBrowserCrypto().subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext),
    );
    return new Uint8Array(plaintext);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "browser_wallet_passphrase_too_short"
    ) {
      throw error;
    }
    throw new Error("browser_wallet_unlock_failed");
  }
}

function openWalletDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("browser_wallet_storage_unavailable"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () =>
      reject(request.error ?? new Error("browser_wallet_storage_open_failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "organizationId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function putVault(vault: BrowserDevnetWalletVault) {
  const db = await openWalletDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).put(vault);
      request.onerror = () =>
        reject(request.error ?? new Error("browser_wallet_storage_write_failed"));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("browser_wallet_storage_transaction_failed"),
        );
    });
  } finally {
    db.close();
  }
}

async function readVault(
  organizationId: string,
): Promise<BrowserDevnetWalletVault | null> {
  const db = await openWalletDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction
        .objectStore(STORE_NAME)
        .get(organizationId);
      request.onerror = () =>
        reject(request.error ?? new Error("browser_wallet_storage_read_failed"));
      request.onsuccess = () =>
        resolve((request.result as BrowserDevnetWalletVault | undefined) ?? null);
    });
  } finally {
    db.close();
  }
}

async function removeVault(organizationId: string) {
  const db = await openWalletDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).delete(organizationId);
      request.onerror = () =>
        reject(request.error ?? new Error("browser_wallet_storage_delete_failed"));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("browser_wallet_storage_transaction_failed"),
        );
    });
  } finally {
    db.close();
  }
}

export async function signBrowserDevnetMessage(secretKey: Uint8Array, message: Uint8Array) {
  const seed = secretKey.slice(0, 32);
  const pkcs8Prefix = Uint8Array.from([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
    0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(pkcs8Prefix.length + seed.length);
  pkcs8.set(pkcs8Prefix, 0);
  pkcs8.set(seed, pkcs8Prefix.length);

  try {
    const privateKey = await requireBrowserCrypto().subtle.importKey(
      "pkcs8",
      toArrayBuffer(pkcs8),
      "Ed25519",
      false,
      ["sign"],
    );
    const signature = await requireBrowserCrypto().subtle.sign(
      "Ed25519",
      privateKey,
      toArrayBuffer(message),
    );
    return new Uint8Array(signature);
  } finally {
    seed.fill(0);
    pkcs8.fill(0);
  }
}

function signerFromKeypair(keypair: Keypair): BrowserDevnetWalletSigner {
  return {
    kind: "browser-devnet",
    publicKey: keypair.publicKey.toBase58(),
    async signMessage(message) {
      return signBrowserDevnetMessage(keypair.secretKey, message);
    },
    async signTransaction(transaction) {
      transaction.partialSign(keypair);
      return transaction;
    },
  };
}

export async function createBrowserDevnetWallet(
  organizationId: string,
  passphrase: string,
): Promise<BrowserDevnetWalletSigner> {
  const normalizedOrganizationId = organizationId.trim();
  if (!normalizedOrganizationId) {
    throw new Error("browser_wallet_organization_required");
  }
  const keypair = Keypair.generate();
  const encrypted = await encryptBrowserWalletSecret(
    keypair.secretKey,
    passphrase,
  );
  const vault: BrowserDevnetWalletVault = {
    organizationId: normalizedOrganizationId,
    publicKey: keypair.publicKey.toBase58(),
    createdAt: new Date().toISOString(),
    version: VAULT_VERSION,
    ...encrypted,
  };
  await putVault(vault);
  unlockedWallets.set(normalizedOrganizationId, keypair);
  return signerFromKeypair(keypair);
}

export async function unlockBrowserDevnetWallet(
  organizationId: string,
  passphrase: string,
): Promise<BrowserDevnetWalletSigner> {
  const vault = await readVault(organizationId);
  if (!vault) throw new Error("browser_wallet_not_found");
  const secretKey = await decryptBrowserWalletSecret(vault, passphrase);
  try {
    const keypair = Keypair.fromSecretKey(secretKey);
    if (keypair.publicKey.toBase58() !== vault.publicKey) {
      throw new Error("browser_wallet_public_key_mismatch");
    }
    unlockedWallets.set(organizationId, keypair);
    return signerFromKeypair(keypair);
  } finally {
    secretKey.fill(0);
  }
}

export async function getBrowserDevnetWalletMetadata(
  organizationId: string,
): Promise<BrowserDevnetWalletMetadata | null> {
  const vault = await readVault(organizationId);
  if (!vault) return null;
  return {
    organizationId: vault.organizationId,
    publicKey: vault.publicKey,
    createdAt: vault.createdAt,
    version: vault.version,
  };
}

export function getUnlockedBrowserDevnetWallet(
  organizationId: string,
): BrowserDevnetWalletSigner | null {
  const keypair = unlockedWallets.get(organizationId);
  return keypair ? signerFromKeypair(keypair) : null;
}

export async function deleteBrowserDevnetWallet(organizationId: string) {
  unlockedWallets.delete(organizationId);
  await removeVault(organizationId);
}

export function lockBrowserDevnetWallet(organizationId: string) {
  unlockedWallets.delete(organizationId);
}
