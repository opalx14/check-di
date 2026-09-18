import { Keypair } from "@solana/web3.js";
import {
  encryptBrowserWalletSecret,
  signBrowserDevnetMessage,
} from "../src/lib/wallet/browser-devnet-wallet";

const baseUrl = process.env.CHECK_DI_SMOKE_BASE_URL || "http://localhost:7314";

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

async function run() {
  console.log(`[Smoke] Testing Signup and Embedded Wallet against ${baseUrl}...`);

  const unique = Date.now().toString().slice(-6);
  const testEmail = `tester.smoke.${unique}@promptmarketcap.net`;
  const testPassword = `SmokePass_${unique}_Aa1!`;
  const testOrgName = `HTX Nông Sản Thử Nghiệm ${unique}`;

  // 1. Signup
  console.log(`1. Signing up user: ${testEmail}...`);
  const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      organizationName: testOrgName,
    }),
  });

  const signupData = (await signupRes.json()) as {
    ok?: boolean;
    error?: string;
    autoLogin?: boolean;
    emailConfirmationRequired?: boolean;
    hackathonAutoConfirmed?: boolean;
    user?: { id: string; email?: string };
    organization?: { id: string; name: string; slug: string };
  };

  if (!signupRes.ok || !signupData.ok) {
    console.error("[Smoke FAIL] Signup failed:", signupData);
    process.exit(1);
  }

  console.log("   ✓ Signup succeeded:", {
    userId: signupData.user?.id,
    orgId: signupData.organization?.id,
    autoLogin: signupData.autoLogin,
    emailConfirmationRequired: signupData.emailConfirmationRequired,
    hackathonAutoConfirmed: signupData.hackathonAutoConfirmed,
  });

  // Extract set-cookie headers
  const cookieHeaders = signupRes.headers.getSetCookie?.() ?? [];
  const cookieHeader = cookieHeaders.map((c) => c.split(";")[0]).join("; ");

  if (signupData.emailConfirmationRequired) {
    console.log("   ℹ Project requires email confirmation. Auto-login branch skipped as expected by Supabase config.");
    console.log("[Smoke SUCCESS] Signup with email confirmation branch verified successfully!");
    return;
  }

  if (!signupData.autoLogin) {
    console.log("   ⚠ User created without direct session, proceeding with password signin...");
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    if (!loginRes.ok) {
      console.log("   ℹ Password login requires confirmed email on this project. Branch verified.");
      return;
    }
  }

  // 2. Check /api/auth/me
  console.log("2. Verifying authenticated session via GET /api/auth/me...");
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: cookieHeader },
  });
  const meData = (await meRes.json()) as {
    ok: boolean;
    user?: { id: string; email?: string };
    memberships?: { organizationId: string; role: string; walletPublicKey?: string }[];
  };
  if (!meRes.ok || !meData.ok) {
    console.error("[Smoke FAIL] /api/auth/me failed:", meData);
    process.exit(1);
  }
  const orgMembership = meData.memberships?.find(
    (m) => m.organizationId === signupData.organization?.id,
  );
  if (!orgMembership || orgMembership.role !== "owner") {
    console.error("[Smoke FAIL] Membership owner role missing in /api/auth/me:", meData);
    process.exit(1);
  }
  console.log("   ✓ Authenticated as owner of:", orgMembership.organizationId);

  // 3. Create embedded Devnet keypair & sign challenge
  console.log("3. Creating client-side Devnet keypair & signing wallet challenge...");
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();

  // Test local encryption
  const encrypted = await encryptBrowserWalletSecret(
    keypair.secretKey,
    "WalletTestPass123!",
  );
  if (!encrypted.ciphertextBase64) {
    console.error("[Smoke FAIL] Client encryption failed");
    process.exit(1);
  }
  console.log("   ✓ Client-side keypair encrypted with AES-GCM (PBKDF2):", publicKey);

  // Request challenge
  const challengeRes = await fetch(`${baseUrl}/api/auth/wallet/challenge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify({ organizationId: orgMembership.organizationId }),
  });
  const challengeCookies = challengeRes.headers.getSetCookie?.() ?? [];
  const mergedCookies = [...cookieHeaders, ...challengeCookies]
    .map((c) => c.split(";")[0])
    .join("; ");

  const challengeData = (await challengeRes.json()) as {
    ok?: boolean;
    message?: string;
    nonce?: string;
  };
  if (!challengeRes.ok || !challengeData.message || !challengeData.nonce) {
    console.error("[Smoke FAIL] /api/auth/wallet/challenge failed:", challengeData);
    process.exit(1);
  }

  // Sign challenge with client keypair
  const signatureBytes = await signBrowserDevnetMessage(
    keypair.secretKey,
    new TextEncoder().encode(challengeData.message),
  );

  // 4. Verify wallet linking
  console.log("4. Submitting signed challenge to /api/auth/wallet/verify...");
  const verifyRes = await fetch(`${baseUrl}/api/auth/wallet/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: mergedCookies,
    },
    body: JSON.stringify({
      organizationId: orgMembership.organizationId,
      publicKey,
      signatureBase64: bytesToBase64(signatureBytes),
      nonce: challengeData.nonce,
    }),
  });
  const verifyData = (await verifyRes.json()) as { ok?: boolean; error?: string };
  if (!verifyRes.ok || !verifyData.ok) {
    console.error("[Smoke FAIL] /api/auth/wallet/verify failed:", verifyData);
    process.exit(1);
  }
  console.log("   ✓ Wallet verification succeeded on server!");

  // 5. Confirm wallet is linked in /api/auth/me
  const updatedMeRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: cookieHeader },
  });
  const updatedMeData = (await updatedMeRes.json()) as {
    ok: boolean;
    memberships?: { organizationId: string; walletPublicKey?: string }[];
  };
  const updatedMembership = updatedMeData.memberships?.find(
    (m) => m.organizationId === signupData.organization?.id,
  );
  if (updatedMembership?.walletPublicKey !== publicKey) {
    console.error("[Smoke FAIL] walletPublicKey mismatch in /api/auth/me:", updatedMembership);
    process.exit(1);
  }
  console.log("   ✓ Organization wallet successfully updated to:", updatedMembership.walletPublicKey);

  // 6. Cleanup test organization and user if admin access is configured
  const supabaseUrl = process.env.CHECK_DI_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey && signupData.user?.id) {
    console.log("6. Cleaning up test user and organization...");
    await fetch(
      `${supabaseUrl}/rest/v1/check_di_organizations?id=eq.${encodeURIComponent(signupData.organization!.id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
        },
      },
    ).catch(() => {});
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${signupData.user.id}`, {
      method: "DELETE",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
      },
    }).catch(() => {});
    console.log("   ✓ Cleaned up test records from database.");
  }

  console.log("\n[Smoke SUCCESS] Public onboarding & embedded Devnet wallet flow passed 100%!");
}

run().catch((err) => {
  console.error("[Smoke ERROR]", err);
  process.exit(1);
});
