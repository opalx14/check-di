# Check-Di Status

## Current phase

**Phase 11 BUIDL CTC adapter đang triển khai trên nền Phase 10 demo-ready; app production đã deploy thành công lên VPS tại `/opt/check-di` (port 7314, systemd `check-di.service`, Nginx reverse proxy + TLS certificate Let's Encrypt), public URL `https://check-di.promptmarketcap.net` hoạt động ổn định qua Cloudflare Proxy cho UniHackfest 2026.**

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
- Landing đã rút gọn theo benchmark Redline/SkillBridge: navbar chỉ giữ tác vụ chính, hero có ảnh sầu riêng thật, hai persona rõ ràng, pipeline 5 chặng, kiến trúc integrity ngắn gọn và ô tra cứu batch nhanh; các section competition/compliance dài đã bỏ khỏi landing public.
- Landing dùng onboarding dạng popup/coach-mark cho người mới: bước đầu chọn `Nhà cung cấp` hoặc `Người mua`, sau đó tour rẽ nhánh theo đúng mục đích; supplier được dẫn tới kho sản phẩm + ví tổ chức, client được dẫn tới quét QR. Tour chỉ hiện lần đầu bằng localStorage và không chiếm layout.

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
  - lấy hash chặng finalized trước (`confirmed/revoked/superseded`) hoặc `GENESIS`; vì lifecycle terminal không được làm đứt lịch sử;
  - canonicalize payload;
  - sinh SHA-256 event hash;
  - ký Ed25519;
  - persist event đã confirmed.
- Chỉ cho tồn tại một draft chưa xử lý trên một batch để giữ linear chain rõ ràng trong MVP.
- AI warning được hiển thị trước khi xác nhận nhưng không tự động chặn tổ chức ký; bên xác nhận chịu trách nhiệm dữ liệu.
- Packing event form có input weight/output weight/declared loss để chạy AI check deterministic.
- Public verify chỉ dùng các event `confirmed`, không công khai draft.

### PostgreSQL/Supabase database foundation

- Đã tách `BatchRepository` contract khỏi file-backed implementation để API/UI/Solana service không phụ thuộc trực tiếp `.data/check-di-store.json`.
- Runtime chọn adapter bằng `CHECK_DI_DB_DRIVER=file|supabase`; mặc định vẫn là `file` để local/demo hiện tại không cần credential.
- `src/lib/db/supabase-repository.ts` dùng Supabase Data API server-side bằng `fetch`, không thêm SDK/dependency mới và chỉ nhận `CHECK_DI_SUPABASE_SERVICE_ROLE_KEY` ở server.
- Migration `supabase/migrations/202608300001_check_di_core.sql` tạo 8 bảng được namespace bằng prefix `check_di_*`: `check_di_organizations`, `check_di_organization_members`, `check_di_batches`, `check_di_trace_events`, `check_di_documents`, `check_di_document_extractions`, `check_di_ai_checks`, `check_di_integrity_proofs` để tránh collision với dữ liệu cũ trong `coin14`.
- `trace_events` có `sequence_no`, partial unique index để mỗi batch tối đa một draft và giữ linear chain rõ ràng.
- DB trigger khóa payload của confirmed event; chỉ status lifecycle được phép chuyển tiếp, còn `revoked/superseded` là terminal trong database mirror.
- Batch identity (`public_id`, `product_name`, `origin`) bị khóa sau khi đã có event confirmed để consumer metadata không thể âm thầm đổi ngoài hash chain.
- Document/extraction/AI check chỉ được mutate khi parent event còn `draft`; integrity proof được tách riêng để Solana vẫn là proof layer thay vì database nghiệp vụ.
- Supabase adapter hydrate normalized rows trở lại đúng domain model hiện tại: batch -> events -> document evidence -> AI checks -> Solana proof.
- Raw document storage cũng có adapter `file|supabase`; mặc định tự dùng private Supabase Storage khi `CHECK_DI_DB_DRIVER=supabase`, còn local giữ `.data/documents`.
- Migration tạo private bucket `check-di-documents`, giới hạn 10 MB và chỉ nhận PDF/JPEG/PNG/WebP; object key dùng `batch/event/document.ext`, không expose raw object path qua public proof.
- Upload/reanalyze route đi qua configured storage adapter và vẫn bắt buộc SHA-256 raw bytes khớp metadata trước khi chạy lại extraction.
- `bun run db:doctor` là read-only readiness check cho Data API + private bucket khi credential remote đã có.
- RLS được bật trên toàn bộ bảng; Phase 7A chưa thêm user policies vì organization auth chưa triển khai. Server adapter dùng service-role key; key không được đưa `NEXT_PUBLIC_*`.
- Target remote đã chốt là Supabase project/database `coin14`; runtime local hiện đã kết nối remote bằng server-only credential và `db:doctor` pass. Core migration `202608300001` đã có trên remote history.
- Database được tách **hai data lane logic trong cùng một PostgreSQL** để phục vụ hai track mà không fork dữ liệu: Product & Business lane (`organizations/batches/events/documents/extractions/AI`) và Technical / Blockchain lane (`previous_event_hash/event_hash/signature` + `check_di_integrity_proofs`).
- Migration `202608310002_check_di_track_lanes.sql` tạo hai read-only security-invoker projection: `check_di_business_track_v` và `check_di_blockchain_track_v`; hai lane nối bằng `batch_id / event_id / event_hash`.
- Tài liệu boundary hai lane: `docs/CHECK-DI-TWO-TRACK-DATA-LANES.md`.

### Document upload + AI demo check pipeline

- Draft event có thể nhận tối đa 5 file chứng từ thật: PDF, JPG, PNG hoặc WebP; giới hạn 10 MB/file.
- Upload route `POST /api/manage/batches/[id]/events/[eventId]/documents` chỉ cho phép event còn `draft`.
- Backend kiểm tra magic bytes thay vì tin MIME/đuôi file từ browser; file giả định dạng bị reject.
- Raw file luôn off-chain/private: local dùng `.data/documents/...` mode `0600`; Supabase mode dùng private bucket `check-di-documents`. Raw document/path không đưa vào public proof hoặc on-chain.
- Mỗi file có SHA-256 riêng và metadata `DocumentEvidence`; SHA-256 + demo extraction được đưa vào canonical event payload của event mới trước khi ký.
- Legacy confirmed events không có `documentEvidence` vẫn verify hash cũ bình thường nhờ canonical payload chỉ thêm field mới khi field tồn tại.
- Phase 6 demo **không gọi OpenAI/Gemini/LLM bên ngoài và không cần API key**.
- `extractDocumentDemo()` là deterministic fixture: lấy tín hiệu từ tên file + metadata chặng để mô phỏng structured fields như batch ID, document number, quantity/unit và organization; mọi UI/public proof đều ghi rõ `DEMO EXTRACTION` và `simulated`.
- Cross-check layer so mã lô, organization, nguồn gốc và quantity với batch/event rồi sinh `matched | warning | needs_review`; demo warning không tự chặn organization confirmation.
- Management UI cho upload file sau khi lưu draft, hiển thị SHA-256, demo extraction/confidence và mismatch trước nút xác nhận.
- Public verify hiển thị tên chứng từ, SHA-256 và field demo đã extraction nhưng không expose raw file.
- Có `bun run document:smoke` để kiểm tra deterministic extraction/cross-check mà không phụ thuộc mạng, billing hoặc credential.

### API/consumer routes

- `POST /api/batches`: tạo batch mới cho organization đang đăng nhập.
- `GET /api/supplier/products`: trả kho sản phẩm theo organization, gồm batch đã tạo/tham gia, trạng thái chặng và proof.
- `/supplier`: dashboard nhà cung cấp; anonymous được dẫn về `/login?next=/supplier`, authenticated organization thấy inventory và trạng thái Phantom.
- `/scan`: luồng người mua không cần đăng nhập; hỗ trợ camera QR qua `BarcodeDetector` khi browser có, fallback nhập public batch ID.
- `GET /api/batches/[publicId]`: public proof JSON từ persisted confirmed events.
- `GET /api/manage/batches/[id]`: management projection gồm draft + confirmed events.
- `POST /api/manage/batches/[id]/events`: thêm event draft.
- `POST /api/manage/batches/[id]/events/[eventId]/documents`: upload PDF/ảnh, hash file, AI extraction + cross-check và attach vào draft.
- `POST /api/manage/batches/[id]/events/[eventId]/documents/[documentId]/reanalyze`: đọc lại file off-chain đã lưu, bắt buộc bytes vẫn khớp SHA-256 đã ghi trong evidence rồi mới chạy lại deterministic demo extraction/cross-check mà không upload lại.
- `POST /api/manage/batches/[id]/events/[eventId]/confirm`: prepare canonical event hash, Phantom/demo signature verification rồi persist event.
- `POST /api/manage/batches/[id]/events/[eventId]/status`: lifecycle `confirmed -> revoked|superseded`, cập nhật PDA trước rồi mới mirror DB.
- `GET /api/qr/[publicId]`: QR demo encode URL verify của domain hiện tại, chỉ hoạt động khi batch đã có finalized proof.
- `/verify/[publicId]`: consumer verify page đọc persisted proof, hiển thị ảnh sản phẩm, timeline chặng, trạng thái AI/integrity/Devnet và chi tiết proof dạng mở rộng.

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

- `bun test`: **24 passed, 0 failed, 97 assertions**.
- `bun run typecheck`: passed.
- `bun run build`: passed sau khi chuyển toàn bộ runtime DB access qua repository adapter chung.
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
- Document tests xác nhận deterministic demo extraction, Vietnamese `Đ/đ` normalization, MIME magic-byte detection, off-chain save/read, raw document SHA-256 mismatch bị chặn khi reanalyze và document evidence tamper làm signed event verification fail.
- `bun run document:smoke`: deterministic demo extraction/cross-check pass, không cần API key hoặc mạng ngoài.
- Supabase Storage mock tests xác nhận private upload/read path, deterministic object key và document SHA-256.
- `bun run db:doctor`: **passed (configured=true, database: 200, private_document_bucket: 200)**.
- `bun run product:smoke -- DUR-260830-01`: **passed**.
- `bun run program:smoke -- DUR-260830-02`: **passed**.
- `bun run document:smoke`: **passed**.
- `bun run monitor`: script giám sát tự động tình trạng web (port 7314) và phát hiện delta/thao tác mới (lô hàng, draft/confirmed events, Solana PDA, documents).
- Remote migration history: version `202608300001` đã được repair và đồng bộ với remote database.

## Phase 8A — Organization Identity/Auth foundation

- Đã thêm server helper `src/lib/auth/server.ts` để login bằng Supabase password grant, validate access token qua `/auth/v1/user`, hydrate membership và role `owner/operator/inspector/viewer` từ `check_di_organization_members`.
- Đã thêm `/login`, `POST /api/auth/login`, `POST /api/auth/logout` và `GET /api/auth/me`; access/refresh token được giữ bằng HttpOnly cookie, không đưa service-role key xuống browser.
- `CHECK_DI_AUTH_MODE=off|optional|required`: local runtime hiện dùng `optional` để giữ legacy demo access nhưng bật organization/Phantom path khi có session; `required` sẽ dành cho final organization-only management demo.
- Batch mới có thể persist `createdByOrganizationId`; event mới có thể nhận canonical `organizationId` từ authenticated membership thay vì luôn suy ra từ organization name.
- Đã bọc authorization cho create batch, management batch read, add event, upload/reanalyze document, confirm event và retry Solana anchor. Event của organization A không được thao tác bởi membership organization B khi auth được bật.
- Đã thêm migration `202608310001_check_di_organization_rls.sql` với helper role checks và RLS policy theo organization cho organizations, memberships, batches, trace events, documents, extractions, AI checks và integrity-proof reads.
- Management authorization đã được bọc ở create batch, management batch read, add event, upload/reanalyze document, confirm event và retry Solana anchor. Với `optional`, request authenticated dùng membership/role/Phantom identity; request anonymous vẫn đi legacy demo path.
- `COIN14` là project dùng chung có 25 migration cũ không tồn tại trong repo Check-Di, nên không dùng `db push`; Phase 8 được apply trực tiếp bằng `supabase db query --file` để không đụng migration cũ.
- Remote đã apply `202608310001` (organization RLS), `202608310002` (two-track security-invoker views) và hotfix `202608310003` (phá vòng lặp RLS batch↔event). Migration history đã repair applied cho cả ba version.
- Live `auth:smoke` tạo user/org/membership/batch/event tạm, password-login thật qua Supabase Auth, đọc membership bằng JWT user và đọc được cả `check_di_business_track_v` + `check_di_blockchain_track_v`; cleanup sau smoke xác nhận còn `0` user/org/batch/event tạm.
- `bun run db:doctor` pass; `bun run db:track-doctor` pass cả Business/Blockchain lane.
- Validation hiện tại sau Phase 9 core: `bun test` **31 passed / 0 failed / 113 assertions**, `typecheck` passed, production `build` passed, `db:doctor` pass, `db:track-doctor` pass, `git diff --check` pass; `phantom:smoke` và `lifecycle:smoke` đều rerun idempotent (`reused=true`).

## Phase 8B — Phantom organization signing + Registry transaction bridge

- Đã thêm `/organization/wallet` cho owner membership chọn organization và kết nối Phantom.
- `POST /api/auth/wallet/challenge` sinh nonce HttpOnly ngắn hạn và message gồm organization, user, nonce, Solana Devnet context; challenge nêu rõ đây không phải payment transaction.
- Phantom `signMessage` trả Ed25519 signature; `POST /api/auth/wallet/verify` decode Solana base58 public key, verify chữ ký Ed25519 server-side rồi mới cập nhật `check_di_organizations.wallet_public_key`.
- `/api/auth/me` hydrate thêm `walletPublicKey` từ organization để UI biết ví hiện đang liên kết.
- Wallet linking bắt buộc authenticated membership role `owner` kể cả khi global `CHECK_DI_AUTH_MODE` đang `off`, nên không có anonymous wallet binding.
- Confirm flow đã tách `prepareEventConfirmation()` để server sinh canonical `eventHash`; khi có authenticated organization + linked wallet, browser Phantom ký raw 32-byte `eventHash`, server verify Ed25519 rồi mới chuyển draft → confirmed.
- `TraceEvent.signerPublicKey` hiện hỗ trợ cả demo DER/base64url key cũ và Solana base58 Ed25519 organization key; chain verifier xác minh được cả hai dạng để không phá dữ liệu legacy.
- Với Phantom-signed event, confirm route cố ý không auto-anchor bằng demo organization key. UI chuyển sang bước ký Registry transaction riêng để giữ cùng một organization identity off-chain và on-chain.
- Đã thêm `src/lib/solana/phantom-registry.ts`: server fee-payer chuẩn bị `append_event`, partial-sign fee payer; Phantom ký organization account; server kiểm tra fee payer/program/PDA/accounts/instruction data/toàn bộ signatures trước khi relay Devnet.
- `verifyEventRegistryOnDevnet()` dùng Solana base58 `event.signerPublicKey` làm expected organization khi event được Phantom ký; deterministic signer chỉ còn fallback cho legacy/demo events.
- `appendEventRegistryOnDevnet()` từ server từ chối Phantom-signed event bằng `organization_wallet_transaction_required`, tránh vô tình ghi PDA bằng demo signer.
- Đã thêm `@solana/web3.js` chỉ làm bridge transaction tương thích injected Phantom provider; Registry/PDA core server vẫn giữ `@solana/kit`.
- Live `bun run phantom:smoke` đã thành công trên Devnet với signer test mô phỏng Phantom: transaction `3Bz8yG73LLSXtaBVnxJgKdifxYYgMjw4QebtKByb5uFCZaToE5RUkc6QuWBkMSGe9mEdbPmHjh8Z8opsM75SvvyF`, Registry `jsSKfDjJRRhLvMS4VAM5km1UTmzH93ynaK1RLGkJowL`, Event PDA `HhrKqvtgdcMypHjYdmqTf96gUKtjH3oa7vCyVr9tnQxU`; live verification pass toàn bộ authority/batch/event/organization/hash/status checks.

## Phase 9 — PDA lifecycle + correction workflow + demo provisioning

- Management UI/API gọi thật `set_event_status` với thứ tự `Solana PDA update -> live verification -> DB mirror`; nếu transaction fail thì DB không tự nhận lifecycle status.
- Lifecycle transition chỉ cho `confirmed -> revoked|superseded`; terminal status không thể hoàn tác. Retry idempotent: nếu PDA đã ở target status thì server chỉ verify/sync DB thay vì gửi transaction lần nữa.
- Live `bun run lifecycle:smoke` đã tạo proof riêng trên Devnet và chuyển `active -> revoked`: transaction `3Ggs3CX7Q1pFmp3QRydKTiGbBbncNEn5HdGdswhcDPcini5ZZLyWnFTrUdw1DUx2FQawLMf5Diu4sEmwaN25J46u`, Event PDA `4acfK8xsitA6tjzdSK4yX2zFX3qhgwwr7MVPPwWzbzux`; verifier pass `lifecycleStatus=true` và rerun `reused=true`.
- Public verify hiển thị rõ `REVOKED/SUPERSEDED` nhưng vẫn xác minh hash/signature/PDA; terminal event được giữ trong audit history thay vì bị ẩn/xóa.
- Hash-chain correction đã sửa để event mới nối hash của finalized event gần nhất, kể cả event đó đã revoked/superseded. Test `keeps terminal events in the hash chain when a correction is added` pass.
- Sau `Supersede`, management UI tự chuyển sang form tạo bản thay thế, prefill stage/organization/location + summary gợi ý; không copy raw documents hay timestamp. Bản mới vẫn là draft độc lập và phải qua AI/Phantom/Registry flow lại.
- Đã thêm `bun run auth:demo:provision`: idempotent upsert Supabase Auth user + demo organization + owner membership, verify password login thật; password không hard-code/không in ra và command từ chối chạy nếu thiếu `CHECK_DI_DEMO_OWNER_EMAIL/PASSWORD` hoặc password dưới 12 ký tự.
- `.env.example` mô tả credential provisioning nhưng real values chỉ được đặt trong ignored `.env.local`/shell environment.

## Phase 10 — Submission hardening

- Đã thêm `/judge` làm Judge Demo Console: tách rõ Product & Business Track và Technical / Blockchain Track nhưng dùng chung sample/event IDs; hiển thị live chain/Registry/program readiness và đường bấm trực tiếp tới consumer verify, management, Phantom linking và Solana Explorer.
- Landing navbar có link `Judge demo` để giám khảo không phải tự tìm entry point.
- Đã thêm `docs/CHECK-DI-SUBMISSION-DEMO-PLAYBOOK.md`: pitch một câu, demo 3 phút, kiến trúc hai lane, live proof IDs, provisioning flow, compliance boundary và final pre-submission gate.
- Production runtime smoke sau build: `/judge` trả HTTP `200`; `/verify/DUR-260830-01` trả HTTP `200` với Supabase/Devnet config hiện tại.
- Current full gate vẫn xanh: **31 tests / 0 fail / 113 assertions**, typecheck/build/db doctors/Phantom smoke/lifecycle smoke/diff-check đều pass.

## Phase 11 — BUIDL CTC / Creditcoin + Attestcoin adapter

- Giữ nguyên Solana Devnet lane của UniHackFest; Creditcoin là competition adapter dùng cùng Check-Di `eventHash`/batch lifecycle.
- Đã thêm `src/lib/creditcoin/config.ts`, `readiness.ts`, `GET /api/creditcoin/readiness` và `scripts/check-creditcoin-readiness.ts`; live probe xác nhận Proof API healthy, Sepolia chainKey `1` đang được attest và CC3 RPC trả đúng chain ID `102031`.
- Đã thêm `CheckDiSourceRegistry.sol` cho Sepolia và `CheckDiAttestedRegistry.sol` cho CC3. Target contract gọi Native Query Verifier `0x...0FD2`, decode receipt đã được proof bảo vệ, check đúng source emitter/event signature, chống replay và enforce previous hash/sequence.
- Hai contract compile pass bằng Solidity `0.8.30`. Gate app hiện tại sau UX supplier/client refresh: **46 tests / 0 fail / 154 assertions**, typecheck/build/diff-check pass; build có thêm `/supplier`, `/scan`, `GET /api/supplier/products`, đồng thời giữ `/judge/creditcoin` + readiness API.
- Đã thêm dependency-free `src/lib/creditcoin/proof-builder.ts` + `bun run creditcoin:proof -- <txHash> [--height=<block>]`: gọi current proof-by-tx API, poll attested height khi cần, validate chainKey/txHash/Merkle/continuity fields và map sang `CheckDiAttestedRegistry.ProofInput`.
- `docs/CHECK-DI-CREDITCOIN-ATTESTCOIN.md` khóa truth gate: chưa được gọi `Verified` cho tới khi có source tx thật, Attestcoin proof thật, CC3 execute tx thật và read-back `eventHash` khớp.

## Not implemented yet

- Chưa provision persistent demo owner thật vì chưa có email/password demo được cung cấp; vì vậy chưa bật `CHECK_DI_AUTH_MODE=required` mặc định. Local hiện dùng `optional`.
- Secure production operational policy cho wallet rotation/recovery; authenticated Phantom path đã có nhưng legacy/demo mode vẫn giữ deterministic signer khi auth context không bật.
- Edit/cancel draft UI chưa làm; `revoke/supersede` + correction replacement flow đã hoàn tất.
- OCR/LLM production thật chưa làm; hackathon demo cố ý dùng deterministic extraction để tránh credential/billing/network dependency.
- Production/local QR renderer độc lập provider ngoài.
- Browser smoke bằng extension Phantom thật đã hoàn tất thành công: owner session xác minh ví Phantom thật, ký event integrity proof, ký dual-signer transaction, và ghi nhận thành công Event PDA lên Solana Devnet với full verification.
- Creditcoin lane chưa có test-only EVM deployer/faucet funds trong local env, nên source contract chưa deploy Sepolia và target registry chưa deploy CC3; UI/API cố ý giữ trạng thái pending.
- Chưa có source emit → Attestcoin proof-builder → CC3 `executeJourneyProof` smoke end-to-end. Đây là gate kế tiếp trước khi đưa Creditcoin proof vào consumer verify.

Theo phạm vi hackathon hiện tại, map/GPS provider thật không bắt buộc; map mô phỏng được giữ để tập trung vào traceability, AI checks và integrity proof.

## Next milestone

**BUIDL CTC gate kế tiếp: tạo/fund test-only EVM wallet, deploy source contract lên Sepolia + attested registry lên CC3, rồi chạy một source event thật qua Attestcoin proof builder tới `executeJourneyProof` và read-back transaction evidence. UniHackFest core vẫn chỉ còn human-in-the-loop Phantom provisioning gate.**

Database architecture đã hoạt động trơn tru với Supabase Data API:

```text
PostgreSQL / Supabase
  -> organizations / batches / events
  -> documents metadata / extraction / AI checks
  -> integrity proof mirror

Solana Devnet
  -> event hash / previous hash
  -> organization signer
  -> Batch PDA / Event PDA
  -> lifecycle status proof
```
