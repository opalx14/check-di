import { createPublicKey, verify } from "node:crypto";

import { getBase58Encoder } from "@solana/kit";

import {
  CheckDiAuthError,
  getCheckDiAuthContext,
  membershipAllows,
  type CheckDiOrganizationMembership,
} from "@/lib/auth/server";
import { setDemoOrganizationWalletPublicKey } from "@/lib/auth/demo";

export const CHECK_DI_WALLET_CHALLENGE_COOKIE = "check_di_wallet_challenge";
export const CHECK_DI_WALLET_CHALLENGE_MAX_AGE_SECONDS = 5 * 60;

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function requireSupabaseServerConfig() {
  const url = process.env.CHECK_DI_SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) throw new Error("supabase_url_missing");
  if (!serviceRoleKey) throw new Error("supabase_service_role_key_missing");
  return { url, serviceRoleKey };
}

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    const value = part.slice(index + 1).trim();
    try {
      return decodeURIComponent(value) || null;
    } catch {
      return value || null;
    }
  }
  return null;
}

export function getWalletChallengeNonce(request: Request) {
  return cookieValue(request, CHECK_DI_WALLET_CHALLENGE_COOKIE);
}

export function buildWalletLinkMessage(input: {
  organizationId: string;
  userId: string;
  nonce: string;
}) {
  return [
    "Check-Di organization wallet verification",
    `Organization: ${input.organizationId}`,
    `User: ${input.userId}`,
    `Nonce: ${input.nonce}`,
    "Network: Solana Devnet",
    "Purpose: Link this wallet to the organization. This is not a payment transaction.",
  ].join("\n");
}

export function verifySolanaMessageSignature(input: {
  publicKey: string;
  signatureBase64: string;
  message: string;
}) {
  let publicKeyBytes: Uint8Array;
  let signatureBytes: Buffer;
  try {
    publicKeyBytes = Uint8Array.from(getBase58Encoder().encode(input.publicKey));
    signatureBytes = Buffer.from(input.signatureBase64, "base64");
  } catch {
    return false;
  }

  if (publicKeyBytes.length !== 32 || signatureBytes.length !== 64) {
    return false;
  }

  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(input.message, "utf8"),
      key,
      signatureBytes,
    );
  } catch {
    return false;
  }
}

export async function requireWalletOwnerMembership(
  request: Request,
  organizationId: string,
): Promise<{
  userId: string;
  membership: CheckDiOrganizationMembership;
}> {
  const context = await getCheckDiAuthContext(request);
  if (!context) throw new CheckDiAuthError("unauthorized", 401);

  const membership = context.memberships.find(
    (item) => item.organizationId === organizationId,
  );
  if (!membership || !membershipAllows(membership, ["owner"])) {
    throw new CheckDiAuthError("organization_forbidden", 403);
  }

  return { userId: context.user.id, membership };
}

export async function setOrganizationWalletPublicKey(
  organizationId: string,
  walletPublicKey: string,
) {
  if (await setDemoOrganizationWalletPublicKey(organizationId, walletPublicKey)) {
    return;
  }

  const { url, serviceRoleKey } = requireSupabaseServerConfig();
  const response = await fetch(
    `${url}/rest/v1/check_di_organizations?id=eq.${encodeURIComponent(organizationId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify({ wallet_public_key: walletPublicKey }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`organization_wallet_update_failed:${response.status}`);
  }

  const rows = (await response.json()) as { id?: string }[];
  if (!rows[0]?.id) throw new Error("organization_wallet_update_missing");
}
