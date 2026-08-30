export type TraceEventStatus = "draft" | "confirmed" | "revoked" | "superseded";

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
  metrics?: Record<string, string | number | boolean>;
  aiValidations?: AIValidation[];
  previousEventHash?: string;
  eventHash?: string;
  signerPublicKey?: string;
  signature?: string;
  status: TraceEventStatus;
};

export type AIValidation = {
  status: "matched" | "warning" | "needs_review";
  message: string;
  fields: string[];
};

export type ProductBatch = {
  id: string;
  publicId: string;
  productName: string;
  origin: string;
  events: TraceEvent[];
};
