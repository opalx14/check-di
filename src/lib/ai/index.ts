export const AI_ENGINE_NAME = "Check-Di Document Check";

export type DocumentCheckStatus = "matched" | "warning" | "needs_review";

export type DocumentCheckResult = {
  status: DocumentCheckStatus;
  message: string;
  comparedFields: string[];
};
