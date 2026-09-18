# Check-Di — Pitch Outline (UniHackfest 2026)

## Slide 1 — Hook
**Từ nơi sản xuất đến tay người mua — mỗi chặng đều có dấu vết để kiểm tra.**
Mỗi quả dưa hấu, trái sầu riêng trên kệ hàng đều mang một câu chuyện hành trình minh bạch không thể làm giả.

## Slide 2 — Problem
- **Tem QR truyền thống là tem tĩnh**: Chỉ trỏ về website hoặc dữ liệu tập trung do một bên tự khai.
- **Rủi ro sửa đổi âm thầm**: Không ai biết dữ liệu có bị chỉnh sửa sau khi xuất xưởng, không rõ trách nhiệm pháp lý của từng bên trung gian (đóng gói, vận chuyển, kiểm nghiệm).
- **Vấn đề tráo hàng**: Dễ lấy tem của lô đạt chuẩn dán vào lô kém chất lượng nếu không có bằng chứng hình ảnh nguồn gắn liền mật mã.

## Slide 3 — Product Solution
**Check-Di: Nền tảng truy xuất nguồn gốc nông sản đa bên, kết hợp AI đối chiếu chứng từ và bằng chứng toàn vẹn Solana Devnet.**
```text
Tạo lô / Catalog nông sản
  -> Chụp ảnh sản phẩm nguồn
  -> Ghi nhận từng chặng & đính kèm chứng từ số
  -> AI kiểm toán đối chiếu (Matched / Warning)
  -> Đơn vị tại chặng ký Ed25519 & Anchor Registry PDA
  -> Người tiêu dùng quét QR xem timeline & verified proof
```

## Slide 4 — Live Demo
- **Bảng điều khiển Giám khảo (`/judge`)**: Tích hợp 2 track trên cùng 1 nguồn dữ liệu vận hành.
- **Kho sản phẩm (`/supplier`)**: Quản lý lô, liên kết ví Phantom doanh nghiệp qua challenge `signMessage`.
- **Minh chứng sống Devnet**: Lô hàng mẫu `DUR-260830-01` với 5/5 chặng finalized, Event PDA thật dẫn trực tiếp tới Solana Devnet Explorer.

## Slide 5 — AI & Quality Gate
- Không claim "AI tự quyết định nguồn gốc", AI đóng vai trò **Audit Gate**:
  - Trích xuất cấu trúc chứng từ (hóa đơn, phiếu kiểm nghiệm, packing list).
  - Đối chiếu chéo logic nghiệp vụ: thời gian thu hoạch vs kiểm định, tỷ lệ hao hụt thực tế vs định mức, kiểm tra trùng lặp hoặc sai lệch mã lô.
  - Cảnh báo trước khi ký: Chỉ ra sai lệch để đơn vị phụ trách chặng rà soát trước khi đóng dấu bất biến.

## Slide 6 — Solana Architecture & Anti-Tamper
- **Lưu trữ tối thiểu (Minimal Integrity Anchor)**: PII và chứng từ gốc lưu trữ bảo mật off-chain (PostgreSQL/Supabase Storage); Solana chỉ lưu hash chuỗi SHA-256 canonical, authority, version, timestamp và status.
- **Khóa cứng ảnh nguồn**: Ảnh sản phẩm chụp tại vườn được băm SHA-256 và gắn vào payload chặng 1, ngăn chặn hoàn toàn việc tráo nông sản sau thu hoạch.
- **Vòng đời minh bạch**: Hỗ trợ `revoke` và `supersede` chặng bị lỗi mà không xóa lịch sử cũ; giao dịch Devnet được RPC verify trước khi cập nhật mirror database.

## Slide 7 — Users & Ecosystem
1. **Nhà vườn / HTX sản xuất**: Chụp ảnh nguồn, khởi tạo lô, ký chặng đầu tiên.
2. **Đơn vị sơ chế / Đóng gói / QC**: Tải chứng từ, chạy kiểm tra AI, ký nhận khối lượng & hao hụt.
3. **Đơn vị Logistics chuỗi lạnh**: Cập nhật hành trình vận chuyển, điều kiện nhiệt độ bảo quản.
4. **Hệ thống siêu thị / Bán lẻ**: Xác nhận nhận hàng tại điểm bán.
5. **Người tiêu dùng / Thanh tra**: Quét tem QR xem toàn bộ bằng chứng mà không cần cài ví Web3 hay tài khoản.

## Slide 8 — Business Model
- B2B Workflow SaaS theo số lượng lô phát hành hoặc gói doanh nghiệp / HTX.
- API tích hợp cho các sàn thương mại điện tử, hệ thống ERP / POS bán lẻ.
- Miễn phí 100% cho người tiêu dùng quét QR kiểm tra.
- **Không đầu cơ, không phát hành token, không rủi ro custody crypto**.

## Slide 9 — Compliance & Trust
- Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (không đưa thông tin cá nhân nông dân lên blockchain công khai).
- Tuân thủ tiêu chuẩn truy xuất nguồn gốc quốc gia (TCVN) và thông tư Bộ NN&PTNT.

## Slide 10 — Traction & Kế Hoạch Tiếp Theo
- Đã hoàn thiện Web App Next.js 16 + Solana Anchor Program live trên Devnet.
- Catalog hỗ trợ hơn 20 loại trái cây/nông sản chủ lực Việt Nam.
- Tìm kiếm đối tác HTX nông nghiệp và chuỗi bán lẻ nông sản sạch tại Đồng bằng sông Cửu Long / Tây Nguyên để triển khai thử nghiệm thực tế.
