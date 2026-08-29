# Check-Di Technical Architecture

## Core flow

```text
Artifacts / Repository
  -> Next.js
  -> AI Evidence Engine
  -> Human Review
  -> Issuer Approval
  -> Solana Devnet Attestation
  -> Public Verify
```

## Web application

Check-Di là một Next.js App Router application duy nhất ở root repository.

```text
src/app
  -> routes / UI / route handlers
src/lib/ai
  -> evidence extraction + rubric mapping
src/lib/db
  -> off-chain persistence
src/lib/solana
  -> Solana client and program integration
programs/check_di_registry
  -> Anchor/Rust on-chain state transitions
```

## AI boundary

AI được phép:

- đọc artifact đã được cung cấp/authorize;
- trích evidence;
- map evidence vào rubric;
- tạo structured draft claims;
- confidence + warning + `needs_review`.

AI không được tự issue attestation.

## Human boundary

Reviewer/issuer có quyền:

```text
Approve
Edit
Reject
Needs more evidence
```

Chỉ sau approval mới chuẩn bị payload để issuer ký.

## Data boundary

### Off-chain

```text
PII
raw artifacts
repository metadata
AI evidence map
reviewer notes
consent
full public credential payload
```

### On-chain

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

## Solana boundary

Network mặc định cho competition: **Devnet**.

Planned program:

```text
programs/check_di_registry
```

Planned instructions:

```text
issue_attestation
revoke_attestation
supersede_attestation
```

Frontend/client layer sẽ ưu tiên Solana Kit (`@solana/kit`) và React bindings (`@solana/react`) khi bắt đầu wallet/on-chain integration.

## Two tracks, one implementation

Technical Build và Product & Business dùng cùng deployment, database, AI workflow và Solana program. Hai track chỉ khác trọng tâm tài liệu và pitch; không fork source code.
