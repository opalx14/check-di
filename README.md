# Check-Di

**Check đi — đừng chỉ tin vào claim.**

Check-Di là một web app biến project artifacts thành skill claims có evidence, được AI hỗ trợ phân tích, con người phê duyệt và có integrity/status proof qua Solana.

## Competition strategy

Check-Di dùng **một core duy nhất** cho hai track UniHackFest 2026:

- **Technical Build:** AI evidence engine, Solana program, Devnet proof, technical execution.
- **Product & Business:** user problem, issuer workflow, pilot, GTM và business model.

Không có hai app riêng theo track.

## Core flow

```text
Repository / artifacts
  -> Check-Di Evidence Engine
  -> Human reviewer
  -> Issuer approval
  -> Solana attestation
  -> Public verifier
```

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Bun
- Solana Devnet
- `@solana/kit` + `@solana/react` khi triển khai wallet/client
- Anchor/Rust cho `check_di_registry`
- PostgreSQL/Supabase-compatible persistence khi bắt đầu data layer

## Project structure

```text
check-di/
├── src/
│   ├── app/                 # Next.js routes, UI and APIs
│   ├── components/          # reusable UI
│   ├── lib/
│   │   ├── ai/              # Evidence Engine
│   │   ├── db/              # off-chain data layer
│   │   └── solana/          # Solana integration
│   └── types/               # domain contracts
├── programs/
│   └── check_di_registry/   # Anchor/Rust program
├── tests/
│   ├── ai/
│   ├── api/
│   └── anchor/
├── docs/
├── scripts/
├── package.json
└── README.md
```

## Product boundaries

- AI does not issue credentials automatically.
- Human issuer/reviewer makes the final decision.
- PII and raw evidence stay off-chain.
- Solana stores only minimal integrity/status data.
- No token, custody, crypto payment or marketplace in the MVP.

## Development

Check-Di dùng Bun làm package manager/script runner (`bun install`, `bun run ...`) và chạy Next.js trên port cố định `7314` để tránh trùng các port dev phổ biến.

```bash
bun install
bun run dev
```

Web local:

```text
http://localhost:7314
```

Health check:

```text
http://localhost:7314/api/health
```

Checks:

```bash
bun run typecheck
bun run build
bun run start
```

## Current phase

**Phase 1 — Web foundation**

Goal: establish the root Next.js application and stable project boundaries before implementing AI, database persistence and the Solana program.
