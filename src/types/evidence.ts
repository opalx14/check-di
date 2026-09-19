export type TraceEventStatus = "draft" | "confirmed" | "revoked" | "superseded";

export type DocumentExtractionStatus = "completed";

export type DocumentExtraction = {
  status: DocumentExtractionStatus;
  provider: "demo";
  model: "deterministic-v1";
  simulated: true;
  documentType?: string;
  batchId?: string;
  documentNumber?: string;
  issueDate?: string;
  quantity?: number;
  unit?: string;
  origin?: string;
  destination?: string;
  organizationName?: string;
  confidence?: number;
  notes?: string[];
  privacy?: {
    redactionMode: "deterministic-v1";
    applied: true;
    redactedCategories: Array<"cccd" | "phone" | "bank_account" | "personal_address">;
  };
  error?: string;
};

export type DocumentEvidence = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
  extraction: DocumentExtraction;
};

export type SolanaIntegrityProof = {
  network: "devnet";
  kind: "check-di-registry" | "spl-memo";
  programId: string;
  status: "confirmed" | "failed";
  transactionSignature?: string;
  slot?: number;
  payerPublicKey?: string;
  organizationPublicKey?: string;
  registryAddress?: string;
  eventPda?: string;
  memo?: string;
  explorerUrl?: string;
  registryExplorerUrl?: string;
  eventExplorerUrl?: string;
  anchoredAt?: string;
  attemptedAt: string;
  error?: string;
};

export type TraceEvent = {
  id: string;
  batchId: string;
  stage: "production" | "packing" | "inspection" | "logistics" | "retail";
  organizationId: string;
  organizationName: string;
  location: string;
  occurredAt: string;
  summary: string;
  documents?: string[];
  documentEvidence?: DocumentEvidence[];
  metrics?: Record<string, string | number | boolean>;
  aiValidations?: AIValidation[];
  previousEventHash?: string;
  eventHash?: string;
  signerPublicKey?: string;
  signature?: string;
  solanaProof?: SolanaIntegrityProof;
  status: TraceEventStatus;
};

export type AIValidationSeverity = "LOW" | "MEDIUM" | "HIGH";

export type AIValidationEvidence = {
  sourceField: string;
  sourceText?: string;
  extractedValue?: string | number | boolean;
  expectedValue?: string | number | boolean;
};

export type AIValidation = {
  status: "matched" | "warning" | "needs_review";
  message: string;
  fields: string[];
  sourceDocumentId?: string;
  severity?: AIValidationSeverity;
  evidence?: AIValidationEvidence;
};

export type ProductBatch = {
  id: string;
  publicId: string;
  productName: string;
  origin: string;
  events: TraceEvent[];
};
