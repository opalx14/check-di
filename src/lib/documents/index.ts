import {
  detectDocumentMimeType,
  documentSha256,
  readManagedDocument,
  saveManagedDocument,
  validateDocumentUpload,
} from "@/lib/documents/storage";
import { createSupabaseDocumentStorage } from "@/lib/documents/supabase-storage";

export type DocumentStorageDriver = "file" | "supabase";

export function resolveDocumentStorageDriver(
  value = process.env.CHECK_DI_DOCUMENT_STORAGE_DRIVER,
): DocumentStorageDriver {
  const driver =
    value?.trim().toLowerCase() ||
    (process.env.CHECK_DI_DB_DRIVER?.trim().toLowerCase() === "supabase"
      ? "supabase"
      : "file");
  if (driver === "file" || driver === "supabase") return driver;
  throw new Error(`unsupported_document_storage_driver:${driver}`);
}

export async function saveConfiguredDocument(input: {
  batchId: string;
  eventId: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
}) {
  if (resolveDocumentStorageDriver() === "supabase") {
    return createSupabaseDocumentStorage().save(input);
  }
  return saveManagedDocument(input);
}

export async function readConfiguredDocumentVerified({
  expectedSha256,
  ...input
}: {
  batchId: string;
  eventId: string;
  documentId: string;
  mimeType: string;
  expectedSha256: string;
}) {
  const bytes =
    resolveDocumentStorageDriver() === "supabase"
      ? await createSupabaseDocumentStorage().read(input)
      : await readManagedDocument(input);

  if (documentSha256(bytes) !== expectedSha256) {
    throw new Error("document_hash_mismatch");
  }
  return bytes;
}

export {
  detectDocumentMimeType,
  documentSha256,
  validateDocumentUpload,
};
