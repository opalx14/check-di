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
- `/login` đăng nhập organization bằng Supabase Auth; session giữ bằng HttpOnly access/refresh cookies.
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` xử lý organization session + membership context.
- `/organization/wallet` cho owner liên kết Phantom bằng signed challenge; `/api/auth/wallet/challenge` + `/api/auth/wallet/verify` xác minh Ed25519 ownership trước khi lưu organization wallet public key.
- `/api/batches` tạo batch mới.
- `/api/batches/[publicId]` public proof JSON từ các event đã xác nhận.
- `/api/qr/[publicId]` QR demo trỏ tới verify route của batch đã có proof.
- `/api/manage/batches/[id]` đọc dữ liệu quản lý gồm cả draft event.
- `/api/manage/batches/[id]/events` tạo trace event dạng draft.
- `/api/manage/batches/[id]/events/[eventId]/documents` upload PDF/ảnh, lưu file off-chain, SHA-256, deterministic demo extraction và cross-check trên draft.
- `/api/manage/batches/[id]/events/[eventId]/documents/[documentId]/reanalyze` kiểm tra lại SHA-256 của raw file off-chain rồi mới chạy demo extraction/cross-check trên file cũ mà không upload lại.
- `/api/manage/batches/[id]/events/[eventId]/confirm` prepare canonical hash, xác minh Phantom/demo signature và persist event.
- `/api/manage/batches/[id]/events/[eventId]/status` đồng bộ lifecycle `confirmed -> revoked|superseded` theo thứ tự Solana PDA trước, DB mirror sau.
- `/api/creditcoin/readiness` probe read-only Attestcoin Proof API, Sepolia attested height và Creditcoin CC3 chain ID/block height; không expose private key.
- `/judge/creditcoin` Judge lane riêng cho BUIDL CTC, chỉ hiển thị `Verified` sau khi có source contract + target registry address thật.
- `/batches/new` form tạo lô thật trong prototype.
- `/batches/[id]` quản lý hành trình, AI warning, draft và xác nhận từng chặng.

### `src/components`
UI dùng lại: hero, journey timeline/map preview, document check, QR/public verification.

### `src/lib/ai`
AI demo hỗ trợ đối chiếu chứng từ giữa các chặng. `document-extraction.ts` dùng deterministic fixture từ tên file + metadata chặng để mô phỏng structured extraction và sinh `matched/warning/needs_review`; không cần API key, không gọi model ngoài và UI luôn ghi rõ đây là `DEMO EXTRACTION`.

### `src/lib/documents`
Private off-chain storage cho chứng từ draft với adapter `file|supabase`. Local dùng `.data/documents` mode `0600`; khi `CHECK_DI_DB_DRIVER=supabase`, mặc định dùng private Supabase Storage bucket `check-di-documents`. Cả hai path đều kiểm tra magic bytes, giới hạn size, SHA-256 và bắt buộc raw bytes vẫn khớp hash trước reanalyze; raw file/object path không expose qua public proof.

### `src/lib/auth`
Supabase organization identity layer: password login server-side, HttpOnly session, membership role `owner/operator/inspector/viewer`, auth mode `off|optional|required` và route authorization theo batch/event organization. Remote `COIN14` đã apply organization RLS và live Auth/RLS smoke pass. Owner liên kết Phantom bằng signed challenge; membership hydrate `walletPublicKey`. Authenticated organization xác nhận chặng bằng Phantom trên canonical `eventHash`. `bun run auth:demo:provision` hỗ trợ idempotent upsert demo Auth user + organization + owner membership khi credential được truyền ngoài Git.

### `src/lib/db`
Repository off-chain dùng contract chung `BatchRepository`. Runtime chọn `file` hoặc `supabase` qua `CHECK_DI_DB_DRIVER`: file-backed adapter tiếp tục lưu `.data/check-di-store.json` cho zero-config local demo; Supabase adapter dùng server-side Data API và hydrate schema normalized về cùng domain model nên UI/API/Solana service không đổi. Schema PostgreSQL/Supabase nằm tại `supabase/migrations/202608300001_check_di_core.sql` với 8 bảng được namespace bằng prefix `check_di_*` để dùng an toàn trong project Supabase dùng chung `coin14`: organizations, membership, batches, trace events, documents, extraction, AI checks và integrity-proof mirror. Confirmed payload/batch identity được khóa bằng DB trigger. `bun run db:migrate-demo` mặc định dry-run hai batch `DUR-260830-01` và `DUR-260830-02`, bảo toàn hash/signature/Solana proof khi remote sẵn sàng.

Database được trình bày thành **hai data lane trong cùng một PostgreSQL**, không tách thành hai database: Product & Business lane chứa organization/batch/journey/documents/AI; Technical / Blockchain lane chứa hash chain/signature và `check_di_integrity_proofs` mirror của Solana. Remote đã apply `202608310001` (organization RLS), `202608310002` (security-invoker track views) và `202608310003` (RLS recursion hotfix). `check_di_business_track_v` và `check_di_blockchain_track_v` đều pass remote doctor và nối nhau bằng `batch_id / event_id / event_hash`. Tài liệu kiến trúc nằm ở `docs/CHECK-DI-TWO-TRACK-DATA-LANES.md`.

### `src/lib/traceability`
Canonicalization, SHA-256 event hashing và chain verification server-side. Legacy/demo events vẫn dùng deterministic Ed25519 key; authenticated organization events dùng Solana base58 Phantom signer và verifier hỗ trợ cả hai định dạng. Finalized lifecycle events (`confirmed/revoked/superseded`) đều ở lại hash history; correction event nối hash terminal gần nhất.

### `src/lib/solana`
Solana config + Devnet integrity. Custom `check_di_registry` là proof chính. Legacy/demo path giữ server signer; authenticated organization path dùng `phantom-registry.ts`: server partial-sign fee payer, Phantom ký organization account, server validate fee payer/program/PDA/accounts/instruction/signatures rồi relay Devnet và persist proof. Lifecycle `set_event_status(active -> revoked|superseded)` đã được nối management API/UI theo thứ tự on-chain verify trước, DB mirror sau và retry idempotent. Live Phantom dual-signer + lifecycle smokes đều pass. SPL Memo Phase 4A chỉ còn fallback cho legacy/demo path.

### `src/lib/creditcoin`
BUIDL CTC adapter tách biệt khỏi Solana core: cấu hình public CC3/Attestcoin, source chainKey Sepolia, live readiness probe và proof-builder client. `readiness.ts` bắt buộc RPC trả đúng CC3 testnet chain ID `102031`, Proof API healthy và attested height > 0; contract deployment readiness chỉ xanh khi có cả source + registry public address thật. `proof-builder.ts` gọi current `/api/v1/proof-by-tx/{chainKey}/{txHash}`, validate proof/tx identity và map response sang `CheckDiAttestedRegistry.ProofInput` thay vì tin raw API payload trực tiếp.

### `src/types`
Domain contracts: Batch, TraceEvent, DocumentEvidence/DocumentExtraction, IntegrityProof và AIValidation. Document SHA-256 + demo extraction chỉ được thêm vào canonical signed payload của event mới khi evidence tồn tại để không phá legacy event hashes.

### `programs/check_di_registry`
Anchor 1.1.2/Rust program đã build SBF và deploy thật trên Devnet tại `9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi`. Có `initialize_batch`, `append_event`, `set_event_status`, previous-hash enforcement, organization signer bắt buộc và lifecycle `active/revoked/superseded`; Batch/Event PDA đã được smoke test và đọc ngược RPC thành công.

### `contracts/creditcoin`
Competition adapter Solidity cho BUIDL CTC. `CheckDiSourceRegistry.sol` phát provenance commitment tối thiểu trên Ethereum Sepolia và enforce organization authorization + hash-chain sequence + lifecycle. `CheckDiAttestedRegistry.sol` chạy trên Creditcoin CC3, gọi Attestcoin Native Query Verifier `0x...0FD2`, decode receipt đã được proof bảo vệ, bắt buộc đúng source emitter/event signature, chống replay và enforce previous hash/sequence lần nữa trước khi mirror state. Hai contract compile pass bằng Solidity `0.8.30`; chưa được gọi là deployed cho tới khi có testnet address/transactions thật.

## Dependency direction

```text
src/app
  -> src/components
  -> src/lib/ai
  -> src/lib/db
  -> src/lib/solana
  -> src/lib/creditcoin
  -> src/types

src/lib/*
  -> src/types

programs/check_di_registry
  -> độc lập với Next.js runtime

contracts/creditcoin
  -> độc lập với Solana program; dùng cùng Check-Di eventHash/domain model ở boundary
```

## Competition

Hai track dùng cùng một core:

- Technical Build: AI document checks, hash chain, QR verification, Solana Devnet proof.
- Product & Business: chống hàng giả/không rõ nguồn gốc, minh bạch chuỗi cung ứng, onboarding nhà vườn/doanh nghiệp/retail, GTM.

BUIDL CTC 2026 Fall dùng cùng product core nhưng thêm cross-chain lane, không fork app:

- Primary angle: RWA / physical product provenance.
- AI giữ vai trò document extraction/cross-check, không tự xác nhận hàng thật.
- Source proof path mục tiêu: `Check-Di event -> Ethereum Sepolia -> Attestcoin -> Creditcoin CC3`.
- Solana Devnet vẫn giữ nguyên cho UniHackFest; không xóa/port ngược program hiện tại chỉ để thi Creditcoin.
