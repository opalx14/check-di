# Check-Di — Product One-Pager

## Problem

Người tiêu dùng thường chỉ thấy một tem QR hoặc thông tin do một bên tự khai. Khi sản phẩm đi qua nhiều bên — nhà sản xuất, đóng gói, kiểm định, logistics, điểm bán — rất khó biết chặng nào đã được ai xác nhận và dữ liệu có bị sửa sau đó hay không.

## Solution

Check-Di tạo một hành trình truy xuất cho từng lô hàng:

`Batch/QR -> Trace Events -> AI Document Checks -> Participant Confirmation -> Hash/Integrity Proof -> Consumer Verify`

## Core experience

Người tiêu dùng quét QR và thấy:

- timeline theo từng chặng;
- bản đồ hành trình;
- tổ chức ghi nhận/xác nhận;
- chứng từ công khai phù hợp;
- trạng thái dữ liệu/hash;
- cảnh báo nếu có mismatch hoặc phiên bản bị thay thế.

## AI

AI đọc và đối chiếu phiếu kiểm nghiệm, packing list, hóa đơn, mã lô, số lượng, ngày tháng và địa điểm. AI chỉ cảnh báo sai lệch, không tự xác nhận nguồn gốc.

## Blockchain

Solana chỉ là integrity/status layer: giữ hash, authority, version, timestamp và status. Raw documents và dữ liệu nhạy cảm ở off-chain.

## Beachhead

MVP tập trung một vertical nông sản/lô hàng có chuỗi rõ ràng để demo end-to-end trước khi mở rộng.
