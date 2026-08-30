# Check-Di Project Map

## Product

Check-Di là nền tảng truy xuất nguồn gốc theo hành trình sản phẩm. Mỗi lô hàng có mã QR/public ID; các bên trong chuỗi cung ứng ghi nhận sự kiện, đính kèm chứng từ, xác nhận dữ liệu và tạo hash để kiểm tra tính toàn vẹn.

## Main user flow

```text
Nhà sản xuất / nhà vườn
  -> Thu mua / sơ chế / đóng gói
  -> Kiểm định
  -> Logistics / kho
  -> Điểm bán
  -> Người tiêu dùng quét QR
```

Mỗi chặng gồm:

```text
Location + timestamp + organization + batch data + documents
  -> AI cross-check
  -> Human/organization confirmation
  -> Canonical event payload
  -> Hash / integrity proof
```

## Active structure

### `src/app`
Next.js App Router, landing, API và các route sản phẩm sau này:

- `/` landing + demo.
- `/verify/[publicId]` trang người tiêu dùng quét QR — đọc public proof từ persisted repository.
- `/api/batches` tạo batch mới.
- `/api/batches/[publicId]` public proof JSON từ các event đã xác nhận.
- `/api/qr/[publicId]` QR demo trỏ tới verify route của batch đã có proof.
- `/api/manage/batches/[id]` đọc dữ liệu quản lý gồm cả draft event.
- `/api/manage/batches/[id]/events` tạo trace event dạng draft.
- `/api/manage/batches/[id]/events/[eventId]/confirm` xác nhận, hash và ký event.
- `/batches/new` form tạo lô thật trong prototype.
- `/batches/[id]` quản lý hành trình, AI warning, draft và xác nhận từng chặng.

### `src/components`
UI dùng lại: hero, journey timeline/map preview, document check, QR/public verification.

### `src/lib/ai`
AI đọc chứng từ và đối chiếu dữ liệu giữa các chặng. Không tự xác nhận nguồn gốc.

### `src/lib/db`
Repository off-chain cho batches/trace events và public projection. Prototype hiện có file-backed adapter lưu tại `.data/check-di-store.json`; contract được tách để sau chuyển sang PostgreSQL/Supabase mà không đổi UI/API flow.

### `src/lib/traceability`
Canonicalization, SHA-256 event hashing, Ed25519 demo signing và chain verification server-side.

### `src/lib/solana`
Solana config + server-side Devnet integrity. Custom `check_di_registry` hiện là proof chính: service initialize/backfill Batch/Event PDA, persist on-chain metadata và public verify đọc PDA live từ Devnet RPC. SPL Memo Phase 4A được giữ làm fallback. RPC path có retry/backoff cho public Devnet rate limit.

### `src/types`
Domain contracts: Batch, TraceEvent, Organization, DocumentEvidence, IntegrityProof, AIValidation.

### `programs/check_di_registry`
Anchor 1.1.2/Rust program đã build SBF và deploy thật trên Devnet tại `9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi`. Có `initialize_batch`, `append_event`, `set_event_status`, previous-hash enforcement, organization signer bắt buộc và lifecycle `active/revoked/superseded`; Batch/Event PDA đã được smoke test và đọc ngược RPC thành công.

## Dependency direction

```text
src/app
  -> src/components
  -> src/lib/ai
  -> src/lib/db
  -> src/lib/solana
  -> src/types

src/lib/*
  -> src/types

programs/check_di_registry
  -> độc lập với Next.js runtime
```

## Competition

Hai track dùng cùng một core:

- Technical Build: AI document checks, hash chain, QR verification, Solana Devnet proof.
- Product & Business: chống hàng giả/không rõ nguồn gốc, minh bạch chuỗi cung ứng, onboarding nhà vườn/doanh nghiệp/retail, GTM.
