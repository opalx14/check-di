# Check-Di — Technical Build Track (UniHackfest 2026)

## 1. Mục Tiêu Kỹ Thuật (What Check-Di Proves)

Check-Di chứng minh tính khả thi của mô hình truy xuất nguồn gốc tối giản thông qua bản dựng thực tế (MVP / live demo deployed production):
1. **Sản phẩm chạy thực tế**: Web application Next.js 16 App Router, React 19, TypeScript, Bun runtime.
2. **Cấu trúc dữ liệu bất biến (Hash-Linked Trace Events)**: Mỗi chặng được mã hóa canonical JSON payload, băm SHA-256 kết nối chặt chẽ với mã băm chặng trước (`GENESIS` ở chặng 1).
3. **Cơ chế khóa mã băm ảnh nguồn (Source Photo Locking)**: Ảnh chụp nông sản tại nguồn được tính mã băm SHA-256 và gắn vào payload chặng 1, đảm bảo tính toàn vẹn số của ảnh/payload sau xác nhận.
4. **AI Audit Gate (Deterministic Extraction & Rule Cross-Check)**: Trích xuất trường có cấu trúc từ chứng từ số (PDF/ảnh) theo cơ chế deterministic DEMO EXTRACTION và chạy kiểm toán chéo (kiểm tra thứ tự thời gian, hao hụt định mức, lệch mã lô) trả về kết quả `Matched` hoặc `Warning`.
5. **Solana Anchor Program Deployed Live trên Devnet**:
   - Program ID: `9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi`
   - Quản lý trạng thái và tính toàn vẹn bằng Program Derived Addresses (PDAs).
6. **Mô Hình Ký Kép (Dual-Signer Architecture)**: Doanh nghiệp ký ủy quyền bằng ví Phantom Ed25519; server đóng vai trò fee-payer relayer hỗ trợ chi phí gas mà không nắm giữ private key của doanh nghiệp.
7. **Quản Lý Vòng Đời Bất Biến (Revoke & Supersede Lifecycle)**: Xử lý hiệu chỉnh sai lệch thông qua transaction `set_event_status` được verify live qua RPC Solana trước khi cập nhật database mirror.

---

## 2. Luồng Thực Thi Kỹ Thuật (Execution Flow)

```text
1. Khởi tạo lô hàng (Batch Metadata + Catalog Nông sản)
   ↓
2. Chụp/tải ảnh nguồn (Source Photo) → Hash SHA-256 → Khóa vào Draft Event #1
   ↓
3. Tải chứng từ số (PDF/Image) → Trích xuất cấu trúc (deterministic DEMO EXTRACTION)
   ↓
4. AI Cross-Check Rule (Định mức hao hụt, thứ tự thời gian, đối chiếu mã lô)
   ↓
5. Tổ chức ký xác nhận:
   - Chuẩn hóa canonical JSON payload
   - Previous Event Hash + Payload Hash → Event Hash (SHA-256)
   - Ví Phantom của tổ chức ký Ed25519 lên Event Hash
   ↓
6. Relayer Transaction:
   - Ghép chữ ký Organization + Server Fee Payer
   - Gửi chỉ thị `append_event` lên Anchor Program trên Solana Devnet
   - Khởi tạo Event PDA trên chuỗi
   ↓
7. Người tiêu dùng tra cứu:
   - Quét QR hoặc nhập Public ID
   - Hệ thống tự động recompute toàn bộ chuỗi hash từ sự kiện đã lưu
   - Kiểm tra đối chiếu Event Hash với Event PDA trên Solana Devnet RPC
```

---

## 3. Kiến Trúc Solana Anchor Program (`check_di_registry`)

- **Batch Registry PDA**:
  - Seeds: `[b"batch_registry", authority.key().as_ref(), &batch_hash]`
  - Lưu trữ: `authority`, `batch_hash`, `event_count`, `created_at`, `status`.
- **Event PDA**:
  - Seeds: `[b"event", registry.key().as_ref(), event_authority.key().as_ref(), &event_hash]`
  - Lưu trữ: `registry`, `event_authority`, `event_hash`, `previous_event_hash`, `organization_hash`, `stage`, `status` (`Active` / `Revoked` / `Superseded`), `created_at`.
- **Bảo Vệ Tính Toàn Vẹn**:
  - Không thể chèn đè một Event PDA đã tồn tại.
  - Sự kiện bị `revoke` hoặc `supersede` vẫn tồn tại vĩnh viễn trên blockchain để lưu vết kiểm toán (audit trail), trạng thái vòng đời chuyển thành `Revoked` hoặc `Superseded`.

---

## 4. Minh Chứng Kỹ Thuật Sống (Live Technical Evidence)

- **Solana Devnet Program**:
  - Address: `9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi`
  - Explorer: `https://explorer.solana.com/address/9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi?cluster=devnet`
- **Sample Verified Batch (`DUR-260830-01`)**:
  - Finalized Events: 5/5
  - Sample Event PDA (chặng 5): `DeG1qjXLjHBWuym3dtDtkRQYXoULeJFao2JqQK9DiHvL`
  - Sample Event PDA (chặng 1): `HKLXPSjtEjscEUkBUnBW5Sz5sS3iWyoT48CJH1ZXbJe4`
  - Sample Transaction: `3Bz8yG73LLSXtaBVnxJgKdifxYYgMjw4QebtKByb5uFCZaToE5RUkc6QuWBkMSGe9mEdbPmHjh8Z8opsM75SvvyF`
- **Tự Động Hóa & Kiểm Thử (Automated Verification)**:
  - 13 test suites với 49 test cases bao phủ toàn bộ luồng nghiệp vụ, hashing, ví Phantom, RLS database và scanner.
  - Chạy smoke tests: `bun run phantom:smoke`, `bun run lifecycle:smoke`, `bun test`.

---

## 5. Tiêu Chuẩn Hoàn Thiện (Definition of Done)

- [x] Không sử dụng mock transaction giả dạng proof thật.
- [x] Đã deploy Solana Anchor Program live trên Devnet.
- [x] Ký ví Phantom hai chiều (challenge signMessage + tx sign).
- [x] Hỗ trợ tour onboarding tương tác bám sát DOM thật trên toàn bộ các route.
- [x] Minh bạch giới hạn: Demo extraction và rule AI, không claim OCR/LLM production khi chưa có external model integration.
- [x] Hoàn thành build, typecheck và deploy production thành công.
