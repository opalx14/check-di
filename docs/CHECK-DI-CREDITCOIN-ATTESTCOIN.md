# Check-Di × Creditcoin / Attestcoin

## Mục tiêu

Giữ nguyên core Check-Di hiện tại và thêm một competition adapter cho BUIDL CTC 2026 Fall:

```text
Check-Di confirmed event
  -> source-chain commitment on Ethereum Sepolia
  -> Attestcoin inclusion + continuity proof
  -> Creditcoin CC3 Native Query Verifier
  -> CheckDiAttestedRegistry state
  -> judge / consumer verification evidence
```

Solana Devnet vẫn là integrity layer của bản UniHackFest. Creditcoin/Attestcoin là lane bổ sung, không thay hoặc phá Solana flow hiện tại.

## Network assumptions đã probe live ngày 2026-09-01

- Creditcoin CC3 testnet chain ID: `102031`.
- CC3 RPC mặc định: `https://rpc.cc3-testnet.creditcoin.network`.
- Attestcoin Proof API: `https://proof-gen-api.cc3-testnet.creditcoin.network`.
- Sepolia source `chainKey`: `1`.
- Native Query Verifier precompile: `0x0000000000000000000000000000000000000FD2`.
- Proof service health trả `healthy`, CC3/Ethereum RPC đều connected.
- Sepolia attested height đang tiến lên; không hard-code height vào product logic.

Nguồn implementation tham chiếu: official `gluwa/usc-testnet-bridge-examples` + current `@gluwa/usc-sdk`/`@gluwa/usc-contracts` surface. Không dùng flow oracle/STARK cũ.

## Contracts

### `CheckDiSourceRegistry.sol` — Ethereum Sepolia

Vai trò:

- chỉ lưu hash/status tối thiểu;
- organization EVM wallet phải được authorize;
- enforce linear `previousEventHash` theo batch;
- emit `JourneyEventCommitted` cho Attestcoin chứng minh;
- giữ lifecycle terminal `Active -> Revoked|Superseded` bằng event riêng;
- không lưu raw documents/PII.

Event chính:

```solidity
JourneyEventCommitted(
  batchIdHash,
  eventHash,
  organization,
  previousEventHash,
  organizationHash,
  sequenceNo,
  lifecycleStatus
)
```

### `CheckDiAttestedRegistry.sol` — Creditcoin CC3

Vai trò:

1. gọi Native Query Verifier `0x...0FD2`;
2. yêu cầu source transaction thành công;
3. decode receipt từ chính `encodedTransaction` đã được proof bảo vệ;
4. chỉ nhận log từ đúng `sourceContract`;
5. enforce đúng event signature;
6. chống replay bằng query ID và `eventHash`;
7. enforce `previousEventHash` + sequence lần nữa trên Creditcoin;
8. mirror lifecycle revoke/supersede từ source-chain proof.

Attestcoin vì vậy là execution input bắt buộc: không có proof hợp lệ thì Creditcoin registry không thay đổi state.

## App integration

- `src/lib/creditcoin/config.ts`: public network/config boundary.
- `src/lib/creditcoin/readiness.ts`: live health check cho Proof API, attested height và CC3 RPC.
- `src/lib/creditcoin/proof-builder.ts`: client dependency-free cho current Proof API; validate tx hash/proof shape, poll attested height và map proof sang `CheckDiAttestedRegistry.ProofInput`.
- `GET /api/creditcoin/readiness`: JSON readiness không chứa private key.
- `scripts/check-creditcoin-readiness.ts`: smoke CLI read-only.
- `scripts/fetch-attestcoin-proof.ts`: lấy proof thật theo Sepolia tx hash; có thể chờ `--height=<block>` và chỉ in full proof khi truyền `--json`.

## Environment

```env
# public/read-only network endpoints
CHECK_DI_CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CHECK_DI_ATTESTCOIN_PROOF_API_URL=https://proof-gen-api.cc3-testnet.creditcoin.network
CHECK_DI_ATTESTCOIN_SOURCE_CHAIN_KEY=1

# source-chain RPC dùng lúc emit/deploy; giữ provider key ngoài Git nếu URL có secret
CHECK_DI_SEPOLIA_RPC_URL=

# chỉ set sau khi deploy thật
CHECK_DI_SEPOLIA_SOURCE_CONTRACT=
CHECK_DI_CREDITCOIN_REGISTRY_CONTRACT=
```

Không đưa deployer private key vào `NEXT_PUBLIC_*`, database hoặc source code. Dùng test-only EVM wallet chứa duy nhất faucet funds.

## Deploy order

1. Deploy `CheckDiSourceRegistry` lên Ethereum Sepolia.
2. Authorize EVM organization wallet dùng cho demo.
3. Deploy `CheckDiAttestedRegistry(1, <sourceContract>)` lên Creditcoin CC3 testnet.
4. Set hai public contract address vào env.
5. Commit một Check-Di confirmed event lên Sepolia.
6. Chờ block đó xuất hiện dưới Attestcoin attested height.
7. Generate proof bằng `bun run creditcoin:proof -- <txHash> --height=<block>`; client gọi current `/api/v1/proof-by-tx/1/<txHash>` và validate response trước khi tạo contract input.
8. Submit proof vào `executeJourneyProof` trên CC3.
9. Read back `journeyEvents[eventHash]` và hiển thị receipt/proof thật trong judge flow.
10. Test negative paths: replay, wrong source emitter, failed receipt, previous-hash mismatch.

## Definition of Done cho BUIDL CTC slice

Không gọi integration là hoàn tất cho tới khi có đủ:

- source contract address thật trên Sepolia;
- source transaction hash thật;
- Attestcoin proof sinh từ source transaction đó;
- target contract address thật trên CC3;
- target transaction thành công;
- read-back state khớp Check-Di event hash;
- ít nhất replay/wrong-source proof bị reject;
- UI không hiển thị `Verified` nếu chỉ là mock/local fixture.
