import { notFound } from "next/navigation";

import { BatchManagementClient } from "@/components/BatchManagementClient";
import { batchRepository } from "@/lib/db/persistent-store";

export const dynamic = "force-dynamic";

export default async function BatchManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await batchRepository.getBatchById(id);

  if (!batch) notFound();

  return <BatchManagementClient batch={batch} />;
}
