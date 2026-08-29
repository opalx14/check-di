# Check-Di — Technical Build Track

## What to prove

- Next.js product flow chạy thật.
- Trace event schema và canonical hashing.
- AI đọc/đối chiếu chứng từ có structured output.
- QR/public verification page.
- Anchor program trên Solana Devnet cho batch/event integrity.
- Transaction Explorer proof và revoke/supersede lifecycle.

## Demo path

`batch -> add trace event -> AI check -> confirm -> event hash -> Devnet registry -> QR verify`

## Technical talking points

- Blockchain là integrity/status layer, không phải nơi lưu toàn bộ supply-chain data.
- AI là quality gate, không tự xác nhận nguồn gốc.
- Mỗi organization chỉ ký/xác nhận chặng thuộc trách nhiệm của mình.
- Public verifier recompute hash để phát hiện dữ liệu off-chain bị sửa.

## Definition of done

Không dùng mock transaction như proof thật. Track chỉ được coi là sẵn sàng khi có Program ID + issue/append transaction + Explorer link + verification flow chạy được.
