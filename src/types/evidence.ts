export type TraceEventStatus = "draft" | "confirmed" | "revoked" | "superseded";

export type TraceEvent = {
  id: string;
  batchId: string;
  stage: "production" | "packing" | "inspection" | "logistics" | "retail";
  organizationName: string;
  location: string;
  occurredAt: string;
  summary: string;
  eventHash?: string;
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
