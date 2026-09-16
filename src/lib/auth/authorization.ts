import {
  CheckDiAuthError,
  organizationActorCanAccessBatch,
  organizationActorCanManageEvent,
  resolveCheckDiOrganizationActor,
  type CheckDiOrganizationRole,
} from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";

export async function authorizeManagedBatchRequest(
  request: Request,
  batchId: string,
  allowedRoles: readonly CheckDiOrganizationRole[],
) {
  const actor = await resolveCheckDiOrganizationActor(request, allowedRoles);
  const batch = await batchRepository.getBatchById(batchId);
  if (!batch) throw new Error("batch_not_found");

  if (actor.context && !organizationActorCanAccessBatch(actor, batch)) {
    throw new CheckDiAuthError("organization_forbidden", 403);
  }

  return { actor, batch };
}

export async function authorizeManagedEventRequest(
  request: Request,
  batchId: string,
  eventId: string,
  allowedRoles: readonly CheckDiOrganizationRole[],
) {
  const { actor, batch } = await authorizeManagedBatchRequest(
    request,
    batchId,
    allowedRoles,
  );
  const event = batch.events.find((item) => item.id === eventId);
  if (!event) throw new Error("event_not_found");

  if (actor.context && !organizationActorCanManageEvent(actor, event)) {
    throw new CheckDiAuthError("organization_forbidden", 403);
  }

  return { actor, batch, event };
}
