# 00 — Governance

## Scope

Tài liệu này khóa các nguyên tắc nền của Check-Di trong giai đoạn UniHackFest 2026.

## One product, two tracks

Check-Di chỉ có một core implementation.

- Technical Build Track nhấn mạnh implementation, AI evaluation, Solana Devnet, program/PDA, transaction proof và test.
- Product & Business Track nhấn mạnh problem, user, issuer/verifier workflow, market, GTM và pilot.

Không fork business logic hoặc tạo app riêng chỉ để phục vụ track.

## Core product flow

`Artifacts -> AI Evidence Engine -> Human Review -> Issuer Approval -> Solana Attestation -> Public Verify`

Mọi feature mới phải hỗ trợ trực tiếp ít nhất một bước trong flow này hoặc một deliverable thi đấu bắt buộc.

## AI governance

AI chỉ là decision-support layer:
- evidence extraction;
- rubric mapping;
- missing/contradictory evidence detection;
- confidence + draft claim.

Credential chỉ được issue sau human review/issuer approval.

Không dùng AI để tự động kết luận gian lận, tuyển/loại người, hoặc tạo skill claim không có evidence pointer.

## On-chain governance

Solana là integrity/status layer, không phải nơi chứa toàn bộ hồ sơ.

On-chain chỉ giữ dữ liệu tối thiểu cần cho verification/audit, ví dụ issuer, commitments/hashes, version, timestamp và status.

PII/raw evidence phải ở off-chain.

## Crypto boundary cho MVP

Không build:
- reward/token sale;
- NFT marketplace;
- swap/order book;
- custody;
- crypto payment;
- staking/yield;
- investment language.

## Definition of Done

Một vertical slice chỉ được coi là hoàn chỉnh khi có thể demo end-to-end và có artefact phục vụ submission.

Khi implementation bắt đầu, mỗi phần phải có check/test phù hợp trước khi đánh dấu done trong `STATUS.md`.

## Nhật ký triển khai

### 2026-08-29
- Khởi tạo governance riêng cho Check-Di.
- Chuẩn hóa agent instructions theo kiến trúc và phạm vi riêng của Check-Di.
- Khóa nguyên tắc một core product cho hai track và các boundary AI/Solana/compliance.
