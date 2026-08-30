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

Custom program này chưa được triển khai trong phase hiện tại. Phase 4A dùng **SPL Memo program trên Solana Devnet** làm minimal live integrity anchor trước, vì máy phát triển hiện chưa có Solana CLI/Anchor CLI. Public UI chỉ được hiển thị anchored khi RPC đọc lại transaction thật và memo khớp proof đã lưu.

Bước kế tiếp sau khi hoàn tất funded Devnet smoke test là triển khai custom `check_di_registry` bằng Anchor/PDA cho registry/status; không trình bày SPL Memo anchor như thể đó là custom Check-Di program.
