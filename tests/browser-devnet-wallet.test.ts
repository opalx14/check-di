import { describe, expect, test } from "bun:test";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";

import {
  decryptBrowserWalletSecret,
  encryptBrowserWalletSecret,
  signBrowserDevnetMessage,
} from "../src/lib/wallet/browser-devnet-wallet";
import { connectPhantomSigner } from "../src/lib/wallet/client-signer";
import { verifySolanaMessageSignature } from "../src/lib/auth/wallet";

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

describe("browser Devnet wallet crypto", () => {
  test("encrypts and decrypts a Solana secret key with AES-GCM", async () => {
    const keypair = Keypair.generate();
    const encrypted = await encryptBrowserWalletSecret(
      keypair.secretKey,
      "WalletPassphrase123",
      Uint8Array.from({ length: 16 }, (_, index) => index + 1),
      Uint8Array.from({ length: 12 }, (_, index) => index + 21),
    );

    expect(encrypted.ciphertextBase64).not.toContain(
      bytesToBase64(keypair.secretKey),
    );

    const decrypted = await decryptBrowserWalletSecret(
      encrypted,
      "WalletPassphrase123",
    );
    expect(Array.from(decrypted)).toEqual(Array.from(keypair.secretKey));

    await expect(
      decryptBrowserWalletSecret(encrypted, "WrongPassphrase123"),
    ).rejects.toThrow("browser_wallet_unlock_failed");
  });

  test("signs an Ed25519 challenge accepted by the existing server verifier", async () => {
    const keypair = Keypair.generate();
    const message = new TextEncoder().encode(
      "Check-Di embedded Devnet wallet challenge",
    );
    const signature = await signBrowserDevnetMessage(
      keypair.secretKey,
      message,
    );

    expect(signature).toHaveLength(64);
    expect(
      verifySolanaMessageSignature({
        publicKey: keypair.publicKey.toBase58(),
        signatureBase64: bytesToBase64(signature),
        message: new TextDecoder().decode(message),
      }),
    ).toBe(true);
  });

  test("signs a dual-signer Solana transaction with the keypair", async () => {
    const feePayer = Keypair.generate();
    const organization = Keypair.generate();

    const transaction = new Transaction({
      feePayer: feePayer.publicKey,
      recentBlockhash: "11111111111111111111111111111111",
    }).add(
      SystemProgram.transfer({
        fromPubkey: organization.publicKey,
        toPubkey: feePayer.publicKey,
        lamports: 100,
      }),
    );

    // Fee payer partial sign
    transaction.partialSign(feePayer);
    expect(transaction.verifySignatures()).toBe(false);

    // Organization wallet partial sign
    transaction.partialSign(organization);
    expect(transaction.verifySignatures()).toBe(true);

    const orgSig = transaction.signatures.find((s) =>
      s.publicKey.equals(organization.publicKey),
    )?.signature;
    expect(orgSig).toBeDefined();
    expect(orgSig).toHaveLength(64);
  });
});

describe("client wallet signer abstraction", () => {
  test("wraps a Phantom-compatible provider without changing server transaction semantics", async () => {
    const organization = Keypair.generate();
    const feePayer = Keypair.generate();
    const originalWindow = (globalThis as { window?: unknown }).window;

    const provider = {
      isPhantom: true,
      publicKey: organization.publicKey,
      async connect() {
        return { publicKey: organization.publicKey };
      },
      async signMessage(message: Uint8Array) {
        return {
          signature: await signBrowserDevnetMessage(
            organization.secretKey,
            message,
          ),
          publicKey: organization.publicKey,
        };
      },
      async signTransaction(transaction: Transaction) {
        transaction.partialSign(organization);
        return transaction;
      },
    };

    Object.defineProperty(globalThis, "window", {
      value: { phantom: { solana: provider } },
      configurable: true,
      writable: true,
    });

    try {
      const signer = await connectPhantomSigner();
      expect(signer.kind).toBe("phantom");
      expect(signer.publicKey).toBe(organization.publicKey.toBase58());

      const signature = await signer.signMessage(
        new TextEncoder().encode("event-hash"),
      );
      expect(signature).toHaveLength(64);

      const transaction = new Transaction({
        feePayer: feePayer.publicKey,
        recentBlockhash: "11111111111111111111111111111111",
      }).add(
        SystemProgram.transfer({
          fromPubkey: organization.publicKey,
          toPubkey: feePayer.publicKey,
          lamports: 1,
        }),
      );
      transaction.partialSign(feePayer);

      const signed = await signer.signTransaction(transaction);
      const organizationSignature = signed.signatures.find((entry) =>
        entry.publicKey.equals(organization.publicKey),
      )?.signature;
      expect(organizationSignature).not.toBeNull();
      expect(organizationSignature).toBeDefined();
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          configurable: true,
          writable: true,
        });
      }
    }
  });
});
