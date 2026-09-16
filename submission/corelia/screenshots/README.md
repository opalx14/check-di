# Bộ Ảnh Chụp Sản Phẩm Check-Di (UniHackfest 2026 — Corelia Submission)

Thư mục lưu trữ: `/Users/opalx14/GitHub/check-di/submission/corelia/screenshots/`

Bộ 6 ảnh chụp màn hình chất lượng cao được lưu trữ dưới định dạng **`.png` nguyên bản (lossless, sắc nét Retina desktop 2880px, dung lượng mỗi ảnh từ 200 KB đến 809 KB)**, hoàn toàn đáp ứng trần dung lượng < 5 MB/ảnh của Corelia.

---

## Đề xuất ảnh Cover / Ảnh đại diện

- **File đề xuất**: `01-check-di-product-overview.png`
- **Lý do**: Khung hình Hero bao quát đầy đủ thông điệp giá trị *"Từ nơi sản xuất đến tay người mua"*, giới thiệu cốt lõi hệ thống Check-Di (theo dõi từng chặng, AI kiểm tra chứng từ, mã QR người tiêu dùng) đi kèm thẻ lô hàng mẫu sầu riêng Ri6 (`DUR-260830-01`) với 5 chặng hành trình trực quan. Giám khảo nhìn ảnh đầu tiên là hiểu ngay bài toán và giải pháp sản phẩm.

---

## Danh sách 6 ảnh chụp theo thứ tự

### 01 — Landing / Product Overview
- **File**: `01-check-di-product-overview.png` (507 KB)
- **Route được chụp**: `/`
- **Nội dung chính**:
  - Giao diện Hero giới thiệu định vị Check-Di: truy xuất nguồn gốc nông sản theo từng chặng hành trình thực tế.
  - Thẻ tóm tắt lô hàng mẫu `Sầu riêng Ri6 · DUR-260830-01` (354 km từ Đắk Lắk về TP.HCM).
  - Trực quan hóa 5 mắt xích chuỗi cung ứng: Nhà vườn → Đóng gói → Kiểm định → Vận chuyển → Điểm bán.
  - Các nút tác vụ chính: Quét thử một lô hàng, Xem hành trình hoạt động.

### 02 — Judge Demo Console
- **File**: `02-check-di-judge-console.png` (384 KB)
- **Route được chụp**: `/judge`
- **Nội dung chính**:
  - Bảng điều khiển riêng cho ban giám khảo UniHackfest 2026 quy tụ cả hai track vào một màn hình:
    - **Product & Business Track**: Trách nhiệm tổ chức, bằng chứng off-chain, luồng quét QR người tiêu dùng, audit trail.
    - **Technical / Blockchain Track**: Chuỗi hash SHA-256 canonical, chữ ký ví Phantom của tổ chức, Program Anchor và Event PDA trên Solana Devnet.
  - Badge trạng thái **Live readiness**: xác nhận Program `9sNDit...` đang executable trên Devnet, 5/5 finalized events và 5 Registry proof verified live.
  - Hàng metrics quan trọng: Finalized events (5), Chain (Valid/Check), Registry live (5/5), Documents, Program (Deployed), kèm Program ID, Sample Event PDA, Organization signer và Event hash.

### 03 — Consumer Verification
- **File**: `03-check-di-consumer-verification.png` (224 KB)
- **Route được chụp**: `/verify/DUR-260830-01`
- **Nội dung chính**:
  - Màn hình người tiêu dùng nhận được sau khi quét mã QR trên bao bì sản phẩm.
  - Thông tin lô hàng: Mã lô `DUR-260830-01`, `Sầu riêng Ri6`, tuyến hành trình `Krông Pắc, Đắk Lắk → Quận 7, TP.HCM` và mã QR công khai.
  - Huy hiệu xác thực cao nhất: `CHECK-DI REGISTRY · 5/5 VERIFIED`.
  - Khối tóm tắt tính toàn vẹn chuỗi hash & kết quả đối chiếu dữ liệu AI.
  - Danh sách timeline chặng hành trình (`5 trạm · 5 lần xác nhận · SHA-256 + Ed25519`), mở rộng chi tiết chặng Thu hoạch với bằng chứng Event PDA dẫn trực tiếp tới Solana Explorer.

### 04 — Supply Chain Journey
- **File**: `04-check-di-supply-chain-journey.png` (809 KB)
- **Route được chụp**: `/` (khu vực Bản đồ hành trình tương tác `InteractiveSandbox`)
- **Nội dung chính**:
  - Bản đồ hành trình địa lý công nghệ cao thể hiện hành lang vận chuyển nông sản từ Tây Nguyên về TP.HCM qua các cao trình và quốc lộ (QL26 → QL14 → ĐT741 → QL13 / Q7).
  - Thanh đo đạc viễn thám thực tế: Cự ly 354 km, thời gian 8h 45m, điều kiện chuỗi lạnh 12°C - 15°C, tiến độ 5/5 chặng.
  - Danh sách 5 bước chặng: 1. Thu hoạch nông trại → 2. Đóng gói & sơ chế → 3. Kiểm định chất lượng → 4. Vận chuyển chuỗi lạnh → 5. Phân phối & điểm bán.
  - Thẻ thanh tra chi tiết (Checkpoint Inspector) ghi nhận đơn vị xác nhận, dấu mốc thời gian, tọa độ GPS và thông số bảo quản.

### 05 — Document / AI Data Check
- **File**: `05-check-di-document-check.png` (337 KB)
- **Route được chụp**: `/batches/batch-224ddb55-c1aa-4885-8d80-203c68c7c956` (quản lý chặng Đóng gói)
- **Nội dung chính**:
  - Minh chứng chứng từ số đính kèm chặng: file `DUR-260830-01_HTX-Dak-Farm_1080kg_PK-0830.pdf` với mã băm mật mã SHA-256 độc lập.
  - Nhãn minh bạch `DEMO EXTRACTION`: trích xuất trường dữ liệu có cấu trúc (loại chứng từ, số lô, khối lượng 1080 kg, mức độ tin cậy 50%).
  - Trực quan hóa kết quả đối chiếu AI:
    - **Matched**: Tỷ lệ hao hụt thực tế 46.0% khớp mức khai báo; khối lượng 1080 kg khớp dữ liệu chặng.
    - **Warning / Mismatch**: Cảnh báo bất thường mã lô nhận diện từ chứng từ không khớp mã lô hiện tại, hỗ trợ phát hiện sai lệch dữ liệu trước khi xác nhận.
  - Liên kết mật mã: Previous hash, Event hash, khóa công khai người ký, chữ ký Ed25519 và nút ghi nhận/thao tác PDA.

### 06 — Solana Integrity Proof
- **File**: `06-check-di-solana-integrity-proof.png` (214 KB)
- **Route được chụp**: `/verify/DUR-260830-01` (khu vực chi tiết mật mã on-chain)
- **Nội dung chính**:
  - Trình bày trực tiếp các trường mật mã bảo vệ tính toàn vẹn của từng sự kiện chặng:
    - `Previous hash`: `GENESIS` (liên kết chuỗi không thể sửa đổi).
    - `Event hash`: `ce3c3e792067c3...0a7673062a` (mã băm SHA-256 của toàn bộ payload chuẩn hóa).
    - `Signer public key`: `MCoWBQYDK2VwAy...TkBeE55MhU` (danh tính đơn vị tại chặng).
    - `Ed25519 signature`: `8mU57KH1Nfhy0j...St54nkMFDQ` (chữ ký số bảo đảm nguồn gốc).
  - Nút kiểm tra on-chain sống: `Check-Di Registry · Event PDA HKLXPSjtEj...H1ZXbJe4` kết nối trực tiếp đến Solana Devnet Explorer.
  - Trạng thái các chặng kế tiếp trong chuỗi cung ứng được bảo toàn cấu trúc toàn vẹn.

---

## Tiêu chuẩn kỹ thuật đạt được
- Toàn bộ ảnh xuất ra dưới định dạng `.png` nguyên bản (lossless), độ phân giải cao sắc nét ở màn hình Retina.
- Dung lượng mỗi ảnh dao động từ **214 KB đến 809 KB** (rất an toàn so với trần 5 MB của Corelia).
- Không để lộ secret, DevTools, terminal, Next.js dev overlay, hay localhost browser address bar.
