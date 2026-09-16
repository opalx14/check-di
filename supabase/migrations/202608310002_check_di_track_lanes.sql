-- Check-Di two-track data lanes
--
-- One Supabase/PostgreSQL database remains the operational source of truth.
-- These security-invoker views expose two clear competition-facing lanes:
--   1) Product & Business: supply-chain operations, evidence and AI checks.
--   2) Technical / Blockchain: hashes, signatures and Solana integrity proof metadata.
--
-- The lanes join on batch_id / event_id / event_hash; they are not separate databases.

create or replace view public.check_di_business_track_v
with (security_invoker = true)
as
select
  b.id as batch_id,
  b.public_id,
  b.product_name,
  b.origin,
  b.created_by_organization_id,
  e.id as event_id,
  e.sequence_no,
  e.stage,
  e.organization_id,
  e.organization_name_snapshot,
  e.location,
  e.occurred_at,
  e.summary,
  e.documents,
  e.metrics,
  e.status as event_status,
  e.created_at as event_created_at,
  e.confirmed_at,
  coalesce(doc_stats.document_count, 0) as document_count,
  coalesce(ai_stats.ai_check_count, 0) as ai_check_count,
  coalesce(ai_stats.warning_count, 0) as ai_warning_count,
  coalesce(ai_stats.needs_review_count, 0) as ai_needs_review_count
from public.check_di_batches b
join public.check_di_trace_events e
  on e.batch_id = b.id
left join lateral (
  select count(*)::integer as document_count
  from public.check_di_documents d
  where d.event_id = e.id
) doc_stats on true
left join lateral (
  select
    count(*)::integer as ai_check_count,
    count(*) filter (where a.status = 'warning')::integer as warning_count,
    count(*) filter (where a.status = 'needs_review')::integer as needs_review_count
  from public.check_di_ai_checks a
  where a.event_id = e.id
) ai_stats on true;

comment on view public.check_di_business_track_v is
  'Product & Business Track projection: batch journey, participant, business payload, evidence counts and AI review status. No Solana proof fields are required to understand the business workflow.';

create or replace view public.check_di_blockchain_track_v
with (security_invoker = true)
as
select
  b.id as batch_id,
  b.public_id,
  e.id as event_id,
  e.sequence_no,
  e.stage,
  e.organization_id,
  e.status as event_status,
  e.previous_event_hash,
  e.event_hash,
  e.signer_public_key,
  e.signature,
  e.confirmed_at,
  p.network,
  p.kind as proof_kind,
  p.program_id,
  p.status as proof_status,
  p.transaction_signature,
  p.slot,
  p.payer_public_key,
  p.organization_public_key,
  p.registry_address,
  p.event_pda,
  p.anchored_at,
  p.attempted_at,
  p.error as proof_error
from public.check_di_batches b
join public.check_di_trace_events e
  on e.batch_id = b.id
left join public.check_di_integrity_proofs p
  on p.event_id = e.id
where e.status <> 'draft';

comment on view public.check_di_blockchain_track_v is
  'Technical / Blockchain Track projection: immutable event hash chain, organization signature and Solana Devnet registry/PDA proof metadata. Business payload remains off-chain in the business lane.';

grant select on public.check_di_business_track_v to authenticated;
grant select on public.check_di_blockchain_track_v to authenticated;
