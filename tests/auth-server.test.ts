import { describe, expect, test } from "bun:test";

import {
  getAuthenticatedCheckDiUser,
  getCheckDiAuthContext,
  membershipAllows,
  resolveCheckDiOrganizationActor,
  signInCheckDiWithPassword,
} from "../src/lib/auth/server";

const originalUrl = process.env.CHECK_DI_SUPABASE_URL;
const originalServiceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY;
const originalFetch = globalThis.fetch;
const originalAuthMode = process.env.CHECK_DI_AUTH_MODE;

function restoreEnvironment() {
  process.env.CHECK_DI_SUPABASE_URL = originalUrl;
  process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  process.env.CHECK_DI_AUTH_MODE = originalAuthMode;
  globalThis.fetch = originalFetch;
}

describe("organization auth server helpers", () => {
  test("returns null when bearer token is missing", async () => {
    const user = await getAuthenticatedCheckDiUser(
      new Request("http://localhost/api/auth/me"),
    );

    expect(user).toBeNull();
  });

  test("hydrates authenticated user and organization memberships", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

    let fetchCalls = 0;
    const fetchMock = async (input: RequestInfo | URL) => {
      fetchCalls += 1;
      const url = String(input);
      if (url.endsWith("/auth/v1/user")) {
        return Response.json({
          id: "user-123",
          email: "operator@example.com",
        });
      }

      if (url.includes("/rest/v1/check_di_organization_members?")) {
        return Response.json([
          {
            organization_id: "org-dak-farm",
            role: "operator",
            check_di_organizations: {
              name: "HTX Đắk Farm",
              slug: "dak-farm",
              wallet_public_key: null,
            },
          },
        ]);
      }

      return new Response(null, { status: 404 });
    };
    globalThis.fetch = fetchMock as typeof fetch;

    const request = new Request("http://localhost/api/auth/me", {
      headers: { authorization: "Bearer user-access-token" },
    });
    const context = await getCheckDiAuthContext(request);

    expect(context?.user.id).toBe("user-123");
    expect(context?.memberships).toEqual([
      {
        organizationId: "org-dak-farm",
        organizationName: "HTX Đắk Farm",
        organizationSlug: "dak-farm",
        walletPublicKey: undefined,
        role: "operator",
      },
    ]);
    expect(membershipAllows(context?.memberships[0], ["owner", "operator"])).toBe(
      true,
    );
    expect(membershipAllows(context?.memberships[0], ["owner"])).toBe(false);
    expect(fetchCalls).toBe(2);
    restoreEnvironment();
  });

  test("accepts the HttpOnly access cookie when Authorization is absent", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

    globalThis.fetch = (async (_input, init) => {
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer cookie-access-token",
      );
      return Response.json({ id: "cookie-user", email: "owner@example.com" });
    }) as typeof fetch;

    const user = await getAuthenticatedCheckDiUser(
      new Request("http://localhost/api/auth/me", {
        headers: { cookie: "check_di_access_token=cookie-access-token" },
      }),
    );

    expect(user?.id).toBe("cookie-user");
    restoreEnvironment();
  });

  test("creates a password session through Supabase Auth", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

    globalThis.fetch = (async (input, init) => {
      expect(String(input)).toBe(
        "https://example.supabase.co/auth/v1/token?grant_type=password",
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        email: "operator@example.com",
        password: "secret-123",
      });
      return Response.json({
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        user: { id: "user-123", email: "operator@example.com" },
      });
    }) as typeof fetch;

    const session = await signInCheckDiWithPassword(
      " Operator@Example.com ",
      "secret-123",
    );
    expect(session.accessToken).toBe("access-token");
    expect(session.user.id).toBe("user-123");
    restoreEnvironment();
  });

  test("requires a session when organization auth mode is required", async () => {
    process.env.CHECK_DI_AUTH_MODE = "required";

    await expect(
      resolveCheckDiOrganizationActor(
        new Request("http://localhost/api/manage/batches/test"),
        ["owner"],
      ),
    ).rejects.toMatchObject({ message: "unauthorized", status: 401 });
    restoreEnvironment();
  });

  test("rejects invalid Supabase access tokens without querying memberships", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

    let fetchCalls = 0;
    const fetchMock = async () => {
      fetchCalls += 1;
      return new Response(null, { status: 401 });
    };
    globalThis.fetch = fetchMock as typeof fetch;

    const request = new Request("http://localhost/api/auth/me", {
      headers: { authorization: "Bearer invalid-token" },
    });
    const context = await getCheckDiAuthContext(request);

    expect(context).toBeNull();
    expect(fetchCalls).toBe(1);
    restoreEnvironment();
  });
});
