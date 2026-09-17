import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";

import { describe, expect, test } from "bun:test";
import { getBase58Decoder } from "@solana/kit";

import {
  buildWalletLinkMessage,
  verifySolanaMessageSignature,
} from "../src/lib/auth/wallet";

function rawEd25519PublicKey(publicKey: KeyObject) {
  const der = publicKey.export({ format: "der", type: "spki" });
  return new Uint8Array(der.subarray(der.length - 32));
}

describe("organization Phantom wallet linking", () => {
  test("verifies a Solana-compatible Ed25519 signMessage challenge", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const publicKeyBase58 = getBase58Decoder().decode(rawEd25519PublicKey(publicKey));
    const message = buildWalletLinkMessage({
      organizationId: "org-dak-farm",
      userId: "user-123",
      nonce: "nonce-123",
    });
    const signature = sign(null, Buffer.from(message, "utf8"), privateKey);

    expect(
      verifySolanaMessageSignature({
        publicKey: publicKeyBase58,
        signatureBase64: signature.toString("base64"),
        message,
      }),
    ).toBe(true);
  });

  test("rejects a signature when the organization challenge changes", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const publicKeyBase58 = getBase58Decoder().decode(rawEd25519PublicKey(publicKey));
    const message = buildWalletLinkMessage({
      organizationId: "org-dak-farm",
      userId: "user-123",
      nonce: "nonce-123",
    });
    const signature = sign(null, Buffer.from(message, "utf8"), privateKey);
    const tampered = buildWalletLinkMessage({
      organizationId: "org-other",
      userId: "user-123",
      nonce: "nonce-123",
    });

    expect(
      verifySolanaMessageSignature({
        publicKey: publicKeyBase58,
        signatureBase64: signature.toString("base64"),
        message: tampered,
      }),
    ).toBe(false);
  });

  test("verifies signature with challenge message constructed from explicit body nonce", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const publicKeyBase58 = getBase58Decoder().decode(rawEd25519PublicKey(publicKey));
    const explicitNonce = "dG5UTBDQY6LMuO1o5QVCh64kukgxwb7N";
    const message = buildWalletLinkMessage({
      organizationId: "org-qa-e2e-4f853d60",
      userId: "8de16e22-a76b-4b58-8419-ad3308c86bfe",
      nonce: explicitNonce,
    });
    const signature = sign(null, Buffer.from(message, "utf8"), privateKey);

    expect(
      verifySolanaMessageSignature({
        publicKey: publicKeyBase58,
        signatureBase64: signature.toString("base64"),
        message,
      }),
    ).toBe(true);
  });
});
