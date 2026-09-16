-- Phase 8A: organization-scoped authorization for authenticated Supabase users.
-- Public consumer verification continues to run through the trusted server adapter.

create or replace function public.check_di_is_org_member(target_organization_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.check_di_organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
  );
$$;

create or replace function public.check_di_has_org_role(
  target_organization_id text,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.check_di_organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function public.check_di_can_read_batch(target_batch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.check_di_batches batch
    where batch.id = target_batch_id
      and (
        (
          batch.created_by_organization_id is not null
          and exists (
            select 1
            from public.check_di_organization_members membership
            where membership.organization_id = batch.created_by_organization_id
              and membership.user_id = auth.uid()
          )
        )
        or exists (
          select 1
          from public.check_di_trace_events event
          join public.check_di_organization_members membership
            on membership.organization_id = event.organization_id
          where event.batch_id = batch.id
            and membership.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.check_di_is_org_member(text) from public;
revoke all on function public.check_di_has_org_role(text, text[]) from public;
revoke all on function public.check_di_can_read_batch(text) from public;
grant execute on function public.check_di_is_org_member(text) to authenticated;
grant execute on function public.check_di_has_org_role(text, text[]) to authenticated;
grant execute on function public.check_di_can_read_batch(text) to authenticated;

drop policy if exists check_di_organizations_member_select on public.check_di_organizations;
create policy check_di_organizations_member_select
on public.check_di_organizations
for select
to authenticated
using (public.check_di_is_org_member(id));

drop policy if exists check_di_organizations_owner_update on public.check_di_organizations;
create policy check_di_organizations_owner_update
on public.check_di_organizations
for update
to authenticated
using (public.check_di_has_org_role(id, array['owner']))
with check (public.check_di_has_org_role(id, array['owner']));

drop policy if exists check_di_members_self_select on public.check_di_organization_members;
create policy check_di_members_self_select
on public.check_di_organization_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.check_di_has_org_role(organization_id, array['owner'])
);

drop policy if exists check_di_members_owner_insert on public.check_di_organization_members;
create policy check_di_members_owner_insert
on public.check_di_organization_members
for insert
to authenticated
with check (public.check_di_has_org_role(organization_id, array['owner']));

drop policy if exists check_di_members_owner_update on public.check_di_organization_members;
create policy check_di_members_owner_update
on public.check_di_organization_members
for update
to authenticated
using (public.check_di_has_org_role(organization_id, array['owner']))
with check (public.check_di_has_org_role(organization_id, array['owner']));

drop policy if exists check_di_members_owner_delete on public.check_di_organization_members;
create policy check_di_members_owner_delete
on public.check_di_organization_members
for delete
to authenticated
using (public.check_di_has_org_role(organization_id, array['owner']));

drop policy if exists check_di_batches_member_select on public.check_di_batches;
create policy check_di_batches_member_select
on public.check_di_batches
for select
to authenticated
using (public.check_di_can_read_batch(id));

drop policy if exists check_di_batches_operator_insert on public.check_di_batches;
create policy check_di_batches_operator_insert
on public.check_di_batches
for insert
to authenticated
with check (
  created_by_organization_id is not null
  and public.check_di_has_org_role(created_by_organization_id, array['owner', 'operator'])
);

drop policy if exists check_di_batches_operator_update on public.check_di_batches;
create policy check_di_batches_operator_update
on public.check_di_batches
for update
to authenticated
using (
  created_by_organization_id is not null
  and public.check_di_has_org_role(created_by_organization_id, array['owner', 'operator'])
)
with check (
  created_by_organization_id is not null
  and public.check_di_has_org_role(created_by_organization_id, array['owner', 'operator'])
);

drop policy if exists check_di_events_member_select on public.check_di_trace_events;
create policy check_di_events_member_select
on public.check_di_trace_events
for select
to authenticated
using (
  public.check_di_is_org_member(organization_id)
  or public.check_di_can_read_batch(batch_id)
);

drop policy if exists check_di_events_operator_insert on public.check_di_trace_events;
create policy check_di_events_operator_insert
on public.check_di_trace_events
for insert
to authenticated
with check (
  public.check_di_has_org_role(organization_id, array['owner', 'operator', 'inspector'])
);

drop policy if exists check_di_events_operator_update on public.check_di_trace_events;
create policy check_di_events_operator_update
on public.check_di_trace_events
for update
to authenticated
using (
  public.check_di_has_org_role(organization_id, array['owner', 'operator', 'inspector'])
)
with check (
  public.check_di_has_org_role(organization_id, array['owner', 'operator', 'inspector'])
);

-- Evidence tables inherit authorization from their parent trace event.
drop policy if exists check_di_documents_event_member_all on public.check_di_documents;
create policy check_di_documents_event_member_all
on public.check_di_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.check_di_trace_events event
    where event.id = check_di_documents.event_id
      and public.check_di_is_org_member(event.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.check_di_trace_events event
    where event.id = check_di_documents.event_id
      and public.check_di_has_org_role(event.organization_id, array['owner', 'operator', 'inspector'])
  )
);

drop policy if exists check_di_extractions_event_member_all on public.check_di_document_extractions;
create policy check_di_extractions_event_member_all
on public.check_di_document_extractions
for all
to authenticated
using (
  exists (
    select 1
    from public.check_di_documents document
    join public.check_di_trace_events event on event.id = document.event_id
    where document.id = check_di_document_extractions.document_id
      and public.check_di_is_org_member(event.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.check_di_documents document
    join public.check_di_trace_events event on event.id = document.event_id
    where document.id = check_di_document_extractions.document_id
      and public.check_di_has_org_role(event.organization_id, array['owner', 'operator', 'inspector'])
  )
);

drop policy if exists check_di_ai_checks_event_member_all on public.check_di_ai_checks;
create policy check_di_ai_checks_event_member_all
on public.check_di_ai_checks
for all
to authenticated
using (
  exists (
    select 1
    from public.check_di_trace_events event
    where event.id = check_di_ai_checks.event_id
      and public.check_di_is_org_member(event.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.check_di_trace_events event
    where event.id = check_di_ai_checks.event_id
      and public.check_di_has_org_role(event.organization_id, array['owner', 'operator', 'inspector'])
  )
);

drop policy if exists check_di_integrity_proofs_member_select on public.check_di_integrity_proofs;
create policy check_di_integrity_proofs_member_select
on public.check_di_integrity_proofs
for select
to authenticated
using (
  exists (
    select 1
    from public.check_di_trace_events event
    where event.id = check_di_integrity_proofs.event_id
      and public.check_di_is_org_member(event.organization_id)
  )
);
