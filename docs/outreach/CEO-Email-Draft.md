**Subject: OpenRNG — Provably Fair RNG Infrastructure for Gaming (Patent-Protected)**

---

Hi [Name],

I'm reaching out because I believe we've built something that solves one of gaming's oldest trust problems — and I wanted to share it with you directly.

**The problem in one sentence:**
Today, when a player pulls a gacha, spins a slot, or rolls for loot, they have zero way to verify the result was fair. They trust the platform. That's it.

**What we built:**
OpenRNG is a patented infrastructure layer that makes every random outcome in a game independently verifiable — by the player, by regulators, by anyone — without trusting the game operator.

---

### How It Works (No Jargon)

**1. Anti-Cheat for the House (Patent #1 — Approved ✅)**

Every random value is generated in batches and organized into a cryptographic tree (Merkle tree). The root hash is anchored to a public blockchain. This means: after a batch is committed, nobody — not even the game operator — can change a single value without it being mathematically detectable.

→ *Players can verify: "my result was not tampered with after it was generated."*

**2. Anti-Insider Preview (Patent #2 — Filing)**

Patent #1 prevents tampering *after* commitment. But what about *before*? A bad actor inside the company could preview the results, pick a favorable batch, and commit that one instead.

Patent #2 closes this gap with a Verifiable Delay Function (VDF) — a mandatory computation that takes a fixed amount of time (e.g., 4 seconds). During that window, nobody in the world — not the CEO, not the CTO, not a hacker — can see the results. When the computation finishes, the values are locked. Too late to cherry-pick.

→ *Players can verify: "nobody could have seen these results before they were committed."*

**3. Provably Fair Receipts (Patent #3 — Filing)**

Every random outcome is packaged as a Verifiable Entropy Object (VEO) — a digital receipt carrying the random value, where the entropy came from (multiple independent sources), a quality score (0–1000, graded AAA to LOW), a cryptographic signature, and an optional blockchain anchor. Any player, any regulator, any third party can independently verify the receipt — offline, without contacting the game server.

→ *Players can verify: "this result came from high-quality, multi-source randomness, and here's the proof."*

---

### What This Means for Game Companies

**For your players:**
- End the "is this rigged?" question permanently
- Every pull, every drop, every roll comes with a verifiable proof
- Trust is no longer a marketing promise — it's a mathematical guarantee

**For your business:**
- **Regulatory advantage:** VEO verification satisfies GLI-19/GLI-33 requirements for provably fair RNG — auditors can verify outcomes independently without trusting your logs
- **Market differentiation:** Be the first platform that can say "our randomness is independently verifiable" — not as marketing, but as a technical fact
- **Player retention:** Players who trust the system spend more time (and money) in it — studies consistently show trust correlates with engagement and LTV
- **Zero performance impact:** Tokens are served from pre-generated pools at sub-2ms latency. Players experience zero delay on pulls or spins

**For the industry:**
- If one major platform adopts verifiable randomness, it raises the bar for everyone
- "Provably fair" becomes the new standard, not a nice-to-have
- The gaming industry moves from "trust us" to "verify it yourself"

---

### Current Status

| Component | Status |
|-----------|--------|
| Core RNG engine | ✅ Built and tested (74/74 tests passing) |
| Patent #1 (Merkle batch + blockchain anchor) | ✅ **Approved** |
| Patent #2 (VDF anti-preview) | 📋 Filing with IP counsel |
| Patent #3 (VEO trust artifacts) | 📋 Filing with IP counsel |
| Blockchain anchoring (Polygon) | ✅ Live on testnet |
| Public verifier (verify.openrng.io) | ✅ Live |
| SDK (@openrng/sdk) | 🔜 In development |
| GLI certification | 🔜 Planned |

---

### Integration

Integration is designed to be minimal:

```
// One line to get verifiable randomness
const veo = await openrng.getEntropy({ policy: 'gaming-grade' });

// Use veo.value for your game logic
const result = determineOutcome(veo.value);

// The VEO receipt is automatically available for player verification
```

The SDK handles everything — multi-source entropy, quality scoring, signing, and anchoring — behind a single API call.

---

I'd love to show you a live demo or discuss how this could integrate with your platform. Happy to jump on a call at your convenience.

Best,
Ned Hsu
OpenRNG
[contact]
