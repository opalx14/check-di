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
- Mobile UX tối giản thành `QR -> AI quick check -> Map`; 5 chặng chỉ mở khi người dùng yêu cầu, còn các section giải thích dài chỉ hiển thị từ tablet/desktop.
- Mỗi chặng mô phỏng organization, location, timestamp, event data, AI check và event hash.
- UI ghi rõ dữ liệu mô phỏng, không giả transaction/Devnet proof thật.
- Product rules, project map, governance, README và competition docs đã chuyển sang traceability core.
- Domain boundaries đã đổi sang batch / trace event / integrity model.
- Nâng cấp giao diện Bản đồ hành trình (Geographic Transit Corridor Visualizer):
  - Thay thế đường cong đồ thị hình sin bằng hành lang vận chuyển tự nhiên mượt mà (Đắk Lắk → QL14 → TP.HCM);
  - Bổ sung Telemetry HUD thời gian thực: khoảng cách 354km, thời gian vận chuyển 14.5h, giám sát chuỗi lạnh 18°C;
  - Luminous route beam với hiệu ứng laser gradient và contour địa hình cao nguyên - đồng bằng;
  - Waypoint markers hiển thị rõ trạng thái xác nhận (micro checkmark) và beacon định vị không bị che khuất icon.
- Nâng cấp toàn diện giao diện Quét QR Người Tiêu Dùng (Digital Product Passport):
  - Thẻ chứng chỉ nguồn gốc kỹ thuật số sang trọng với viền gradient holographic;
  - Khung AI Radar đối chiếu 5/5 chứng từ (khớp mã lô, ngày lấy mẫu, dung sai hao hụt 10%, 0% dư lượng BVTV);
  - Timeline 5 chặng tương tác trực quan kèm chứng từ số (VietGAP, Packing list, QC analysis, Vận đơn xe lạnh);
  - Hệ thống sao chép hash on-chain Solana Devnet tức thì với thông báo toast phản hồi.
- Nâng cấp hệ thống Typography chuẩn AI & Web3 hiện đại:
  - Font Display: `Be Vietnam Pro` (tối ưu nét chữ tiếng Việt chuẩn xác, thẩm mỹ cao);
  - Font UI & Body: `Plus Jakarta Sans` (hiện đại, geometric tech);
  - Font Code & Hash: `JetBrains Mono` (dành cho mã lô, transaction hash, timestamp, badge chỉ số).
  - Cấu hình Tailwind v4 `@theme` và font feature smoothing tối ưu cho UI tối màu (dark theme).


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
