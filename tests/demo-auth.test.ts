import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import {
  CHECK_DI_DEMO_EMAIL,
  CHECK_DI_DEMO_ORGANIZATION_ID,
  CHECK_DI_DEMO_PASSWORD,
  getDemoAuthContextFromToken,
  loginDemoProducer,
  setDemoOrganizationWalletPublicKey,
} from "@/lib/auth/demo";

describe("local producer demo auth", () => {
  test("logs in with demo email and persists the linked Phantom public key", async () => {
    const directory = await mkdtemp(join(tmpdir(), "check-di-demo-auth-"));
    const originalDemoPath = process.env.CHECK_DI_DEMO_AUTH_PATH;
    const originalDemoEnabled = process.env.CHECK_DI_ENABLE_DEMO_LOGIN;
    const originalDbDriver = process.env.CHECK_DI_DB_DRIVER;
    try {
      process.env.CHECK_DI_DEMO_AUTH_PATH = join(directory, "auth.json");
      process.env.CHECK_DI_ENABLE_DEMO_LOGIN = "1";
      process.env.CHECK_DI_DB_DRIVER = "file";

      const session = await loginDemoProducer(
        CHECK_DI_DEMO_EMAIL,
        CHECK_DI_DEMO_PASSWORD,
      );
      expect(session?.membership.organizationId).toBe(CHECK_DI_DEMO_ORGANIZATION_ID);
      expect(session?.membership.walletPublicKey).toBeUndefined();

      const wallet = "11111111111111111111111111111111";
      expect(
        await setDemoOrganizationWalletPublicKey(
          CHECK_DI_DEMO_ORGANIZATION_ID,
          wallet,
        ),
      ).toBe(true);

      const context = await getDemoAuthContextFromToken(session?.token ?? null);
      expect(context?.user.email).toBe(CHECK_DI_DEMO_EMAIL);
      expect(context?.memberships[0]?.walletPublicKey).toBe(wallet);
    } finally {
      if (originalDemoPath === undefined) delete process.env.CHECK_DI_DEMO_AUTH_PATH;
      else process.env.CHECK_DI_DEMO_AUTH_PATH = originalDemoPath;
      if (originalDemoEnabled === undefined) delete process.env.CHECK_DI_ENABLE_DEMO_LOGIN;
      else process.env.CHECK_DI_ENABLE_DEMO_LOGIN = originalDemoEnabled;
      if (originalDbDriver === undefined) delete process.env.CHECK_DI_DB_DRIVER;
      else process.env.CHECK_DI_DB_DRIVER = originalDbDriver;
      await rm(directory, { recursive: true, force: true });
    }
  });
});
