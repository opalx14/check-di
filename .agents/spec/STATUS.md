# Check-Di Status

## Current phase

**Phase 1 — Product foundation & traceability demo**

## Product core

Check-Di là web truy xuất nguồn gốc theo hành trình sản phẩm, dùng một core chung cho hai track UniHackFest 2026.

```text
Batch / QR
  -> Trace Events
  -> AI Document Checks
  -> Participant Confirmation
  -> Hash / Integrity Proof
  -> Consumer Verify
```

## Completed

- Next.js App Router + TypeScript + Tailwind + Bun foundation.
- Dev/start port `7314`.
- Landing đã chuyển hoàn toàn sang use case supply-chain traceability.
- Hero mô tả hành trình sản phẩm từ nơi sản xuất đến tay người mua.
- Demo mô phỏng có lô `DUR-260830-01` với 5 chặng:
  - thu hoạch;
  - sơ chế & đóng gói;
  - kiểm định;
  - vận chuyển;
  - điểm bán.
- Journey map full-width có marker theo chặng, đường tiến độ và hiệu ứng chạy hành trình.
- Click marker trên map đồng bộ với phần chi tiết chặng.
- Consumer QR view hiển thị bản đồ + timeline hành trình.
- Mỗi chặng mô phỏng organization, location, timestamp, event data, AI check và event hash.
- UI ghi rõ dữ liệu mô phỏng, không giả transaction/Devnet proof thật.
- Product rules, project map, governance, README và competition docs đã chuyển sang traceability core.
- Domain boundaries đã đổi sang batch / trace event / integrity model.
- Hai track dùng chung một core:
  - Technical Build: AI document check, hashing, QR, Solana integrity layer.
  - Product & Business: nguồn gốc hàng hóa, chuỗi cung ứng, user flow và GTM.

## Validation status

- Bun local: `1.2.18`.
- Next.js dev/start port: `7314`.
- `bun run typecheck`: passed sau product pivot.
- `bun run build`: passed sau product pivot.
- `GET /`: `200` trên runtime local.
- `GET /api/health`: `200`, phase `traceability-demo`.
- `git diff --check`: passed cho phạm vi traceability đã commit.

## Not implemented yet

- Database schema/persistence thật.
- Create batch flow thật.
- Add trace event flow thật.
- Document upload/storage thật.
- AI model/document extraction thật.
- Organization authentication/sign-off.
- QR generation/public verify route thật.
- Canonical hashing utility.
- Anchor program source code.
- Solana Devnet deployment/transactions.
- Automated tests.

Theo phạm vi hackathon hiện tại, map/GPS provider thật không phải yêu cầu bắt buộc; demo map mô phỏng được giữ để tập trung vào core traceability, AI check và integrity proof.

## Next milestone

**Phase 2 — First real vertical slice**

```text
create sample batch
  -> add packing trace event
  -> run deterministic document-check fixture
  -> organization confirms event
  -> canonicalize + SHA-256 hash
  -> public /verify/[publicId] timeline
```

Sau khi vertical slice off-chain chạy ổn mới nối `check_di_registry` lên Solana Devnet.
