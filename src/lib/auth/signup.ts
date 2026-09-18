import { randomUUID } from "node:crypto";

import {
  CHECK_DI_AUTH_ACCESS_COOKIE,
  CHECK_DI_AUTH_REFRESH_COOKIE,
  type CheckDiPasswordSession,
} from "@/lib/auth/server";

const SIGNUP_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_MAX_ATTEMPTS = 5;
const signupAttempts = new Map<string, number[]>();

export class CheckDiSignupError extends Error {
  status: 400 | 409 | 429 | 500;

  constructor(message: string, status: 400 | 409 | 429 | 500) {
    super(message);
    this.name = "CheckDiSignupError";
    this.status = status;
  }
}

type SupabaseSignupPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string;
    identities?: unknown[];
  };
  error?: string;
  error_description?: string;
  msg?: string;
};

export type CheckDiSignupInput = {
  email: string;
  password: string;
  organizationName: string;
};

export type CheckDiSignupResult = {
  user: {
    id: string;
    email?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  session: CheckDiPasswordSession | null;
  confirmationRequired: boolean;
  hackathonAutoConfirmed: boolean;
};

function requireSupabaseServerConfig() {
  const url = process.env.CHECK_DI_SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) throw new Error("supabase_url_missing");
  if (!serviceRoleKey) throw new Error("supabase_service_role_key_missing");
  return { url, serviceRoleKey };
}

export function normalizeOrganizationSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "organization";
}

export function validateSignupInput(input: CheckDiSignupInput) {
  const email = input.email.trim().toLowerCase();
  const organizationName = input.organizationName.trim();
  const password = input.password;

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new CheckDiSignupError("signup_email_invalid", 400);
  }
  if (password.length < 12) {
    throw new CheckDiSignupError("signup_password_too_short", 400);
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new CheckDiSignupError("signup_password_too_weak", 400);
  }
  if (organizationName.length < 2 || organizationName.length > 120) {
    throw new CheckDiSignupError("signup_organization_name_invalid", 400);
  }

  return { email, password, organizationName };
}

export function consumeSignupRateLimit(key: string, now = Date.now()) {
  const normalizedKey = key.trim() || "unknown";
  const recent = (signupAttempts.get(normalizedKey) ?? []).filter(
    (timestamp) => now - timestamp < SIGNUP_WINDOW_MS,
  );
  if (recent.length >= SIGNUP_MAX_ATTEMPTS) {
    signupAttempts.set(normalizedKey, recent);
    return false;
  }
  recent.push(now);
  signupAttempts.set(normalizedKey, recent);
  return true;
}

export function resetSignupRateLimitForTests() {
  signupAttempts.clear();
}

function hackathonAutoConfirmEnabled() {
  return process.env.CHECK_DI_HACKATHON_AUTO_CONFIRM_SIGNUP === "1";
}

async function createHackathonConfirmedUser(input: {
  url: string;
  serviceRoleKey: string;
  email: string;
  password: string;
  organizationName: string;
}) {
  const createResponse = await fetch(`${input.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: input.serviceRoleKey,
      authorization: `Bearer ${input.serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        check_di_hackathon_test_account: true,
        check_di_organization_name: input.organizationName,
      },
    }),
    cache: "no-store",
  });
  const created = (await createResponse.json().catch(() => ({}))) as {
    id?: string;
    email?: string;
    error?: string;
    msg?: string;
  };

  if (!createResponse.ok) {
    const detail = `${created.error ?? ""} ${created.msg ?? ""}`.toLowerCase();
    if (
      createResponse.status === 409 ||
      createResponse.status === 422 ||
      detail.includes("already") ||
      detail.includes("registered")
    ) {
      throw new CheckDiSignupError("signup_email_exists", 409);
    }
    throw new Error(`supabase_hackathon_user_create_failed:${createResponse.status}`);
  }
  if (!created.id) {
    throw new Error("supabase_hackathon_user_missing_id");
  }

  const sessionResponse = await fetch(
    `${input.url}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: input.serviceRoleKey,
        authorization: `Bearer ${input.serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
      cache: "no-store",
    },
  );
  const session = (await sessionResponse.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (
    !sessionResponse.ok ||
    !session.access_token ||
    !session.refresh_token
  ) {
    await deleteSupabaseUserBestEffort(
      input.url,
      input.serviceRoleKey,
      created.id,
    );
    throw new Error("supabase_hackathon_session_failed");
  }

  return {
    user: {
      id: created.id,
      email: created.email ?? input.email,
    },
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
  };
}

async function deleteSupabaseUserBestEffort(
  url: string,
  serviceRoleKey: string,
  userId: string,
) {
  await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  }).catch(() => undefined);
}

async function deleteOrganizationBestEffort(
  url: string,
  serviceRoleKey: string,
  organizationId: string,
) {
  await fetch(
    `${url}/rest/v1/check_di_organizations?id=eq.${encodeURIComponent(organizationId)}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    },
  ).catch(() => undefined);
}

export async function signUpCheckDiUser(
  rawInput: CheckDiSignupInput,
): Promise<CheckDiSignupResult> {
  const input = validateSignupInput(rawInput);
  const { url, serviceRoleKey } = requireSupabaseServerConfig();

  const signupResponse = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
    cache: "no-store",
  });

  const signupPayload = (await signupResponse
    .json()
    .catch(() => ({}))) as SupabaseSignupPayload;
  let hackathonAutoConfirmed = false;

  if (!signupResponse.ok) {
    const detail = [
      signupPayload.error,
      signupPayload.error_description,
      signupPayload.msg,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      signupResponse.status === 409 ||
      signupResponse.status === 422 ||
      detail.includes("already") ||
      detail.includes("registered")
    ) {
      throw new CheckDiSignupError("signup_email_exists", 409);
    }

    if (
      signupResponse.status === 429 ||
      detail.includes("over_email_send_rate_limit") ||
      detail.includes("rate limit")
    ) {
      if (!hackathonAutoConfirmEnabled()) {
        throw new CheckDiSignupError("signup_upstream_rate_limited", 429);
      }

      const fallback = await createHackathonConfirmedUser({
        url,
        serviceRoleKey,
        email: input.email,
        password: input.password,
        organizationName: input.organizationName,
      });
      signupPayload.user = fallback.user;
      signupPayload.access_token = fallback.accessToken;
      signupPayload.refresh_token = fallback.refreshToken;
      signupPayload.expires_in = fallback.expiresIn;
      hackathonAutoConfirmed = true;
    } else {
      throw new Error(
        `supabase_signup_failed:${signupResponse.status}:${signupPayload.error ?? signupPayload.msg ?? "unknown"}`,
      );
    }
  }

  if (signupPayload.user?.identities?.length === 0) {
    throw new CheckDiSignupError("signup_email_exists", 409);
  }

  const userId = signupPayload.user?.id;
  if (!userId) {
    throw new Error("supabase_signup_missing_user");
  }

  const baseSlug = normalizeOrganizationSlug(input.organizationName);
  let organizationSlug = "";
  let organizationId = "";
  let organizationCreated = false;
  let lastOrganizationStatus = 500;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
    organizationSlug = `${baseSlug.slice(0, 39)}-${suffix}`;
    organizationId = `org-${organizationSlug}`;

    const organizationResponse = await fetch(
      `${url}/rest/v1/check_di_organizations`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify({
          id: organizationId,
          name: input.organizationName,
          slug: organizationSlug,
          type: "participant",
        }),
        cache: "no-store",
      },
    );

    lastOrganizationStatus = organizationResponse.status;
    if (organizationResponse.ok) {
      organizationCreated = true;
      break;
    }

    // A unique slug/id collision is safe to retry with a fresh random suffix.
    if (organizationResponse.status !== 409) break;
  }

  if (!organizationCreated) {
    await deleteSupabaseUserBestEffort(url, serviceRoleKey, userId);
    throw new Error(
      `signup_organization_create_failed:${lastOrganizationStatus}`,
    );
  }

  const membershipResponse = await fetch(
    `${url}/rest/v1/check_di_organization_members`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({
        organization_id: organizationId,
        user_id: userId,
        role: "owner",
      }),
      cache: "no-store",
    },
  );

  if (!membershipResponse.ok) {
    await deleteOrganizationBestEffort(url, serviceRoleKey, organizationId);
    await deleteSupabaseUserBestEffort(url, serviceRoleKey, userId);
    throw new Error(
      `signup_membership_create_failed:${membershipResponse.status}`,
    );
  }

  const hasSession = Boolean(
    signupPayload.access_token && signupPayload.refresh_token,
  );
  const session: CheckDiPasswordSession | null = hasSession
    ? {
        accessToken: signupPayload.access_token!,
        refreshToken: signupPayload.refresh_token!,
        expiresIn: Math.max(60, Number(signupPayload.expires_in) || 3600),
        user: {
          id: userId,
          email: signupPayload.user?.email ?? input.email,
        },
      }
    : null;

  return {
    user: {
      id: userId,
      email: signupPayload.user?.email ?? input.email,
    },
    organization: {
      id: organizationId,
      name: input.organizationName,
      slug: organizationSlug,
    },
    session,
    confirmationRequired: !session,
    hackathonAutoConfirmed,
  };
}

export function signupSessionCookieNames() {
  return {
    access: CHECK_DI_AUTH_ACCESS_COOKIE,
    refresh: CHECK_DI_AUTH_REFRESH_COOKIE,
  };
}
