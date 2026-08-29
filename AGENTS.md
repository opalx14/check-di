# Check-Di Agent Rules

Bắt buộc đọc trước khi làm việc:

1. `.agents/skill.md`
2. `.agents/project-map.md`
3. `.agents/spec/00-governance.md`
4. `.agents/spec/STATUS.md`

## Phạm vi dự án

Check-Di là một web app Next.js cho UniHackFest 2026, dùng chung một core cho hai track:

- Technical Build
- Product & Business

Không tạo hai app riêng theo track.

## Core product flow

```text
Lô sản phẩm / mã QR
  -> Ghi nhận từng chặng chuỗi cung ứng
  -> AI đọc và đối chiếu chứng từ
  -> Đơn vị tại từng chặng xác nhận
  -> Tạo hash / integrity proof
  -> Người tiêu dùng quét QR
  -> Xem timeline + bản đồ + trạng thái xác minh
```

## Cấu trúc chính

- `src/app`: Next.js App Router, route handlers và UI.
- `src/components`: component dùng lại trong web app.
- `src/lib/ai`: AI kiểm tra chứng từ và phát hiện sai lệch.
- `src/lib/db`: dữ liệu lô hàng, sự kiện hành trình và chứng từ off-chain.
- `src/lib/solana`: Solana client/config/integrity proof.
- `src/types`: domain types dùng chung.
- `programs/check_di_registry`: Anchor/Rust program ghi nhận hash/trạng thái theo lô và chặng.
- `docs`: product, technical, competition và compliance.
- `tests`: AI/API/Anchor tests.

## Product boundaries

- AI chỉ đọc/đối chiếu dữ liệu và cảnh báo bất thường, không tự xác nhận nguồn gốc.
- Mỗi bên trong chuỗi cung ứng chịu trách nhiệm xác nhận dữ liệu của chặng mình.
- PII, chứng từ gốc và dữ liệu nhạy cảm không đưa on-chain.
- Solana chỉ lưu dữ liệu tối thiểu phục vụ integrity/status: batch/event hash, issuer, version, timestamp và status.
- MVP không token, không custody, không crypto payment, không marketplace.

## Runtime local

- Dùng Bun: `bun install`, `bun run dev`, `bun run build`, `bun run start`.
- Dev/start port mặc định: `7314`.
- Không tự chuyển sang npm, yarn hoặc pnpm.
- Không ép Next.js chạy bằng `bun --bun` trên Bun 1.2.18; dùng `bun run ...`.

## Sau mỗi task `/go`

1. Review code liên quan.
2. Chạy check/build/test phù hợp.
3. Cập nhật `.agents/spec/STATUS.md` nếu trạng thái dự án thay đổi.
4. Không báo hoàn thành nếu chưa xác nhận phần vừa làm.
