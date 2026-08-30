# Check-Di Status

## Current phase

**Phase 4A — Solana Devnet memo integrity anchor integration**

## Product core

Check-Di là web truy xuất nguồn gốc theo hành trình sản phẩm, dùng một core chung cho hai track UniHackFest 2026.

```text
Batch / QR
  -> Trace Event Draft
  -> AI/Data Checks
  -> Participant Confirmation
  -> SHA-256 Hash Chain
  -> Organization Ed25519 Signature
  -> Persist Event
  -> Consumer Verify
```

## Completed

### Product/UI foundation

- Next.js App Router + TypeScript + Tailwind + Bun foundation.
- Dev/start port `7314`.
- Landing dùng supply-chain traceability core và có CTA desktop `Tạo lô`.
- Demo lô `DUR-260830-01` có 5 chặng: thu hoạch, đóng gói, kiểm định, vận chuyển, điểm bán.
- Journey map mô phỏng có marker, tiến độ, telemetry và hiệu ứng theo chặng.
- Mobile UX ưu tiên `QR -> AI quick check -> Map`; chi tiết mở theo yêu cầu.
- UI ghi rõ dữ liệu demo và không trình bày Devnet proof giả như dữ liệu thật.
- i18n Việt/Anh và typography hiện tại đã tích hợp trong landing.

### Real off-chain integrity slice

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
- Verify lại từng event gồm previous-hash link, recomputed SHA-256 và Ed25519 signature.
- Tamper detection đã có test: sửa payload lịch sử làm chain verification fail.

### Persisted batch workflow

- Có file-backed repository `src/lib/db/persistent-store.ts`.
- Prototype persistence lưu tại `.data/check-di-store.json` và `.data/` được ignore khỏi Git.
- Repository dùng atomic temp-file + rename khi ghi.
- Sample `DUR-260830-01` được seed lần đầu để landing/public verify cũ tiếp tục hoạt động.
- Có UI tạo batch thật tại `/batches/new`.
- Có UI quản lý batch tại `/batches/[id]`.
- Trace event mới được lưu dạng `draft` trước:
  - chưa có event hash;
  - chưa có signer key/signature.
- Khi tổ chức bấm xác nhận:
  - lấy hash chặng confirmed trước hoặc `GENESIS`;
  - canonicalize payload;
  - sinh SHA-256 event hash;
  - ký Ed25519;
  - persist event đã confirmed.
- Chỉ cho tồn tại một draft chưa xử lý trên một batch để giữ linear chain rõ ràng trong MVP.
- AI warning được hiển thị trước khi xác nhận nhưng không tự động chặn tổ chức ký; bên xác nhận chịu trách nhiệm dữ liệu.
- Packing event form có input weight/output weight/declared loss để chạy AI check deterministic.
- Public verify chỉ dùng các event `confirmed`, không công khai draft.

### API/consumer routes

- `POST /api/batches`: tạo batch mới.
- `GET /api/batches/[publicId]`: public proof JSON từ persisted confirmed events.
- `GET /api/manage/batches/[id]`: management projection gồm draft + confirmed events.
- `POST /api/manage/batches/[id]/events`: thêm event draft.
- `POST /api/manage/batches/[id]/events/[eventId]/confirm`: hash + ký + persist event.
- `GET /api/qr/[publicId]`: QR demo encode URL verify của domain hiện tại, chỉ hoạt động khi batch đã có confirmed proof.
- `/verify/[publicId]`: consumer verify page đọc persisted proof và hiển thị số trạm động.

### Solana Devnet anchor integration

- Confirm route hiện giữ thứ tự `off-chain confirm -> SHA-256/Ed25519 -> persist -> Devnet anchor`.
- Dùng SPL Memo program trên Devnet làm minimal integrity anchor ở Phase 4A để có transaction thật mà không đưa raw document/PII on-chain.
- Memo chứa version, Check-Di app marker, public batch ID, event ID, event hash, previous hash, issuer signer và status.
- Server có legacy Solana transaction serialization + Ed25519 fee-payer signing trực tiếp bằng Node crypto, không cần thêm package runtime.
- Fee-payer Devnet là demo key riêng; mặc định lưu trong `.data/solana-devnet-fee-payer.json` với mode 0600 hoặc có thể cấp seed bằng env.
- Khi thiếu test SOL, app thử Devnet airdrop; nếu faucet lỗi/hết quota thì event vẫn confirmed off-chain và lưu trạng thái anchor `failed` để retry.
- Có endpoint retry `POST /api/manage/batches/[id]/events/[eventId]/anchor`.
- Public JSON proof đọc transaction lại từ Devnet RPC và chỉ đánh dấu anchor hợp lệ khi transaction tồn tại, không lỗi và Memo instruction khớp chính xác memo đã persist.
- Public verify page chỉ hiện `Anchored on Solana Devnet` khi live RPC verification pass; có link Solana Explorer thật.
- Management UI hiển thị số chặng đã anchor, Explorer link hoặc nút retry.
- Custom `check_di_registry` Anchor/PDA program vẫn là phase kế tiếp; Phase 4A dùng SPL Memo như minimal live anchor, không giả mạo đây là custom program.

### Validation

- `bun test tests/traceability.test.ts tests/persistent-store.test.ts tests/solana-anchor.test.ts`: **9 passed, 0 failed, 40 assertions**.
- `bun run typecheck`: passed.
- `git diff --check`: passed.
- Devnet RPC `getLatestBlockhash`: hoạt động, trả blockhash/slot thật.
- Live transaction smoke test đã chạy tới bước funding fee-payer nhưng public Devnet faucet trả RPC `429` (airdrop quota/rate limit), vì vậy **chưa có transaction signature mới để tuyên bố anchor thành công trong môi trường hiện tại**.
- Code giữ đúng fallback: off-chain confirmation không bị rollback và UI cho phép nạp test SOL rồi retry anchor.

## Not implemented yet

- PostgreSQL/Supabase production persistence; hiện là file-backed prototype persistence.
- Organization authentication và phân quyền theo đơn vị.
- Secure production key management; hiện dùng deterministic demo Ed25519 keys.
- Edit/cancel draft và revoke/supersede workflow.
- Document upload/storage thật.
- OCR/LLM document extraction thật; AI hiện là deterministic validation fixture.
- Production/local QR renderer độc lập provider ngoài.
- Custom Anchor/PDA program source + deployment cho `check_di_registry`.
- Một funded Devnet fee-payer để hoàn tất live transaction smoke test trong môi trường hiện tại; public faucet đang trả `429`.
- PDA-backed on-chain status/revoke/supersede; Phase 4A hiện dùng SPL Memo transaction làm minimal integrity anchor.

Theo phạm vi hackathon hiện tại, map/GPS provider thật không bắt buộc; map mô phỏng được giữ để tập trung vào traceability, AI checks và integrity proof.

## Next milestone

**Phase 4B — Fund + prove live Devnet transaction, sau đó custom Anchor registry**

Ngay khi fee-payer có test SOL:

```text
confirmed event
  -> retry /anchor
  -> real SPL Memo Devnet transaction
  -> persist tx signature / slot
  -> public verify live-checks memo
  -> Explorer link thật
```

Sau khi vertical slice live này được chứng minh, triển khai `check_di_registry` custom Anchor/PDA program cho `initialize/append/update status`, rồi mới ưu tiên PostgreSQL/Supabase nếu thời gian thi cần multi-user/production-like hơn.
