# Check-Di — Technical Architecture

## Core flow

```text
Batch / QR
  -> Trace Event API
  -> Document Storage
  -> AI Document Check
  -> Participant Confirmation
  -> Canonical Event JSON
  -> SHA-256 Event Hash
  -> Solana Integrity Registry
  -> Public Verify
```

## Off-chain

- product/batch metadata;
- organizations;
- locations;
- raw documents/images;
- AI extraction/check results;
- public projection preferences;
- full trace-event payloads.

## On-chain planned fields

- `batch_hash`;
- `event_hash`;
- `previous_event_hash`;
- `organization`/authority;
- `issued_at`;
- `status`;
- `version`.

## AI boundary

AI extracts and compares data. It cannot confirm provenance by itself. Human/organization confirmation is required before an event becomes confirmed.

## Public verifier

The verifier reconstructs the public timeline from off-chain data, recomputes hashes and compares them with the integrity registry when Devnet integration is available.

## Routes planned

- `/batches/new`
- `/batches/[id]`
- `/batches/[id]/events/new`
- `/verify/[publicId]`

## Demo truthfulness

Until Devnet deployment exists, UI must label hashes/transactions as demo fixtures.
