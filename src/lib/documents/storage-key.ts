const extensionByMimeType: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function safeDocumentStorageSegment(value: string) {
  const segment = value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
  if (!segment) throw new Error("invalid_document_path_segment");
  return segment;
}

export function documentExtension(mimeType: string) {
  const extension = extensionByMimeType[mimeType];
  if (!extension) throw new Error("unsupported_document_type");
  return extension;
}

export function managedDocumentStorageKey({
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
  return [
    safeDocumentStorageSegment(batchId),
    safeDocumentStorageSegment(eventId),
    `${safeDocumentStorageSegment(documentId)}${documentExtension(mimeType)}`,
  ].join("/");
}
