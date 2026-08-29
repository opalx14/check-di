# Check-Di Status

## Current phase

**Phase 1 — Web foundation**

## Completed

- Project identity standardized as **Check-Di**.
- Competition architecture fixed as **two tracks, one core**.
- Root web architecture changed to a single Next.js App Router application.
- Added root runtime/config files:
  - `package.json`
  - `tsconfig.json`
  - `next.config.ts`
  - `postcss.config.mjs`
  - `next-env.d.ts`
- Added initial web foundation:
  - `src/app/layout.tsx` (Plus Jakarta Sans & JetBrains Mono)
  - `src/app/page.tsx` (Interactive Sandbox & Dual-track architecture showcase)
  - `src/app/globals.css` (Cyber/fintech glassmorphism, glow effects & grid overlays)
  - `src/app/api/health/route.ts`
- Added rich interactive UI components:
  - `src/components/Navbar.tsx`
  - `src/components/HeroSection.tsx`
  - `src/components/InteractiveSandbox.tsx` (4-step interactive simulator with multi-role scenarios)
  - `src/components/CoreFlowSection.tsx`
  - `src/components/DualTrackSection.tsx` (Interactive Technical vs Product & Business view)
  - `src/components/OnChainArchitectureSection.tsx`
  - `src/components/ComplianceBanner.tsx`
  - `src/components/Footer.tsx`
- Added implementation boundaries:
  - `src/lib/ai`
  - `src/lib/db`
  - `src/lib/solana`
  - `src/types/evidence.ts`
- Kept `programs/check_di_registry` as the dedicated Anchor/Rust boundary.
- Product, technical, competition and compliance docs created.
- Agent/project rules aligned to Check-Di.

## Current product flow

```text
Artifacts
  -> AI Evidence Engine
  -> Human Review
  -> Issuer Approval
  -> Solana Attestation
  -> Public Verify
```

## Validation status

- Bun local: `1.2.18`.
- Next.js dev/start port: `7314`.
- `bun run typecheck`: passed.
- `bun run build`: passed.
- `bun run dev`: passed on `http://localhost:7314`.
- `GET /api/health`: `200` with Check-Di health payload.
- `GET /`: `200`.
- `git diff --check`: passed.
- Do not force `bun --bun` for Next.js 16 on Bun 1.2.18; that runtime path crashes in Turbopack/worker_threads. Use `bun run ...` as the project entrypoint.

## Not implemented yet

- Real submit flow.
- AI model integration and evidence schema.
- Database/persistence.
- Authentication/authorization.
- Issuer dashboard.
- Solana wallet integration.
- Anchor program source code.
- Devnet deployment.
- Public verification route.
- Automated tests.

## Next milestone

**Phase 2 — First vertical slice**

Build the smallest real flow:

```text
sample artifact
  -> structured evidence result
  -> review screen
  -> approved credential payload
```

Do not start token/payment/marketplace or non-MVP features.
