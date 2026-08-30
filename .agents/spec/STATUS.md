# Check-Di Status

## Current phase

**Phase 2 — First real off-chain vertical slice**

## Product core

Check-Di là web truy xuất nguồn gốc theo hành trình sản phẩm, dùng một core chung cho hai track UniHackFest 2026.

```text
Batch / QR
  -> Trace Events
  -> AI Document Checks
  -> Participant Confirmation
  -> SHA-256 Hash Chain
  -> Organization Signature
  -> Consumer Verify
```

## Completed

### Product/UI foundation

- Next.js App Router + TypeScript + Tailwind + Bun foundation.
- Dev/start port `7314`.
- Landing đã chuyển hoàn toàn sang supply-chain traceability.
- Demo lô `DUR-260830-01` có 5 chặng: thu hoạch, đóng gói, kiểm định, vận chuyển, điểm bán.
- Journey map mô phỏng có marker, tiến độ, telemetry và hiệu ứng theo chặng.
- Mobile UX ưu tiên `QR -> AI quick check -> Map`; chi tiết mở theo yêu cầu.
- UI ghi rõ dữ liệu demo và không trình bày Devnet proof giả như dữ liệu thật.
- i18n Việt/Anh và typography hiện tại đã tích hợp trong web.

### Real vertical slice

- Có sample batch repository tại `src/lib/db/sample-batch.ts`.
- Có deterministic document/data checks tại `src/lib/ai/trace-checks.ts`:
  - kiểm tra hao hụt đóng gói;
  - kiểm tra thứ tự thời gian thu hoạch/kiểm định.
- Có canonical JSON normalization + SHA-256 thật tại `src/lib/traceability/server.ts`.
- Mỗi event đã xác nhận dùng mô hình:

```text
canonical payload + previousEventHash
  -> SHA-256 eventHash
  -> organization signs eventHash with Ed25519
```

- Chặng đầu dùng `previousEventHash = GENESIS`; chặng sau tham chiếu `eventHash` của chặng trước.
- Demo organization signing keys là deterministic test keys, không phải production identity keys.
- Có verify lại từng event:
  - previous-hash link;
  - recomputed SHA-256 hash;
  - Ed25519 signature.
- Có tamper detection: sửa payload lịch sử làm chain verification fail.
- API thật:
  - `GET /api/batches/[publicId]` trả batch + events + proof + chain verification.
  - `GET /api/qr/[publicId]` tạo QR demo thông qua QR image provider và encode URL verify của domain hiện tại.
- Public consumer route thật:
  - `/verify/[publicId]`;
  - sample hoạt động: `/verify/DUR-260830-01`.
- Landing QR passport đã liên kết sang public verify route thật.
- Public verify page hiển thị:
  - trạng thái hash/signature chain;
  - AI check fixture;
  - 5 trạm;
  - previous hash;
  - event hash;
  - signer public key;
  - Ed25519 signature;
  - JSON proof link.

### Validation

- `bun test tests/traceability.test.ts`: **4 passed, 0 failed**.
- `bun run typecheck`: passed.
- `bun run build`: passed.
- `git diff --check`: passed.
- `GET /verify/DUR-260830-01`: `200`.
- `GET /api/batches/DUR-260830-01`: chain verification `valid: true`.
- `GET /api/qr/DUR-260830-01`: redirect `307` tới QR image chứa đúng verify URL.

## Not implemented yet

- Database persistence thật (PostgreSQL/Supabase).
- UI tạo batch và thêm trace event thật từ người dùng.
- Document upload/storage thật.
- OCR/LLM document extraction thật; AI hiện là deterministic validation fixture.
- Production organization authentication và secure key management.
- Production/local QR renderer độc lập provider ngoài.
- Anchor program source code.
- Solana Devnet deployment/transactions.
- On-chain anchoring cho event hash/status.

Theo phạm vi hackathon hiện tại, map/GPS provider thật không bắt buộc; map mô phỏng được giữ để tập trung vào traceability, AI checks và integrity proof.

## Next milestone

**Phase 3 — Persisted trace events + Solana Devnet anchor**

```text
create batch form
  -> persist batch
  -> add trace event form
  -> AI/document validation
  -> organization confirmation
  -> canonical SHA-256 + Ed25519 signature
  -> persist event
  -> anchor eventHash/status on Solana Devnet
  -> public verify shows real Devnet transaction
```
