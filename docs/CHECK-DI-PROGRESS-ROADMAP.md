# Check-Di — Tổng hợp tiến độ, kiến trúc và định hướng tiếp theo

Cập nhật: **18/09/2026**

> Trạng thái mới nhất: Phase 5B đã hoàn tất custom `check_di_registry` vertical slice trên Solana Devnet. Program `9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi` đã build SBF + deploy thật, Batch/Event PDA đã được tạo và đọc ngược RPC. Product flow hiện ưu tiên custom Registry PDA làm proof chính; SPL Memo chỉ còn fallback.

Tài liệu này tổng hợp trạng thái hiện tại của Check-Di sau các vòng phát triển từ khởi tạo dự án đến workflow quản lý lô có persistence. Mục tiêu là để tiếp tục phát triển, demo và chuẩn bị submission mà không phải đọc lại toàn bộ lịch sử trao đổi.

---

## 1. Check-Di là gì?

Check-Di là web truy xuất nguồn gốc sản phẩm theo hành trình chuỗi cung ứng.

Mô hình người dùng cuối:

```text
Quét QR
  -> biết đây là lô hàng nào
  -> AI cho biết dữ liệu/chứng từ có điểm bất thường hay không
  -> xem sản phẩm đã đi qua những trạm nào
  -> xem tổ chức nào xác nhận từng trạm
  -> kiểm tra hash/chữ ký của từng chặng
```

Mô hình dữ liệu cốt lõi:

```text
Batch / QR
  -> Trace Events
  -> AI Document/Data Checks
  -> Organization Confirmation
  -> Canonical Payload
  -> SHA-256 Event Hash
  -> Ed25519 Signature
  -> Check-Di Registry Batch/Event PDA trên Solana Devnet
  -> Consumer Verify + live RPC verification
```

Check-Di **không dùng blockchain để khẳng định dữ liệu ngoài đời tự động là thật**. Mỗi tổ chức chỉ chịu trách nhiệm xác nhận dữ liệu của chặng mình phụ trách.

---

## 2. Một sản phẩm, hai track thi

Check-Di dùng **một codebase, một web, một core sản phẩm** cho cả hai track.

### Technical Build

Tập trung chứng minh:

- AI đối chiếu dữ liệu/chứng từ;
- canonical payload;
- SHA-256 hash chain;
- Ed25519 signature;
- QR/public verification;
- tamper detection;
- Solana Devnet integrity anchor;
- test kỹ thuật.

### Product & Business

Tập trung chứng minh:

- vấn đề hàng hóa không rõ nguồn gốc;
- minh bạch chuỗi cung ứng;
- user flow quét QR;
- trách nhiệm của từng bên;
- trải nghiệm người mua;
- khả năng pilot với nhà vườn/HTX/kiểm định/logistics/retail;
- GTM và business model.

Người dùng public không cần nhìn thấy khái niệm “hai track”. Hai track chỉ là cách trình bày cùng một sản phẩm khi submission/pitch.

---

## 3. Hành trình mẫu hiện tại

Sample batch dùng xuyên suốt demo:

- Sản phẩm: **Sầu riêng Ri6**
- Public ID: **`DUR-260830-01`**
- Tuyến: **Đắk Lắk → TP.HCM**

5 chặng mẫu:

1. **Thu hoạch**
   - Vườn Minh Phát
   - Krông Pắc, Đắk Lắk
   - 1.200 kg

2. **Đóng gói**
   - HTX Đắk Farm
   - Buôn Ma Thuột
   - 1.200 kg → 1.080 kg
   - khai báo hao hụt 10%

3. **Kiểm định**
   - Trung tâm QC Demo
   - kiểm tra mã lô/ngày lấy mẫu

4. **Vận chuyển**
   - Green Route Logistics
   - Đắk Lắk → TP.HCM

5. **Điểm bán**
   - Fresh Market Quận 7
   - TP.HCM

---

## 4. Logic integrity đã chốt

Mỗi chặng không phải một record rời nhau. Các chặng nối thành hash chain.

```text
canonical event payload
        +
previousEventHash
        |
        v
      SHA-256
        |
        v
    eventHash
        |
        v
organization signs eventHash with Ed25519
```

Chặng đầu:

```text
previousEventHash = GENESIS
```

Chặng tiếp theo:

```text
previousEventHash = eventHash của chặng trước
```

Ví dụ:

```text
GENESIS
   |
   v
Hash A + chữ ký Nhà vườn
   |
   v
Hash B + chữ ký HTX
   |
   v
Hash C + chữ ký Kiểm định
   |
   v
Hash D + chữ ký Logistics
   |
   v
Hash E + chữ ký Điểm bán
```

Nếu sửa payload lịch sử của chặng B nhưng giữ hash/chữ ký cũ:

```text
recomputedHash(B) != eventHash(B)
```

Chain verification sẽ fail.

---

## 5. Những phần đã hoàn thành

### 5.1 Foundation

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- Bun.
- Dev/start port `7314`.
- Dark UI.
- i18n Việt/Anh.
- Typography:
  - Be Vietnam Pro cho display;
  - Plus Jakarta Sans cho body/UI;
  - JetBrains Mono cho mã/hash.

### 5.2 Landing và demo traceability

- Landing chuyển hoàn toàn từ use case cũ sang truy xuất nguồn gốc.
- Hero mô tả đúng hành trình sản phẩm.
- Map hành trình mô phỏng.
- 5 marker tương ứng 5 chặng.
- Route animation/progress.
- Consumer QR demo.
- AI check result.
- Hash/signature view.
- Không tích hợp map/GPS provider thật vì không cần cho MVP hackathon.

### 5.3 Mobile UX

Mobile đã được rút gọn theo ưu tiên:

```text
QR -> AI -> Map -> Chi tiết khi cần
```

Các section giải thích dài chủ yếu để desktop/tablet; mobile ưu tiên thao tác quét và kết quả nhanh.

### 5.4 SHA-256 thật

`src/lib/traceability/server.ts` có:

- deterministic canonicalization;
- SHA-256 event hashing;
- chain verification;
- hash recomputation;
- previous-hash link verification.

### 5.5 Ed25519 signature thật trong demo

Mỗi organization có demo signing key deterministic để:

- ký event hash;
- export public key;
- verify signature lại server-side.

Đây là **demo/test keys**, không phải production identity keys.

### 5.6 AI validation fixture

`src/lib/ai/trace-checks.ts` hiện có deterministic checks:

#### Packing loss

```text
Input: 1200 kg
Output: 1080 kg
Declared loss: 10%
=> actual loss = 10%
=> matched
```

#### Chronology

Kiểm tra thời điểm kiểm định có diễn ra sau thu hoạch hay không.

Deterministic checks vẫn được giữ làm lớp rule-based. Phase 6 đã bổ sung pipeline chứng từ thật: PDF/JPG/PNG/WebP được lưu off-chain, tính SHA-256 và chạy **demo extraction deterministic** từ tên file + metadata chặng để mô phỏng structured fields trước khi cross-check với batch/event. Không cần API key, billing hoặc mạng ngoài; UI/public proof luôn ghi rõ đây là mô phỏng, không phải OCR/LLM production.

Một nguyên tắc đã khóa:

> AI chỉ cảnh báo/hỗ trợ đối chiếu, không có quyền tự xác nhận nguồn gốc và không tự chặn tổ chức ký.

### 5.7 Public verification route

Đã có:

```text
/verify/[publicId]
```

Ví dụ:

```text
/verify/DUR-260830-01
```

Trang verify hiển thị:

- thông tin batch;
- chain verification;
- AI checks;
- 5 chặng;
- previous hash;
- event hash;
- signer public key;
- Ed25519 signature;
- QR;
- JSON proof link.

### 5.8 API public

Đã có:

```text
GET /api/batches/[publicId]
GET /api/qr/[publicId]
```

API batch trả:

- batch;
- confirmed events;
- chain verification;
- trạng thái Solana anchor hiện tại.

Hiện:

```text
solanaAnchored = false
```

### 5.9 Workflow tạo lô có persistence

Đã có UI thật:

```text
/batches/new
```

Người dùng nhập:

- tên sản phẩm;
- public ID;
- nguồn gốc.

Sau khi tạo:

```text
/batches/[id]
```

### 5.10 Quản lý trace event

Trang `/batches/[id]` cho phép:

- xem batch;
- thêm trace event;
- chọn loại chặng;
- nhập organization;
- location;
- timestamp;
- summary;
- document names;
- packing metrics khi cần;
- inspection data khi cần.

### 5.11 Draft -> Confirm workflow

Chặng mới được tạo ở trạng thái:

```text
draft
```

Draft:

- chưa có event hash;
- chưa có chữ ký;
- chưa xuất hiện trong public verify.

Khi tổ chức bấm **Xác nhận & tạo hash**:

```text
load previous confirmed hash
  -> canonicalize event
  -> SHA-256
  -> Ed25519 sign
  -> status = confirmed
  -> persist
```

Public verification chỉ dùng confirmed events.

### 5.12 File-backed persistence

Hiện có persistence server-side tại:

```text
.data/check-di-store.json
```

`.data/` được Git ignore.

Repository có atomic write theo hướng:

```text
write temp file
  -> rename
```

Dữ liệu sống qua refresh/restart local/VPS.

Đây vẫn là persistence mặc định phù hợp zero-config local/hackathon. Phase 7A đã bổ sung `BatchRepository` contract và Supabase Data API adapter; runtime có thể chọn `file|supabase` qua `CHECK_DI_DB_DRIVER` mà không đổi UI/API/Solana flow. Remote Supabase project chưa được provision/apply migration trong repo hiện tại nên chưa gọi là production persistence live.

### 5.13 API quản trị

Đã có:

```text
POST /api/batches
GET  /api/manage/batches/[id]
POST /api/manage/batches/[id]/events
POST /api/manage/batches/[id]/events/[eventId]/confirm
```

### 5.14 Navbar demo workflow

Desktop landing có nút:

```text
Tạo lô
```

để vào workflow thật nhanh khi demo.

Mobile vẫn được giữ tối giản.

### 5.15 React Grab đã được loại bỏ

React Grab từng gây lỗi script/render trong Next.js.

Hiện:

- không còn inject script trong layout;
- không còn dependency React Grab trong package manifest;
- lockfile không còn React Grab;
- runtime không còn lỗi liên quan.

---

## 6. Các route hiện có

### Public

```text
/
/verify/[publicId]
```

### Batch management

```text
/batches/new
/batches/[id]
```

### API

```text
GET  /api/health
POST /api/batches
GET  /api/batches/[publicId]
GET  /api/qr/[publicId]
GET  /api/manage/batches/[id]
POST /api/manage/batches/[id]/events
POST /api/manage/batches/[id]/events/[eventId]/confirm
```

---

## 7. Tests hiện tại

### Traceability tests

`tests/traceability.test.ts`

Kiểm tra:

- build 5-stage chain;
- SHA-256 hash;
- Ed25519 signatures;
- chain verification;
- tamper detection;
- AI packing check;
- chronology check.

### Persistence tests

`tests/persistent-store.test.ts`

Kiểm tra:

- create batch;
- persist batch;
- add draft event;
- draft chưa có hash/signature;
- confirm mới tạo hash/signature;
- dữ liệu giữ qua repository instance mới;
- event sau tham chiếu event hash trước.

Trạng thái validation gần nhất:

```text
6 tests passed
28 assertions
bun run typecheck: passed
bun run build: passed
git diff --check: passed
```

---

## 8. Cái gì đang thật, cái gì vẫn là demo?

### Đã chạy thật trong prototype

- tạo batch từ UI;
- lưu batch qua restart;
- tạo draft trace event;
- xác nhận event;
- SHA-256;
- Ed25519 signature;
- previous-event hash chain;
- chain verification;
- tamper detection;
- public verify route;
- JSON proof API;
- QR encode verify URL;
- deterministic AI data checks;
- upload PDF/ảnh thật vào draft;
- magic-byte validation + private off-chain storage (`file|supabase`) + document SHA-256;
- deterministic document extraction demo không phụ thuộc API key;
- document/batch/event cross-check + management/public evidence UI.

### Vẫn là demo/prototype

- organization authentication;
- secure key storage;
- production identity/KYC;
- OCR/LLM production thật; hackathon demo hiện cố ý dùng deterministic extraction;
- Supabase remote deployment/migration + demo data migration; schema và runtime adapter đã có nhưng chưa provision project thật;
- Supabase Storage adapter/private bucket đã có nhưng chưa verify trên remote project thật; local fallback vẫn là `.data/documents`;
- on-chain status/revoke/supersede transaction từ management UI; instruction đã deploy nhưng app chưa gọi lifecycle instruction;
- organization wallet/Phantom signing; hiện vẫn dùng deterministic demo organization signer server-side;
- real-world GPS/map provider.

---

## 9. Data boundary

### Off-chain

Giữ off-chain:

- batch data;
- organization profile;
- raw documents;
- PII;
- AI extraction/check result;
- full trace event payload.

### On-chain hiện tại

Chỉ anchor dữ liệu integrity tối thiểu:

```text
batch identifier
trace event hash
organization/issuer key
version
status
timestamp
```

Không đưa raw document hoặc dữ liệu nhạy cảm lên chain.

---

## 10. Roadmap tiếp theo

### Đã hoàn tất — Solana custom registry vertical slice

```text
organization confirms event
  -> SHA-256 + Ed25519 off-chain proof
  -> initialize Batch Registry PDA nếu cần
  -> backfill confirmed Event PDA theo previous-hash chain
  -> append Event Proof PDA
  -> persist program / registry / event PDA metadata
  -> public verify đọc PDA live từ Devnet RPC
```

Program `9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi` đã `executable = true`; lô 1 chặng và lô mẫu 5 chặng đều đã smoke test thành công. RPC 429 được xử lý bằng retry/exponential backoff. SPL Memo chỉ còn fallback.

### Đã triển khai — Document upload + AI demo extraction pipeline

```text
upload PDF/image
  -> validate magic bytes + max 10 MB
  -> save raw file private off-chain (local mode 0600 hoặc Supabase private bucket)
  -> SHA-256 document thật
  -> deterministic demo extraction từ filename/metadata
  -> compare batch/event/document
  -> matched / warning / needs_review
  -> organization xác nhận
  -> document hash/evidence nằm trong signed event
  -> Registry PDA
```

UI/API/test đã hoàn tất và không còn external AI blocker. `bun run document:smoke` chạy toàn bộ demo extraction/cross-check không cần credential.

### Đã triển khai — PostgreSQL/Supabase schema + adapter foundation

Runtime persistence hiện theo mô hình:

```text
BatchRepository
  ├── file adapter       -> .data/check-di-store.json
  └── supabase adapter   -> Supabase Data API / PostgreSQL schema
```

`CHECK_DI_DB_DRIVER=file|supabase` chọn adapter mà không đổi domain contract, API, AI flow hoặc Solana anchor service.

Migration `supabase/migrations/202608300001_check_di_core.sql` tạo schema normalized:

```text
organizations
organization_members
batches
trace_events
documents
document_extractions
ai_checks
integrity_proofs
```

Database trigger khóa batch identity/payload đã confirmed và chỉ cho document/extraction/AI check mutate khi event còn draft. RLS đã bật. Raw document có cùng chiến lược adapter: `file` ở local hoặc private Supabase Storage bucket `check-di-documents` khi DB driver là Supabase; migration tạo bucket private, giới hạn 10 MB và whitelist PDF/JPEG/PNG/WebP. `bun run db:doctor` kiểm tra read-only Data API + bucket sau khi có credential. Chưa apply lên remote project vì chưa có Supabase URL/service-role credential trong repo; do đó đây là foundation đã test bằng mock Data API/Storage API, chưa phải remote database live.

### Ưu tiên 1 — Provision Supabase + migrate demo data

Khi có Supabase project thật:

```text
apply migration
  -> cấu hình CHECK_DI_SUPABASE_URL + service-role
  -> smoke CRUD/confirm trên DB thật
  -> migrate/seed DUR-260830-01
  -> switch CHECK_DI_DB_DRIVER=supabase
  -> document storage tự chuyển sang private Supabase bucket
  -> bun run db:doctor
```

Không cần đưa raw documents lên Solana hoặc public bucket; Supabase mode đã có private Storage adapter, còn local/VPS có persistent disk vẫn có thể ép `CHECK_DI_DOCUMENT_STORAGE_DRIVER=file`.

### Ưu tiên 2 — Organization authentication

Cần phân biệt:

- nhà vườn;
- HTX/đóng gói;
- kiểm định;
- logistics;
- retail.

Mỗi organization chỉ xác nhận chặng thuộc quyền của mình.

Demo key deterministic phải được thay bằng secure key/wallet flow trước production.

### Ưu tiên 3 — QR renderer local

Hiện QR image có thể dùng external provider.

Nên đổi sang local/server QR generation trước demo final để:

- không phụ thuộc mạng bên thứ ba;
- tránh privacy leak URL;
- ổn định khi pitch.

### Ưu tiên 4 — Demo script

Demo final nên ngắn và có câu chuyện rõ:

```text
1. Tạo lô
2. Nhà vườn thêm chặng và xác nhận
3. HTX thêm packing data
4. AI đối chiếu khối lượng
5. HTX vẫn là bên quyết định ký
6. Hash chain được nối
7. Event được ghi vào Check-Di Registry PDA trên Solana Devnet
8. Mở điện thoại quét QR
9. Consumer thấy hành trình + live PDA verification
```

### Ưu tiên 5 — Product & Business package

Chuẩn bị song song:

- pain point;
- target users;
- existing alternatives;
- why blockchain is needed only as integrity layer;
- pilot plan;
- onboarding flow;
- pricing/business model;
- GTM;
- compliance/data privacy.

---

## 11. Roadmap hiện tại sau UniHackFest hardening

Các milestone nền tảng trong roadmap cũ (Supabase, organization auth, Phantom signing, PDA lifecycle, private storage và submission polish) đã hoàn tất. Roadmap active chuyển sang:

```text
13A. Public signup + organization owner provisioning          COMPLETE
13B. Embedded browser Devnet wallet + ownership challenge    COMPLETE
13C. eventHash + dual-signer Registry E2E không cần Phantom  COMPLETE (live Devnet)
13D. Idempotency-Key + reconciliation                        COMPLETE
13E. AI/Data Check severity + evidence                         COMPLETE (production)
13F. deterministic PII redaction                               COMPLETE (production)
13G. independent Devnet verifier trên consumer verify          COMPLETE (production)
13H. consumer journey stepper                                   COMPLETE (production)
13I. i18n completeness                                          COMPLETE (production)
13J. audit/export dossier                                       COMPLETE (production)
14A. production proof storytelling trên landing               COMPLETE (production)
14B. landing i18n completeness                                  COMPLETE (production)
```

Phase 13A–13C giữ security boundary: service-role chỉ ở server; embedded-wallet secret chỉ ở browser, mã hóa PBKDF2/AES-GCM trong IndexedDB; server chỉ nhận public key/challenge signature và tiếp tục validate đầy đủ fee payer/program/PDA/accounts/instruction/signatures trước khi relay Registry transaction.

Hackathon auto-confirm signup là explicit fallback, mặc định OFF, chỉ chạy khi Supabase email delivery bị rate-limit và UI phải ghi đúng đây là test mode — không thay thế production email ownership verification.

Phase 13F chỉ redaction deterministic trên extracted/textual output: CCCD, phone, labeled bank account và personal-address trong field được đánh dấu. Raw PDF/image vẫn private off-chain, giữ nguyên bytes + SHA-256; consumer verify sanitize thêm legacy text/filename trước khi render public. Không claim OCR/visual redaction của file gốc.

Phase 13G thêm fresh Devnet verifier độc lập khỏi persisted mirror address/TXID: public route derive lại Registry/Event PDA từ public inputs + authority, đọc account trực tiếp Solana Devnet RPC và trả từng check integrity. Consumer verify có nút chủ động chạy lượt kiểm tra mới; sample DUR-260830-01 pass 5/5 Registry events cả local/live-RPC lẫn production browser smoke, không có console/network error.

Phase 13H thay timeline consumer tĩnh bằng mobile-first journey stepper. Người dùng có thể tap chặng hoặc dùng Chặng trước / Chặng tiếp; panel focus hiển thị organization/location/time, sanitized summary, AI/data warning, Devnet integrity và Event PDA. State helper được tách riêng và test edge case 0/1/N stages. Production browser smoke đã pass thao tác trực tiếp và giữ independent verifier 5/5.

Phase 13I hoàn thiện VI/EN cho public consumer flow /scan + /verify, gồm camera fallback, stepper, proof details, independent verifier và tours. Locale persist localStorage + SameSite cookie; dynamic verify đọc cookie server-side còn root layout không bị ép dynamic. Dictionary parity test khóa cấu trúc consumerScan/consumerVerify giữa vi/en. Commit 26 đã deploy production; browser smoke VI ↔ EN, stepper và independent verifier 5/5 đều pass, console/network 0 lỗi.

Phase 13J thêm public audit dossier JSON: export lifecycle/hash/signature/document SHA-256 + sanitized AI evidence và fresh Devnet verification, nhưng không export raw document/private path/extraction raw text hay canonical signed payload đầy đủ. Consumer verify có nút tải dossier VI/EN; endpoint `/api/verify/[publicId]/dossier` chạy no-store và attachment. Commit 27 đã deploy production, boundary/privacy + Devnet 5/5 pass. Smoke phát hiện legacy sample bị false-negative chain hash do PostgreSQL timestamptz đổi textual +07:00 thành +00:00; commit 28 đã hotfix verifier bằng các timestamp serialization semantic-equivalent đã biết, không nới lỏng signature/eventHash. Production hiện trả chain valid 5/5 + Devnet 5/5, và reconciliation read-only 49 batches báo 0 issue.

Phase 14A đưa các proof production lên landing bằng một khối riêng ngay sau hero. Khối này tách rõ sample marketing trên hero với **live proof batch `DUR-260830-01`**, hiển thị chain 5/5, Solana Devnet 5/5, independent fresh-RPC verifier và redacted audit dossier; CTA mở thẳng consumer proof hoặc tải audit JSON. Commit 30 đã deploy production với backup `/root/backups/check-di_backup_20260919_141405.tar.gz`; homepage/verify/dossier đều 200.

Phase 14B dọn nốt i18n landing: navbar “Kho sản phẩm / Quét QR”, hero proof summary, hai role paths và quick lookup chuyển sang dictionary VI/EN thay vì hard-code tiếng Việt. Thêm parity test cho nav/hero/rolePaths/quickLookup để tránh regression khi đổi locale. Commit 31–32 đã deploy production; backup gần nhất `/root/backups/check-di_backup_20260919_142208.tar.gz`, homepage/health/scan/verify đều 200 và production bundle chứa cả VI/EN copy mới.

---

## 12. Nguyên tắc không được phá ở các bước sau

1. Một sản phẩm, không fork hai app theo track.
2. AI không phải nguồn chân lý và không tự kết luận gian lận.
3. Organization chịu trách nhiệm ký/xác nhận chặng của mình.
4. Hash được sinh từ canonical payload + previous hash rồi mới ký hash.
5. Không overwrite lịch sử đã xác nhận âm thầm.
6. Raw documents và PII không đưa on-chain.
7. Chỉ hiển thị Solana `Verified/Anchored` khi có transaction thật.
8. Không cần map/GPS thật cho hackathon trừ khi sau này có lý do sản phẩm rõ ràng.
9. Mobile phải ưu tiên QR -> kết quả -> hành trình, không biến thành dashboard dài.
10. Mọi feature mới phải demo được bằng một hành vi người dùng thực tế.

---

## 13. Git history chính

```text
01. feat: khởi tạo nền tảng và giao diện demo Check-Di
02. feat: chuyển Check-Di sang truy xuất nguồn gốc theo hành trình
03. docs: đồng bộ trạng thái spec truy xuất nguồn gốc
04. feat: tối ưu trải nghiệm truy xuất mobile và giao diện song ngữ
05. feat: hoàn thiện vertical slice truy xuất và xác minh chuỗi
06. feat: triển khai workflow quản lý lô và persistence
07. feat: tích hợp integrity anchor trên Solana Devnet
08. feat: hoàn thiện custom Solana registry và xác minh PDA trên Devnet
```

Working tree sau commit `08` hiện chứa Phase 6 document AI và Phase 7A database adapter/schema; chưa commit trong trạng thái tài liệu này.

---

## 14. Điểm dừng hiện tại

Check-Di hiện đã vượt qua mức “landing/demo UI”.

Nó đã có một vertical slice có thể thao tác:

```text
Create Batch
  -> Add Draft Event
  -> Upload PDF/image + document SHA-256
  -> deterministic AI demo extraction + cross-check
  -> Organization Confirmation
  -> SHA-256
  -> Ed25519
  -> Persist
  -> Check-Di Registry Batch/Event PDA
  -> Public Verify đọc live Devnet RPC
```

Custom Solana vertical slice, document demo flow và PostgreSQL/Supabase adapter foundation đều đã hoàn tất ở code/test. Bước tiếp theo là apply migration lên Supabase project thật + migrate demo data, sau đó làm organization identity/wallet signing. OCR/LLM thật có thể nâng cấp sau hackathon; AI demo hiện chỉ hỗ trợ đối chiếu và organization vẫn là bên quyết định xác nhận.
