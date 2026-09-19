import type { DocumentExtraction } from "@/types/evidence";

export type PiiCategory =
  | "cccd"
  | "phone"
  | "bank_account"
  | "personal_address";

export type PiiRedactionResult = {
  value: string;
  categories: PiiCategory[];
};

function maskValue(category: Exclude<PiiCategory, "personal_address">) {
  return `[REDACTED_${category.toUpperCase()}]`;
}

function addCategory(
  categories: Set<PiiCategory>,
  category: PiiCategory,
) {
  categories.add(category);
}

export function redactSensitiveText(
  input: string,
  options: { personalAddress?: boolean } = {},
): PiiRedactionResult {
  const categories = new Set<PiiCategory>();
  let value = input;

  // Bank account number only when accompanied by a bank-account label. Run this
  // before generic numeric detectors so a 12-digit account is not misclassified as CCCD.
  value = value.replace(
    /(?<![A-Za-z0-9])(STK|Số tài khoản|So tai khoan|Bank account)\s*[:#-]?\s*([0-9][0-9 .-]{6,20}[0-9])(?!\d)/gi,
    (_full, label: string) => {
      addCategory(categories, "bank_account");
      return `${label}: ${maskValue("bank_account")}`;
    },
  );

  // Vietnamese citizen ID (CCCD): 12 consecutive digits.
  value = value.replace(/(?<!\d)\d{12}(?!\d)/g, () => {
    addCategory(categories, "cccd");
    return maskValue("cccd");
  });

  // Vietnamese phone numbers: 0xxxxxxxxx or +84xxxxxxxxx, with common separators.
  value = value.replace(
    /(?<!\d)(?:\+?84|0)(?:[ .-]?\d){9}(?!\d)/g,
    () => {
      addCategory(categories, "phone");
      return maskValue("phone");
    },
  );

  if (
    options.personalAddress &&
    /(địa chỉ|dia chi|address|số nhà|so nha|đường|duong|phường|phuong|xã|xa|quận|quan|huyện|huyen)/i.test(
      value,
    )
  ) {
    addCategory(categories, "personal_address");
    value = "[REDACTED_PERSONAL_ADDRESS]";
  }

  return { value, categories: [...categories] };
}

export function redactForPublicDisplay(input: string) {
  return redactSensitiveText(input, { personalAddress: true }).value;
}

function redactOptionalText(
  value: string | undefined,
  categories: Set<PiiCategory>,
  options?: { personalAddress?: boolean },
) {
  if (!value) return value;
  const redacted = redactSensitiveText(value, options);
  redacted.categories.forEach((category) => categories.add(category));
  return redacted.value;
}

export function redactDocumentExtraction(
  extraction: DocumentExtraction,
): DocumentExtraction {
  const categories = new Set<PiiCategory>();

  return {
    ...extraction,
    documentType: redactOptionalText(extraction.documentType, categories),
    organizationName: redactOptionalText(
      extraction.organizationName,
      categories,
    ),
    origin: redactOptionalText(extraction.origin, categories),
    destination: redactOptionalText(extraction.destination, categories),
    notes: extraction.notes?.map(
      (note) =>
        redactOptionalText(note, categories, { personalAddress: true }) ?? note,
    ),
    privacy: {
      redactionMode: "deterministic-v1",
      applied: true,
      redactedCategories: [...categories],
    },
  };
}
