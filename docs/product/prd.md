# Check-Di — PRD Foundation

## Product goal

Cho phép một builder submit project artifacts, nhận AI evidence draft, được human reviewer xác nhận và phát hành một attestation có thể verify công khai.

## MVP user journeys

### Builder
1. Submit repo/artifacts.
2. Chọn rubric phù hợp.
3. Xem AI evidence draft.
4. Bổ sung evidence nếu thiếu.

### Reviewer / Issuer
1. Mở assessment.
2. Xem claim + evidence + confidence + warning.
3. Approve / Edit / Reject / Needs more evidence.
4. Chỉ sau approval mới được chuẩn bị attestation.
5. Issuer ký issue/revoke/supersede bằng wallet của mình.

### Verifier
1. Mở public verify link/QR.
2. Xem issuer, skill claims công khai, evidence public và trạng thái attestation.
3. Kiểm tra integrity/status proof.

## Non-goals cho MVP

- Token/NFT marketplace.
- Crypto payment/custody.
- Recruiter auto-ranking.
- Mainnet monetary flow.
- University SIS/VNeID replacement.
- Multi-chain/ZK/custom wallet.

## Success condition

Vertical slice phải demo được end-to-end:

`artifact -> AI JSON with evidence -> human approval -> issue on Devnet -> public verify -> revoke/status update`

## Open decisions

- Web framework/package manager initialization.
- Database provider/schema implementation.
- AI model/provider abstraction.
- Exact rubric `UniHackFest Builder v1` schema.
- Solana issuer account/PDA details.
