import { describe, expect, test } from "bun:test";

import { documentSha256 } from "@/lib/documents/storage";
import { managedDocumentStorageKey } from "@/lib/documents/storage-key";
import { createSupabaseDocumentStorage } from "@/lib/documents/supabase-storage";

describe("Check-Di Supabase document storage", () => {
  test("builds a deterministic private object key", () => {
    expect(
      managedDocumentStorageKey({
        batchId: "batch-demo/../unsafe",
        eventId: "evt-demo",
        documentId: "doc-demo",
        mimeType: "application/pdf",
      }),
    ).toBe("batch-demo-unsafe/evt-demo/doc-demo.pdf");
  });

  test("uploads and reads document bytes through the private Storage API", async () => {
    const bytes = Buffer.from("%PDF-1.7\nCheck-Di Supabase storage", "utf8");
    const calls: Array<{ url: string; method: string; body?: Buffer }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({
        url,
        method,
        body: init?.body ? Buffer.from(init.body as ArrayBuffer) : undefined,
      });

      if (method === "POST") {
        return new Response(JSON.stringify({ Key: "stored" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(bytes, { status: 200 });
    }) as typeof fetch;

    const storage = createSupabaseDocumentStorage({
      url: "https://project.supabase.co",
      serviceRoleKey: "service-role-test",
      bucket: "check-di-documents",
      fetchImpl,
    });

    const saved = await storage.save({
      batchId: "batch-test",
      eventId: "event-test",
      filename: "evidence.pdf",
      mimeType: "application/pdf",
      bytes,
    });
    const reloaded = await storage.read({
      batchId: "batch-test",
      eventId: "event-test",
      documentId: saved.id,
      mimeType: "application/pdf",
    });

    expect(saved.storageBackend).toBe("supabase");
    expect(saved.storagePath).toBe(`batch-test/event-test/${saved.id}.pdf`);
    expect(saved.sha256).toBe(documentSha256(bytes));
    expect(reloaded.equals(bytes)).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toContain(
      `/storage/v1/object/check-di-documents/batch-test/event-test/${saved.id}.pdf`,
    );
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.body?.equals(bytes)).toBe(true);
    expect(calls[1]?.method).toBe("GET");
  });
});
