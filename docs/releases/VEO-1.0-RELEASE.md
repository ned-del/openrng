# OpenRNG VEO-1.0 Release Notes

**Release Date:** 2026-06-24
**Tag:** `veo-1.0`
**Protocol Hash:** `0xcb21de7f1661548b85a8d9249cf2c1d939de93e1ce17ab22444238e3a466b7f7`

---

## What is VEO-1?

VEO-1 (Verifiable Entropy Object Standard) transforms randomness from a disposable value into a verifiable digital object. Each VEO carries its entropy payload, source provenance, confidence metrics, cryptographic proof, and optional blockchain anchor.

---

## Features

### Object Classes

| Class  | Description |
|--------|-------------|
| VEO-1A | Raw single-source entropy |
| VEO-1B | Composite multi-source entropy |
| VEO-1C | Blockchain-anchored entropy |
| VEO-1D | Reserved for Verifiable Decision Objects |

### Entropy Sources

- **drand** — League of Entropy randomness beacon
- **Bitcoin** — Latest block hash via Blockstream API
- **Polygon** — Latest block hash via RPC

All sources include `crypto.randomBytes` fallback with ECS penalty.

### Entropy Confidence Score (ECS v1)

0–1000 score with six weighted dimensions:
- freshness (20%), diversity (15%), independence (20%)
- manipulation_resistance (20%), verification_success (15%), availability (10%)

Grades: AAA / AA / A / B / C / LOW

### Provider Signing

- secp256k1 EIP-191 (`personal_sign`)
- Deterministic canonical payload (deep-sorted keys, excludes self-referential fields)
- Verifiable by any party with the provider address

### Blockchain Anchoring

- Polygon Amoy testnet (contract: `0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8`)
- MerkleAnchor contract with on-chain readback verification
- 2-confirmation wait, nonce-serialized transaction queue

### Verification Levels

| Level | Meaning |
|-------|---------|
| `structurally_valid_unsigned` | Schema + hash valid, no signature |
| `cryptographically_verified` | Valid provider signature |
| `anchored_verified` | Signature + on-chain anchor verified |
| `policy_failed` | Policy requirements not met |
| `invalid` | Structural or cryptographic failure |

### Consumer Policies

5 presets: simulation-grade, ai-grade, gaming-grade, casino-grade, enterprise-grade

### API Endpoints

```
GET  /v2/entropy          — Generate VEO object
POST /v2/entropy/verify   — Verify VEO object
GET  /v2/entropy/status   — System status
```

---

## Known Limitations

1. **VEO-1A not implemented** — Single-source objects are defined but not yet generated. Generator always produces VEO-1B or VEO-1C.

2. **Signing key management** — Provider signing key is stored as an environment variable. Key rotation, HSM integration, and multi-provider signing are not yet supported.

3. **Anchor batching** — Each VEO-1C uses a single-leaf Merkle root. Batch anchoring (multiple VEOs per transaction) is planned for v1.1.

4. **VEO-1D reserved** — Decision Entropy Objects are defined as a class but have no implementation. See VDO-1 roadmap.

5. **drand verification** — drand beacon integrity is checked but BLS signature verification is not yet implemented.

6. **Polygon Amoy testnet** — Anchoring uses the Amoy testnet. Mainnet deployment requires separate configuration.

7. **Lineage** — The `lineage` field is defined but lineage hash recomputation is not implemented.

8. **Expiration** — `expires_at` is always `null`. Time-based expiration is not enforced.

---

## Future Roadmap

### VEO-1.1 (planned)
- Batch anchoring (multiple VEOs per on-chain transaction)
- VEO-1A single-source generation
- drand BLS signature verification
- Key rotation support

### VEO-2.0 (future)
- ECS v2 (if scoring changes are needed)
- Canonicalization v2 (if field changes are needed)
- Mainnet anchoring

### VDO-1 (future)
- Verifiable Decision Objects (extends VEO-1D)
- Decision replay infrastructure
- Entropy-backed AI decision verification

---

## Protocol Documents

- [RFC-0001-VEO1.md](../rfc/RFC-0001-VEO1.md)
- [ECS-v1.md](../rfc/ECS-v1.md)
- [veo-1.schema.json](../rfc/veo-1.schema.json)
- [VEO_PROTOCOL_HASH.txt](../rfc/VEO_PROTOCOL_HASH.txt)

---

## Test Results

- 26/26 VEO unit tests passing
- 6/6 live integration tests passing
- Golden fixture compatibility tests passing
- Live Polygon Amoy anchor verification confirmed
