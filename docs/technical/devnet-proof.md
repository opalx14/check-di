# Check-Di — Devnet Proof

Chỉ điền tài liệu này sau khi `check_di_registry` được deploy thật.

## Required evidence

- Program ID
- Deploy signature
- Test wallet/public authority
- Create batch/registry transaction
- Append trace event transaction
- Revoke/supersede transaction
- Explorer links
- Schema/program version

## Public verification check

Verifier phải có thể lấy event payload off-chain, canonicalize + hash lại và so sánh với event hash/state trên Devnet.

## Rule

Không dùng hash, PDA hoặc transaction giả làm bằng chứng thật. Trước khi có deployment, UI chỉ được ghi “dữ liệu mô phỏng” hoặc “kiến trúc dự kiến”.
