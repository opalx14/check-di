# Check-Di — Submission & Judge Demo Playbook

## 1. One-sentence pitch

**Check-Di lets supply-chain participants sign trace events, keeps business evidence off-chain, and anchors minimal integrity/status proof to a custom Solana Devnet registry so consumers and auditors can verify both the journey and whether the signed history was later revoked or superseded.**

## 2. Why one product can enter two tracks

Check-Di does not maintain two separate applications or two separate databases. It uses one operational PostgreSQL/Supabase source of truth and exposes two logical lanes over the same event IDs/hashes.

### Product & Business lane

Answers: **What happened, where, by which organization, with which evidence, and what did the AI checks flag?**

Core data:

- `check_di_organizations`
- `check_di_organization_members`
- `check_di_batches`
- `check_di_trace_events`
- `check_di_documents`
- `check_di_document_extractions`
- `check_di_ai_checks`
- projection: `check_di_business_track_v`

### Technical / Blockchain lane

Answers: **Was the signed event changed, who signed it, what is the previous-hash link, and which Solana PDA/status proves the integrity record?**

Core data:

- `previous_event_hash`
- `event_hash`
- `signer_public_key`
- `signature`
- `check_di_integrity_proofs`
- projection: `check_di_blockchain_track_v`
- custom Solana program: `check_di_registry`

The two lanes meet on `batch_id`, `event_id`, and `event_hash`.

## 3. Judge entry point

Start at:

```text
/judge
```

The page exposes both track paths and a live sample summary.

Recommended sample batch:

```text
DUR-260830-01
```

Consumer verification:

```text
/verify/DUR-260830-01
```

## 4. Three-minute demo sequence

### 0:00–0:45 — Business value

Open `/judge`, choose Product & Business Track, then open `/verify/DUR-260830-01`.

Show:

1. product origin and journey;
2. organization/location/timestamp by trace event;
3. document SHA-256 + deterministic demo extraction;
4. AI warnings are advisory, not automatic truth claims;
5. consumer can inspect proof without receiving raw private documents.

Message for judges:

> Supabase/PostgreSQL is the business source of truth. Raw evidence and PII stay off-chain. Each participant is responsible for the event it signs.

### 0:45–1:45 — Integrity model

Open a finalized event and show:

```text
canonical payload
  + previousEventHash
  -> SHA-256 eventHash
  -> organization Ed25519 signature
```

Explain:

- first event uses `GENESIS`;
- later events reference the previous finalized event hash;
- `revoked` and `superseded` events remain in the hash history;
- a correction creates a new event instead of overwriting history.

### 1:45–2:30 — Phantom + Solana

For authenticated organization flow:

```text
/login
  -> /organization/wallet
  -> Phantom signMessage ownership challenge
  -> create/confirm event
  -> Phantom signs eventHash
  -> server fee-payer + Phantom sign append_event transaction
  -> Event PDA on Devnet
```

Custom Devnet program:

```text
9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi
```

The server validates the prepared transaction before relay:

- fee payer;
- custom program ID;
- Batch/Event PDA;
- account ordering/roles;
- instruction payload;
- organization public key;
- required signatures.

### 2:30–3:00 — Lifecycle proof

Show `Revoke event` / `Supersede event` on management UI.

Lifecycle order:

```text
Solana set_event_status
  -> read Event PDA live
  -> verify target lifecycle status
  -> update PostgreSQL mirror
```

If Solana fails, the business DB is not allowed to claim the lifecycle transition succeeded.

A retry is idempotent: if the PDA already has the target terminal status, the app verifies it and repairs only the DB mirror.

## 5. Live technical evidence

### Phantom-style dual-signer Devnet smoke

Command:

```bash
bun run phantom:smoke
```

Known proof:

- transaction: `3Bz8yG73LLSXtaBVnxJgKdifxYYgMjw4QebtKByb5uFCZaToE5RUkc6QuWBkMSGe9mEdbPmHjh8Z8opsM75SvvyF`
- organization signer: `9wmHde6rMkzas3sXBeZL5hC71dHgvRnZ7Vcp9omQQPwn`
- Batch Registry: `jsSKfDjJRRhLvMS4VAM5km1UTmzH93ynaK1RLGkJowL`
- Event PDA: `HhrKqvtgdcMypHjYdmqTf96gUKtjH3oa7vCyVr9tnQxU`

Reruns reuse the same deterministic smoke proof rather than creating unnecessary Devnet accounts.

### Lifecycle Devnet smoke

Command:

```bash
bun run lifecycle:smoke
```

Known proof:

- lifecycle transaction: `3Ggs3CX7Q1pFmp3QRydKTiGbBbncNEn5HdGdswhcDPcini5ZZLyWnFTrUdw1DUx2FQawLMf5Diu4sEmwaN25J46u`
- Event PDA: `4acfK8xsitA6tjzdSK4yX2zFX3qhgwwr7MVPPwWzbzux`
- transition tested: `active -> revoked`

Verifier checks:

- authority;
- batch hash;
- registry link;
- event authority;
- organization signer;
- event hash;
- previous event hash;
- organization hash;
- lifecycle status.

## 6. Database readiness commands

```bash
bun run db:doctor
bun run db:track-doctor
bun run auth:smoke
```

`db:track-doctor` checks both logical track projections on remote Supabase.

Remote Phase 8 migrations already applied:

- `202608310001_check_di_organization_rls.sql`
- `202608310002_check_di_track_lanes.sql`
- `202608310003_check_di_rls_recursion_fix.sql`

The shared `COIN14` project contains unrelated older migrations, so Check-Di intentionally uses direct file queries for its own migrations instead of rewriting shared migration history.

## 7. Stable demo owner provisioning

Provisioning is intentionally credential-driven and does not hard-code a password in Git.

Set, outside Git:

```text
CHECK_DI_DEMO_OWNER_EMAIL
CHECK_DI_DEMO_OWNER_PASSWORD
```

Optional organization overrides:

```text
CHECK_DI_DEMO_ORGANIZATION_ID
CHECK_DI_DEMO_ORGANIZATION_NAME
CHECK_DI_DEMO_ORGANIZATION_SLUG
```

Then run:

```bash
bun run auth:demo:provision
```

The command:

1. creates or updates the Supabase Auth user;
2. confirms email for the hackathon demo user;
3. upserts the Check-Di organization;
4. upserts owner membership;
5. verifies password login;
6. never prints the password.

Only after the target environment has a known demo owner should management be switched from:

```text
CHECK_DI_AUTH_MODE=optional
```

to:

```text
CHECK_DI_AUTH_MODE=required
```

## 8. What the AI claim is — and is not

Current hackathon extraction is deterministic and explicitly labeled `DEMO EXTRACTION`.

It demonstrates the product flow:

```text
document metadata
  -> structured extraction fixture
  -> cross-check against batch/event data
  -> matched / warning / needs_review
```

It does **not** claim that an LLM/OCR provider has independently verified real-world truth.

This separation is intentional: AI assists data review; the organization remains responsible for signing the trace event.

## 9. Compliance / scope boundaries

Check-Di currently does not include:

- token issuance;
- NFT issuance;
- crypto payments;
- custody;
- a trading marketplace;
- raw documents or PII on-chain.

Solana contains only minimal integrity/status proof needed for verifiability.

## 10. Final pre-submission gate

Run:

```bash
bun test
bun run typecheck
bun run build
bun run db:doctor
bun run db:track-doctor
bun run phantom:smoke
bun run lifecycle:smoke
git diff --check
```

Expected current baseline:

```text
31 tests passed
0 failed
113 assertions
```

Then manually check:

- `/judge` loads;
- `/verify/DUR-260830-01` loads;
- program Explorer link opens;
- QR route works;
- if a persistent demo owner has been provisioned: login → Phantom link → event confirm → Registry signing;
- lifecycle buttons remain visible only for confirmed Registry-backed events.

## 11. Submission framing

### Product & Business Track framing

> Check-Di creates an accountable digital chain of custody for products. Each participant records only the data it owns, evidence remains private/off-chain, AI flags inconsistencies, and the consumer gets a QR journey that preserves corrections instead of silently rewriting history.

### Technical / Blockchain Track framing

> Check-Di uses canonical SHA-256 event hashing, Ed25519 organization signatures, a previous-hash chain, and a custom Solana Devnet registry with Batch/Event PDAs. Phantom supplies the organization identity, while on-chain lifecycle status makes revoked or superseded records independently verifiable.

### Key architectural sentence

> **The business database says what happened; the blockchain proof says whether the signed record and its lifecycle status still match what was committed.**
