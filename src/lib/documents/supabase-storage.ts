import { randomUUID } from "node:crypto";

import { documentSha256, validateDocumentUpload } from "@/lib/documents/storage";
import { managedDocumentStorageKey } from "@/lib/documents/storage-key";

type FetchLike = typeof fetch;

type SupabaseDocumentStorageOptions = {
  url?: string;
  serviceRoleKey?: string;
  bucket?: string;
  fetchImpl?: FetchLike;
};

function required(value: string | undefined, error: string) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(error);
  return normalized.replace(/\/+$/, "");
}

function encodedStoragePath(bucket: string, key: string) {
  return [bucket, ...key.split("/")]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function createSupabaseDocumentStorage(
  options: SupabaseDocumentStorageOptions = {},
) {
  const url = required(
    options.url ?? process.env.CHECK_DI_SUPABASE_URL,
    "supabase_url_missing",
  );
  const serviceRoleKey = required(
    options.serviceRoleKey ?? process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY,
    "supabase_service_role_key_missing",
  );
  const bucket =
    options.bucket?.trim() ||
    process.env.CHECK_DI_SUPABASE_DOCUMENT_BUCKET?.trim() ||
    "check-di-documents";
  const fetchImpl = options.fetchImpl ?? fetch;

  async function storageRequest(
    key: string,
    init: RequestInit,
  ) {
    const target = `${url}/storage/v1/object/${encodedStoragePath(bucket, key)}`;
    const response = await fetchImpl(target, {
      ...init,
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      let message = `supabase_storage_http_${response.status}`;
      try {
        const payload = (await response.json()) as {
          error?: string;
          message?: string;
        };
        message = payload.message || payload.error || message;
      } catch {
        // Keep a stable error when Supabase returns a non-JSON body.
      }
      throw new Error(message);
    }

    return response;
  }

  return {
    backend: "supabase" as const,
    bucket,

    async save({
      batchId,
      eventId,
      filename,
      mimeType,
      bytes,
    }: {
      batchId: string;
      eventId: string;
      filename: string;
      mimeType: string;
      bytes: Uint8Array;
    }) {
      validateDocumentUpload({ filename, mimeType, sizeBytes: bytes.byteLength });
      const id = `doc-${randomUUID()}`;
      const key = managedDocumentStorageKey({
        batchId,
        eventId,
        documentId: id,
        mimeType,
      });

      await storageRequest(key, {
        method: "POST",
        headers: {
          "content-type": mimeType,
          "x-upsert": "false",
        },
        body: Buffer.from(bytes),
      });

      return {
        id,
        storageBackend: "supabase" as const,
        storagePath: key,
        sha256: documentSha256(bytes),
      };
    },

    async read({
      batchId,
      eventId,
      documentId,
      mimeType,
    }: {
      batchId: string;
      eventId: string;
      documentId: string;
      mimeType: string;
    }) {
      const key = managedDocumentStorageKey({
        batchId,
        eventId,
        documentId,
        mimeType,
      });
      const response = await storageRequest(key, { method: "GET" });
      return Buffer.from(await response.arrayBuffer());
    },
  };
}
