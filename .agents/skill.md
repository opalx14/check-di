# Check-Di Working Skill

## Mục tiêu

Phát triển Check-Di thành web truy xuất nguồn gốc theo hành trình sản phẩm: người dùng quét QR và xem sản phẩm đã đi qua những đâu, đơn vị nào xác nhận, chứng từ nào liên quan và dữ liệu có bị thay đổi sau xác nhận hay không.

## Luồng cốt lõi

```text
Batch / QR
  -> Supply-chain events
  -> AI document checks
  -> Participant confirmation
  -> Hash / integrity proof
  -> Consumer verification page
```

## Stack đã chốt

- Web: Next.js App Router + TypeScript.
- Styling: Tailwind CSS.
- Package manager/script runner: Bun.
- Dev/start port: `7314`.
- Solana frontend: ưu tiên `@solana/kit` + `@solana/react` khi triển khai on-chain.
- Solana program: Anchor/Rust trong `programs/check_di_registry`.
- Database: PostgreSQL/Supabase-compatible layer ở `src/lib/db`.
- AI: document extraction/cross-checking ở `src/lib/ai`.

## Module ownership

- `src/app`: UI/API orchestration.
- `src/components`: reusable web components.
- `src/lib/ai`: OCR/document extraction abstraction, cross-document checks, anomaly flags.
- `src/lib/db`: batch, trace events, organizations, documents, QR/public view.
- `src/lib/solana`: network config, hash anchoring, transaction/program integration.
- `src/types`: traceability contracts.
- `programs/check_di_registry`: batch/event integrity and status logic.

## Quy tắc implementation

- Mọi màn hình phải phục vụ một hành vi thật: tạo lô, thêm chặng, kiểm tra chứng từ, xác nhận, quét QR, xem hành trình.
- AI không được tự kết luận nguồn gốc là thật; chỉ hỗ trợ đối chiếu/cảnh báo.
- Không lưu PII/raw documents on-chain.
- Không token/NFT marketplace/custody/payment trong MVP.
- Devnet là network mặc định trong giai đoạn thi.
- Không trình bày dữ liệu mô phỏng như transaction/proof thật.

## Definition of Done

Feature chỉ xem là xong khi:

1. Code chạy được.
2. Có trạng thái loading/error/empty phù hợp.
3. Có check/test tương ứng khi infrastructure sẵn sàng.
4. Có thể xuất hiện trong live demo hoặc submission package.
