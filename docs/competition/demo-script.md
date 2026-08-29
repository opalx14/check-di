# Check-Di — Demo Script Foundation

Target demo spine: khoảng 75–90 giây khi MVP hoàn chỉnh.

## 1. Hook

Một CV/certificate nói người dùng có skill, nhưng không chỉ ra nhanh artifact nào chứng minh claim đó.

## 2. Analyze

Submit project/repo và chạy Check-Di Evidence Engine.

Hiển thị:
- claim;
- evidence pointer;
- confidence;
- `needs_review` khi thiếu bằng chứng.

## 3. Human review

Reviewer approve/edit/reject. Claim thiếu evidence không được issue.

## 4. Issue

Issuer ký attestation bằng wallet và nhận Devnet transaction proof.

## 5. Verify

Public page hiển thị:
- issuer;
- integrity match;
- version;
- active/revoked/superseded status.

## Close

AI giảm workload review. Con người chịu trách nhiệm. Solana là integrity/status layer. Không token, không custody, không crypto payment.

> Chỉ dùng live claims/transactions sau khi implementation thật tồn tại; không giả UI là transaction thật.
