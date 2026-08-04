# Brand Transition: OpenRNG → Fairseal

**Date:** 2026-08-03  
**Status:** Phase 1 Complete

---

## Summary

| | Old | New |
|---|---|---|
| **Brand name** | OpenRNG | **Fairseal** |
| **Domain** | openrng.io | **fairseal.io** |
| **npm scope** | @openrng | @fairseal (Phase 3) |
| **ElizaOS plugin** | @openrng/eliza-plugin | @elizaos/plugin-fairseal |
| **GitHub org** | github.com/openrng | github.com/fairseal (Phase 4) |

---

## Why We Renamed

**Primary reason: Naming conflict with Arm Ltd.**

"OpenRNG" conflicts with Arm Ltd's hardware random number generator technology, which Arm refers to as "OpenRNG" in its CPU security architecture documentation. As Fairseal grows and engages enterprise customers — who conduct thorough IP and trademark due diligence — this conflict creates legal risk and potential confusion.

**Secondary reasons:**

1. **"RNG" undersells the product.** "RNG" is gaming slang for random number generator, with negative connotations ("bad RNG" = bad luck). The actual product is a *committed selection oracle with a verifiable receipt* — something far more valuable and differentiated than the name suggested.

2. **No receipt concept.** "OpenRNG" describes *what it is* (a random number generator), not *what it does* (committed, auditable, verifiable selection). The product's moat is the receipt standard, not the randomness primitive.

---

## The Fairseal Name

**Double meaning — that's the point:**

- **Seal (animal):** Mascot. Playful, memorable, distinct.
- **Seal (stamp of approval):** A seal of fairness. Every committed selection receipt *is* a fairseal — a cryptographic stamp certifying that the draw was provably fair.

The logo concept: a seal (the animal) pressing a wax stamp of approval. The brand story: every draw you run gets a Fairseal.

**Domain acquired:** fairseal.io (purchased 2026-08-03)

---

## Migration Plan

### Phase 1 — Documents & Specs (2026-08-03) ✅ COMPLETE

Updated:
- `docs/csr-spec-v0.1.md` — Author updated to "Fairseal (formerly OpenRNG)"
- `docs/security-model-v0.1.md` — Brand name updated throughout
- `docs/receipt-permanence-guarantee.md` — Brand name updated; SDK references updated to @fairseal/core
- `docs/gtm-playbook.md` — Brand name updated throughout
- `docs/cold-outreach-templates.md` — Outreach emails updated to Fairseal
- `docs/elizaos-plugin-design.md` — Updated to @elizaos/plugin-fairseal
- `docs/naming-candidates.md` — Final decision recorded
- `docs/4-round-audit-synthesis.md` — Post-session naming decision section added
- `examples/fair-selection-ts/README.md` — Brand references updated
- `examples/fair-selection-py/README.md` — Brand references updated

**Not changed in Phase 1:**
- Live API endpoints (still openrng.io until Phase 2)
- npm packages (still @openrng/core until Phase 3)
- GitHub repo name (still openrng until Phase 4)
- Server configurations

---

### Phase 2 — DNS & API Domain Migration (this week)

Tasks:
- [ ] Configure DNS for fairseal.io
- [ ] Set up api.fairseal.io → api.openrng.io reverse proxy (for backward compatibility)
- [ ] Set up verify.fairseal.io
- [ ] Update API documentation to reference fairseal.io
- [ ] Add 301 redirects: openrng.io → fairseal.io
- [ ] Update website content and landing page

---

### Phase 3 — npm Scope Migration (next week)

Tasks:
- [ ] Publish `@fairseal/core` as new canonical package (with same API as @openrng/core)
- [ ] Publish `@fairseal/client` (currently @openrng/client)
- [ ] Publish `@elizaos/plugin-fairseal` (currently @openrng/eliza-plugin)
- [ ] Add deprecation notices to @openrng/* packages pointing to @fairseal/*
- [ ] Update all documentation to reference @fairseal/* packages

**Backward compatibility:** @openrng/core will continue to be published and receive updates during a transition window (minimum 90 days). Existing integrations do not break.

---

### Phase 4 — GitHub Rename (future)

Tasks:
- [ ] Rename GitHub organization: openrng → fairseal
- [ ] Rename repository: openrng → fairseal
- [ ] Update all repository references in documentation
- [ ] GitHub automatically redirects old URLs; no broken links expected

---

## What Does NOT Change

The technology and protocol are **unchanged**:

- **CSR (Committed Selection Receipt) standard** — same specification, same field names, same verification algorithm
- **MerkleAnchor smart contract** — unchanged, same address
- **Cryptographic architecture** — VDF-based commit/reveal, Base mainnet anchoring, Merkle proofs
- **Security model** — same threat model, same guarantees, same open risks
- **Historical receipts** — all receipts issued under "OpenRNG" remain permanently valid and verifiable. The brand name on the receipt doesn't affect cryptographic verifiability. See `receipt-permanence-guarantee.md`.

---

## For Integrators

If you integrated with OpenRNG before this rebrand:

- **Your existing integration keeps working.** No action required now.
- **@openrng/core** will continue to receive updates through the transition.
- **Migration guide** will be published when @fairseal/core is available (Phase 3).
- **Your receipts are still valid.** Every CSR issued under "OpenRNG" is verifiable forever — the on-chain anchor is what matters, not the brand name.

---

## Contact

For questions about the rebrand or migration timeline, contact the Fairseal team via the same channels as before.

---

*This document is the official record of the OpenRNG → Fairseal brand transition.*
