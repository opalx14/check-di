import { createHash, createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const CHECK_DI_DEMO_SESSION_COOKIE = "check_di_demo_session";
export const CHECK_DI_DEMO_EMAIL = "producer.demo@check-di.local";
export const CHECK_DI_DEMO_PASSWORD = "CheckDiDemo2026!";
export const CHECK_DI_DEMO_USER_ID = "demo-producer-user";
export const CHECK_DI_DEMO_ORGANIZATION_ID = "demo-producer-org";

const DEFAULT_DEMO_AUTH_PATH = join(
  process.cwd(),
  ".data",
  "check-di-demo-auth.json",
);

type DemoAuthState = {
  version: 1;
  user: {
    id: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    walletPublicKey?: string;
  };
  passwordHash: string;
  sessionSecret: string;
};

function demoAuthPath() {
  return process.env.CHECK_DI_DEMO_AUTH_PATH || DEFAULT_DEMO_AUTH_PATH;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function syncDemoOrganizationToConfiguredDatabase(state: DemoAuthState) {
  if (process.env.CHECK_DI_DB_DRIVER?.trim().toLowerCase() !== "supabase") return;
  const url = process.env.CHECK_DI_SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return;

  const response = await fetch(`${url}/rest/v1/check_di_organizations?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: state.organization.id,
      name: state.organization.name,
      slug: state.organization.slug,
      type: "producer_demo",
      wallet_public_key: state.organization.walletPublicKey ?? null,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`demo_organization_sync_failed:${response.status}`);
  }
}

function sessionToken(state: DemoAuthState) {
  return createHmac("sha256", state.sessionSecret)
    .update(`${state.user.id}:${state.user.email}`)
    .digest("base64url");
}

async function writeState(state: DemoAuthState) {
  const path = demoAuthPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

async function ensureState(): Promise<DemoAuthState> {
  const path = demoAuthPath();
  try {
    const raw = await readFile(/* turbopackIgnore: true */ path, "utf8");
    const parsed = JSON.parse(raw) as DemoAuthState;
    if (
      parsed?.version === 1 &&
      parsed.user?.id === CHECK_DI_DEMO_USER_ID &&
      parsed.organization?.id === CHECK_DI_DEMO_ORGANIZATION_ID &&
      parsed.sessionSecret
    ) {
      return parsed;
    }
  } catch {
    // Seed the local demo account below.
  }

  const state: DemoAuthState = {
    version: 1,
    user: {
      id: CHECK_DI_DEMO_USER_ID,
      email: CHECK_DI_DEMO_EMAIL,
    },
    organization: {
      id: CHECK_DI_DEMO_ORGANIZATION_ID,
      name: "Nông trại Demo Check-Di",
      slug: "nong-trai-demo-check-di",
    },
    passwordHash: sha256(CHECK_DI_DEMO_PASSWORD),
    sessionSecret: randomBytes(32).toString("base64url"),
  };
  await writeState(state);
  return state;
}

export function isDemoLoginEnabled() {
  const configured = process.env.CHECK_DI_ENABLE_DEMO_LOGIN?.trim().toLowerCase();
  if (configured === "true" || configured === "1") return true;
  if (configured === "false" || configured === "0") return false;
  return process.env.NODE_ENV !== "production";
}

export async function loginDemoProducer(email: string, password: string) {
  if (!isDemoLoginEnabled()) return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== CHECK_DI_DEMO_EMAIL) return null;

  const state = await ensureState();
  if (sha256(password) !== state.passwordHash) {
    throw new Error("invalid_credentials");
  }

  await syncDemoOrganizationToConfiguredDatabase(state);

  return {
    token: sessionToken(state),
    user: state.user,
    membership: {
      organizationId: state.organization.id,
      organizationName: state.organization.name,
      organizationSlug: state.organization.slug,
      walletPublicKey: state.organization.walletPublicKey,
      role: "owner" as const,
    },
  };
}

export async function getDemoAuthContextFromToken(token: string | null) {
  if (!token || !isDemoLoginEnabled()) return null;
  const state = await ensureState();
  if (token !== sessionToken(state)) return null;

  return {
    user: state.user,
    memberships: [
      {
        organizationId: state.organization.id,
        organizationName: state.organization.name,
        organizationSlug: state.organization.slug,
        walletPublicKey: state.organization.walletPublicKey,
        role: "owner" as const,
      },
    ],
  };
}

export async function getDemoMembershipForUser(userId: string) {
  if (userId !== CHECK_DI_DEMO_USER_ID || !isDemoLoginEnabled()) return null;
  const state = await ensureState();
  return {
    organizationId: state.organization.id,
    organizationName: state.organization.name,
    organizationSlug: state.organization.slug,
    walletPublicKey: state.organization.walletPublicKey,
    role: "owner" as const,
  };
}

export async function setDemoOrganizationWalletPublicKey(
  organizationId: string,
  walletPublicKey: string,
) {
  if (organizationId !== CHECK_DI_DEMO_ORGANIZATION_ID) return false;
  const state = await ensureState();
  state.organization.walletPublicKey = walletPublicKey;
  await writeState(state);
  await syncDemoOrganizationToConfiguredDatabase(state);
  return true;
}
