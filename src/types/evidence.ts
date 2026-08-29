export type EvidencePointer = {
  type: "repository_file" | "commit" | "pull_request" | "document" | "demo";
  uri: string;
  reason: string;
};

export type SkillClaim = {
  skill: string;
  status: "pending_human" | "approved" | "needs_review" | "rejected";
  confidence: number;
  evidence: EvidencePointer[];
};
