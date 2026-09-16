import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  MAX_DOCUMENT_BYTES,
  SUPPORTED_DOCUMENT_MIME_TYPES,
} from "@/lib/ai/document-extraction";
import { managedDocumentStorageKey } from "@/lib/documents/storage-key";

const DEFAULT_DOCUMENT_ROOT = join(process.cwd(), ".data", "documents");

export function validateDocumentUpload({
  filename,
  mimeType,
  sizeBytes,
}: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}) {
  if (!filename.trim()) throw new Error("document_filename_missing");
  if (!SUPPORTED_DOCUMENT_MIME_TYPES.includes(mimeType as never)) {
    throw new Error("unsupported_document_type");
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("document_empty");
  }
  if (sizeBytes > MAX_DOCUMENT_BYTES) {
    throw new Error("document_too_large");
  }
}

export function detectDocumentMimeType(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function documentSha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function documentPath({
  batchId,
  eventId,
  documentId,
  mimeType,
  rootDir,
}: {
  batchId: string;
  eventId: string;
  documentId: string;
  mimeType: string;
  rootDir: string;
}) {
  const key = managedDocumentStorageKey({
    batchId,
    eventId,
    documentId,
    mimeType,
  });
  return join(/* turbopackIgnore: true */ rootDir, ...key.split("/"));
}

export async function readManagedDocument({
  batchId,
  eventId,
  documentId,
  mimeType,
  rootDir = process.env.CHECK_DI_DOCUMENT_ROOT || DEFAULT_DOCUMENT_ROOT,
}: {
  batchId: string;
  eventId: string;
  documentId: string;
  mimeType: string;
  rootDir?: string;
}) {
  return readFile(
    documentPath({ batchId, eventId, documentId, mimeType, rootDir }),
  );
}

export async function readManagedDocumentVerified({
  expectedSha256,
  ...input
}: Parameters<typeof readManagedDocument>[0] & { expectedSha256: string }) {
  const bytes = await readManagedDocument(input);
  if (documentSha256(bytes) !== expectedSha256) {
    throw new Error("document_hash_mismatch");
  }
  return bytes;
}

export async function saveManagedDocument({
  batchId,
  eventId,
  filename,
  mimeType,
  bytes,
  rootDir = process.env.CHECK_DI_DOCUMENT_ROOT || DEFAULT_DOCUMENT_ROOT,
}: {
  batchId: string;
  eventId: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  rootDir?: string;
}) {
  validateDocumentUpload({ filename, mimeType, sizeBytes: bytes.byteLength });

  const id = `doc-${randomUUID()}`;
  const storagePath = managedDocumentStorageKey({
    batchId,
    eventId,
    documentId: id,
    mimeType,
  });
  const directory = join(
    /* turbopackIgnore: true */ rootDir,
    ...storagePath.split("/").slice(0, -1),
  );
  const filePath = documentPath({
    batchId,
    eventId,
    documentId: id,
    mimeType,
    rootDir,
  });

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, bytes, { mode: 0o600 });

  return {
    id,
    filePath,
    storageBackend: "file" as const,
    storagePath,
    sha256: documentSha256(bytes),
  };
}
