import { notFound } from "next/navigation";

import { BatchManagementClient } from "@/components/BatchManagementClient";
import { batchRepository } from "@/lib/db/persistent-store";
import {
  getDevnetFeePayerStatus,
  getDevnetRegistryProgramStatus,
} from "@/lib/solana/server";

export const dynamic = "force-dynamic";

export default async function BatchManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await batchRepository.getBatchById(id);

  if (!batch) notFound();

  const [feePayerStatus, registryProgramStatus] = await Promise.all([
    getDevnetFeePayerStatus().catch(() => null),
    getDevnetRegistryProgramStatus().catch(() => null),
  ]);

  return (
    <BatchManagementClient
      batch={batch}
      feePayerStatus={feePayerStatus}
      registryProgramStatus={registryProgramStatus}
    />
  );
}
