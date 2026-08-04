# Naming Candidates Analysis

**Date:** 2026-08-03  
**Context:** OpenRNG brand name conflict identified; replacement candidates evaluated.

---

## The Problem

**"OpenRNG"** conflicts with **Arm Ltd**, which holds trademarks in the "RNG" namespace related to hardware random number generation. This creates legal risk as OpenRNG scales and pursues enterprise customers (who conduct IP due diligence).

Additionally, "OpenRNG" is technically accurate but:
- Describes *what it is* (random number generator), not *what it does* (committed selection)
- "RNG" is gaming slang with negative connotations ("bad RNG" = bad luck)
- Doesn't convey the audit/receipt concept that is the actual product moat

---

## Candidates from Round 4 Audit

### Set A — Claude's Candidates

| Name | Concept | Rank |
|---|---|---|
| **Sortis** | Latin for "lot" / "fate by drawing lots" — ancient selection ceremony | 1 |
| **Fairseal** | Explicit: seal of fairness; receipt-forward | 2 |
| **Veridraw** | "Veri" (truth) + "draw" (selection) | 3 |
| **Drawbound** | Draws that are bound/committed; suggests commitment | 4 |
| **Kleroterion** | Ancient Athenian lottery device for fair civic selection | 5 |

**Claude's rationale for rankings:**
- **Sortis** wins on brevity, memorability, and historical resonance. "Lots" is the original committed selection — ancient Greeks and Romans used it for civic randomness. No obvious IP conflicts. Domain likely available.
- **Fairseal** is explicit but slightly generic; "seal" implies permanence and authenticity.
- **Veridraw** works well for technical audiences; "veri-" prefix signals provability.
- **Kleroterion** is historically perfect but hard to spell/say; niche appeal.

### Set B — Gemini's Candidates

| Name | Concept | Rank |
|---|---|---|
| **Provably** | Direct claim: "provably fair" as a brand name | 1 |
| **VeritasL2** | "Veritas" (truth) + L2 positioning | 2 |
| **EpochProof** | Technical; references epoch-based commitment | 3 |
| **AxiomTrust** | Axiom (self-evident truth) + Trust | 4 |
| **ConsensusRing** | Consensus + ring (circle/seal) | 5 |

**Gemini's rationale:**
- **Provably** is the strongest because "provably fair" is already the established phrase in Web3 gaming. Turning it into a proper noun is bold but memorable — it makes the value prop the brand name.
- **VeritasL2** is positioning-forward; helps in Base/L2 ecosystem conversations.
- **EpochProof** appeals to developers who understand the protocol but alienates non-technical buyers.

---

## Combined Ranking

After cross-AI synthesis:

| Rank | Name | Why |
|---|---|---|
| **1** | **Provably** | Turns "provably fair" into the brand; zero explanation required; works as noun, adjective, and verb ("we Provably'd this draw") |
| **2** | **Sortis** | Elegant, brief, historical legitimacy; works globally; no tech jargon |
| **3** | **Veridraw** | Clear, technical, memorable; "draw" anchors the use case |
| **4** | **Fairseal** | Explicit value prop; slightly corporate-feeling |
| **5** | **EpochProof** | Developer-first; too technical for non-dev buyers |

---

## Domain Availability (TODO)

These domains need checking before finalizing any name:

| Name | .com | .io | .xyz | .eth |
|---|---|---|---|---|
| provably.com | ❓ | ❓ | ❓ | ❓ |
| sortis.com | ❓ | ❓ | ❓ | ❓ |
| veridraw.com | ❓ | ❓ | ❓ | ❓ |
| fairseal.com | ❓ | ❓ | ❓ | ❓ |
| epochproof.com | ❓ | ❓ | ❓ | ❓ |

**Action:** Run domain availability check. Prefer `.com` or `.io`. If `provably.com` is taken and expensive, `provably.io` is an acceptable fallback for the Web3 audience.

---

## IP Considerations

Before committing to any name:

1. **USPTO trademark search** — check the name + "selection/randomness/blockchain" class.
2. **EU trademark search** — if European enterprise customers are in scope.
3. **GitHub namespace** — is `github.com/[name]` available?
4. **npm namespace** — is `@[name]/core` available on npm?
5. **X/Twitter handle** — is `@[name]` available?

---

## Recommendation

**Proceed with "Provably" as the working name for GTM purposes**, subject to domain and IP check.

Rationale: The GTM motion (see `docs/gtm-playbook.md`) relies on cold outreach and developer community presence. "Provably" needs zero explanation in that context. "Provably fair" is already the industry phrase — we're just owning it.

If `provably.com` is taken by a squatter at unreasonable cost, second choice is **Sortis**.

---

## What to Keep from "OpenRNG"

Regardless of brand name change:
- The GitHub repo can stay `openrng` during transition.
- The npm package `@openrng/core` can stay for backward compatibility with early integrators.
- The `openrng.xyz` domain can redirect to the new brand.
- The CSR spec v0.1 was authored under "OpenRNG" — footnotes can credit it as the original project name.

---

---

## ✅ Final Decision — 2026-08-03

**Selected name: Fairseal**

- **Domain purchased:** fairseal.io (acquired 2026-08-03)
- **Rationale:** "Fairseal" captures both the trust guarantee (seal of approval) and the animal logo concept (seal). Explicit, memorable, and immediately communicates the product's purpose — a seal of fairness on every selection. Ranked #2 in combined analysis; "Provably" had domain availability risk. Fairseal is cleaner for a B2B brand and avoids potential trademark ambiguity.
- **Logo concept:** A seal (animal) with a stamp/seal (trust mark) — double meaning: the animal and the act of sealing/certifying.
- **Migration plan:**
  - Phase 1 (2026-08-03): Documents, specs, outreach materials updated
  - Phase 2 (this week): DNS setup, API domain migration to fairseal.io
  - Phase 3 (next week): npm scope migration (@openrng → @fairseal)
  - Phase 4 (future): GitHub repo rename
- **Backward compatibility:** @openrng/core continues to work during transition. npm package migration is Phase 3.

*This document captures naming analysis from the 4-round AI audit. Decision finalized 2026-08-03.*
