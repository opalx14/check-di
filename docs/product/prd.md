# Check-Di — PRD Foundation

## Product goal

Cho phép một lô sản phẩm được theo dõi từ nơi sản xuất đến điểm bán, với mỗi chặng có dữ liệu, chứng từ, đơn vị chịu trách nhiệm và hash để đối soát tính toàn vẹn.

## Primary users

1. Nhà sản xuất/nhà vườn: tạo lô và sự kiện đầu tiên.
2. Đơn vị đóng gói/kiểm định/logistics/điểm bán: bổ sung chặng mình phụ trách.
3. Người tiêu dùng/verifier: quét QR để xem hành trình.

## MVP flows

### Create batch

`product -> batch ID -> origin -> public ID/QR`

### Add trace event

`stage -> organization -> location -> timestamp -> data -> documents -> AI check -> confirm -> event hash`

### Consumer verify

`scan QR -> product summary -> journey map -> timeline -> organization -> status -> public evidence`

## AI requirements

- trích dữ liệu có cấu trúc từ chứng từ;
- so sánh batch code, date, quantity, location;
- cảnh báo contradiction/missing data;
- luôn cho phép human review;
- không tự kết luận gian lận.

## Integrity requirements

- canonicalize event payload;
- SHA-256 event hash;
- hỗ trợ previous event hash/version;
- khi sửa dữ liệu đã xác nhận phải supersede, không overwrite lịch sử;
- Solana Devnet proof chỉ được hiển thị là thật khi có transaction thật.

## Definition of first vertical slice

`create sample batch -> add packing event -> run deterministic AI check fixture -> confirm event -> generate hash -> public verify page`
