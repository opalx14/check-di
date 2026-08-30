# check_di_registry

Anchor/Rust boundary cho integrity registry của Check-Di.

## Source hiện tại

Program ID đã khóa cho Devnet build:

```text
9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi
```

Anchor source hiện đã có:

- `initialize_batch(batch_hash)` tạo Batch Registry PDA;
- `append_event(...)` tạo Event Proof PDA, bắt buộc `previous_event_hash` khớp registry head và yêu cầu organization signer ký instruction;
- `set_event_status(...)` chuyển event từ `active` sang `revoked` hoặc `superseded`;
- lưu registry authority, organization signer pubkey, organization hash, batch/event/previous hash, version và timestamp tối thiểu;
- emit event để audit batch initialization, event anchoring và lifecycle status.

`GENESIS` off-chain được ánh xạ thành `[0; 32]` on-chain.

## Không lưu on-chain

- chứng từ gốc;
- hình ảnh;
- thông tin cá nhân;
- địa chỉ chi tiết không cần công khai;
- toàn bộ dữ liệu nghiệp vụ của lô hàng.

Custom program đã compile/test bằng `anchor-lang 1.1.2`, build SBF và **deploy thật lên Devnet**. RPC xác nhận program account `executable = true`. Product flow hiện ưu tiên Batch Registry/Event Proof PDA làm integrity proof chính; SPL Memo Phase 4A chỉ còn fallback.

Validation:

```bash
bun run program:test
bun run program:check
bun run program:smoke -- DUR-260830-02
bun run product:smoke -- DUR-260830-01
```

Deploy transaction hiện tại:

```text
3vhUrCXzYESp35V4iX24hnQz7LV7LFM1tbb11YFZMLPTx1ypp6uS1ndWTc3QNNppWRs7tHJbbVccfztQM1yQbHPJ
```

Public/product verifier phải đọc PDA live từ Devnet RPC; không tin metadata persisted một cách mù quáng.
