# Check-Di — Community Launch Pack

Tài liệu dùng để đăng Check-Di vào hội nhóm, cộng đồng hackathon, AI/blockchain hoặc nhóm startup/sản phẩm. Nội dung dưới đây chỉ dùng các capability đã chạy production; không claim OCR/LLM production và không biến Solana Devnet thành mainnet claim.

## 1. Link công khai

- Landing: https://check-di.promptmarketcap.net/
- Demo truy xuất live: https://check-di.promptmarketcap.net/verify/DUR-260830-01
- Quét / nhập mã lô: https://check-di.promptmarketcap.net/scan
- Audit dossier JSON: https://check-di.promptmarketcap.net/api/verify/DUR-260830-01/dossier
- Independent Devnet verifier API: https://check-di.promptmarketcap.net/api/verify/DUR-260830-01/devnet

Mã lô demo nên dùng khi đăng bài:

```text
DUR-260830-01
```

## 2. Bài đăng ngắn — phù hợp hội nhóm startup / công nghệ

Mình vừa hoàn thiện bản demo public của **Check-Di** — một hệ thống truy xuất nguồn gốc theo từng chặng bằng QR.

Thay vì chỉ hiển thị một timeline, mỗi chặng trong Check-Di được nối bằng hash, chữ ký Ed25519 và proof tối thiểu trên Solana Devnet. Người mua không cần tài khoản: quét QR hoặc nhập mã lô là xem được hành trình và có thể chạy lượt kiểm tra Devnet mới ngay trên trang.

Bản live hiện có:

- 5 chặng truy xuất từ nguồn đến điểm bán
- AI/Data Checks đối chiếu dữ liệu và chứng từ demo
- SHA-256 + Ed25519 signed chain
- Solana Devnet Registry/Event PDA
- independent verifier đọc trực tiếp Devnet RPC
- public audit dossier đã redact dữ liệu nhạy cảm
- giao diện Việt / Anh

Demo: https://check-di.promptmarketcap.net/

Mã lô để thử ngay: **DUR-260830-01**

Mình rất muốn nhận feedback về UX truy xuất, cách trình bày proof cho người dùng phổ thông và hướng ứng dụng thực tế cho nông sản / supply chain.

#CheckDi #Traceability #SupplyChain #Solana #AI #Blockchain #BuildInPublic

## 3. Bài đăng kỹ thuật — phù hợp nhóm developer / blockchain

Mình vừa đưa **Check-Di** lên production demo. Đây là một vertical slice truy xuất nguồn gốc kết hợp dữ liệu nghiệp vụ off-chain với integrity proof trên Solana Devnet.

Flow chính:

```text
Batch / QR
→ Trace Event
→ AI/Data Checks
→ canonical payload + previous hash
→ SHA-256 eventHash
→ Ed25519 organization signature
→ PostgreSQL/Supabase
→ Check-Di Registry Batch/Event PDA trên Solana Devnet
→ consumer verify + fresh RPC verifier
```

Một số điểm mình cố tình giữ boundary rõ:

- raw document / PII không đưa on-chain
- AI check chỉ là advisory; demo extraction được ghi rõ là deterministic simulation, không claim OCR/LLM production
- public verifier không tin persisted TXID/PDA mirror khi quyết định proof hợp lệ; nó derive/read lại từ Devnet RPC
- revoked/superseded event vẫn nằm trong audit history
- audit dossier public giữ hash/signature/document SHA-256/proof nhưng không export raw private document

Live sample hiện pass **chain 5/5** và **Devnet 5/5**:

https://check-di.promptmarketcap.net/verify/DUR-260830-01

Landing:

https://check-di.promptmarketcap.net/

Nếu mọi người làm supply-chain, Solana, identity/signing hoặc audit systems, mình rất muốn nghe góp ý về threat model và UX giải thích proof cho người không chuyên.

#SolanaDevnet #Ed25519 #SHA256 #Traceability #Supabase #NextJS #BuildInPublic

## 4. Caption cực ngắn — dùng khi post kèm ảnh

**Check-Di**: quét QR để xem hành trình sản phẩm, ai xác nhận từng chặng và proof có còn hợp lệ hay không.

Live demo đã chạy:
**Chain 5/5 · Solana Devnet 5/5 · Fresh RPC verifier · Redacted audit dossier**

https://check-di.promptmarketcap.net/

Thử mã: **DUR-260830-01**

## 5. Ảnh nên chụp để đăng

Thứ tự đề xuất:

1. **Homepage hero + Production Proof block**
   - cần thấy dòng “Đang chạy production”
   - cần thấy `DUR-260830-01`
   - cần thấy 4 thẻ: Chain 5/5, Solana Devnet 5/5, Fresh RPC, Redacted

2. **Consumer verify**
   - URL: `/verify/DUR-260830-01`
   - cần thấy badge “Chuỗi hợp lệ”
   - journey 5 chặng
   - nút “Kiểm tra độc lập”
   - nút “Tải hồ sơ audit”

3. **Independent verifier sau khi chạy**
   - cần thấy 5/5 Registry events verified
   - các Event PDA / VERIFIED cards

4. **Supplier flow** nếu bài viết nhắm đến sản phẩm B2B
   - product inventory
   - organization wallet
   - create batch / stage confirmation

Không dùng ảnh chứa:
- password / credential
- service-role key
- private document path
- raw PII
- tài khoản PROD-SMOKE

## 6. Claims được phép dùng

Có thể nói:

- “đã chạy production demo”
- “Solana Devnet proof thật”
- “chain 5/5 trên sample live”
- “independent verifier đọc fresh Devnet RPC”
- “raw documents và PII không đưa on-chain”
- “AI/Data Checks hỗ trợ đối chiếu”
- “demo extraction deterministic / simulated”

Không nên nói:

- “AI phát hiện gian lận”
- “OCR/LLM production” ở phiên bản hiện tại
- “mainnet”
- “proof đảm bảo dữ liệu ngoài đời là đúng tuyệt đối”
- “blockchain xác minh chất lượng nông sản”

## 7. CTA khi đăng

CTA nên dùng:

> Mọi người thử trực tiếp mã **DUR-260830-01** và cho mình feedback xem phần hành trình/proof có dễ hiểu với người không chuyên không.

CTA này giúp người đọc có một hành động cụ thể thay vì chỉ xem landing.
