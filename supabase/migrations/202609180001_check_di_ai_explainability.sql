-- Phase 13E: explainable deterministic AI/data checks.
-- Nullable columns preserve legacy signed-event canonical payloads after hydration.

alter table public.check_di_ai_checks
  add column if not exists severity text
    check (severity in ('LOW', 'MEDIUM', 'HIGH')),
  add column if not exists evidence jsonb;

comment on column public.check_di_ai_checks.severity is
  'Explainability risk level for deterministic Check-Di data checks; nullable for legacy rows.';

comment on column public.check_di_ai_checks.evidence is
  'Structured source field / extracted value / expected value evidence; nullable for legacy rows.';
