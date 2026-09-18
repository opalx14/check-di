# Check-Di — Demo Script (UniHackfest 2026)

## 75–90 Giây Trình Diễn Cốt Lõi

1. **Vấn đề (10s)**:
   > "Người tiêu dùng thấy tem QR, nhưng phần lớn QR hiện nay chỉ trỏ tới thông tin tĩnh do một bên tự khai, không ai chứng minh được dữ liệu có bị sửa sau khi xuất xưởng hay không."

2. **Khởi tạo & Chọn Lô Hàng (15s)**:
   - Bắt đầu tại `/judge` hoặc `/supplier`.
   - Giới thiệu khả năng tạo lô với **danh mục hơn 20 loại nông sản Việt Nam** (Dưa hấu Hắc Mỹ Nhân, Sầu riêng Ri6, Xoài cát, Thanh long...).
   - Mở lô kiểm thử mẫu: `Sầu riêng Ri6 · DUR-260830-01` (354 km từ Đắk Lắk về TP.HCM).

3. **Hành Trình Chuỗi Cung Ứng & Khóa Mã Băm Ảnh Nguồn (20s)**:
   - Cho thấy 5 chặng hành trình: `Nhà vườn → Đóng gói → Kiểm định → Vận chuyển → Điểm bán`.
   - **Tính năng khóa mã băm ảnh nguồn**: Ảnh sản phẩm được gán mã băm SHA-256 và khóa vào canonical event payload ngay khi ký xác nhận; tệp ảnh số sau khi đã ký không thể bị âm thầm thay thế mà không làm sai lệch proof (lưu ý: mã băm bảo đảm tính toàn vẹn tệp số, không thay thế việc kiểm định vật lý ngoài đời).

4. **AI Đối Chiếu Chứng Từ Số (15s)**:
   - Mở chặng Đóng gói / Kiểm định: tài liệu đính kèm (phiếu kiểm định, packing list) có mã băm SHA-256 độc lập.
   - Nhãn minh bạch **DEMO EXTRACTION** trích xuất cấu trúc trường từ file mẫu.
   - Hệ thống AI chạy rule kiểm toán đối chiếu mẫu (demo fixture/rules):
     - **Matched**: Tỷ lệ hao hụt thực tế 10.0% khớp mức khai báo; khối lượng khớp dữ liệu chặng.
     - **Warning**: Cảnh báo khi phát hiện lệch mã lô hoặc sai thứ tự thời gian thu hoạch so với kiểm nghiệm.

5. **Xác Nhận & Ký Giao Dịch Solana Devnet (15s)**:
   - Tổ chức tại chặng dùng ví Phantom ký Ed25519 lên `eventHash`.
   - Transaction được ghi nhận lên custom Anchor Program trên Solana Devnet:
     - Batch Registry PDA + Event PDA được khởi tạo thật trên Devnet.
     - Trình diễn liên kết trực tiếp tới Solana Explorer (`9sNDit...`).

6. **Trải Nghiệm Quét QR Người Tiêu Dùng (10s)**:
   - Truy cập `/scan` (camera hoặc nhập mã công khai `DUR-260830-01`) → mở `/verify/DUR-260830-01`.
   - Người mua xem toàn bộ timeline, ảnh nguồn đã khóa hash, đơn vị xác nhận từng chặng, và trạng thái `CHECK-DI REGISTRY · 5/5 VERIFIED`.

---

## Câu Chốt (Closing Line)

> *"Check-Di không tuyên bố blockchain tự biến dữ liệu sai thành đúng. Check-Di minh bạch hóa ai đã ghi nhận điều gì, ở chặng nào, với chứng từ nào, và bảo đảm bằng mật mã rằng dữ liệu đã xác nhận không thể bị âm thầm sửa đổi."*
