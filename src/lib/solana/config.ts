export const SOLANA_NETWORK =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export const CHECK_DI_PROGRAM_NAME = "check_di_registry";

export const ON_CHAIN_FIELDS = [
  "issuer",
  "subject_commitment",
  "evidence_root",
  "assessment_hash",
  "rubric_hash",
  "issued_at",
  "status",
  "version",
] as const;
