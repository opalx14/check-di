# 00 — Governance

## Scope

Khóa các nguyên tắc nền của Check-Di trong giai đoạn UniHackFest 2026.

## One product, two tracks

Check-Di có một core implementation duy nhất.

- Technical Build Track: AI kiểm tra chứng từ, hash/integrity proof, QR verification, Solana Devnet, program/PDA và test.
- Product & Business Track: bài toán hàng giả/không rõ nguồn gốc, minh bạch chuỗi cung ứng, user workflow, market, GTM và pilot.

Không fork business logic hoặc tạo app riêng theo track.

## Core product flow

`Batch/QR -> Trace Events -> AI Document Checks -> Participant Confirmation -> Hash/Integrity Proof -> Consumer Verify`

## Data truth model

Blockchain không tự chứng minh dữ liệu ngoài đời là đúng.

Mỗi tổ chức chỉ xác nhận dữ liệu thuộc chặng mình chịu trách nhiệm. Check-Di phải hiển thị rõ:

- ai ghi nhận;
- ai xác nhận;
- thời điểm;
- chứng từ liên quan;
- hash/integrity status;
- trạng thái active/revoked/superseded nếu có.

## AI governance

AI là lớp hỗ trợ kiểm tra:

- trích dữ liệu từ chứng từ;
- so sánh số lượng, ngày tháng, mã lô, địa điểm;
- phát hiện mismatch/contradiction;
- gợi ý cần kiểm tra thêm.

AI không tự xác nhận nguồn gốc, không tự buộc tội gian lận.

## On-chain governance

Solana là integrity/status layer. Không lưu toàn bộ hồ sơ lên chain.

On-chain chỉ giữ dữ liệu tối thiểu như batch/event hash, organization/issuer key, version, timestamp và status. Raw document, thông tin cá nhân và dữ liệu nhạy cảm ở off-chain.

## Crypto boundary

Không build token sale, reward token, NFT marketplace, swap, custody, crypto payment, staking/yield hoặc investment language cho MVP.

## Demo truthfulness

- Dữ liệu giả phải ghi rõ là demo/mô phỏng.
- Không hiển thị transaction/PDA/Verified giả như dữ liệu Devnet thật.
- Khi chưa deploy program, UI phải nói rõ đây là kiến trúc dự kiến.

## Definition of Done

Một vertical slice chỉ được coi là hoàn chỉnh khi có thể demo end-to-end và có artefact phục vụ submission.

## Nhật ký triển khai

### 2026-08-30
- Khóa lại đúng core Check-Di: truy xuất nguồn gốc sản phẩm theo timeline/map, QR và hash theo từng chặng.
- AI chuyển sang nhiệm vụ đọc/đối chiếu chứng từ và cảnh báo sai lệch.
- Hai track tiếp tục dùng chung một sản phẩm.
