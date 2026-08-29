# Check-Di — Compliance Foundation

Tài liệu này là product/architecture guardrail cho hackathon, không thay thế tư vấn pháp lý.

## MVP stance

**No token. No custody. No crypto payment. Human-in-the-loop. PII off-chain.**

## AI

- AI chỉ draft evidence-backed claims.
- Mọi claim phải có evidence pointer.
- Thiếu evidence → `needs_review`.
- Human reviewer/issuer quyết định cuối.
- Lưu model/rubric version để audit.
- Không auto-hire/auto-reject hoặc tự kết luận gian lận.

## Privacy

Off-chain:
- name/email/student ID;
- CV/raw artifacts;
- private repository data;
- full AI assessment;
- reviewer notes;
- consent/public display preferences.

On-chain chỉ giữ tối thiểu commitment/hash + issuer/version/status/timestamp cần cho verification.

## Crypto/Web3 boundary

Không build trong MVP:
- token sale/reward token;
- NFT marketplace;
- swap/order book;
- custody private key;
- crypto payment;
- staking/yield;
- investment language.

Solana được dùng làm integrity/status registry cho attestation lifecycle, không phải market layer.

## Production gate

Trước mainnet/commercial launch cần review lại:
- legal classification;
- personal-data processing/retention/cross-border flow;
- issuer governance;
- wallet/signature policy;
- security/audit requirements.
