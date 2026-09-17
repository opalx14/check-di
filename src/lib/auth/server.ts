import {
  CHECK_DI_DEMO_SESSION_COOKIE,
  getDemoAuthContextFromToken,
  getDemoMembershipForUser,
} from "@/lib/auth/demo";

export const CHECK_DI_ORGANIZATION_ROLES = [
  "owner",
  "operator",
  "inspector",
  "viewer",
] as const;

export type CheckDiOrganizationRole =
  (typeof CHECK_DI_ORGANIZATION_ROLES)[number];

export const CHECK_DI_AUTH_ACCESS_COOKIE = "check_di_access_token";
export const CHECK_DI_AUTH_REFRESH_COOKIE = "check_di_refresh_token";

export type CheckDiAuthMode = "off" | "optional" | "required";

export type AuthenticatedCheckDiUser = {
  id: string;
  email?: string;
};

export type CheckDiOrganizationMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  walletPublicKey?: string;
  role: CheckDiOrganizationRole;
};

export type CheckDiAuthContext = {
  user: AuthenticatedCheckDiUser;
  memberships: CheckDiOrganizationMembership[];
};

export type CheckDiOrganizationActor = {
  mode: CheckDiAuthMode;
  context: CheckDiAuthContext | null;
  membership: CheckDiOrganizationMembership | null;
};

export type CheckDiPasswordSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthenticatedCheckDiUser;
};

type SupabaseUserResponse = {
  id?: string;
  email?: string;
};

type SupabasePasswordResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: SupabaseUserResponse;
  error?: string;
  error_description?: string;
  msg?: string;
};

type MembershipRow = {
  organization_id: string;
  role: CheckDiOrganizationRole;
  check_di_organizations:
    | {
        name: string;
        slug: string;
        wallet_public_key: string | null;
      }
    | {
        name: string;
        slug: string;
        wallet_public_key: string | null;
      }[]
    | null;
};

export class CheckDiAuthError extends Error {
  status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "CheckDiAuthError";
    this.status = status;
  }
}

function requireSupabaseServerConfig() {
  const url = process.env.CHECK_DI_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("supabase_url_missing");
  }

  if (!serviceRoleKey) {
    throw new Error("supabase_service_role_key_missing");
  }

  return { url, serviceRoleKey };
}

export function getCheckDiAuthMode(): CheckDiAuthMode {
  const value = process.env.CHECK_DI_AUTH_MODE?.trim().toLowerCase();
  if (value === "optional" || value === "required") return value;
  return "off";
}

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    if (key !== name) continue;
    const value = pair.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value) || null;
    } catch {
      return value || null;
    }
  }

  return null;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice("bearer ".length).trim();
  return token || null;
}

export function getCheckDiAccessToken(request: Request) {
  return (
    bearerToken(request) ??
    cookieValue(request, CHECK_DI_AUTH_ACCESS_COOKIE)
  );
}

export async function signInCheckDiWithPassword(
  email: string,
  password: string,
): Promise<CheckDiPasswordSession> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new CheckDiAuthError("invalid_credentials", 401);
  }

  const { url, serviceRoleKey } = requireSupabaseServerConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email: normalizedEmail, password }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as SupabasePasswordResponse;
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new CheckDiAuthError("invalid_credentials", 401);
  }

  if (!response.ok) {
    throw new Error(
      `supabase_password_auth_failed:${response.status}:${payload.error ?? payload.msg ?? "unknown"}`,
    );
  }

  if (
    !payload.access_token ||
    !payload.refresh_token ||
    !payload.user?.id
  ) {
    throw new Error("supabase_password_auth_invalid_response");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: Math.max(60, Number(payload.expires_in) || 3600),
    user: {
      id: payload.user.id,
      email: payload.user.email,
    },
  };
}

export async function getAuthenticatedCheckDiUser(
  request: Request,
): Promise<AuthenticatedCheckDiUser | null> {
  const demoContext = await getDemoAuthContextFromToken(
    cookieValue(request, CHECK_DI_DEMO_SESSION_COOKIE),
  );
  if (demoContext) return demoContext.user;

  const accessToken = getCheckDiAccessToken(request);
  if (!accessToken) {
    return null;
  }

  const { url, serviceRoleKey } = requireSupabaseServerConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`supabase_auth_user_failed:${response.status}`);
  }

  const user = (await response.json()) as SupabaseUserResponse;
  if (!user.id) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}

export async function getOrganizationMemberships(
  userId: string,
): Promise<CheckDiOrganizationMembership[]> {
  const demoMembership = await getDemoMembershipForUser(userId);
  if (demoMembership) return [demoMembership];

  const { url, serviceRoleKey } = requireSupabaseServerConfig();
  const query = new URLSearchParams({
    select: "organization_id,role,check_di_organizations(name,slug,wallet_public_key)",
    user_id: `eq.${userId}`,
    order: "created_at.asc",
  });

  const response = await fetch(
    `${url}/rest/v1/check_di_organization_members?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`supabase_memberships_failed:${response.status}`);
  }

  const rows = (await response.json()) as MembershipRow[];
  return rows.flatMap((row) => {
    const organization = Array.isArray(row.check_di_organizations)
      ? row.check_di_organizations[0]
      : row.check_di_organizations;

    if (!organization) {
      return [];
    }

    return [
      {
        organizationId: row.organization_id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        walletPublicKey: organization.wallet_public_key ?? undefined,
        role: row.role,
      },
    ];
  });
}

export async function getCheckDiAuthContext(
  request: Request,
): Promise<CheckDiAuthContext | null> {
  const demoContext = await getDemoAuthContextFromToken(
    cookieValue(request, CHECK_DI_DEMO_SESSION_COOKIE),
  );
  if (demoContext) return demoContext;

  const user = await getAuthenticatedCheckDiUser(request);
  if (!user) {
    return null;
  }

  return {
    user,
    memberships: await getOrganizationMemberships(user.id),
  };
}

export function membershipAllows(
  membership: CheckDiOrganizationMembership | undefined | null,
  allowedRoles: readonly CheckDiOrganizationRole[],
) {
  return Boolean(membership && allowedRoles.includes(membership.role));
}

export function organizationActorCanAccessBatch(
  actor: CheckDiOrganizationActor,
  batch: {
    createdByOrganizationId?: string;
    events: { organizationId: string }[];
  },
) {
  if (!actor.context) return actor.mode !== "required";
  if (!actor.membership) return false;
  return (
    batch.createdByOrganizationId === actor.membership.organizationId ||
    batch.events.some(
      (event) => event.organizationId === actor.membership?.organizationId,
    )
  );
}

export function organizationActorCanManageEvent(
  actor: CheckDiOrganizationActor,
  event: { organizationId: string },
) {
  if (!actor.context) return actor.mode !== "required";
  return event.organizationId === actor.membership?.organizationId;
}

export async function resolveCheckDiOrganizationActor(
  request: Request,
  allowedRoles: readonly CheckDiOrganizationRole[],
): Promise<CheckDiOrganizationActor> {
  const mode = getCheckDiAuthMode();
  if (mode === "off") {
    return { mode, context: null, membership: null };
  }

  const context = await getCheckDiAuthContext(request);
  if (!context) {
    if (mode === "required") {
      throw new CheckDiAuthError("unauthorized", 401);
    }
    return { mode, context: null, membership: null };
  }

  const requestedOrganizationId = request.headers
    .get("x-check-di-organization-id")
    ?.trim();
  const membership = requestedOrganizationId
    ? context.memberships.find(
        (item) => item.organizationId === requestedOrganizationId,
      ) ?? null
    : context.memberships[0] ?? null;

  if (!membership || !membershipAllows(membership, allowedRoles)) {
    throw new CheckDiAuthError("organization_forbidden", 403);
  }

  return { mode, context, membership };
}
