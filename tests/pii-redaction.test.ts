import { describe, expect, test } from "bun:test";

import {
  redactDocumentExtraction,
  redactForPublicDisplay,
  redactSensitiveText,
} from "../src/lib/ai/pii-redaction";

describe("deterministic PII redaction", () => {
  test("masks CCCD, phone and labeled bank account values", () => {
    const result = redactSensitiveText(
      "CCCD 079203001234, phone 0931333131, STK: 9931333131",
    );

    expect(result.value).not.toContain("079203001234");
    expect(result.value).not.toContain("0931333131");
    expect(result.value).not.toContain("9931333131");
    expect(result.categories).toContain("cccd");
    expect(result.categories).toContain("phone");
    expect(result.categories).toContain("bank_account");
    expect(result.value).toContain("[REDACTED_CCCD]");
    expect(result.value).toContain("[REDACTED_PHONE]");
    expect(result.value).toContain("[REDACTED_BANK_ACCOUNT]");
  });

  test("classifies a labeled 12-digit bank account as bank data before CCCD", () => {
    const result = redactSensitiveText("Số tài khoản: 123456789012");

    expect(result.value).toBe("Số tài khoản: [REDACTED_BANK_ACCOUNT]");
    expect(result.categories).toEqual(["bank_account"]);
  });

  test("redacts personal address only when the caller marks the field as personal", () => {
    const plain = redactSensitiveText("Địa chỉ 477 Nguyễn Văn Công");
    expect(plain.value).toContain("477");

    const personal = redactSensitiveText("Địa chỉ 477 Nguyễn Văn Công", {
      personalAddress: true,
    });
    expect(personal.value).toBe("[REDACTED_PERSONAL_ADDRESS]");
    expect(personal.categories).toContain("personal_address");
  });

  test("marks extraction output as deterministic redaction protected", () => {
    const output = redactDocumentExtraction({
      status: "completed",
      provider: "demo",
      model: "deterministic-v1",
      simulated: true,
      organizationName: "HTX demo 0931333131",
      notes: [
        "Liên hệ 0931333131",
        "Địa chỉ: 477 Nguyễn Văn Công, phường Hạnh Thông",
      ],
    });

    expect(output.organizationName).not.toContain("0931333131");
    expect(output.notes?.[0]).not.toContain("0931333131");
    expect(output.notes?.[1]).toBe("[REDACTED_PERSONAL_ADDRESS]");
    expect(output.privacy).toEqual({
      redactionMode: "deterministic-v1",
      applied: true,
      redactedCategories: ["phone", "personal_address"],
    });
  });

  test("sanitizes legacy public display text without mutating stored evidence", () => {
    const input = "CCCD 079203001234 - STK: 9931333131";
    const output = redactForPublicDisplay(input);

    expect(output).not.toContain("079203001234");
    expect(output).not.toContain("9931333131");
    expect(input).toContain("079203001234");
  });
});
