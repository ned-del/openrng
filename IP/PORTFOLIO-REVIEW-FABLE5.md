# OpenRNG Patent Portfolio — Independent Review

**Reviewer:** Senior Patent Counsel (External)
**Date:** July 2, 2026
**Classification:** CONFIDENTIAL — Attorney Work Product

---

## 1. Portfolio Architecture: Does the Five-Patent Curve Hold?

**Verdict: Yes — with structural caveats.**

The five-patent family follows a genuinely elegant logical progression:

1. **Can randomness be verified?** → Verifiable Randomness
2. **Can it be hidden until needed?** → Dual Temporal Integrity
3. **Can trust survive consumption?** → Portable Trust Assertion
4. **Can trust survive delegation?** → End-to-End Verifiable Trust
5. **Can trust survive time?** → Continuous Trust Health

This is a rare thing in patent portfolios: a narrative arc that isn't just marketing veneer. Each patent addresses a genuinely distinct technical problem, and each builds on the capabilities established by its predecessor. The logical dependency chain is real — you cannot meaningfully implement #3 without #1's VEO infrastructure, and #5's decay monitoring presupposes #3's persistent trust objects.

**Structural strengths:**
- The curve moves from concrete/implementable (#1-#3) to abstract/aspirational (#4-#5), which maps correctly to technical maturity
- Patents #1-#3 form a defensible "gaming/compliance" cluster; #4-#5 form a "computational trust infrastructure" cluster
- The "stop after #5" decision is disciplined and correct — speculative #6+ patents would dilute the coherence

**Structural risks:**
- The curve is also a dependency chain. If Patent #1 is invalidated or narrowed significantly during prosecution, the foundation crumbles. The continuation strategy (anchoring #4/#5 priority dates in #3's non-provisional) is smart but also creates concentration risk.
- Patents #4 and #5 drift significantly from randomness into general "computational trust." This is commercially exciting but creates §101 (Alice) exposure — more on this below.
- The gap between #3 and #4 is the widest conceptual leap. #1-#3 all deal with verifiable randomness. #4 suddenly introduces "delegation" and multi-agent systems. An examiner — or opposing counsel — might argue these are different inventive concepts dressed in the same language.

**Overall architecture score: 8/10** — Coherent, well-sequenced, but the #3→#4 conceptual bridge needs strengthening in prosecution narratives.

---

## 2. Per-Patent Scoring

### Patent #1: Verifiable Randomness

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Patentability** | 9/10 | Already approved. The VEO-1 standard with five-layer structure (Payload, Provenance, Confidence, Proof, Anchor) is genuinely novel in its combination. |
| **Commercial Value** | 7/10 | Strong in regulated gaming, moderate elsewhere. The addressable market is real but niche until #4/#5 expand the aperture. |
| **Defensibility** | 7/10 | Approved status is worth a lot. But Chainlink's US12401532B2 remains a shadow — if their claims are read broadly, there's a design-around argument waiting to happen. The centralized-vs-distributed distinction is the primary moat. |

**Key Risks:**
- Chainlink's disclosure explicitly mentions VDF combination. Even if their claims are narrow (distributed VRF oracle network), the disclosure creates a prior art problem for certain claim constructions.
- The VDF primitive itself (Boneh et al. 2018) is well-established prior art. The novelty must rest on the *system integration*, not the cryptographic primitive. If any claim drifts toward claiming VDF itself, it's dead on arrival.
- drand is open-source prior art for distributed randomness beacons. Claims must carefully avoid claiming "obtaining entropy from a public beacon" as novel.

### Patent #2: Dual Temporal Integrity

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Patentability** | 8/10 | Strong. The pre-generation-before-request temporal separation is a clean, novel architectural choice. Chainlink's request-response model is fundamentally different. |
| **Commercial Value** | 8/10 | High in gaming/casino contexts where insider preview is a genuine regulatory concern. This patent has teeth — regulators *want* this property. |
| **Defensibility** | 8/10 | The temporal argument is clean: pre-generate → anchor → then serve. This is structurally distinct from every existing verifiable randomness system in the prior art, all of which generate on-request or on-chain. |

**Key Risks:**
- The concept of "commit-then-reveal" is ancient in cryptography. The examiner will likely cite general commitment schemes. The defense must emphasize: this is not a commitment scheme per se — it's a pre-generated pool with blockchain-anchored Merkle roots, where the generation timeline is provably anterior to any request timeline.
- nChain's abandoned US20220410017A1, while unenforceable, is citable prior art for "provably fair gaming + blockchain." The distinction (interactive commit-reveal vs. non-interactive pre-generated pools) must be crystal clear in prosecution.

### Patent #3: Portable Trust Assertion

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Patentability** | 7/10 | Novel concept, but "entropy receipts" could be characterized as "just logging with cryptographic signatures" by a hostile examiner. The Five-Layer Trust Stack adds structural novelty. |
| **Commercial Value** | 7/10 | Moderate standalone, but strategically critical as the bridge to #4/#5. The "trust receipt" concept has legs in audit/compliance contexts. |
| **Defensibility** | 6/10 | Most vulnerable of the first three patents. "Persistent cryptographic attestation of a computation" is dangerously close to existing attestation/notarization systems. Must differentiate from timestamping services, digital notarization, and blockchain-based proof-of-existence. |

**Key Risks:**
- §103 obviousness: An examiner could combine (a) any blockchain timestamping service + (b) any digital signature scheme + (c) any audit logging system and argue the combination is obvious. The defense must focus on the *specific* trust stack structure and the fact that the attestation carries verifiable quality metrics (ECS), not just proof-of-existence.
- The "continuation anchor" strategy (embedding #4/#5 concepts in #3's non-provisional) is clever for priority dates but creates prosecution complexity. If #3's claims are narrowed during office actions, the continuation claims for #4/#5 may also be affected.

### Patent #4: End-to-End Verifiable Trust

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Patentability** | 6/10 | The problem is real and well-articulated. The DAG-based lineage mechanism is implementable. But "trust delegation" as a concept is broad and touches many existing systems (PKI certificate chains, OAuth delegation, distributed tracing). |
| **Commercial Value** | 8/10 | Potentially enormous. Multi-agent AI is the hottest market in tech. If OpenAI, Anthropic, or Google need verifiable trust chains for agent delegation, this patent is gold. |
| **Defensibility** | 5/10 | Weakest defensibility in the portfolio. The concept of "maintaining provenance across delegation" is addressed (imperfectly) by existing distributed systems. The non-amplification constraint is novel, but the overall claim scope needs significant broadening beyond DAG mechanics. The portfolio document itself flags this: "Add broader independent claim beyond DAG mechanics." Until that's done, the patent is over-specified and easy to design around. |

**Key Risks:**
- **§101 Alice risk: HIGH.** "Preserving trust across delegation boundaries" sounds like an abstract idea. The patent needs a specific, concrete technical implementation — the DAG lineage records are a good start, but the independent claims must be grounded in specific data structures, cryptographic operations, and system architectures.
- PKI certificate chain delegation (X.509 path validation) is conceptually similar. The distinction (PKI delegates *identity*, this delegates *computational trust with quality metrics*) is real but subtle and needs aggressive prosecution.
- **New threat: Cyberscope filed a US patent (Aug 2025) for "AI-Optimized Blockchain Trust Scoring Platform."** While likely focused on smart contract auditing, the "trust scoring + blockchain" combination creates potential §103 combination prior art. Need to monitor this filing closely.

### Patent #5: Continuous Trust Health

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Patentability** | 8/10 | Strongest novel concept in the portfolio. "Trust decay" as an observable, measurable phenomenon that requires active monitoring and remediation — this framing is genuinely new. No existing patent or academic paper treats trust quality as a time-varying signal requiring continuous monitoring. |
| **Commercial Value** | 9/10 | Highest commercial value. The "Battery Health for Trust" analogy is commercially compelling and creates a new product category. Every compliance-heavy industry needs this. Every AI governance framework needs this. This is the crown jewel. |
| **Defensibility** | 7/10 | The "trust decay" framing is original enough to withstand §103 attacks. SIEM monitors security events, not trust quality. APM monitors performance, not trust. GRC does periodic checks, not continuous monitoring. The gap is real. |

**Key Risks:**
- **§101 Alice risk: MEDIUM-HIGH.** "Monitoring and responding to trust quality degradation" could be characterized as an abstract business method. The patent needs concrete technical anchors: specific metrics, specific detection algorithms, specific automated responses.
- The "Battery Health" analogy is great marketing but dangerous in prosecution. An examiner might argue you're just applying known monitoring/alerting patterns to a new domain (trust), which is §103 obvious.
- **New academic prior art: Yaslioglu (2025) published "A Novel Bayesian-Time-Decay Trust Mechanism in Blockchain" on arXiv.** This paper directly addresses time-decay of trust in blockchain contexts. While the specific mechanisms differ (Bayesian vs. OpenRNG's multi-dimensional monitoring), this paper will almost certainly be cited by an examiner. The defense: Yaslioglu addresses trust *reputation* decay in peer-to-peer networks; OpenRNG addresses trust *quality* decay in computational trust infrastructure. Different problem, different domain, different solution.

---

## 3. Claim Strength Review: §101/§103 Risks and Alice

### §101 (Abstract Idea / Alice) Risk Assessment

| Patent | §101 Risk | Analysis |
|--------|-----------|----------|
| #1 | **LOW** | Concrete system with specific cryptographic operations (VDF computation, Merkle tree construction, blockchain anchoring). The VEO-1 data structure is a specific technical artifact. Likely passes Alice Step 2 as a "specific improvement to computer functionality." |
| #2 | **LOW** | Temporal separation through pre-generation + blockchain commitment is a concrete technical architecture, not an abstract idea. The dual-pipeline (fast serving + slow anchoring) is a specific engineering solution. |
| #3 | **MEDIUM** | "Persistent attestation of computational trust" is more abstract. Must anchor claims in specific data structures (Five-Layer Trust Stack, Decision Attestation Records) and specific cryptographic operations. Without these anchors, an examiner could characterize this as "recording information about a transaction," which is an abstract idea under Alice. |
| #4 | **HIGH** | "Trust delegation" is dangerously abstract. The independent claims MUST specify concrete technical mechanisms: DAG construction algorithms, cryptographic linkage between parent/child assertions, non-amplification enforcement logic, specific verification protocols. The current draft's over-reliance on DAG mechanics is actually a blessing in disguise for §101 — it's concrete enough to survive Alice. But if you broaden away from DAG (as recommended), you risk abstracting into §101 territory. **This is the central tension for Patent #4.** |
| #5 | **MEDIUM-HIGH** | "Monitoring trust decay" could be characterized as a mental process or abstract business method. Needs specific technical implementation: concrete metrics (ECS dimensions with numerical thresholds), specific anomaly detection algorithms (not just "machine learning"), specific automated remediation actions. The more concrete, the safer. |

### §103 (Obviousness) Risk Assessment

The primary §103 attack vector across the entire portfolio is **combination obviousness**: an examiner combines known components (VDF + Merkle trees + blockchain + monitoring) and argues the combination is obvious.

**Key defense: The dual-path pipeline.** The sub-2ms in-memory token injection alongside slow background Merkle anchoring represents a genuine engineering trade-off that is not suggested by any prior art. No existing system separates the serving path (in-memory, instant) from the verification path (blockchain, delayed) in this way. This architectural choice is the primary §103 defense for Patents #1-#3.

**For Patents #4-#5:** The §103 defense shifts from engineering trade-offs to *problem framing*. Nobody else has defined "trust delegation" or "trust decay" as technical problems requiring systematic solutions. The novelty is in the problem definition as much as the solution. This is legally valid but harder to prosecute — examiners prefer concrete technical distinctions over "we defined the problem first."

---

## 4. Commercial Value Assessment

### Licensing Potential

| Patent | Offensive Licensing | Defensive Value | Acquisition Target |
|--------|--------------------|-----------------|--------------------|
| #1 | Medium — gaming operators, RNG providers | High — blocks competitors from verifiable RNG | Gaming companies, regulators |
| #2 | High — any system needing insider-preview prevention | Medium | Casino technology providers |
| #3 | Medium — audit/compliance platforms | Medium | RegTech companies |
| #4 | **Very High** — multi-agent AI systems | High — blocks Big Tech from trust delegation | OpenAI, Anthropic, Google, Microsoft |
| #5 | **Very High** — trust monitoring as a service | High — creates new category | Enterprise governance, GRC vendors, cloud providers |

### Revenue Model Analysis

**Near-term (2026-2027):** Patents #1-#3 generate licensing revenue from gaming/casino industry. The regulated gambling market has a real, immediate need for verifiable randomness. Revenue potential: $500K-$2M/year in licensing.

**Medium-term (2027-2029):** Patent #4 becomes relevant as multi-agent AI systems mature. This is timing-dependent — if AI agent delegation becomes standard (likely), this patent's value explodes. Revenue potential: $5M-$20M in acquisition value.

**Long-term (2028+):** Patent #5 creates a new category. "Trust Health" monitoring becomes a compliance requirement. Revenue potential: $10M-$50M+ if the category takes hold.

### Defensive vs. Offensive Posture

The portfolio is primarily **offensive** — designed for licensing and acquisition, not just defensive blocking. This is the right strategy for a startup. Key consideration: the portfolio has more value as a coherent family (sold together) than as individual patents. A potential acquirer gets not just five patents but a logical framework for computational trust infrastructure.

---

## 5. Competitive Positioning

### vs. Chainlink

| Dimension | Chainlink (US12401532B2) | OpenRNG |
|-----------|--------------------------|---------|
| Architecture | Distributed oracle network | Centralized server |
| Primitive | VRF (secret key) | VDF (time-based) |
| Model | Per-request generation | Pre-generated pool |
| Verification | VRF proof (single value) | Merkle proof (batch 65,536) |
| Trust model | Distributed (multiple oracles) | Centralized + cryptographic (VDF enforced) |
| Latency | Seconds (on-chain tx) | Sub-2ms (in-memory) |

**Assessment:** The architectural differences are substantial and genuine. Chainlink and OpenRNG solve the same high-level problem (verifiable randomness) through fundamentally different means. The risk is not direct patent infringement — it's that Chainlink's broad disclosure (mentioning VDF) creates prior art problems.

**Critical concern:** Chainlink's patent was *granted* in August 2025. Their claims are now final. An immediate priority should be obtaining and carefully reviewing the granted claim language (not just the disclosure). If their claims are narrow (specific to distributed VRF oracle networks), OpenRNG is safe. If they contain any claim broad enough to cover "verifiable randomness using cryptographic proofs anchored on blockchain," there's a problem. **This analysis has not been done and is the single highest-priority action item.**

### Big Tech Design-Around Risk

**Google:** Could implement VEO-like objects using their existing infrastructure (Cloud KMS + BigQuery + Vertex AI for monitoring). Design-around risk: **HIGH** for #5 (monitoring is Google's core competency), **LOW** for #1-#3 (specific VDF+Merkle pipeline).

**Microsoft:** Could integrate trust monitoring into Azure Confidential Computing. Design-around risk: **MEDIUM** for #4-#5 (they have the infrastructure), **LOW** for #1-#3.

**Amazon:** Already holds the Merkle tree patent (US10291408B2). Could potentially combine with their own RNG services. Design-around risk: **MEDIUM** for #1 (Merkle overlap), **LOW** for #2-#5.

**OpenAI/Anthropic:** Most interesting potential licensees for #4-#5. They need trust delegation for agent systems and currently have no public solution. Design-around risk: **LOW** (they'd rather license than build trust infrastructure).

---

## 6. Gaps & Vulnerabilities

### Missing Patents

1. **Hardware Entropy Source Integration** — The portfolio assumes software-based entropy. A patent covering the integration of hardware security modules (HSMs) or quantum RNG hardware with the VEO standard would strengthen the foundation.

2. **Cross-Chain Verification** — Currently anchored to Polygon. A patent covering chain-agnostic verification (verification on any EVM chain, or even non-EVM chains) would prevent competitors from implementing the same system on a different chain.

3. **Privacy-Preserving Verification** — Zero-knowledge proofs for VEO verification (prove a number was generated correctly without revealing the number or the verification path). This is a natural extension and would be extremely valuable in privacy-regulated markets (healthcare, financial services).

4. **Regulatory Compliance Mapping** — A patent covering automated mapping of trust assertions to specific regulatory frameworks (GLI-19 for gaming, PCI-DSS, SOC2) would add significant commercial value and be hard to design around.

### Competitor Blocking Opportunities

- **Chainlink's Expansion:** If Chainlink files continuation patents covering VDF integration (which their disclosure enables), they could block OpenRNG's approach. Filing #2 and #3 immediately establishes priority dates that Chainlink cannot preempt.
- **Cyberscope's Trust Scoring:** The August 2025 filing for AI-optimized blockchain trust scoring could evolve toward trust monitoring. Monitor their prosecution closely.

### Vulnerability Assessment

1. **Single-chain dependency:** If Polygon becomes irrelevant, the practical implementation of the patents weakens. The claims should be chain-agnostic wherever possible.
2. **VDF algorithm dependency:** If the specific VDF algorithm used (likely Wesolowski or Pietrzak) is broken cryptographically, Patents #1-#2 lose their cryptographic foundation. This is low probability but catastrophic risk.
3. **Open-source strategy tension:** OpenRNG appears to be partially open-source. Any code published before provisional filing dates is prior art against your own claims. Audit the public repository for pre-filing disclosures.

---

## 7. Filing Strategy

### Priority Order

1. **IMMEDIATE (July 2026): File Patents #2 and #3 provisionals.** These are ready. Every day of delay is a day another filing could establish prior art. Cost estimate: $3,000-$5,000 per provisional (patent attorney drafting + USPTO fees).

2. **Within 30 days: Full Chainlink claims analysis.** Obtain US12401532B2 granted claims. Have patent counsel conduct claim-by-claim comparison with OpenRNG's architecture. Cost: $5,000-$10,000 for formal FTO opinion.

3. **Q3 2026: File Patent #2 and #3 non-provisionals.** These are drafted but need attorney review. Cost estimate: $8,000-$12,000 per non-provisional.

4. **Q4 2026: File Patent #4 provisional.** After broadening the independent claim beyond DAG mechanics. This is the patent that needs the most prosecution strategy work. Cost: $5,000-$8,000.

5. **Q1 2027: File Patent #5 provisional.** The crown jewel deserves the most careful drafting. Consider filing with the broadest reasonable claims and letting the examiner narrow. Cost: $5,000-$8,000.

6. **Q2 2027: PCT applications for #2 and #3.** International protection for the gaming/compliance patents. Cost: $5,000-$8,000 per PCT application, plus national phase costs later.

### Budget Estimate (18-Month Filing Plan)

| Item | Estimated Cost |
|------|---------------|
| Patents #2-#3 provisionals | $6,000-$10,000 |
| Chainlink FTO opinion | $5,000-$10,000 |
| Patents #2-#3 non-provisionals | $16,000-$24,000 |
| Patent #4 provisional | $5,000-$8,000 |
| Patent #5 provisional | $5,000-$8,000 |
| PCT applications (#2-#3) | $10,000-$16,000 |
| Office action responses (est.) | $10,000-$20,000 |
| **Total 18-month estimate** | **$57,000-$96,000** |

### PCT Timing Considerations

The Paris Convention gives 12 months from provisional filing to claim priority in PCT. For Patents #2-#3, this means PCT must be filed within 12 months of the provisional date. Plan accordingly.

### Jurisdiction Strategy

- **United States:** Primary market. All patents filed here first.
- **EU (EPO):** Secondary. Gaming regulation (especially Malta, Gibraltar, Isle of Man) makes #1-#3 relevant.
- **Taiwan:** Consider ROC filing for #1-#3 given the company's location and Asia-Pacific gaming market.
- **Japan/Korea:** Defer unless specific commercial opportunities arise.

---

## 8. Red Team Attack: How Opposing Counsel Would Invalidate Each Patent

### Patent #1: Verifiable Randomness

**Attack 1 — §103 Combination:**
"VDF is known (Boneh 2018). Merkle trees are known (Merkle 1979). Blockchain anchoring is known (Bitcoin 2008). The combination of these three known techniques to verify randomness is obvious to one skilled in the art."

*Counter:* The specific five-layer VEO-1 architecture, the dual-path pipeline (sub-2ms serving + delayed anchoring), and the Entropy Confidence Score are not suggested by any prior art combination. The engineering trade-off between serving speed and verification completeness is a non-obvious design choice.

**Attack 2 — Chainlink Prior Art:**
"Chainlink's US12401532B2 disclosure describes verifiable randomness with blockchain verification and explicitly mentions VDF. OpenRNG's approach falls within Chainlink's disclosed embodiments."

*Counter:* Chainlink's *claims* (which define the patent scope, not the disclosure) are specific to distributed VRF with oracle networks. OpenRNG's centralized VDF + pre-generated pool architecture is outside the claim scope. The disclosure mention of VDF does not create claim coverage — it creates prior art for VDF + blockchain combination, but not for the specific OpenRNG pipeline.

### Patent #2: Dual Temporal Integrity

**Attack 1 — Commitment Scheme Prior Art:**
"Cryptographic commitment schemes (commit-then-reveal) have existed since Blum 1981. Pre-generating random values and revealing them later is a standard commitment protocol."

*Counter:* This is not a commitment scheme. It is a pool pre-generation architecture where (a) values are generated in batches of 65,536 using VDF-derived seeds, (b) the entire batch is Merkle-committed and blockchain-anchored as a single transaction, and (c) individual values are served from an in-memory pool with sub-2ms latency. No commitment scheme proposes this architecture.

**Attack 2 — Obviousness over nChain:**
"nChain's US20220410017A1 (abandoned) discloses provably fair gaming with blockchain and hash-based verification. Adding pre-generation is an obvious modification."

*Counter:* nChain's system is fundamentally interactive — it requires real-time commit-reveal between players and server. OpenRNG's system is non-interactive — values exist before any player interaction. This is not a minor modification; it's a different temporal architecture.

### Patent #3: Portable Trust Assertion

**Attack 1 — Digital Notarization Prior Art:**
"This is just blockchain timestamping with extra metadata. Services like Originstamp, Proof of Existence, and OpenTimestamps have provided blockchain-based attestation since 2012."

*Counter:* Timestamping services prove a document existed at time T. Trust Assertions prove a *computation* was performed with specific *quality metrics* at time T, using specific *entropy sources* with quantified *confidence scores*, and this attestation remains independently verifiable after the original computation's outputs are consumed. The quality dimension (ECS) is absent from all timestamping prior art.

**Attack 2 — §101 Alice:**
"'Recording trust information about a computation' is an abstract business concept."

*Counter:* The claim requires specific technical operations: constructing a multi-layer data structure (Five-Layer Trust Stack), performing cryptographic hash computations, generating Merkle proofs, anchoring to a blockchain, and creating portable verification packages. These are specific improvements to computer functionality, not abstract ideas.

### Patent #4: End-to-End Verifiable Trust

**Attack 1 — X.509 Certificate Chain:**
"PKI certificate chains already delegate trust across boundaries. What you call 'trust delegation' is just another form of certificate chain validation."

*Counter:* PKI delegates *identity* trust ("this entity is who they claim to be"). OpenRNG delegates *computational* trust ("this computation was performed with verifiable quality"). PKI has no concept of trust quality metrics, non-amplification constraints, or quality degradation tracking across delegation. They are categorically different systems.

**Attack 2 — Distributed Tracing (OpenTelemetry):**
"Distributed tracing already maintains provenance across service boundaries with parent-child span relationships."

*Counter:* Distributed tracing tracks *execution paths* for debugging. It does not track *trust quality*, enforce *non-amplification*, or enable *independent verification* of trust assertions. A trace span tells you "Service A called Service B." A trust delegation record tells you "Service A delegated a computation to Service B with trust quality Q1, and Service B's result has trust quality Q2 ≤ Q1, verifiable independently."

**Attack 3 — §101 Alice:**
"'Preserving trust across delegation boundaries' is an abstract business concept."

*Counter:* The claims require specific technical structures: directed acyclic graph construction with cryptographic linkage between nodes, non-amplification enforcement through mathematical constraints on trust quality scores, and independent verification protocols that traverse the graph without cooperation from intermediate nodes. This is a specific technical architecture, not an abstract idea. *However, this defense is only viable if the independent claims maintain sufficient technical specificity. If broadened too much per the portfolio document's recommendation, this counter fails.*

### Patent #5: Continuous Trust Health

**Attack 1 — SIEM/Monitoring Analogy:**
"You're applying known system monitoring techniques (anomaly detection, alerting, automated response) to a new domain (trust). That's §103 obvious."

*Counter:* The monitoring techniques are adapted to trust-specific metrics that have no analog in existing monitoring systems. ECS dimension drift, source diversity narrowing, anchoring latency creep, and delegation chain depth growth are novel observables. The remediation actions (source rebalancing, policy tightening, trust downgrading) are specific to trust infrastructure and not found in any SIEM or APM system.

**Attack 2 — Bayesian Trust Decay (Yaslioglu 2025):**
"Academic prior art already addresses time-decay of trust in blockchain systems using Bayesian methods."

*Counter:* Yaslioglu addresses *reputation* trust decay in peer-to-peer networks (node trustworthiness based on past behavior). OpenRNG addresses *computational* trust quality decay (the quality of cryptographic and statistical properties of generated entropy). Different type of trust, different decay mechanism, different monitoring approach, different remediation.

**Attack 3 — §101 Alice:**
"'Monitoring trust quality over time' is a mental process that humans perform."

*Counter:* The claims require specific computational processes: continuous multi-dimensional metric collection, algorithmic anomaly detection against trust-specific baselines, automated remediation through specific system reconfigurations, and machine-readable compliance attestation generation. No human can perform Merkle tree integrity verification at scale, cross-reference entropy source diversity metrics across millions of VEOs, or automatically rebalance entropy source allocation in real-time. These are inherently computational processes.

---

## Summary Scorecard

| Patent | Patentability | Commercial Value | Defensibility | Overall |
|--------|:---:|:---:|:---:|:---:|
| #1 Verifiable Randomness | 9 | 7 | 7 | **7.7** |
| #2 Dual Temporal Integrity | 8 | 8 | 8 | **8.0** |
| #3 Portable Trust Assertion | 7 | 7 | 6 | **6.7** |
| #4 End-to-End Verifiable Trust | 6 | 8 | 5 | **6.3** |
| #5 Continuous Trust Health | 8 | 9 | 7 | **8.0** |

**Portfolio-level assessment: 7.3/10** — A strong, coherent portfolio with genuine commercial potential. The crown jewels are Patents #2 (cleanest claims, best defensibility) and #5 (highest commercial value, strongest novelty). Patent #4 is the weakest link and needs significant claim work before filing.

### Top 5 Action Items (Priority Order)

1. **File Patents #2 and #3 provisionals immediately.** Every week of delay is risk.
2. **Obtain and analyze Chainlink US12401532B2 granted claims.** This is the single biggest unknown in the portfolio.
3. **Broaden Patent #4 independent claims** beyond DAG mechanics while maintaining §101 compliance. This is the hardest drafting challenge in the portfolio.
4. **Audit the public OpenRNG repository** for any code or documentation published before provisional filing dates that could constitute self-inflicted prior art.
5. **Monitor Cyberscope's trust scoring patent** and Yaslioglu's academic work for prosecution-relevant developments.

---

*This review is based on publicly available information, the provided portfolio documents, and web-accessible prior art. It does not constitute a formal freedom-to-operate opinion or patentability opinion. A patent attorney should conduct formal claim analysis, particularly for the Chainlink patent comparison.*

**End of Review**
