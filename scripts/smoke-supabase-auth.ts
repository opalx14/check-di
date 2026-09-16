import { randomBytes, randomUUID } from "node:crypto";

export {};

const url = process.env.CHECK_DI_SUPABASE_URL?.trim().replace(/\/+$/, "");
const serviceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceRoleKey) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "supabase_server_config_missing",
        missing: [
          !url ? "CHECK_DI_SUPABASE_URL" : null,
          !serviceRoleKey ? "CHECK_DI_SUPABASE_SERVICE_ROLE_KEY" : null,
        ].filter(Boolean),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const suffix = randomUUID().slice(0, 8);
const email = `checkdi-auth-smoke-${suffix}@example.invalid`;
const password = `${randomBytes(18).toString("base64url")}Aa1!`;
const organizationId = `org-auth-smoke-${suffix}`;
const organizationName = `Check-Di Auth Smoke ${suffix}`;
const batchId = `batch-auth-smoke-${suffix}`;
const publicId = `AUTH-${suffix.toUpperCase()}`;
const eventId = `evt-auth-smoke-${suffix}`;

const serviceHeaders = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
  "content-type": "application/json",
};

let userId: string | null = null;
let batchCreated = false;
let organizationCreated = false;
let membershipCreated = false;

async function jsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function requireOk(response: Response, label: string) {
  const payload = await jsonResponse(response);
  if (!response.ok) {
    throw new Error(`${label}:${response.status}:${JSON.stringify(payload)}`);
  }
  return payload;
}

async function serviceRest(
  table: string,
  init: RequestInit & { query?: Record<string, string> } = {},
) {
  const query = new URLSearchParams(init.query ?? {});
  return fetch(`${url}/rest/v1/${table}${query.size ? `?${query}` : ""}`, {
    ...init,
    headers: {
      ...serviceHeaders,
      ...(init.headers ?? {}),
    },
  });
}

async function cleanup() {
  try {
    if (batchCreated) {
      await serviceRest("check_di_batches", {
        method: "DELETE",
        query: { id: `eq.${batchId}` },
      });
    }
    if (membershipCreated && userId) {
      await serviceRest("check_di_organization_members", {
        method: "DELETE",
        query: {
          organization_id: `eq.${organizationId}`,
          user_id: `eq.${userId}`,
        },
      });
    }
    if (organizationCreated) {
      await serviceRest("check_di_organizations", {
        method: "DELETE",
        query: { id: `eq.${organizationId}` },
      });
    }
    if (userId) {
      await fetch(`${url}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: serviceHeaders,
      });
    }
  } catch (error) {
    console.error("check_di_auth_smoke_cleanup_failed", error);
  }
}

try {
  const createdUser = (await requireOk(
    await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { purpose: "check-di-auth-smoke" },
      }),
    }),
    "auth_user_create_failed",
  )) as { id?: string };

  if (!createdUser.id) throw new Error("auth_user_id_missing");
  userId = createdUser.id;

  await requireOk(
    await serviceRest("check_di_organizations", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        id: organizationId,
        name: organizationName,
        slug: `auth-smoke-${suffix}`,
        type: "participant",
      }),
    }),
    "organization_create_failed",
  );
  organizationCreated = true;

  await requireOk(
    await serviceRest("check_di_organization_members", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        organization_id: organizationId,
        user_id: userId,
        role: "owner",
      }),
    }),
    "membership_create_failed",
  );
  membershipCreated = true;

  const session = (await requireOk(
    await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({ email, password }),
    }),
    "password_login_failed",
  )) as { access_token?: string };

  if (!session.access_token) throw new Error("access_token_missing");
  const userHeaders = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${session.access_token}`,
    "content-type": "application/json",
  };

  const membershipRows = (await requireOk(
    await fetch(
      `${url}/rest/v1/check_di_organization_members?select=organization_id,role&organization_id=eq.${organizationId}`,
      { headers: userHeaders },
    ),
    "membership_rls_read_failed",
  )) as { organization_id: string; role: string }[];

  await requireOk(
    await fetch(`${url}/rest/v1/check_di_batches`, {
      method: "POST",
      headers: { ...userHeaders, prefer: "return=minimal" },
      body: JSON.stringify({
        id: batchId,
        public_id: publicId,
        product_name: "Check-Di Auth Smoke Product",
        origin: "Auth Smoke",
        created_by_organization_id: organizationId,
      }),
    }),
    "batch_rls_insert_failed",
  );
  batchCreated = true;

  const now = new Date().toISOString();
  await requireOk(
    await fetch(`${url}/rest/v1/check_di_trace_events`, {
      method: "POST",
      headers: { ...userHeaders, prefer: "return=minimal" },
      body: JSON.stringify({
        id: eventId,
        batch_id: batchId,
        sequence_no: 1,
        stage: "production",
        organization_id: organizationId,
        organization_name_snapshot: organizationName,
        location: "Auth Smoke",
        occurred_at: now,
        summary: "Temporary live RLS verification event",
        documents: [],
        metrics: {},
        status: "confirmed",
        previous_event_hash: "GENESIS",
        event_hash: "0".repeat(64),
        signer_public_key: "auth-smoke-only",
        signature: "auth-smoke-only",
        confirmed_at: now,
      }),
    }),
    "event_rls_insert_failed",
  );

  const businessRows = (await requireOk(
    await fetch(
      `${url}/rest/v1/check_di_business_track_v?select=batch_id,event_id,organization_id,event_status&batch_id=eq.${batchId}`,
      { headers: userHeaders },
    ),
    "business_lane_rls_read_failed",
  )) as unknown[];

  const blockchainRows = (await requireOk(
    await fetch(
      `${url}/rest/v1/check_di_blockchain_track_v?select=batch_id,event_id,organization_id,event_status,event_hash&batch_id=eq.${batchId}`,
      { headers: userHeaders },
    ),
    "blockchain_lane_rls_read_failed",
  )) as unknown[];

  const ok =
    membershipRows.length === 1 &&
    membershipRows[0]?.organization_id === organizationId &&
    membershipRows[0]?.role === "owner" &&
    businessRows.length === 1 &&
    blockchainRows.length === 1;

  console.log(
    JSON.stringify(
      {
        ok,
        remote: true,
        auth: {
          passwordLogin: true,
          membershipRlsRead: membershipRows.length === 1,
        },
        lanes: {
          business: businessRows.length === 1,
          blockchain: blockchainRows.length === 1,
        },
        cleanup: "scheduled",
      },
      null,
      2,
    ),
  );

  if (!ok) process.exitCode = 1;
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        remote: true,
        error: error instanceof Error ? error.message : "unknown_error",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await cleanup();
}
