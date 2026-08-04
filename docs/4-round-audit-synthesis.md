# 4-Round Multi-AI Audit: Synthesis Document

**Date:** 2026-08-03  
**Duration:** ~3 hours  
**AIs involved:** ChatGPT (GPT-4o), Claude (Sonnet), Gemini (1.5 Pro)  
**Status:** Final synthesis

---

## What This Was

A structured multi-AI audit of OpenRNG — asking three different AI systems to independently analyze the same product, then combining their findings into a synthesis that no single AI would have reached alone.

Four rounds, each building on the last:
1. Product evaluation
2. Security audit
3. Business model
4. Co-creation (artifacts)

---

## Timeline

| Round | Focus | Duration | Key Output |
|---|---|---|---|
| Round 1 | Product evaluation | ~45 min | Strengths, weaknesses, manifest 404 |
| Round 2 | Security audit | ~45 min | Threat model, cherry-picking, seed grinding |
| Round 3 | Business model | ~45 min | ICP, pricing, receipt standard as moat |
| Round 4 | Co-creation | ~45 min | CSR spec, security model, email, plugin, naming |

---

## Round 1: Product Evaluation

**What was asked:** Evaluate OpenRNG as a product. What works, what doesn't, where are the gaps?

**ChatGPT finding:** The RNG mechanism is technically sound. The strongest asset is the on-chain commitment and Merkle anchoring. The weakest element is the developer onboarding — documentation is thin, and the manifest link 404s.

**Claude finding:** The product has a "trust gap" problem — it claims provable fairness but doesn't surface a receipt that non-technical users can understand. The cryptographic proof exists but is invisible to the end beneficiary (the raffle participant).

**Gemini finding:** The brand name "OpenRNG" undersells the product. "RNG" is associated with luck/chance (and gaming frustration); the actual product is about commitment and proof, which is more valuable.

**Synthesis finding:**
- **RNG is the strongest technical element.** The commit-reveal with Base anchoring is the right architecture.
- **PII is the weakest element.** No PII in receipts, but the documentation doesn't make this explicit — creating uncertainty for GDPR-aware operators.
- **Manifest 404 is a credibility killer.** A broken link in the documentation signals abandonment to evaluators.
- **The receipt needs to be the product.** Not just a technical artifact — something a user can see and understand.

---

## Round 2: Security Audit

**What was asked:** Audit the security model. What are the attack vectors? What's not protected?

**ChatGPT finding:** The main risk is operator cherry-picking — submitting a commitment after seeing the epoch block hash. This is addressed by on-chain ordering, but the documentation doesn't explain this clearly. Recommend explicit verification instructions.

**Claude finding:**
1. **Testnet anchoring risk:** If any production receipts use testnet anchors, the security guarantee collapses — testnet block hashes have no economic security.
2. **Seed grinding:** An operator who controls `operator_seed` can precompute many possible outcomes by iterating over future epoch blocks and picking a favorable one.
3. **cherry-picking mitigated but not documented** — the `anchor_tx` ordering proof exists in the protocol but isn't surfaced to users.

**Gemini finding:** The modulo bias issue (using `seed mod pool_size` for large pools) could produce non-uniform distributions. Recommend rejection sampling. Also flagged: no slashing for selective abort — an operator can commit and refuse to reveal with no on-chain penalty.

**Synthesis finding:**
- **Testnet anchoring** was already fixed for production; documentation should be explicit.
- **Cherry-picking** is mitigated by on-chain ordering; needs documentation and UX surfacing.
- **Seed grinding** requires the `client_salt` mechanism (designed in Round 4).
- **Modulo bias** addressed in SDK v1.x with rejection sampling.
- **Selective abort** remains an open risk; staking/slashing is the planned fix.

---

## Round 3: Business Model

**What was asked:** Who should OpenRNG sell to? What's the pricing? What's the moat?

**ChatGPT finding:** The primary ICP is developers building products where fairness is a claim they need to make to their users. Games, raffles, DAOs. The moat is distribution, not technology — the oracle is commoditizable, but the receipt standard (if adopted) creates lock-in through ecosystem compatibility.

**Claude finding:** The most underserved market is **humans building AI agents**. As agents make consequential decisions (selecting a winner, assigning a task, sampling data), they'll need auditable randomness. The agent framework plugin (ElizaOS, LangChain) is the wedge into this market.

**Gemini finding:** Three-tier pricing is the right structure: micropayment per-selection (x402), voucher packs (mid-tier), subscription plans (production). Enterprise tier should include a GLI-19 certification roadmap for regulated gaming.

**Synthesis finding:**
- **Sell to developers building for humans**, not directly to end users.
- **Receipt standard is the moat.** If operators issue CSR-compatible receipts, verifiers, auditors, and users build tooling around the standard — making Fairseal the canonical source.
- **Agent framework integrations are the growth lever.** ElizaOS + LangChain plugins = distribution to every developer using those frameworks.
- **Three-tier pricing confirmed:** x402 micro → voucher packs → production plans → enterprise with GLI path.
- **AEOM explicitly excluded.** Different company, different domain, no demand signal.

---

## Round 4: Co-Creation (Artifacts)

**What was asked:** Let's build the actual artifacts — spec, security model, email templates, plugin design, naming.

**Outputs from this round:**
1. **CSR Specification v0.1** (ChatGPT structure + Gemini RFC 8785 + Claude client_salt) → `csr-spec-v0.1.md`
2. **Formal Threat Model** (ChatGPT + Claude security models merged) → `security-model-v0.1.md`
3. **Cold outreach templates** (Claude's trust-problem frame + Gemini's cost-comparison frame) → `cold-outreach-templates.md`
4. **ElizaOS plugin design** (Claude's primary + async patterns from Gemini) → `elizaos-plugin-design.md`
5. **Naming candidates** (Claude: Sortis, Fairseal, Veridraw / Gemini: Provably, VeritasL2) → `naming-candidates.md`
6. **Receipt permanence guarantee** (new — prompted by question about what happens if OpenRNG disappears) → `receipt-permanence-guarantee.md`

---

## Key Consensus Points Across All Three AIs

Despite different architectures and training, all three AIs converged on:

1. **The receipt is the product.** Not the oracle, not the API. The verifiable, shareable, offline-checkable receipt.

2. **"Provably fair" is already the phrase.** The market knows what it wants; Fairseal just needs to deliver it in a form people can verify.

3. **On-chain commitment ordering is the core security guarantee.** Everything else is enhancement; this is the irreducible foundation.

4. **Developer distribution first.** SDKs, plugins, and framework integrations beat direct sales to end users.

5. **Naming matters.** "OpenRNG" undersells the product. All three AIs suggested a rename toward proof/fairness/commitment framing.

6. **The moat is the receipt standard, not the oracle.** If the CSR spec becomes the standard that other tools verify against, the oracle is just one implementation.

---

## Unasked Questions (Identified in Synthesis)

Questions that weren't explicitly raised but should be addressed:

1. **GLI-19 certification path.** For regulated gambling markets (Nevada, UK, Malta), a third-party audit certification is required. No AI was asked about this explicitly; it appeared in Gemini's pricing suggestion. This is a significant enterprise unlock.

2. **Receipt permanence.** If OpenRNG shuts down, can historical receipts be verified? None of the AIs was asked directly — it emerged as a question during the session. Answer: yes, with Base mainnet as the source of truth. Formalized in `receipt-permanence-guarantee.md`.

3. **Candidate list completeness.** How do verifiers confirm that all eligible candidates were included in the pool? The CSR proves fair selection *from* the pool, not that the pool was complete. Eligibility Receipt extension addresses this, but it wasn't designed in this session.

4. **Base sequencer risk.** If the Base sequencer is compromised or colluding, can it influence epoch block hashes? Partial answer in the security model; full analysis deferred to a future security review.

---

## Key Strategic Decisions Made

After the 4-round session, the following decisions were reached:

| Decision | Rationale |
|---|---|
| CSR spec v0.1 is the primary external-facing artifact | Developers need a spec to build against; the spec makes Fairseal interoperable |
| client_salt should be default-on | Seed grinding is a real risk; client_salt is the mitigation; defaulting off is a security footgun |
| Receipt permanence is a formal commitment, not just a feature | Customers building on Fairseal need to know their receipts survive operator failure |
| Naming review required | Arm Ltd conflict creates legal risk; "Provably" or "Sortis" as replacements |
| ElizaOS plugin is Priority 1 for ecosystem growth | Agent frameworks are the growth channel; plugin is the wedge |
| AEOM excluded from Fairseal strategy | Different company, different domain, no demand signal; conflating them creates confusion |
| Kill signal defined at Day 30 | Prevents over-investment in an outreach motion that isn't working |

---

## Final Positioning

From the synthesis of all four rounds across three AIs:

> **Fairseal is a committed selection infrastructure company.**

Not "a randomness API." Not "a VRF alternative." Not "a raffle tool."

**Committed selection infrastructure** — the phrase that captures:
- The cryptographic commitment (not just randomness)
- The selection (not just a number)
- The infrastructure (not just a library)

The receipt is the proof. The moat is the standard. The wedge is the plugin.

---

---

## Post-Session Update: Brand Decision (2026-08-03)

Following the 4-round audit session, a naming conflict was confirmed with Arm Ltd's "OpenRNG" hardware RNG technology. On 2026-08-03, the project was rebranded:

| | Before | After |
|---|---|---|
| **Brand name** | OpenRNG | **Fairseal** |
| **Domain** | openrng.io | **fairseal.io** |
| **npm scope** | @openrng | @fairseal (planned Phase 3) |
| **ElizaOS plugin** | @openrng/eliza-plugin | @elizaos/plugin-fairseal |

**Why Fairseal over Provably (the top-ranked candidate):**
"Provably" had potential domain/trademark ambiguity and is already used informally as a generic adjective across the industry. "Fairseal" is distinct, ownable, and the double meaning (seal-the-animal + seal-of-approval) provides a strong logo concept and brand story.

**What does NOT change:**
- The CSR protocol, cryptographic architecture, and security model are unchanged.
- The Committed Selection Receipt (CSR) standard remains the same specification.
- All receipts issued under "OpenRNG" remain valid and verifiable — see `receipt-permanence-guarantee.md`.
- The @openrng/core package remains available for backward compatibility during transition.

**Infrastructure migration plan:**
- Phase 1 (2026-08-03): Document and specification rebrand — complete
- Phase 2 (this week): DNS setup, API domain migration to fairseal.io
- Phase 3 (next week): npm scope migration (@openrng → @fairseal)
- Phase 4 (future): GitHub repo rename (openrng → fairseal)

See `brand-transition.md` for the full migration record.

---

*This document is a synthesis artifact from the 2026-08-03 multi-AI audit session. The raw session transcripts are not preserved; this document captures the distilled findings.*
