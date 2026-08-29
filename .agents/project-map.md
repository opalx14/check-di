# Check-Di Project Map

## Product architecture

```text
Browser
  -> Next.js App Router
      -> src/lib/ai
      -> src/lib/db
      -> src/lib/solana
           -> check_di_registry (Solana Devnet)
```

## Root

### `src/app`
Next.js App Router của web app Check-Di.

Planned product surfaces:

```text
/
/submit
/issuer
/verify/[id]
/api/...
```

### `src/components`
Reusable UI components. Chưa tách design system riêng ở giai đoạn foundation.

### `src/lib/ai`
AI Evidence Engine.

Responsibilities:

- normalize artifact input;
- map evidence vào rubric;
- trả structured claim/evidence output;
- confidence + `needs_review`;
- không issue credential.

### `src/lib/db`
Off-chain data layer.

PII, raw artifacts, AI output, reviewer notes và consent nằm ở đây hoặc storage tương ứng; không đưa raw data on-chain.

### `src/lib/solana`
Solana integration boundary.

- Devnet config;
- client/provider setup;
- wallet/signing integration;
- transaction helpers;
- `check_di_registry` client.

### `src/types`
Domain contracts dùng chung giữa UI, route handlers, AI, DB và Solana mapping.

### `programs/check_di_registry`
Anchor/Rust program.

Planned state transitions:

```text
issue_attestation
revoke_attestation
supersede_attestation
```

On-chain data tối thiểu:

```text
issuer
subject_commitment
evidence_root
assessment_hash
rubric_hash
issued_at
status
version
```

### `tests`

- `tests/ai`: fixed evidence fixtures và AI evaluation.
- `tests/api`: route/API integration.
- `tests/anchor`: Solana program tests.

### `docs`

- `docs/product`: problem, PRD, market.
- `docs/technical`: architecture, AI evaluation, Devnet proof.
- `docs/competition`: hai track, demo, pitch.
- `docs/compliance`: legal/product boundaries.

## Shared core for two tracks

```text
Technical Build
  -> cùng source code
  -> nhấn mạnh AI implementation + Solana program + Devnet proof

Product & Business
  -> cùng source code
  -> nhấn mạnh problem + workflow + pilot issuer + GTM
```

Không fork product theo track.
