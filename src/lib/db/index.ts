import type { BatchRepository } from "@/lib/db/contracts";
import { createFileBatchRepository } from "@/lib/db/persistent-store";
import { createSupabaseBatchRepository } from "@/lib/db/supabase-repository";

export type DatabaseDriver = "file" | "supabase";

export const DATA_BOUNDARY = {
  productBatch: "off-chain",
  traceEvents: "off-chain",
  rawDocuments: "off-chain-private-storage",
  organizationProfiles: "off-chain",
  aiChecks: "off-chain",
  integrityStatus: "on-chain-mirror",
  solanaProof: "on-chain-source-of-truth",
} as const;

export function resolveDatabaseDriver(
  value = process.env.CHECK_DI_DB_DRIVER,
): DatabaseDriver {
  const driver = value?.trim().toLowerCase() || "file";
  if (driver === "file" || driver === "supabase") return driver;
  throw new Error(`unsupported_database_driver:${driver}`);
}

export function createConfiguredBatchRepository(): BatchRepository {
  const driver = resolveDatabaseDriver();
  if (driver === "supabase") return createSupabaseBatchRepository();
  return createFileBatchRepository();
}

export const batchRepository = createConfiguredBatchRepository();

export type {
  BatchRepository,
  CreateBatchInput,
  CreateDraftTraceEventInput,
  ManagedProductBatch,
} from "@/lib/db/contracts";
