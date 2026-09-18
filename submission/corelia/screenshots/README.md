# Bộ Ảnh Chụp Sản Phẩm Check-Di (UniHackfest 2026 — Corelia Submission)

Thư mục lưu trữ: `/Users/opalx14/GitHub/check-di/submission/corelia/screenshots/`

Bộ 6 ảnh chụp màn hình chất lượng cao được lưu trữ dưới định dạng **`.png` nguyên bản (lossless, sắc nét Retina desktop 2880px, dung lượng mỗi ảnh từ 370 KB đến 1.9 MB)**, hoàn toàn đáp ứng tiêu chuẩn chất lượng cao và trần dung lượng < 5 MB/ảnh của Corelia.

---

## Đề xuất ảnh Cover / Ảnh đại diện

- **File đề xuất**: `01-check-di-landing-overview.png`
- **Lý do**: Khung hình Hero bao quát đầy đủ thông điệp giá trị *"Từ nơi sản xuất đến tay người mua"*, giới thiệu cốt lõi hệ thống Check-Di (theo dõi từng chặng, AI đối chiếu chứng từ, mã QR người tiêu dùng) đi kèm thẻ lô hàng mẫu `Dưa hấu Hắc Mỹ Nhân · WM-260917-01` với 5 chặng hành trình trực quan (Nhà vườn → Đóng gói → Kiểm định → Vận chuyển → Điểm bán). Giám khảo nhìn ảnh đầu tiên là hiểu ngay bài toán và giải pháp sản phẩm.

---

## Danh sách 6 ảnh chụp theo thứ tự

### 01 — Landing / Product Overview
- **File**: `01-check-di-landing-overview.png` (1.8 MB)
- **Route được chụp**: `/`
- **Nội dung chính**:
  - Giao diện Hero giới thiệu định vị Check-Di: truy xuất nguồn gốc nông sản theo từng chặng hành trình thực tế.
  - Thẻ tóm tắt lô hàng mẫu `Dưa hấu Hắc Mỹ Nhân · WM-260917-01` (hành trình từ Long An về TP.HCM).
  - Trực quan hóa 5 mắt xích chuỗi cung ứng: Nhà vườn → Đóng gói → Kiểm định → Vận chuyển → Điểm bán.
  - Các nút tác vụ chính: Quét / tra cứu sản phẩm, Tôi là nhà cung cấp, chuyển đổi ngôn ngữ Việt / Anh.
  - Huy hiệu chính thức: `Dự án UniHackFest 2026` cùng các thẻ công nghệ cốt lõi (5 chặng truy xuất, AI đối chiếu, Solana proof).

### 02 — Supplier Inventory / Workspace
- **File**: `02-check-di-supplier-inventory.png` (623 KB)
- **Route được chụp**: `/supplier` (phiên đăng nhập doanh nghiệp `Nông trại Demo Check-Di`)
- **Nội dung chính**:
  - Kho sản phẩm và không gian làm việc của nhà cung cấp / tổ chức sản xuất.
  - Trạng thái ví Phantom doanh nghiệp: Đã liên kết với public key `FHAq...ULsF`, sẵn sàng ký xác nhận chặng và ký giao dịch Anchor.
  - Hàng metrics trực quan thời gian thực: Số sản phẩm (1), Số lô có Devnet proof (0), Trạng thái ví tổ chức (Đã nối).
  - Thẻ hành động đề xuất kế tiếp (Next Action Card): Gợi ý bước tiếp theo trong quy trình (Chụp ảnh & ký lô nguồn).
  - Danh mục sản phẩm đã tạo: Lô `Dưa hấu Hắc Mỹ Nhân · CD-260917-510731` tại Châu Thành, Long An kèm nút Quản lý chặng và QR công khai.
  - Nút kích hoạt tour hướng dẫn demo: `✨ Hướng dẫn kho sản phẩm`.

### 03 — Batch Creation & Source Visual
- **File**: `03-check-di-batch-creation-source.png` (1.9 MB)
- **Route được chụp**: `/batches/new`
- **Nội dung chính**:
  - Khung giao diện khởi tạo lô hàng mới tích hợp trực quan hóa sinh động.
  - Thẻ visual preview bên trái: Hiển thị hình ảnh nông sản thực tế chất lượng cao tự động đồng bộ theo loại nông sản được chọn.
  - Bộ chọn danh mục nông sản Việt Nam phong phú (>20 loại): Dưa hấu Hắc Mỹ Nhân, Thanh long ruột đỏ, Sầu riêng Ri6, Xoài cát Hòa Lộc, Cam sành, Bưởi da xanh, Mít Thái, Đu đủ ruột đỏ...
  - Form khai báo nghiệp vụ: Tên sản phẩm, Nguồn gốc xuất xứ (vùng trồng), Mã lô công khai, và nút CTA `Tạo và thêm hành trình`.

### 04 — Document & AI Data Check
- **File**: `04-check-di-document-ai-check.png` (373 KB)
- **Route được chụp**: `/batches/batch-demo-ri6-001` (quản lý chặng Đóng gói & Kiểm định)
- **Nội dung chính**:
  - Quản lý chi tiết các chặng chuỗi cung ứng của lô `Sầu riêng Ri6 · DUR-260830-01`.
  - Minh chứng chứng từ số đính kèm chặng: `Nhật ký thu hoạch`, `VietGAP #VG-2026`, `Packing list #PK-0830`, `Biên bản bàn giao lô`.
  - Kết quả kiểm tra đối chiếu dữ liệu AI: Khối lượng và tỷ lệ hao hụt thực tế (10.0%) khớp mức khai báo.
  - Liên kết mật mã minh bạch: Previous hash (`GENESIS` hoặc mã băm chặng trước), Event hash canonical SHA-256, Signer key Ed25519, và nút tương tác on-chain `Check-Di Registry · PDA` dẫn thẳng tới Solana Explorer.
  - Thao tác vòng đời (Lifecycle): Nút `Revoke event` và `Supersede event` xử lý hiệu chỉnh dữ liệu minh bạch.
  - Form thêm chặng mới bên phải để các bên tiếp theo trong chuỗi nhập thông tin và tải chứng từ.

### 05 — Consumer Verification Experience
- **File**: `05-check-di-consumer-verification.png` (1.6 MB)
- **Route được chụp**: `/verify/DUR-260830-01`
- **Nội dung chính**:
  - Trải nghiệm người tiêu dùng sau khi quét mã QR tem truy xuất trên bao bì trái cây.
  - Thẻ sản phẩm nổi bật: Ảnh chụp nguồn nông sản thực tế (Sầu riêng Ri6 tại vườn Đắk Lắk), mã lô `DUR-260830-01`, hành lang di chuyển `Krông Pắc, Đắk Lắk → Quận 7, TP.HCM` và mã QR công khai.
  - Huy hiệu bảo chứng độc lập: `AI không cảnh báo`, `5/5 Devnet proof`, `Chưa có cảnh báo`.
  - Thanh tiến trình mini 5 chặng: Thu hoạch → Đóng gói → Kiểm định → Vận chuyển → Điểm bán.
  - Danh sách chi tiết 5 chặng đã xác nhận với dấu kiểm xanh verified, kèm mốc thời gian và tên tổ chức chịu trách nhiệm (Vườn Minh Phát, HTX Đắk Farm, Trung tâm QC Demo, Green Route Logistics...).
  - Nút kích hoạt tour hướng dẫn người tiêu dùng: `✨ Hướng dẫn xác thực QR`.

### 06 — Judge Demo Console & Solana Proof
- **File**: `06-check-di-judge-solana-proof.png` (375 KB)
- **Route được chụp**: `/judge`
- **Nội dung chính**:
  - Bảng điều khiển riêng cho ban giám khảo UniHackfest 2026 quy tụ cả hai track vào một màn hình duy nhất:
    - **Product & Business Track**: Trách nhiệm tổ chức, bằng chứng off-chain, luồng quét QR người tiêu dùng, audit trail không thể tẩy xóa.
    - **Technical / Blockchain Track**: Chuỗi hash SHA-256 canonical, chữ ký ví Phantom của tổ chức, Program Anchor và Event PDA trên Solana Devnet.
  - Badge trạng thái **Live readiness**: xác nhận Program `9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi` đang executable trên Devnet, 5/5 finalized events và 5 Registry proof verified live.
  - Bảng số liệu snapshot: Finalized events (5), Chain (Valid/Check), Registry live (5/5), Documents, Terminal status, Program (Deployed).
  - Chi tiết mật mã sống: Program ID, Sample Event PDA (`DeG1qjLX...`), Organization signer, Event hash canonical SHA-256, nút mở JSON proof và link Solana Devnet Explorer.

---

## Tiêu chuẩn kỹ thuật đạt được
- Toàn bộ ảnh xuất ra dưới định dạng `.png` nguyên bản (lossless), độ phân giải cao sắc nét ở màn hình Retina (2880 x 1920).
- Dung lượng mỗi ảnh dao động từ **370 KB đến 1.9 MB** (rất an toàn so với trần 5 MB của Corelia).
- Không để lộ secret, DevTools, terminal, Next.js dev overlay, hay localhost browser address bar.
- Đầy đủ nút kích hoạt tour demo hướng dẫn người dùng thật ở các trang nghiệp vụ.
