# programs/check_di_registry

Planned Solana/Anchor program cho Check-Di attestation registry.

## Planned on-chain state

- issuer pubkey;
- subject commitment;
- credential schema hash;
- evidence root;
- assessment hash;
- rubric hash;
- issued/expiry timestamps;
- status;
- version/supersedes.

## Planned instructions

- `initialize_issuer`
- `issue_attestation`
- `revoke_attestation`
- `supersede_attestation`

## Boundary

Program không lưu PII/raw artifacts và không triển khai token, marketplace, custody, payment hay yield trong MVP.

Anchor crate chưa được khởi tạo ở phase foundation này.
