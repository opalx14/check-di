-- Phase 8A hotfix: remove recursive RLS dependency between batches and trace events.
-- Both policies now delegate membership resolution to one SECURITY DEFINER helper,
-- so policy evaluation does not recursively invoke the sibling table policy.

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

revoke all on function public.check_di_can_read_batch(text) from public;
grant execute on function public.check_di_can_read_batch(text) to authenticated;

drop policy if exists check_di_batches_member_select on public.check_di_batches;
create policy check_di_batches_member_select
on public.check_di_batches
for select
to authenticated
using (public.check_di_can_read_batch(id));

drop policy if exists check_di_events_member_select on public.check_di_trace_events;
create policy check_di_events_member_select
on public.check_di_trace_events
for select
to authenticated
using (
  public.check_di_is_org_member(organization_id)
  or public.check_di_can_read_batch(batch_id)
);
