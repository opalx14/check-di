# check_di_registry

Anchor/Rust boundary cho integrity registry của Check-Di.

## Planned responsibilities

- khởi tạo registry cho một product batch;
- ghi nhận hash của từng trace event;
- liên kết `previous_event_hash` để audit thứ tự hành trình;
- lưu organization/authority đã xác nhận;
- quản lý `active`, `revoked`, `superseded` và version;
- phát transaction proof trên Solana Devnet.

## Không lưu on-chain

- chứng từ gốc;
- hình ảnh;
- thông tin cá nhân;
- địa chỉ chi tiết không cần công khai;
- toàn bộ dữ liệu nghiệp vụ của lô hàng.

Program chưa được triển khai trong phase hiện tại. Không trình bày hash/transaction mẫu trên UI như Devnet proof thật.
