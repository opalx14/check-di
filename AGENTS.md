# Check-Di Agent Rules

Bắt buộc đọc trước khi làm việc:

1. `.agents/skill.md`
2. `.agents/project-map.md`
3. `.agents/spec/00-governance.md`
4. `.agents/spec/STATUS.md`

## Phạm vi dự án

Check-Di là một web app Next.js duy nhất cho UniHackFest 2026, dùng chung một core cho hai track:

- Technical Build
- Product & Business

Không tạo hai app riêng cho hai track.

## Core product flow

```text
Artifacts / Repository
  -> AI Evidence Engine
  -> Human Review
  -> Issuer Approval
  -> Solana Attestation
  -> Public Verify
```

## Cấu trúc chính

- `src/app`: Next.js App Router, route handlers và UI.
- `src/components`: component dùng lại trong web app.
- `src/lib/ai`: AI Evidence Engine.
- `src/lib/db`: persistence và data boundary off-chain.
- `src/lib/solana`: Solana client/config/integration.
- `src/types`: domain types dùng chung.
- `programs/check_di_registry`: Anchor/Rust program và on-chain state.
- `docs`: product, technical, competition và compliance.
- `tests`: AI/API/Anchor tests.

## Product boundaries

- AI chỉ trích xuất/map evidence, không tự issue credential.
- Human reviewer/issuer quyết định cuối.
- PII và raw evidence không đưa on-chain.
- Solana chỉ lưu tối thiểu issuer, commitment/hash, version, timestamp và status.
- MVP không token, không custody, không crypto payment, không marketplace.

## Runtime local

- Dùng Bun cho install và toàn bộ project scripts: `bun install`, `bun run dev`, `bun run build`, `bun run start`.
- Dev/start chạy mặc định trên port `7314`.
- Không tự chuyển sang npm, yarn hoặc pnpm.
- Không ép Next.js chạy bằng `bun --bun` trên Bun 1.2.18; Next.js 16/Turbopack hiện cần worker APIs mà runtime Bun này chưa hỗ trợ đầy đủ. `bun run ...` vẫn là entrypoint chuẩn của dự án.

## Sau mỗi task `/go`

1. Review code liên quan.
2. Chạy check/build/test phù hợp với phần đã có.
3. Cập nhật `.agents/spec/STATUS.md` nếu trạng thái dự án thay đổi.
4. Không báo hoàn thành nếu chưa xác nhận phần vừa làm.
