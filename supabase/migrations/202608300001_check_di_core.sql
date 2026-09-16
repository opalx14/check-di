create extension if not exists pgcrypto;

create table if not exists public.check_di_organizations (
  id text primary key,
  name text not null,
  slug text not null unique,
  type text not null default 'participant',
  wallet_public_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.check_di_organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.check_di_organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'operator', 'inspector', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.check_di_batches (
  id text primary key,
  public_id text not null unique,
  product_name text not null,
  origin text not null,
  created_by_organization_id text references public.check_di_organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(public_id) >= 4)
);

create table if not exists public.check_di_trace_events (
  id text primary key,
  batch_id text not null references public.check_di_batches(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  stage text not null check (stage in ('production', 'packing', 'inspection', 'logistics', 'retail')),
  organization_id text not null references public.check_di_organizations(id) on delete restrict,
  organization_name_snapshot text not null,
  location text not null,
  occurred_at timestamptz not null,
  summary text not null,
  documents jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'revoked', 'superseded')),
  previous_event_hash text,
  event_hash text,
  signer_public_key text,
  signature text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (batch_id, sequence_no),
  check (
    status = 'draft'
    or (
      previous_event_hash is not null
      and event_hash is not null
      and signer_public_key is not null
      and signature is not null
      and confirmed_at is not null
    )
  )
);

create unique index if not exists check_di_trace_events_one_draft_per_batch_idx
  on public.check_di_trace_events(batch_id)
  where status = 'draft';

create index if not exists check_di_trace_events_batch_sequence_idx
  on public.check_di_trace_events(batch_id, sequence_no);

create index if not exists check_di_trace_events_event_hash_idx
  on public.check_di_trace_events(event_hash)
  where event_hash is not null;

create table if not exists public.check_di_documents (
  id text primary key,
  event_id text not null references public.check_di_trace_events(id) on delete cascade,
  filename text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_backend text not null default 'local',
  storage_path text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists check_di_documents_event_idx
  on public.check_di_documents(event_id);
create index if not exists check_di_documents_sha256_idx
  on public.check_di_documents(sha256);

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    values (
      'check-di-documents',
      'check-di-documents',
      false,
      10485760,
      array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    )
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

create table if not exists public.check_di_document_extractions (
  document_id text primary key references public.check_di_documents(id) on delete cascade,
  provider text not null,
  model text not null,
  is_simulated boolean not null default true,
  status text not null,
  confidence numeric(5, 4),
  extraction jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create table if not exists public.check_di_ai_checks (
  id text primary key,
  event_id text not null references public.check_di_trace_events(id) on delete cascade,
  document_id text references public.check_di_documents(id) on delete cascade,
  status text not null check (status in ('matched', 'warning', 'needs_review')),
  message text not null,
  fields text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists check_di_ai_checks_event_idx
  on public.check_di_ai_checks(event_id);
create index if not exists check_di_ai_checks_document_idx
  on public.check_di_ai_checks(document_id)
  where document_id is not null;

create table if not exists public.check_di_integrity_proofs (
  id text primary key,
  event_id text not null unique references public.check_di_trace_events(id) on delete cascade,
  network text not null check (network in ('devnet')),
  kind text not null check (kind in ('check-di-registry', 'spl-memo')),
  program_id text not null,
  status text not null check (status in ('confirmed', 'failed')),
  transaction_signature text,
  slot bigint,
  payer_public_key text,
  organization_public_key text,
  registry_address text,
  event_pda text,
  memo text,
  explorer_url text,
  registry_explorer_url text,
  event_explorer_url text,
  anchored_at timestamptz,
  attempted_at timestamptz not null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists check_di_integrity_proofs_transaction_idx
  on public.check_di_integrity_proofs(transaction_signature)
  where transaction_signature is not null;

create or replace function public.check_di_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.check_di_guard_batch_identity()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.check_di_trace_events e
    where e.batch_id = old.id and e.status <> 'draft'
  ) and (
    new.public_id is distinct from old.public_id
    or new.product_name is distinct from old.product_name
    or new.origin is distinct from old.origin
  ) then
    raise exception 'confirmed_batch_identity_immutable';
  end if;
  return new;
end;
$$;

create or replace function public.check_di_guard_confirmed_event()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' and (
    new.batch_id is distinct from old.batch_id
    or new.sequence_no is distinct from old.sequence_no
    or new.stage is distinct from old.stage
    or new.organization_id is distinct from old.organization_id
    or new.organization_name_snapshot is distinct from old.organization_name_snapshot
    or new.location is distinct from old.location
    or new.occurred_at is distinct from old.occurred_at
    or new.summary is distinct from old.summary
    or new.documents is distinct from old.documents
    or new.metrics is distinct from old.metrics
    or new.previous_event_hash is distinct from old.previous_event_hash
    or new.event_hash is distinct from old.event_hash
    or new.signer_public_key is distinct from old.signer_public_key
    or new.signature is distinct from old.signature
    or new.confirmed_at is distinct from old.confirmed_at
  ) then
    raise exception 'confirmed_event_payload_immutable';
  end if;

  if old.status = 'confirmed' and new.status not in ('confirmed', 'revoked', 'superseded') then
    raise exception 'invalid_confirmed_event_status_transition';
  end if;

  if old.status in ('revoked', 'superseded') and new.status is distinct from old.status then
    raise exception 'terminal_event_status_immutable';
  end if;

  return new;
end;
$$;

create or replace function public.check_di_assert_event_draft(p_event_id text)
returns void
language plpgsql
as $$
declare
  event_status text;
begin
  select status
  into event_status
  from public.check_di_trace_events
  where id = p_event_id;

  if event_status is null then
    raise exception 'event_not_found';
  end if;
  if event_status <> 'draft' then
    raise exception 'event_not_draft';
  end if;
end;
$$;

create or replace function public.check_di_guard_document_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.check_di_assert_event_draft(old.event_id);
    return old;
  end if;

  perform public.check_di_assert_event_draft(new.event_id);
  return new;
end;
$$;

create or replace function public.check_di_guard_extraction_mutation()
returns trigger
language plpgsql
as $$
declare
  target_document_id text;
  target_event_id text;
begin
  if tg_op = 'DELETE' then
    target_document_id := old.document_id;
  else
    target_document_id := new.document_id;
  end if;

  select event_id
  into target_event_id
  from public.check_di_documents
  where id = target_document_id;

  if target_event_id is not null then
    perform public.check_di_assert_event_draft(target_event_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.check_di_guard_ai_check_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.check_di_trace_events where id = old.event_id) then
      perform public.check_di_assert_event_draft(old.event_id);
    end if;
    return old;
  end if;

  perform public.check_di_assert_event_draft(new.event_id);
  return new;
end;
$$;

drop trigger if exists check_di_organizations_touch_updated_at on public.check_di_organizations;
create trigger check_di_organizations_touch_updated_at
before update on public.check_di_organizations
for each row execute function public.check_di_touch_updated_at();

drop trigger if exists check_di_batches_touch_updated_at on public.check_di_batches;
create trigger check_di_batches_touch_updated_at
before update on public.check_di_batches
for each row execute function public.check_di_touch_updated_at();

drop trigger if exists check_di_document_extractions_touch_updated_at on public.check_di_document_extractions;
create trigger check_di_document_extractions_touch_updated_at
before update on public.check_di_document_extractions
for each row execute function public.check_di_touch_updated_at();

drop trigger if exists check_di_integrity_proofs_touch_updated_at on public.check_di_integrity_proofs;
create trigger check_di_integrity_proofs_touch_updated_at
before update on public.check_di_integrity_proofs
for each row execute function public.check_di_touch_updated_at();

drop trigger if exists check_di_batches_guard_identity on public.check_di_batches;
create trigger check_di_batches_guard_identity
before update on public.check_di_batches
for each row execute function public.check_di_guard_batch_identity();

drop trigger if exists check_di_trace_events_guard_confirmed_payload on public.check_di_trace_events;
create trigger check_di_trace_events_guard_confirmed_payload
before update on public.check_di_trace_events
for each row execute function public.check_di_guard_confirmed_event();

drop trigger if exists check_di_documents_guard_draft on public.check_di_documents;
create trigger check_di_documents_guard_draft
before insert or update or delete on public.check_di_documents
for each row execute function public.check_di_guard_document_mutation();

drop trigger if exists check_di_document_extractions_guard_draft on public.check_di_document_extractions;
create trigger check_di_document_extractions_guard_draft
before insert or update or delete on public.check_di_document_extractions
for each row execute function public.check_di_guard_extraction_mutation();

drop trigger if exists check_di_ai_checks_guard_draft on public.check_di_ai_checks;
create trigger check_di_ai_checks_guard_draft
before insert or update or delete on public.check_di_ai_checks
for each row execute function public.check_di_guard_ai_check_mutation();

alter table public.check_di_organizations enable row level security;
alter table public.check_di_organization_members enable row level security;
alter table public.check_di_batches enable row level security;
alter table public.check_di_trace_events enable row level security;
alter table public.check_di_documents enable row level security;
alter table public.check_di_document_extractions enable row level security;
alter table public.check_di_ai_checks enable row level security;
alter table public.check_di_integrity_proofs enable row level security;

comment on table public.check_di_batches is 'Check-Di off-chain product batch business data. Solana remains the integrity/status proof layer.';
comment on table public.check_di_trace_events is 'Check-Di supply-chain events. Confirmed event payload fields are immutable; corrections use revoke/supersede plus a new event.';
comment on table public.check_di_documents is 'Check-Di private off-chain document metadata only; raw bytes belong in private storage, never on Solana.';
comment on table public.check_di_integrity_proofs is 'Check-Di mirror/index of Solana Devnet proof metadata for fast application reads; live RPC remains the proof source of truth.';
