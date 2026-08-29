# Check-Di Working Skill

## Mục tiêu

Phát triển Check-Di thành một web app Next.js có thể demo end-to-end cho UniHackFest 2026 với hai track dùng chung một core.

## Luồng cốt lõi

```text
Artifacts
  -> AI evidence mapping
  -> Human review
  -> Issuer approval
  -> Solana attestation
  -> Public verification
```

## Stack đã chốt

- Web: Next.js App Router + TypeScript.
- Styling: Tailwind CSS.
- Package manager/script runner local: Bun.
- Next.js dev/start port: `7314`.
- Dùng `bun run ...` làm entrypoint; không force `bun --bun` cho Next.js 16 trên Bun 1.2.18.
- Solana frontend: ưu tiên `@solana/kit` + `@solana/react` khi bắt đầu wallet/on-chain integration.
- Solana program: Anchor/Rust trong `programs/check_di_registry`.
- Database: PostgreSQL/Supabase-compatible layer ở `src/lib/db` khi triển khai persistence.
- AI: structured evidence engine ở `src/lib/ai`.

## Module ownership

- `src/app`: route/UI/API orchestration.
- `src/components`: reusable web components.
- `src/lib/ai`: schema, prompt, evaluator, evidence attribution.
- `src/lib/db`: data access, persistence, retention boundary.
- `src/lib/solana`: network config, client, transaction/program integration.
- `src/types`: product contracts.
- `programs/check_di_registry`: issue/revoke/supersede logic.

## Quy tắc implementation

- Không build feature ngoài MVP trước khi flow end-to-end chạy được.
- Không để AI tự cấp credential.
- Không lưu PII/raw evidence on-chain.
- Không đưa token/NFT marketplace/custody/payment vào MVP.
- Không trộn legacy Solana wallet stack nếu chưa có lý do rõ ràng.
- Giữ Devnet làm network mặc định trong giai đoạn thi.

## Definition of Done cho feature

Feature chỉ xem là xong khi:

1. Code chạy được.
2. Có error handling phù hợp.
3. Có test/check tương ứng khi infrastructure đã sẵn sàng.
4. Có thể xuất hiện trong live demo hoặc submission package.
