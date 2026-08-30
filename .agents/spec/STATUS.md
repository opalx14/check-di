# Check-Di Status

## Current phase

**Phase 5B — Custom `check_di_registry` deployed và trở thành proof chính của product flow**

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
  -> Check-Di Registry Batch/Event PDA on Solana Devnet
  -> Consumer Verify + live RPC verification
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

### Solana Devnet integrity integration

- Confirm route giữ thứ tự `off-chain confirm -> SHA-256/Ed25519 -> persist -> custom Devnet registry`.
- Custom program `check_di_registry` hiện là **proof chính**; SPL Memo Phase 4A chỉ còn fallback nếu registry path không khả dụng.
- Fee-payer Devnet là demo key riêng tại `.data/solana-devnet-fee-payer.json`; private key không commit Git.
- Có endpoint retry `POST /api/manage/batches/[id]/events/[eventId]/anchor`.
- Registry service tự initialize Batch PDA nếu chưa có và backfill các confirmed Event PDA theo đúng thứ tự previous-hash trước khi ghi event mục tiêu.
- RPC client có retry/exponential backoff cho HTTP 429 để backfill nhiều chặng ổn định hơn trên public Devnet RPC.
- Public JSON proof và `/verify/[publicId]` đọc Batch/Event PDA lại trực tiếp từ Devnet RPC, đối chiếu batch hash, event hash, previous hash, organization signer/hash, authority, registry link và lifecycle status; read-only verifier dùng persisted public authority, không cần private fee-payer key để derive PDA.
- Persistence lưu `programId`, Batch PDA, Event PDA, organization public key, transaction/Explorer proof khi có.
- Management UI ưu tiên hiển thị `Check-Di Registry · Event PDA`; Memo được ghi rõ là fallback, không được trình bày như custom registry proof.
- App chỉ gọi custom program là deployed khi RPC xác nhận program account `executable = true`.

### Custom `check_di_registry` Anchor/PDA program

- Rust/Anchor workspace tại root dùng `anchor-lang = 1.1.2`.
- Canonical Devnet program ID: `9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi`.
- Program đã build SBF và deploy thật lên Devnet; RPC xác nhận `executable = true`.
- Deploy transaction: `3vhUrCXzYESp35V4iX24hnQz7LV7LFM1tbb11YFZMLPTx1ypp6uS1ndWTc3QNNppWRs7tHJbbVccfztQM1yQbHPJ`.
- `initialize_batch(batch_hash)` tạo Batch Registry PDA.
- `append_event(...)` tạo Event Proof PDA, bắt buộc previous hash khớp registry head và yêu cầu organization signer ký instruction.
- `set_event_status(...)` hỗ trợ lifecycle `active -> revoked|superseded` ở program layer.
- Batch registry giữ authority, batch hash, last event hash, event count, status và timestamps.
- Event proof giữ event hash, previous hash, organization signer pubkey + organization hash, authority, version, status và timestamps.
- `GENESIS` off-chain ánh xạ thành zero hash `[0; 32]` on-chain.
- Live smoke `DUR-260830-02` đã tạo Batch PDA `rMJQtaADihWqThytPv5aLHAtJkcPhDkbis5KKAnkBVe` và Event PDA `Dd7JhZdVxBXmn6XbA3Tc36tEj85of3pEeDqgG3ApWZHa`, đọc ngược RPC và verify hợp lệ.
- Multi-event sample `DUR-260830-01` đã backfill toàn bộ chuỗi confirmed lên Registry PDA/Event PDA thành công.

### Validation

- `bun test`: **11 passed, 0 failed, 44 assertions**.
- `bun run typecheck`: passed.
- `bun run build`: passed.
- `bun run program:test`: **3 passed, 0 failed**.
- `bun run program:check`: passed, không còn host cfg warnings.
- `cargo build-sbf`: passed; sinh `target/deploy/check_di_registry.so`.
- `git diff --check`: passed.
- Fee-payer `g83EX9BBPEmjv1fRwdeRcZVvA8EdhMsqDe3W1Cta8ai` đã được cấp 5 Devnet SOL, đã trả phí deploy/PDA transactions thật và hiện còn khoảng **3.73677232 SOL**.
- SPL Memo live transaction đã từng verify thành công trước khi chuyển sang custom registry.
- `solana program show` xác nhận custom program `executable`, upgrade authority là fee-payer demo và last deployed slot `490197159`.
- `bun run program:smoke -- DUR-260830-02`: Batch/Event PDA đọc ngược và live verification pass.
- `bun run product:smoke -- DUR-260830-02`: migration `spl-memo -> check-di-registry` pass.
- `bun run product:smoke -- DUR-260830-01`: multi-event Registry backfill pass sau retry/backoff 429.
- Off-chain confirmation vẫn không rollback nếu Solana tạm lỗi; Memo fallback và retry endpoint vẫn giữ để demo không mất dữ liệu.

## Not implemented yet

- PostgreSQL/Supabase production persistence; hiện là file-backed prototype persistence.
- Organization authentication và phân quyền theo đơn vị.
- Secure production key management; hiện dùng deterministic demo Ed25519 keys.
- Edit/cancel draft và revoke/supersede workflow.
- Document upload/storage thật.
- OCR/LLM document extraction thật; AI hiện là deterministic validation fixture.
- Production/local QR renderer độc lập provider ngoài.
- PDA-backed revoke/supersede transaction từ app; instruction on-chain đã có nhưng management flow chưa gọi instruction này.
- Wallet/Phantom organization signing; hiện organization signer vẫn là deterministic demo signer server-side.

Theo phạm vi hackathon hiện tại, map/GPS provider thật không bắt buộc; map mô phỏng được giữ để tập trung vào traceability, AI checks và integrity proof.

## Next milestone

**Phase 6 — Document upload + AI extraction/check production-like**

Blockchain vertical slice đã chạy live. Milestone tiếp theo tập trung biến AI từ deterministic fixture thành luồng chứng từ thật:

```text
upload PDF/image
  -> extract document fields
  -> normalize structured evidence
  -> compare against batch/event data
  -> matched / warning / needs_review
  -> human/organization confirmation
  -> SHA-256 + Ed25519
  -> Check-Di Registry Event PDA
```

Sau AI document slice mới ưu tiên PostgreSQL/Supabase adapter, organization auth/Phantom signing và PDA-backed revoke/supersede UI.
