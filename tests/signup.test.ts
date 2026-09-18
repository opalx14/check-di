import { describe, expect, test } from "bun:test";

import {
  CheckDiSignupError,
  consumeSignupRateLimit,
  normalizeOrganizationSlug,
  resetSignupRateLimitForTests,
  signUpCheckDiUser,
  validateSignupInput,
} from "../src/lib/auth/signup";

const originalUrl = process.env.CHECK_DI_SUPABASE_URL;
const originalServiceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY;
const originalHackathonAutoConfirm =
  process.env.CHECK_DI_HACKATHON_AUTO_CONFIRM_SIGNUP;
const originalFetch = globalThis.fetch;

function restore() {
  if (originalUrl === undefined) delete process.env.CHECK_DI_SUPABASE_URL;
  else process.env.CHECK_DI_SUPABASE_URL = originalUrl;
  if (originalServiceRoleKey === undefined) {
    delete process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  }
  if (originalHackathonAutoConfirm === undefined) {
    delete process.env.CHECK_DI_HACKATHON_AUTO_CONFIRM_SIGNUP;
  } else {
    process.env.CHECK_DI_HACKATHON_AUTO_CONFIRM_SIGNUP =
      originalHackathonAutoConfirm;
  }
  globalThis.fetch = originalFetch;
  resetSignupRateLimitForTests();
}

describe("public Check-Di signup", () => {
  test("normalizes Vietnamese organization names into safe slugs", () => {
    expect(normalizeOrganizationSlug("  HTX Trái Cây Đồng Nai  ")).toBe(
      "htx-trai-cay-dong-nai",
    );
    expect(normalizeOrganizationSlug("Đắk Farm & Co.")).toBe("dak-farm-co");
  });

  test("requires a strong-enough password and organization name", () => {
    expect(() =>
      validateSignupInput({
        email: "owner@example.com",
        password: "short",
        organizationName: "HTX Test",
      }),
    ).toThrow("signup_password_too_short");

    expect(() =>
      validateSignupInput({
        email: "owner@example.com",
        password: "alllowercase123",
        organizationName: "HTX Test",
      }),
    ).toThrow("signup_password_too_weak");

    expect(
      validateSignupInput({
        email: " Owner@Example.com ",
        password: "StrongPassword123",
        organizationName: " HTX Test ",
      }),
    ).toEqual({
      email: "owner@example.com",
      password: "StrongPassword123",
      organizationName: "HTX Test",
    });
  });

  test("limits repeated public signup attempts per key", () => {
    const now = 1_000_000;
    for (let index = 0; index < 5; index += 1) {
      expect(consumeSignupRateLimit("203.0.113.10", now + index)).toBe(true);
    }
    expect(consumeSignupRateLimit("203.0.113.10", now + 10)).toBe(false);
    expect(consumeSignupRateLimit("203.0.113.11", now + 10)).toBe(true);
    resetSignupRateLimitForTests();
  });

  test("creates auth user, organization and fixed owner membership", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

    const calls: Array<{ url: string; body?: unknown }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });

      if (url.endsWith("/auth/v1/signup")) {
        return Response.json(
          {
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              email: "owner@example.com",
            },
          },
          { status: 200 },
        );
      }
      if (url.endsWith("/rest/v1/check_di_organizations")) {
        return Response.json([{ id: "org-created" }], { status: 201 });
      }
      if (url.endsWith("/rest/v1/check_di_organization_members")) {
        return new Response(null, { status: 201 });
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    const result = await signUpCheckDiUser({
      email: "owner@example.com",
      password: "StrongPassword123",
      organizationName: "HTX Trái Cây Long An",
    });

    expect(result.confirmationRequired).toBe(false);
    expect(result.session?.accessToken).toBe("access-token");
    expect(result.organization.slug.startsWith("htx-trai-cay-long-an-")).toBe(
      true,
    );
    expect(calls).toHaveLength(3);
    expect(calls[2]?.body).toMatchObject({
      organization_id: result.organization.id,
      user_id: "11111111-1111-4111-8111-111111111111",
      role: "owner",
    });
    restore();
  });

  test("retries organization provisioning when a slug collision returns 409", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

    let organizationAttempts = 0;
    const organizationBodies: Array<{ id?: string; slug?: string }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;

      if (url.endsWith("/auth/v1/signup")) {
        return Response.json(
          {
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            user: {
              id: "44444444-4444-4444-8444-444444444444",
              email: "collision@example.com",
            },
          },
          { status: 200 },
        );
      }
      if (url.endsWith("/rest/v1/check_di_organizations")) {
        organizationAttempts += 1;
        organizationBodies.push(body ?? {});
        if (organizationAttempts === 1) {
          return Response.json({ code: "23505" }, { status: 409 });
        }
        return Response.json([{ id: body.id }], { status: 201 });
      }
      if (url.endsWith("/rest/v1/check_di_organization_members")) {
        return new Response(null, { status: 201 });
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    const result = await signUpCheckDiUser({
      email: "collision@example.com",
      password: "StrongPassword123",
      organizationName: "Collision Test",
    });

    expect(organizationAttempts).toBe(2);
    expect(organizationBodies[0]?.slug).not.toBe(
      organizationBodies[1]?.slug,
    );
    expect(result.organization.slug).toBe(organizationBodies[1]?.slug);
    restore();
  });

  test("cleans up organization and auth user when owner membership provisioning fails", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

    const calls: Array<{ url: string; method?: string }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      calls.push({ url, method: init?.method });

      if (url.endsWith("/auth/v1/signup")) {
        return Response.json(
          {
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            user: {
              id: "55555555-5555-4555-8555-555555555555",
              email: "cleanup@example.com",
            },
          },
          { status: 200 },
        );
      }
      if (url.endsWith("/rest/v1/check_di_organizations") && init?.method === "POST") {
        return Response.json([{ id: "org-created" }], { status: 201 });
      }
      if (
        url.endsWith("/rest/v1/check_di_organization_members") &&
        init?.method === "POST"
      ) {
        return Response.json({ error: "membership failed" }, { status: 500 });
      }
      if (
        url.includes("/rest/v1/check_di_organizations?id=eq.") &&
        init?.method === "DELETE"
      ) {
        return new Response(null, { status: 204 });
      }
      if (
        url.includes("/auth/v1/admin/users/55555555-5555-4555-8555-555555555555") &&
        init?.method === "DELETE"
      ) {
        return new Response(null, { status: 204 });
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    await expect(
      signUpCheckDiUser({
        email: "cleanup@example.com",
        password: "StrongPassword123",
        organizationName: "Cleanup Test",
      }),
    ).rejects.toThrow("signup_membership_create_failed:500");

    expect(
      calls.some(
        (call) =>
          call.method === "DELETE" &&
          call.url.includes("/rest/v1/check_di_organizations?id=eq."),
      ),
    ).toBe(true);
    expect(
      calls.some(
        (call) =>
          call.method === "DELETE" &&
          call.url.includes(
            "/auth/v1/admin/users/55555555-5555-4555-8555-555555555555",
          ),
      ),
    ).toBe(true);
    restore();
  });

  test("returns confirmation-required when Supabase creates user without session", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";

    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/signup")) {
        return Response.json({
          user: {
            id: "22222222-2222-4222-8222-222222222222",
            email: "confirm@example.com",
          },
        });
      }
      if (url.endsWith("/rest/v1/check_di_organizations")) {
        return Response.json([{ id: "org-created" }], { status: 201 });
      }
      if (url.endsWith("/rest/v1/check_di_organization_members")) {
        return new Response(null, { status: 201 });
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    const result = await signUpCheckDiUser({
      email: "confirm@example.com",
      password: "StrongPassword123",
      organizationName: "Confirm Test",
    });

    expect(result.session).toBeNull();
    expect(result.confirmationRequired).toBe(true);
    restore();
  });

  test("keeps the hackathon auto-confirm fallback disabled by default", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    delete process.env.CHECK_DI_HACKATHON_AUTO_CONFIRM_SIGNUP;
    globalThis.fetch = (async () =>
      Response.json(
        { msg: "over_email_send_rate_limit" },
        { status: 429 },
      )) as typeof fetch;

    try {
      await signUpCheckDiUser({
        email: "rate-limited@example.com",
        password: "StrongPassword123",
        organizationName: "Rate Limited Org",
      });
      throw new Error("expected rate limit");
    } catch (error) {
      expect(error).toBeInstanceOf(CheckDiSignupError);
      expect((error as CheckDiSignupError).status).toBe(429);
      expect((error as Error).message).toBe("signup_upstream_rate_limited");
    }
    restore();
  });

  test("uses the explicit hackathon auto-confirm fallback only after upstream email rate limiting", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    process.env.CHECK_DI_HACKATHON_AUTO_CONFIRM_SIGNUP = "1";

    const calls: Array<{ url: string; body?: unknown }> = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });

      if (url.endsWith("/auth/v1/signup")) {
        return Response.json(
          { msg: "over_email_send_rate_limit" },
          { status: 429 },
        );
      }
      if (url.endsWith("/auth/v1/admin/users")) {
        return Response.json(
          {
            id: "33333333-3333-4333-8333-333333333333",
            email: "hackathon@example.com",
          },
          { status: 200 },
        );
      }
      if (url.includes("/auth/v1/token?grant_type=password")) {
        return Response.json({
          access_token: "hackathon-access",
          refresh_token: "hackathon-refresh",
          expires_in: 3600,
        });
      }
      if (url.endsWith("/rest/v1/check_di_organizations")) {
        return Response.json([{ id: "org-created" }], { status: 201 });
      }
      if (url.endsWith("/rest/v1/check_di_organization_members")) {
        return new Response(null, { status: 201 });
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;

    const result = await signUpCheckDiUser({
      email: "hackathon@example.com",
      password: "StrongPassword123",
      organizationName: "Hackathon Test Org",
    });

    expect(result.hackathonAutoConfirmed).toBe(true);
    expect(result.confirmationRequired).toBe(false);
    expect(result.session?.accessToken).toBe("hackathon-access");
    expect(calls[1]?.body).toMatchObject({
      email_confirm: true,
      user_metadata: {
        check_di_hackathon_test_account: true,
      },
    });
    expect(calls[4]?.body).toMatchObject({
      user_id: "33333333-3333-4333-8333-333333333333",
      role: "owner",
    });
    restore();
  });

  test("maps duplicate Supabase signup to a conflict", async () => {
    process.env.CHECK_DI_SUPABASE_URL = "https://example.supabase.co";
    process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    globalThis.fetch = (async () =>
      Response.json(
        { msg: "User already registered" },
        { status: 422 },
      )) as typeof fetch;

    try {
      await signUpCheckDiUser({
        email: "exists@example.com",
        password: "StrongPassword123",
        organizationName: "Existing Org",
      });
      throw new Error("expected conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(CheckDiSignupError);
      expect((error as CheckDiSignupError).status).toBe(409);
      expect((error as Error).message).toBe("signup_email_exists");
    }
    restore();
  });
});
