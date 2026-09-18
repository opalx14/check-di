# Check-Di — Product & Business Track (UniHackfest 2026)

## 1. Bài Toán Thị Trường & Nỗi Đau (Problem)

1. **Tem QR "tự biên tự diễn"**: Hầu hết các giải pháp truy xuất nguồn gốc nông sản hiện nay chỉ tạo ra một mã QR tĩnh trỏ về cơ sở dữ liệu tập trung của một đơn vị duy nhất. Người mua không có cách nào biết được thông tin đó có bị sửa đổi sau thu hoạch hay không.
2. **Thiếu sự xác nhận dữ liệu độc lập theo từng bên**: Nông sản từ nông trại đến bàn ăn phải đi qua 4–5 mắt xích: Nhà vườn → Sơ chế đóng gói → Trạm kiểm nghiệm QC → Đơn vị vận chuyển → Nhà phân phối bán lẻ. Khi xảy ra sự cố chất lượng hoặc tồn dư thuốc bảo vệ thực vật, các bên thường đổ lỗi lẫn nhau vì không có nhật ký xác nhận độc lập tại từng chặng.
3. **Thiếu liên kết dữ liệu số với thực tế nguồn**: Dán tem đạt chuẩn vào hàng trôi nổi ngoài chợ mà dữ liệu tem không có cơ chế đối chiếu với ảnh hoặc chứng từ ghi nhận ban đầu.

---

## 2. Giải Pháp Sản Phẩm (Product Thesis)

Check-Di biến mỗi mã QR thành **một chuỗi sự kiện hành trình minh bạch với trách nhiệm và xác nhận dữ liệu theo từng bên**:
- **Khóa mã băm ảnh nguồn tại nông trại**: Nhà vườn chụp/tải ảnh nông sản tại thời điểm thu hoạch. Ảnh này được tính mã băm SHA-256 và khóa vào dữ liệu chặng đầu tiên để bảo toàn tính toàn vẹn số của tệp ảnh.
- **AI Audit Gate (Prototype)**: Trích xuất trường có cấu trúc từ chứng từ số (phiếu kiểm nghiệm chất lượng, biên bản đóng gói, hóa đơn xuất kho) theo cơ chế deterministic demo extraction và đối chiếu quy tắc nghiệp vụ với dữ liệu chặng để cảnh báo sớm các sai lệch (khối lượng, tỷ lệ hao hụt, mã lô).
- **Phân định xác nhận dữ liệu rõ ràng**: Mỗi đơn vị sử dụng chữ ký số Ed25519 (ví Phantom của doanh nghiệp) để xác nhận chặng của mình. Dữ liệu sau khi ký được neo mã băm toàn vẹn (integrity proof) lên Solana Devnet.
- **Trải nghiệm người tiêu dùng trực quan**: Người mua chỉ cần quét mã QR bằng camera điện thoại thông thường để xem toàn bộ timeline, danh tính đơn vị xác nhận từng chặng và bằng chứng mật mã — hoàn toàn không cần cài ví hay kiến thức crypto.

---

## 3. Khách Hàng Mục Tiêu & Mô Hình Vai Trò

- **Nhà vườn / Hợp tác xã (Producers)**: Cần công cụ số hóa đơn giản để minh chứng xuất xứ và nâng cao giá trị thương phẩm của nông sản sạch (hỗ trợ danh mục hơn 20 loại nông sản Việt Nam).
- **Cơ sở đóng gói & QC (Processors & Inspectors)**: Cần kiểm toán nhanh chứng từ và xác nhận tỷ lệ hao hụt/đạt chuẩn trước khi phân phối.
- **Doanh nghiệp Logistics**: Ghi nhận thời gian nhận/giao và điều kiện chuỗi lạnh.
- **Hệ thống phân phối & Siêu thị (Retailers)**: Cần hệ thống minh bạch để bảo vệ uy tín thương hiệu và hỗ trợ giải trình nguồn gốc.
- **Người tiêu dùng cuối**: Muốn an tâm về sản phẩm và biết rõ hành trình chuỗi cung ứng của sản phẩm mình mua.

---

## 4. Kiến Trúc Dữ Liệu Hai Làn (Two-Track Data Lanes)

Check-Di áp dụng kiến trúc **Một lõi dữ liệu duy nhất, hai góc nhìn chuyên biệt**:
- **Làn Product & Business (`check_di_business_track_v`)**:
  - Trả lời: *Điều gì đã xảy ra, ở đâu, do đơn vị nào phụ trách, kèm chứng từ nào, và AI có cảnh báo gì không?*
  - Bao gồm: Đơn vị tổ chức, thành viên, lô hàng, sự kiện hành trình, tệp chứng từ và kết quả đối chiếu AI rule.
- **Làn Technical & Blockchain (`check_di_blockchain_track_v`)**:
  - Trả lời: *Dữ liệu có bị sửa đổi sau khi ký không, chuỗi hash liên kết ra sao, và Event PDA nào trên Solana Devnet bảo chứng?*
  - Bao gồm: Previous hash, Event hash SHA-256, Signer public key, Signature, Event PDA và trạng thái vòng đời.

---

## 5. Mô Hình Kinh Doanh (Business Model & GTM)

1. **Mô hình Doanh Thu (Revenue Streams)**:
   - **B2B SaaS theo lô (Per-Batch / Volume Tier)**: Thu phí trên số lượng lô hàng được phát hành tem và neo proof on-chain (phù hợp HTX và doanh nghiệp xuất khẩu nông sản).
   - **Gói Đăng Ký Doanh Nghiệp (Enterprise Subscription)**: Dành cho chuỗi bán lẻ hoặc đơn vị xuất khẩu có nhu cầu tích hợp API với hệ thống ERP/SAP nội bộ và quản trị quyền tổ chức.
   - **Miễn phí cho người tiêu dùng**: Người quét mã QR tra cứu hoàn toàn miễn phí.
2. **Chiến Lược Thâm Nhập Thị Trường (Go-To-Market)**:
   - **Beachhead**: Bắt đầu bằng việc liên kết với các HTX sản xuất trái cây đặc sản có chỉ dẫn địa lý (Sầu riêng Krông Pắc Đắk Lắk, Dưa hấu Long An, Xoài cát Hòa Lộc Tiền Giang).
   - **Tích hợp thay vì thay thế**: Cung cấp API để kết nối trực tiếp với hệ thống tem in ấn và phần mềm kho vận sẵn có của doanh nghiệp.
3. **Kinh tế học không Token (No-Token Enterprise Model)**:
   - Check-Di hoàn toàn **không phát hành token**, không kinh doanh tiền mã hóa, không custody tiền tệ của người dùng.
   - Mọi chi phí transaction on-chain được Check-Di tài trợ qua cơ chế relayer fee-payer, doanh nghiệp chỉ thanh toán bằng tiền fiat qua hóa đơn dịch vụ phần mềm thông thường.

---

## 6. Định Hướng Tuân Thủ & Quyền Riêng Tư (Privacy & Compliance)

- **Quyền riêng tư (Privacy-by-Design)**: Thiết kế theo nguyên tắc bảo vệ quyền riêng tư, định hướng tương thích Nghị định 13/2023/NĐ-CP: toàn bộ dữ liệu định danh cá nhân (PII của nông dân, lái xe), hợp đồng kinh tế và chứng từ gốc được lưu trữ bảo mật off-chain trong cơ sở dữ liệu doanh nghiệp có phân quyền RLS (Row Level Security). Tuyệt đối không đưa PII lên blockchain công khai.
- **Tiêu chuẩn dữ liệu**: Thiết kế cấu trúc dữ liệu chặng và thuộc tính lô hàng hướng tới tương thích các tiêu chuẩn truy xuất nguồn gốc quốc gia (TCVN) và thông tư của Bộ NN&PTNT.
