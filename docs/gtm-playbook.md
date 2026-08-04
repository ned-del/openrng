# Fairseal Go-to-Market Playbook

**Version:** 0.1  
**Date:** 2026-08-03  
**Status:** Draft — synthesized from multi-AI strategy session

---

## Strategic Frame

Fairseal is not a randomness API. It is **committed selection infrastructure** for the onchain economy.

The wedge product is the **Fair Selection Receipt** — a human-readable, independently verifiable proof that "this winner was chosen fairly before anyone knew who would win." Every game, agent framework, DAO, and raffle has a trust problem. We solve it.

**Core insight from cross-AI synthesis:** The moat is not the oracle — it's the receipt standard. VRFs are commodities. A receipt that anyone can verify offline and that customers can show to their users is a product.

---

## 90-Day Sprint Plan

### Days 1–14: Package the Wedge

**Goal:** One undeniable integration that a developer can ship in an afternoon.

**Deliverables:**
- [ ] Publish CSR spec v0.1 (done — see `docs/csr-spec-v0.1.md`)
- [ ] Ship `@fairseal/core` verification SDK to npm
- [ ] Build one-page integration demo: "raffle in 20 lines of code"
- [ ] Create receipt viewer UI: paste a receipt JSON, see the audit trail
- [ ] Write "Fair Selection Receipt" landing page (< 500 words, no jargon)
- [ ] Publish receipt permanence guarantee (done — see `docs/receipt-permanence-guarantee.md`)
- [ ] Identify 3 design partners from personal network for early feedback

**Success metric:** A developer outside the team can integrate and verify a receipt in under 2 hours.

---

### Days 15–45: 100-Target Outreach

**Goal:** 100 personalized outreach touches, segment-specific value props.

#### Segment Breakdown (100 total)

| Segment | Count | Why They Care | Hook |
|---|---|---|---|
| Onchain games (raffles, loot, tournaments) | 30 | Player trust is survival | "Stop losing users to 'the raffle was rigged'" |
| AI agent frameworks (ElizaOS, LangChain agents, etc.) | 25 | Agents need auditable decisions | "Your agent's coin flip should be provable" |
| DAOs (governance, grants, committee selection) | 20 | Procedural legitimacy | "Committee selection that's unchallengeable" |
| AI evaluation / benchmarking teams | 15 | Sample selection integrity | "Prove your eval set was randomly selected" |
| x402 / micropayment protocol projects | 10 | Native Base ecosystem | "Randomness that settles on Base like your payments" |

#### Per-Segment Value Props

**Games (30):**
- Pain: Players accuse operators of rigging raffles; no way to prove otherwise.
- Hook: One integration adds a "Verify This Draw" button to every result.
- Ask: 30-minute call → free pilot → first receipt on mainnet.

**Agent Frameworks (25):**
- Pain: Agents make random choices (sampling, assignment) with no audit trail.
- Hook: Plugin-based integration (see `docs/elizaos-plugin-design.md`); 3 actions, drop-in.
- Ask: Integrate into the framework's example library.

**DAOs (20):**
- Pain: Random committee or grant selection is politically contested.
- Hook: On-chain commitment + public receipt makes results unchallengeable.
- Ask: Run one governance selection as a free pilot.

**AI Evaluation (15):**
- Pain: Benchmark datasets must be randomly sampled; no proof they were.
- Hook: Receipt proves sample selection was unbiased at dataset creation time.
- Ask: Add to evaluation methodology documentation.

**x402 / Base Ecosystem (10):**
- Pain: Need native Base randomness that's not Chainlink (expensive, slow).
- Hook: Costs <$0.01/selection on Base; settles in one transaction.
- Ask: Integrate into x402 payment confirmation flow.

#### Outreach Cadence
- Day 15: Send first 30 (games segment)
- Day 22: Send next 40 (agents 25 + DAO 15)
- Day 29: Send final 30 (DAO 5 + AI eval 15 + x402 10)
- Day 36–45: Follow-up sequence (3-touch max per target)

---

### Days 46–75: Convert to Paid Pilots

**Goal:** 5–10 paying pilot integrations.

**Pilot terms:**
- Duration: 30 days
- Price: $500–1,500 flat (covers integration support + unlimited receipts during pilot)
- Deliverable: Working integration + pilot receipt count + one testimonial quote

**Conversion triggers:**
- Demo call completed → send pilot proposal within 24 hours
- Trial integration working → offer paid upgrade with SLA
- Inbound from competitor comparison → fast-track to pilot call

**What makes a good pilot candidate:**
1. Has an existing product with a raffle/selection/assignment use case
2. Has users who could see and verify receipts
3. Team is technically capable of SDK integration
4. Decision-maker reachable in under 2 touches

---

### Days 76–90: Case Studies + Repeatable Wedge

**Goal:** 2 publishable case studies + refined ICP definition.

**Case study format:**
- Problem: What they were doing before (centralized random, no proof)
- Integration: How long it took (target: < 1 day)
- Result: First verifiable receipt on mainnet
- Quote: From the integration lead (role label, no PII)

**Repeatable wedge:**
- One integration guide (< 1,000 words)
- One receipt verification demo (< 5 clicks to verify any receipt)
- One pricing calculator (enter draws/month → see cost)

---

## Plan B Options

If Day 30 kill signal triggers (see below), pivot to one of:

### Plan B1: Event-Led GTM
- Target: Hackathons, ETHGlobal, and onchain game conferences
- Offer: $2,000–5,000 flat fee to power the event's raffle/prize draw
- Proof: Every winner gets a verifiable receipt; event organizer can show it to all participants
- Why it works: Events have the exact trust problem (public + high stakes), and the operator benefits from the PR

### Plan B2: Discord/Telegram Raffle Bot
- Target: Crypto communities, NFT projects, indie game Discord servers
- Product: `/raffle` bot command → runs selection → posts verifiable receipt link
- Pricing: Free tier (10 raffles/month) → $49/month (unlimited)
- Why it works: Bot is viral; every receipt posted in Discord shows the product to new users
- Build timeline: 2 weeks for MVP bot

---

## Pricing Tiers

### x402 Micro (Pay-per-use)
- Price: Micropayments via x402 protocol
- Rate: ~$0.001–0.01 per selection (based on gas + margin)
- Target: Developers prototyping, agents making infrequent decisions
- No subscription, no commitment

### Voucher Packs
- 100 receipts: $25 ($0.25/receipt)
- 1,000 receipts: $150 ($0.15/receipt)
- 10,000 receipts: $750 ($0.075/receipt)
- Target: Small games, indie projects, hackathon winners

### Production Plans (Monthly Subscription)
| Plan | Price/month | Receipts/month | SLA | Support |
|---|---|---|---|---|
| Starter | $750 | 5,000 | 99.5% | Email |
| Growth | $1,500 | 25,000 | 99.9% | Slack |
| Scale | $2,500 | 100,000 | 99.95% | Dedicated |

### Enterprise (Annual)
| Tier | Price/year | Volume | Features |
|---|---|---|---|
| Enterprise S | $15,000 | 500K receipts | Custom contract, audit report |
| Enterprise M | $35,000 | 2M receipts | White-label receipt viewer |
| Enterprise L | $75,000 | Unlimited | On-prem option, GLI path |

**Note on GLI-19:** Enterprise tier should include a roadmap toward GLI-19 certification for regulated gaming markets. Not required for initial GTM but is a key enterprise upsell.

---

## Kill Signal

**Trigger:** Day 30 checkpoint.

If ALL of the following are true:
- ≥ 40 outreach touches sent
- < 10% reply rate (< 4 replies)
- Zero integrations started (no one actually tried the SDK)

→ **Stop the outreach motion.** Do not continue to Day 45. Pivot to Plan B1 or B2.

**Interpretation:** Low reply rate + zero trials means the value prop isn't landing in cold email. Either the ICP is wrong, the hook is wrong, or the product needs a lower-friction entry point (the bot or event model).

**What to do on kill signal:**
1. Run 5 retrospective calls with the people who did reply but didn't convert.
2. Identify the #1 objection.
3. Rebuild the pitch around the objection.
4. Relaunch with Plan B as primary channel.

---

## Metrics to Track

| Metric | Target (Day 90) |
|---|---|
| Outreach touches sent | 100 |
| Reply rate | > 20% |
| Demo calls completed | > 10 |
| Pilot integrations started | ≥ 5 |
| Paying pilots | ≥ 3 |
| Receipts issued on mainnet | > 500 |
| Published case studies | ≥ 2 |
| MRR (end of Day 90) | > $2,000 |

---

## Note on AEOM

AEOM (the fashion brand) is **explicitly excluded** from Fairseal's go-to-market strategy. AEOM operates in a different domain (fashion/retail), has no identified demand for committed randomness infrastructure, and would create brand confusion. Fairseal targets developer and DAO audiences; AEOM targets fashion consumers. These are separate companies with separate strategies.

---

*This playbook is a living document. Update after each weekly review.*
