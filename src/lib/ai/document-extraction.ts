import type {
  AIValidation,
  DocumentExtraction,
  DocumentEvidence,
  ProductBatch,
  TraceEvent,
} from "@/types/evidence";

export const SUPPORTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const stageDocumentType: Record<TraceEvent["stage"], string> = {
  production: "Nhật ký sản xuất / thu hoạch",
  packing: "Packing list / biên bản đóng gói",
  inspection: "Phiếu kiểm định",
  logistics: "Vận đơn / chứng từ logistics",
  retail: "Biên bản nhận hàng / điểm bán",
};

type ExtractionContext = {
  publicId: string;
  productName: string;
  origin: string;
  event: Pick<
    TraceEvent,
    | "stage"
    | "organizationName"
    | "location"
    | "occurredAt"
    | "summary"
    | "metrics"
  >;
};

function normalized(value: string | undefined) {
  return value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function closeTextMatch(left: string | undefined, right: string | undefined) {
  const a = normalized(left);
  const b = normalized(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function filenameStem(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, "");
}

function parseBatchId(filename: string, expectedPublicId: string) {
  const stem = filenameStem(filename);
  if (normalized(stem)?.includes(normalized(expectedPublicId) ?? "")) {
    return expectedPublicId;
  }

  const candidates = stem.toUpperCase().match(/[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+/g) ?? [];
  return candidates.find((candidate) => /\d/.test(candidate));
}

function parseQuantity(filename: string) {
  const match = filenameStem(filename).match(
    /(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilogram|kilograms|g|gram|grams|t|ton|tons|tan)/i,
  );
  if (!match) return {};

  const quantity = Number(match[1].replace(",", "."));
  if (!Number.isFinite(quantity)) return {};

  const rawUnit = match[2].toLowerCase();
  const unit = rawUnit.startsWith("kg") || rawUnit.startsWith("kilo") ? "kg" : rawUnit;
  return { quantity, unit };
}

function parseDocumentNumber(filename: string) {
  const match = filenameStem(filename).toUpperCase().match(
    /\b(?:PK|QC|VG|GR|FM|BB|DOC|INV)[-_][A-Z0-9-]{2,}\b/,
  );
  return match?.[0];
}

function parseIssueDate(filename: string) {
  const stem = filenameStem(filename);
  const match = stem.match(/\b(20\d{2})[-_](0[1-9]|1[0-2])[-_]([0-2]\d|3[01])\b/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

/**
 * Demo-only extraction for the hackathon build.
 *
 * It deliberately does NOT OCR or inspect semantic content in the file. It derives a
 * small structured fixture from the filename plus event metadata so the upload ->
 * cross-check -> human confirmation flow can be demonstrated without API keys,
 * billing or an external model dependency.
 */
export function extractDocumentDemo({
  filename,
  mimeType,
  context,
}: {
  filename: string;
  mimeType: string;
  context: ExtractionContext;
}): DocumentExtraction {
  const stemNormalized = normalized(filenameStem(filename)) ?? "";
  const organizationNormalized = normalized(context.event.organizationName) ?? "";
  const originNormalized = normalized(context.origin) ?? "";
  const locationNormalized = normalized(context.event.location) ?? "";
  const { quantity, unit } = parseQuantity(filename);

  const batchId = parseBatchId(filename, context.publicId);
  const organizationName =
    organizationNormalized && stemNormalized.includes(organizationNormalized)
      ? context.event.organizationName
      : undefined;
  const origin =
    context.event.stage === "production" &&
    ((originNormalized && stemNormalized.includes(originNormalized)) ||
      (locationNormalized && stemNormalized.includes(locationNormalized)))
      ? context.origin
      : undefined;

  const parsedFieldCount = [batchId, organizationName, origin, quantity].filter(
    (value) => value !== undefined,
  ).length;

  return {
    status: "completed",
    provider: "demo",
    model: "deterministic-v1",
    simulated: true,
    documentType: stageDocumentType[context.event.stage],
    batchId,
    documentNumber: parseDocumentNumber(filename),
    issueDate: parseIssueDate(filename),
    quantity,
    unit,
    origin,
    organizationName,
    confidence: Math.round(Math.min(0.7, 0.3 + parsedFieldCount * 0.1) * 100) / 100,
    notes: [
      "DEMO: extraction mô phỏng từ tên file + metadata chặng; không phải OCR/LLM.",
      `MIME dùng cho demo extraction: ${mimeType}.`,
    ],
  };
}

function documentValidation(
  evidence: Pick<DocumentEvidence, "id" | "filename" | "extraction">,
  status: AIValidation["status"],
  message: string,
  fields: string[],
  explain?: {
    severity?: AIValidation["severity"];
    sourceField?: string;
    extractedValue?: string | number | boolean;
    expectedValue?: string | number | boolean;
  },
): AIValidation {
  const severity =
    explain?.severity ??
    (status === "matched"
      ? "LOW"
      : status === "needs_review"
        ? "MEDIUM"
        : fields.includes("batchId")
          ? "HIGH"
          : "MEDIUM");
  return {
    status,
    message,
    fields,
    sourceDocumentId: evidence.id,
    severity,
    evidence: {
      sourceField: explain?.sourceField ?? fields[0] ?? "document",
      sourceText: `${evidence.filename}: ${message}`,
      ...(explain?.extractedValue !== undefined
        ? { extractedValue: explain.extractedValue }
        : {}),
      ...(explain?.expectedValue !== undefined
        ? { expectedValue: explain.expectedValue }
        : {}),
    },
  };
}

export function buildDocumentCrossChecks({
  batch,
  event,
  evidence,
}: {
  batch: Pick<ProductBatch, "publicId" | "origin">;
  event: TraceEvent;
  evidence: DocumentEvidence;
}): AIValidation[] {
  const extraction = evidence.extraction;
  const validations: AIValidation[] = [];

  if (extraction.batchId) {
    const batchMatches = normalized(extraction.batchId) === normalized(batch.publicId);
    validations.push(
      documentValidation(
        evidence,
        batchMatches ? "matched" : "warning",
        batchMatches
          ? `${evidence.filename}: mã lô demo nhận diện khớp ${batch.publicId}.`
          : `${evidence.filename}: mã lô demo nhận diện (${extraction.batchId}) không khớp ${batch.publicId}.`,
        ["batchId"],
        {
          severity: batchMatches ? "LOW" : "HIGH",
          sourceField: "batchId",
          extractedValue: extraction.batchId,
          expectedValue: batch.publicId,
        },
      ),
    );
  } else {
    validations.push(
      documentValidation(
        evidence,
        "needs_review",
        `${evidence.filename}: demo extractor chưa nhận diện mã lô từ tên file.`,
        ["batchId"],
      ),
    );
  }

  if (extraction.organizationName) {
    const organizationMatches = closeTextMatch(
      extraction.organizationName,
      event.organizationName,
    );
    validations.push(
      documentValidation(
        evidence,
        organizationMatches ? "matched" : "warning",
        organizationMatches
          ? `${evidence.filename}: đơn vị demo nhận diện khớp bên xác nhận chặng.`
          : `${evidence.filename}: đơn vị demo nhận diện (${extraction.organizationName}) khác bên xác nhận ${event.organizationName}.`,
        ["organizationName"],
        {
          severity: organizationMatches ? "LOW" : "MEDIUM",
          sourceField: "organizationName",
          extractedValue: extraction.organizationName,
          expectedValue: event.organizationName,
        },
      ),
    );
  }

  if (extraction.origin && event.stage === "production") {
    const originMatches =
      closeTextMatch(extraction.origin, batch.origin) ||
      closeTextMatch(extraction.origin, event.location);
    validations.push(
      documentValidation(
        evidence,
        originMatches ? "matched" : "warning",
        originMatches
          ? `${evidence.filename}: địa điểm nguồn demo nhận diện phù hợp chặng sản xuất.`
          : `${evidence.filename}: địa điểm nguồn demo nhận diện (${extraction.origin}) chưa khớp nguồn gốc/chặng.`,
        ["origin", "location"],
        {
          severity: originMatches ? "LOW" : "MEDIUM",
          sourceField: "origin",
          extractedValue: extraction.origin,
          expectedValue: `${batch.origin} / ${event.location}`,
        },
      ),
    );
  }

  if (
    extraction.quantity !== undefined &&
    extraction.unit &&
    normalized(extraction.unit)?.includes("kg")
  ) {
    const candidates = [
      Number(event.metrics?.harvestedWeightKg),
      Number(event.metrics?.inputWeightKg),
      Number(event.metrics?.outputWeightKg),
      Number(event.metrics?.receivedWeightKg),
    ].filter((value) => Number.isFinite(value) && value >= 0);

    if (candidates.length > 0) {
      const quantityMatches = candidates.some(
        (value) => Math.abs(value - extraction.quantity!) <= Math.max(0.5, value * 0.005),
      );
      validations.push(
        documentValidation(
          evidence,
          quantityMatches ? "matched" : "warning",
          quantityMatches
            ? `${evidence.filename}: khối lượng ${extraction.quantity} ${extraction.unit} khớp dữ liệu chặng.`
            : `${evidence.filename}: khối lượng ${extraction.quantity} ${extraction.unit} không khớp các số liệu chặng.`,
          ["quantity", "metrics"],
          {
            severity: quantityMatches ? "LOW" : "MEDIUM",
            sourceField: "quantity",
            extractedValue: `${extraction.quantity} ${extraction.unit}`,
            expectedValue: candidates.join(" / "),
          },
        ),
      );
    }
  }

  if (validations.length === 0) {
    validations.push(
      documentValidation(
        evidence,
        "needs_review",
        `${evidence.filename}: demo extractor chưa có đủ field để đối chiếu tự động.`,
        ["document"],
      ),
    );
  }

  return validations;
}
