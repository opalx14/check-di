# Check-Di — Two-Track Data Lanes

## Mục tiêu

Check-Di dự thi hai track nhưng vẫn là **một sản phẩm, một codebase, một Supabase/PostgreSQL database**.

Database được tổ chức thành hai data lane rõ ràng để mỗi track có câu chuyện riêng mà không nhân đôi dữ liệu hay tạo hai hệ thống độc lập.

```text
                         CHECK-DI CORE
                              │
                     Supabase / PostgreSQL
                              │
             ┌────────────────┴────────────────┐
             │                                 │
             ▼                                 ▼
   PRODUCT & BUSINESS LANE          TECHNICAL / BLOCKCHAIN LANE
   nghiệp vụ doanh nghiệp           integrity / proof
             │                                 │
 organizations / members              previous_event_hash
 batches                              event_hash
 trace events                         signer_public_key
 documents                            signature
 document extraction                  Solana program / PDA
 AI checks                            transaction / status
             │                                 │
             └──────── event_id / event_hash ──┘
                              │
                              ▼
                       Consumer Verify
```

## 1. Product & Business lane

Đây là phần dùng để kể bài toán doanh nghiệp và vận hành chuỗi cung ứng.

### Tables chính

- `check_di_organizations`
- `check_di_organization_members`
- `check_di_batches`
- `check_di_trace_events`
- `check_di_documents`
- `check_di_document_extractions`
- `check_di_ai_checks`

### Câu hỏi lane này trả lời

- Lô hàng là gì?
- Sản phẩm đến từ đâu?
- Đơn vị nào chịu trách nhiệm ở từng chặng?
- Chặng xảy ra ở đâu và khi nào?
- Chứng từ nào được đính kèm?
- AI phát hiện mismatch gì?
- Người vận hành nào được quyền xác nhận?

### Competition story

```text
Nhà vườn
  -> HTX / đóng gói
  -> kiểm định
  -> logistics
  -> retail
  -> consumer
```

AI chỉ hỗ trợ đọc và đối chiếu chứng từ. Organization vẫn là bên chịu trách nhiệm xác nhận dữ liệu.

## 2. Technical / Blockchain lane

Đây là phần dùng để kể bài toán integrity, tamper evidence và Solana.

### Dữ liệu chính

Cryptographic attestation của event:

- `previous_event_hash`
- `event_hash`
- `signer_public_key`
- `signature`
- `confirmed_at`

Solana proof mirror:

- `check_di_integrity_proofs`
- `program_id`
- `transaction_signature`
- `registry_address`
- `event_pda`
- `organization_public_key`
- `anchored_at`
- lifecycle/status

### Câu hỏi lane này trả lời

- Payload đã xác nhận có bị sửa không?
- Event có nối đúng hash của chặng trước không?
- Organization nào đã ký?
- Proof có tồn tại trên Solana Devnet không?
- PDA / transaction nào đại diện cho event?
- Proof đang `active`, `revoked` hay `superseded`?

### Competition story

```text
Business event confirmed
  -> canonical payload
  -> previous hash
  -> SHA-256 event hash
  -> organization signature
  -> Solana append_event
  -> Event PDA
  -> live RPC verification
```

## 3. Hai lane nối với nhau thế nào

Không dùng hai database riêng.

Bridge chính:

```text
batch_id
  + event_id
  + event_hash
```

`event_id` nối business event với proof mirror.

`event_hash` là fingerprint cryptographic của event đã xác nhận và là phần được kiểm tra với Solana.

Vì vậy:

```text
Business lane = dữ liệu gì đã xảy ra ngoài đời và ai chịu trách nhiệm
Blockchain lane = bằng chứng rằng bản ghi đã xác nhận không bị âm thầm thay đổi
```

Blockchain không thay thế business database và không tự chứng minh dữ liệu ngoài đời là đúng.

## 4. Competition-facing database views

Migration `202608310002_check_di_track_lanes.sql` tạo hai projection read-only:

### `check_di_business_track_v`

Dùng cho Product & Business Track:

- batch;
- organization;
- journey event;
- business payload;
- document count;
- AI warning/review count.

### `check_di_blockchain_track_v`

Dùng cho Technical Build Track:

- hash chain;
- signer;
- signature;
- Solana program;
- transaction;
- Batch/Event PDA;
- proof status.

Hai view chỉ là **projection để trình bày và query**. Canonical data vẫn nằm trong normalized core tables.

## 5. Vì sao không tạo hai database

Không chọn:

```text
business_db
blockchain_db
```

vì sẽ phát sinh:

- duplicate batch/event data;
- consistency problem;
- transaction synchronization;
- khó demo tamper detection;
- khó giải thích source of truth;
- tăng code không cần thiết cho hackathon.

Thiết kế được chốt:

```text
ONE DATABASE
  ├── Business lane
  └── Blockchain lane
          ↓
     Solana Devnet
```

## 6. Mapping theo hai track

### Product & Business Track

Ưu tiên trình bày:

```text
organizations
→ batches
→ journey
→ documents
→ AI checks
→ responsibility
→ consumer QR
```

### Technical Build Track

Ưu tiên trình bày:

```text
confirmed event
→ canonicalization
→ SHA-256
→ previous hash chain
→ organization signature
→ Solana Registry
→ Event PDA
→ live RPC verify
```

## Kết luận

Check-Di có **hai data lane nhưng một product core**.

Đây là ranh giới cần giữ xuyên suốt submission:

> Product & Business lane trả lời **"sản phẩm đã đi qua đâu, ai chịu trách nhiệm và chứng từ nói gì?"**
>
> Technical / Blockchain lane trả lời **"bản ghi đã xác nhận có toàn vẹn, được ai ký và proof trên Solana có khớp không?"**
