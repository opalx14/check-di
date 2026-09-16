export {};

const url = process.env.CHECK_DI_SUPABASE_URL?.trim().replace(/\/+$/, "");
const serviceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = process.env.CHECK_DI_DEMO_OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.CHECK_DI_DEMO_OWNER_PASSWORD;

const organizationId =
  process.env.CHECK_DI_DEMO_ORGANIZATION_ID?.trim() || "org-check-di-demo";
const organizationName =
  process.env.CHECK_DI_DEMO_ORGANIZATION_NAME?.trim() || "Check-Di Demo Organization";
const organizationSlug =
  process.env.CHECK_DI_DEMO_ORGANIZATION_SLUG?.trim() || "check-di-demo";

type AdminUser = {
  id: string;
  email?: string;
};

type AdminUsersResponse = {
  users?: AdminUser[];
};

function fail(message: string): never {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: message,
        hint:
          message === "demo_credentials_missing"
            ? "Set CHECK_DI_DEMO_OWNER_EMAIL and CHECK_DI_DEMO_OWNER_PASSWORD in the shell or ignored .env.local before provisioning."
            : undefined,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

if (!url || !serviceRoleKey) fail("supabase_server_config_missing");
if (!email || !password) fail("demo_credentials_missing");
if (password.length < 12) fail("demo_password_too_short");

const adminHeaders = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
  "content-type": "application/json",
};

async function findUserByEmail(targetEmail: string) {
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(
      `${url}/auth/v1/admin/users?page=${page}&per_page=100`,
      {
        headers: adminHeaders,
        cache: "no-store",
      },
    );
    if (!response.ok) {
      throw new Error(`demo_user_list_failed:${response.status}`);
    }

    const payload = (await response.json()) as AdminUsersResponse;
    const users = payload.users ?? [];
    const found = users.find(
      (user) => user.email?.trim().toLowerCase() === targetEmail,
    );
    if (found) return found;
    if (users.length < 100) return null;
  }

  throw new Error("demo_user_search_limit_reached");
}

async function ensureDemoUser() {
  const existing = await findUserByEmail(email!);
  if (existing) {
    const response = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: {
          check_di_demo: true,
          check_di_organization_id: organizationId,
        },
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`demo_user_update_failed:${response.status}`);
    }
    return { user: existing, created: false };
  }

  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        check_di_demo: true,
        check_di_organization_id: organizationId,
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`demo_user_create_failed:${response.status}:${detail.slice(0, 180)}`);
  }

  const user = (await response.json()) as AdminUser;
  if (!user.id) throw new Error("demo_user_create_invalid_response");
  return { user, created: true };
}

async function upsertRest(
  table: string,
  onConflict: string,
  body: Record<string, unknown>,
) {
  const query = new URLSearchParams({ on_conflict: onConflict });
  const response = await fetch(`${url}/rest/v1/${table}?${query.toString()}`, {
    method: "POST",
    headers: {
      ...adminHeaders,
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${table}_upsert_failed:${response.status}:${detail.slice(0, 180)}`);
  }
}

async function verifyPasswordLogin() {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey!,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`demo_login_verify_failed:${response.status}`);
  const payload = (await response.json()) as { access_token?: string; user?: { id?: string } };
  if (!payload.access_token || !payload.user?.id) {
    throw new Error("demo_login_verify_invalid_response");
  }
  return payload.user.id;
}

try {
  const ensured = await ensureDemoUser();

  await upsertRest("check_di_organizations", "id", {
    id: organizationId,
    name: organizationName,
    slug: organizationSlug,
    type: "demo_participant",
    updated_at: new Date().toISOString(),
  });

  await upsertRest(
    "check_di_organization_members",
    "organization_id,user_id",
    {
      organization_id: organizationId,
      user_id: ensured.user.id,
      role: "owner",
    },
  );

  const verifiedUserId = await verifyPasswordLogin();
  if (verifiedUserId !== ensured.user.id) {
    throw new Error("demo_login_user_mismatch");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        user: {
          id: ensured.user.id,
          email,
          created: ensured.created,
        },
        organization: {
          id: organizationId,
          name: organizationName,
          slug: organizationSlug,
          role: "owner",
        },
        loginVerified: true,
        password: "not_printed",
        next: "Log in at /login, then link Phantom at /organization/wallet. Set CHECK_DI_AUTH_MODE=required only after the demo account is provisioned in the target environment.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  fail(error instanceof Error ? error.message : "demo_provision_failed");
}
