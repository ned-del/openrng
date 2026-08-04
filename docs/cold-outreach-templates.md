# Cold Outreach Templates

**Date:** 2026-08-03  
**Context:** Synthesized from multi-AI audit session — two primary templates recommended.

---

## Template A: The Trust Problem ("The next time someone calls your raffle rigged")

**Source:** Claude's draft  
**Length:** ~118 words  
**Tone:** Direct, empathetic, problem-first  
**Best for:** Onchain game operators, NFT project raffle runners, community managers

---

**Subject:** The next time someone calls your raffle rigged

Hi [First Name],

The next time someone calls your raffle rigged, what do you say?

"Trust us" isn't an answer — not in a community that can see everything on-chain except the thing that matters most: *how the winner was chosen*.

Fairseal generates a **Committed Selection Receipt** for every draw. Before the winner is selected, we commit to a future block hash on Base. After, we publish a verifiable proof. Your users can check it themselves — no trust required.

Integration takes an afternoon. The first receipt is free.

Worth a 20-minute call?

[Signature]

---

**Notes on Template A:**
- Works best for projects that have experienced community backlash or accusations of unfairness.
- The "trust us isn't an answer" line resonates especially with Web3 audiences who are primed to distrust operators.
- Follow up with a link to the receipt viewer (let them see a real receipt before the call).
- Personalize the opening: if you can name a specific incident (e.g., "I noticed the [project] community had questions about the [event] draw") it converts much better.

---

## Template B: The Cost Comparison ("Drop-in VRF for Base apps")

**Source:** Gemini's draft  
**Length:** ~90 words  
**Tone:** Technical, benefit-first, cost-focused  
**Best for:** Developers who've looked at Chainlink VRF and been scared off by price/complexity

---

**Subject:** Drop-in VRF for Base apps — 99.9% cheaper than Chainlink

Hi [First Name],

Chainlink VRF on Base: ~$2–5 per request, 2-block callback, oracle dependency.

Fairseal on Base: ~$0.01 per committed selection, one transaction, verifiable offline.

Drop-in SDK. Receipts your users can verify without trusting you. No oracle subscription.

If you're building anything that needs provably fair randomness on Base — raffles, loot, agent decisions, governance selection — it's worth 15 minutes.

[Signature / link to docs]

---

**Notes on Template B:**
- Works best for technically-minded developers who've already evaluated Chainlink VRF.
- The cost comparison is the hook; make sure the pricing is accurate before sending.
- Follow up with a link to the SDK quickstart, not the product marketing page.
- Less effective for non-technical decision-makers (use Template A instead).
- Subject line can be A/B tested: "99.9% cheaper than Chainlink" vs "Verifiable randomness for $0.01" vs "Fair draws your users can verify."

---

## When to Use Which

| Situation | Template | Reason |
|---|---|---|
| Community manager, game founder, NFT project lead | A | They feel the trust problem emotionally |
| Developer who's priced out Chainlink | B | Cost + technical comparison is the hook |
| DAO operations lead | A (modified) | Governance trust is the angle |
| AI agent framework maintainer | A (modified) | "Your agent's decisions should be auditable" |
| Hackathon / event organizer | A | Public trust problem is obvious |
| Technical co-founder, protocol developer | B | Developer efficiency framing |
| Cold outreach, no context on role | A | Safer default; triggers if they have the problem |

---

## Personalization Variables

Both templates should be personalized before sending:

- `[First Name]` — always use first name
- `[Project name]` — reference their specific product in follow-up
- `[Specific incident]` — mention a known community issue if visible (opt-in; don't make things up)
- `[Use case]` — align to their specific use case (raffle, loot box, governance, agent)

---

## Follow-Up Sequence (3-touch max)

1. **Day 0:** Initial template (A or B)
2. **Day 5:** Share a specific receipt link — "Here's what one looks like" (no ask)
3. **Day 12:** Final touch — "Happy to share the integration guide if useful. No pressure." (soft out)

Do not send more than 3 messages. If no reply after 3, mark as unresponsive and move on.

---

*These templates are starting points. The best-converting email will always be one that references something specific about the recipient's project.*
