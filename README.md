# Check-Di

**Từ nơi sản xuất đến tay người mua — mỗi chặng đều có dấu vết để kiểm tra.**

Check-Di là web truy xuất nguồn gốc theo hành trình sản phẩm. Mỗi lô hàng có mã QR/public ID; các bên trong chuỗi cung ứng ghi nhận từng chặng, gắn chứng từ, xác nhận dữ liệu và tạo hash để kiểm tra tính toàn vẹn. Người tiêu dùng quét QR để xem timeline, địa điểm, đơn vị xác nhận và trạng thái dữ liệu.

## Competition strategy

Check-Di dùng **một core duy nhất** cho hai track UniHackFest 2026:

- **Technical Build:** AI đối chiếu chứng từ, QR verification, hash chain, Solana Devnet/integrity proof và technical execution.
- **Product & Business:** chống hàng giả/không rõ nguồn gốc, minh bạch chuỗi cung ứng, onboarding nhà sản xuất/doanh nghiệp/logistics/điểm bán và GTM.

## Core flow

```text
Tạo lô / QR
  -> Ghi nhận từng chặng
  -> AI đối chiếu chứng từ
  -> Đơn vị tại chặng xác nhận
  -> Tạo hash / integrity proof
  -> Người tiêu dùng quét QR
  -> Xem timeline + bản đồ + trạng thái
```

## MVP example

```text
Nhà vườn
  -> Sơ chế / đóng gói
  -> Kiểm định
  -> Logistics / kho
  -> Điểm bán
  -> Người tiêu dùng
```

Mỗi trace event gồm tối thiểu:

- batch ID;
- organization;
- stage;
- location;
- timestamp;
- event data;
- related documents;
- AI validation result;
- event hash;
- status/version.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Bun
- PostgreSQL/Supabase-compatible persistence khi bắt đầu data layer
- Solana Devnet + Anchor/Rust cho integrity registry
- `@solana/kit` + `@solana/react` khi triển khai on-chain client

## Project structure

```text
check-di/
├── src/
│   ├── app/                 # Next.js routes, UI and APIs
│   ├── components/          # reusable UI
│   ├── lib/
│   │   ├── ai/              # document extraction & cross-check
│   │   ├── db/              # batches/events/documents
│   │   └── solana/          # integrity proof integration
│   └── types/               # traceability contracts
├── programs/
│   └── check_di_registry/   # Anchor/Rust registry
├── tests/
├── docs/
├── scripts/
└── README.md
```

## Product boundaries

- AI chỉ đọc/đối chiếu và cảnh báo sai lệch; không tự xác nhận nguồn gốc.
- Mỗi tổ chức chỉ xác nhận dữ liệu của chặng mình chịu trách nhiệm.
- Chứng từ gốc, PII và dữ liệu nhạy cảm ở off-chain.
- Solana chỉ giữ integrity/status data tối thiểu.
- MVP không token, custody, crypto payment hay marketplace.
- Dữ liệu demo phải được ghi rõ là mô phỏng, không giả làm Devnet proof thật.

## Development

```bash
bun install
bun run dev
```

Local: `http://localhost:7314`

Checks:

```bash
bun run typecheck
bun run build
```

## Current phase

**Phase 1 — Product foundation & traceability demo**

Mục tiêu tiếp theo: build vertical slice thật `create batch -> add trace event -> AI document check -> confirm -> public QR verify`.
