# Check-Di — Pitch Outline (UniHackfest 2026)

## Slide 1 — Hook
**Từ nơi sản xuất đến tay người mua — mỗi chặng đều có dấu vết để kiểm tra.**
Mỗi quả dưa hấu, trái sầu riêng trên kệ hàng đều mang một câu chuyện hành trình minh bạch với dấu vết dữ liệu được kiểm tra.

## Slide 2 — Problem
- **Tem QR truyền thống là tem tĩnh**: Chỉ trỏ về website hoặc cơ sở dữ liệu tập trung do một bên tự khai.
- **Rủi ro sửa đổi âm thầm**: Người mua không có cách nào biết dữ liệu có bị chỉnh sửa sau khi xuất xưởng, và không rõ trách nhiệm xác nhận dữ liệu của từng bên trung gian (đóng gói, vận chuyển, kiểm nghiệm).
- **Vấn đề thiếu liên kết bằng chứng số**: Tem dán và thông tin công khai khó đối chiếu chéo xem có khớp với ảnh/tài liệu ghi nhận ban đầu hay đã bị âm thầm thay đổi.

## Slide 3 — Product Solution
**Check-Di: Nền tảng truy xuất hành trình sự kiện chuỗi cung ứng đa bên, kết hợp AI đối chiếu chứng từ và bằng chứng toàn vẹn Solana Devnet.**
```text
Tạo lô / Catalog nông sản
  -> Chụp/tải ảnh sản phẩm nguồn
  -> Ghi nhận từng chặng & đính kèm chứng từ số
  -> AI kiểm toán đối chiếu rule (Matched / Warning)
  -> Đơn vị tại chặng ký Ed25519 & Anchor Registry PDA
  -> Người tiêu dùng quét QR xem timeline & verified proof
```

## Slide 4 — Live Demo
- **Bảng điều khiển Giám khảo (`/judge`)**: Tích hợp 2 track trên cùng 1 nguồn dữ liệu vận hành.
- **Kho sản phẩm (`/supplier`)**: Quản lý lô, liên kết ví Phantom doanh nghiệp qua challenge `signMessage`.
- **Minh chứng sống Devnet**: Lô hàng mẫu `DUR-260830-01` với 5/5 chặng finalized, Event PDA thật dẫn trực tiếp tới Solana Devnet Explorer.

## Slide 5 — AI Audit Gate
- Không claim "AI tự quyết định nguồn gốc" hay "OCR/LLM production"; hiện tại là **Prototype Deterministic Demo Extraction + Rule Cross-Check**:
  - Trích xuất cấu trúc chứng từ (hóa đơn, phiếu kiểm nghiệm, packing list) theo quy tắc mô phỏng ổn định cho hackathon demo.
  - Đối chiếu chéo logic nghiệp vụ: thời gian thu hoạch vs kiểm định, tỷ lệ hao hụt thực tế vs định mức, kiểm tra trùng lặp hoặc sai lệch mã lô.
  - Cảnh báo trước khi ký: Chỉ ra sai lệch (Matched / Warning) để đơn vị phụ trách chặng rà soát trước khi đóng dấu bất biến.

## Slide 6 — Solana Architecture & Anti-Tamper
- **Lưu trữ tối thiểu (Minimal Integrity Anchor)**: PII và chứng từ gốc lưu trữ bảo mật off-chain (PostgreSQL/Supabase Storage); Solana chỉ lưu hash chuỗi SHA-256 canonical, authority, version, timestamp và status.
- **Khóa mã băm ảnh nguồn**: Ảnh sản phẩm chụp tại nguồn được tính mã băm SHA-256 và khóa vào canonical payload chặng 1. Mã băm này chứng minh tệp ảnh sau khi ký không bị âm thầm thay đổi hay tráo tệp số. *(Lưu ý: Mã băm bảo đảm tính toàn vẹn số của tệp dữ liệu đã ký, không tự chứng minh ảnh phản ánh đúng thực tế vật lý ngoài đời và không tự ngăn việc tráo hàng vật lý).*
- **Vòng đời minh bạch**: Hỗ trợ `revoke` và `supersede` chặng bị lỗi mà không xóa lịch sử cũ; giao dịch Devnet được RPC verify trước khi cập nhật mirror database.

## Slide 7 — Users & Ecosystem
1. **Nhà vườn / HTX sản xuất**: Chụp ảnh nguồn, khởi tạo lô, ký chặng đầu tiên.
2. **Đơn vị sơ chế / Đóng gói / QC**: Tải chứng từ, chạy kiểm tra AI rule, ký nhận khối lượng & hao hụt.
3. **Đơn vị Logistics chuỗi lạnh**: Cập nhật hành trình vận chuyển, điều kiện nhiệt độ bảo quản.
4. **Hệ thống siêu thị / Bán lẻ**: Xác nhận nhận hàng tại điểm bán.
5. **Người tiêu dùng / Thanh tra**: Quét tem QR xem toàn bộ bằng chứng mà không cần cài ví Web3 hay tài khoản.

## Slide 8 — Business Model
- B2B Workflow SaaS theo số lượng lô phát hành hoặc gói doanh nghiệp / HTX.
- API tích hợp cho các sàn thương mại điện tử, hệ thống ERP / POS bán lẻ.
- Miễn phí 100% cho người tiêu dùng quét QR kiểm tra.
- **Không đầu cơ, không phát hành token, không rủi ro custody crypto**.

## Slide 9 — Compliance & Trust
- **Quyền riêng tư (Privacy-by-Design)**: Thiết kế theo nguyên tắc bảo vệ quyền riêng tư, định hướng tương thích Nghị định 13/2023/NĐ-CP: toàn bộ dữ liệu cá nhân (PII nông dân, tài xế) và chứng từ gốc lưu trữ off-chain có kiểm soát quyền, chỉ neo hash toàn vẹn lên blockchain công khai.
- **Tiêu chuẩn dữ liệu**: Hướng tới tương thích tiêu chuẩn truy xuất nguồn gốc quốc gia (TCVN) và thông tư hướng dẫn của Bộ NN&PTNT về ghi nhận sự kiện chuỗi cung ứng.

## Slide 10 — Traction & Kế Hoạch Tiếp Theo
- Đã hoàn thiện Web App Next.js 16 + Solana Anchor Program live trên Devnet (MVP / live demo deployed production).
- Catalog hỗ trợ hơn 20 loại trái cây/nông sản chủ lực Việt Nam.
- Tìm kiếm đối tác HTX nông nghiệp và chuỗi bán lẻ nông sản sạch tại Đồng bằng sông Cửu Long / Tây Nguyên để triển khai thử nghiệm thực tế với dữ liệu thật có consent.
