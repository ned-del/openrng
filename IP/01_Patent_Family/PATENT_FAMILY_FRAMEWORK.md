# OpenRNG Patent Family Framework

## The Dual Naming Convention

Every patent has two names:
- **Technical Problem** → for patent examiners, engineers, attorneys
- **System Property** → for papers, talks, standards, industry

---

## The Five Patents

| # | Technical Problem | System Property | Status |
|---|---|---|---|
| **1** | Random values cannot be individually verified | **Verifiable Randomness** | ✅ Approved |
| **2** | Random values can be previewed before commitment | **Dual Temporal Integrity** | 📋 Ready to file |
| **3** | Trust disappears after randomness is consumed | **Portable Trust Assertion** | 📋 Ready to file |
| **4** | Computational trust cannot survive delegation | **End-to-End Verifiable Trust** | 🔬 Problem defined |
| **5** | Trust quality silently degrades during operation | **Continuous Trust Health** | 🔬 Problem defined |

---

## The Logical Curve

```
#1  Can randomness be verified?
 ↓
#2  Can randomness be hidden until it should exist?
 ↓
#3  Can trust survive after randomness is consumed?
 ↓
#4  Can trust survive delegation?
 ↓
#5  Can trust survive time?
```

---

## The Framework: Problem → Property → Protocol → Patent

```
Technical Problem     (What can't be done today?)
       ↓
System Property       (What property does solving it create?)
       ↓
Protocol / RFC        (How does the protocol work?)
       ↓
Patent Claims         (What specific inventions are claimed?)
```

---

## Naming Discipline

### For Patents (Technical Problem language)
- "Insider Preview Attack"
- "Entropy is disposable"
- "Trust cannot survive delegation"
- "Trust quality silently degrades"

### For Papers / Talks / Standards (System Property language)
- "Dual Temporal Integrity"
- "Portable Trust Assertion"
- "End-to-End Verifiable Trust"
- "Continuous Trust Health"

### For Manifestos / Vision (Movement language)
- "The Second Law of Computational Trust"
- "Trust decays. Always."
- "Unattended trust is indistinguishable from no trust."

→ **Never mix these layers.** Patent examiners need problems, not movements. Conferences need properties, not claims. Manifestos need beliefs, not specifications.

---

## External Communication Rule

- ❌ Do NOT use "Patent #4" or "Patent #5" externally
- ✅ Use: "Next Candidate", "Future Research", "Reserved Continuation"
- Keep numbering flexible until Technical Problem is finalized and filed

---

## Where Each Document Lives

| Document Type | Purpose | Audience |
|---|---|---|
| Technical Problem Definition | Define the problem (2-3 pages) | Internal + attorney |
| RFC | Specify the protocol | Engineering + standards |
| Patent (Provisional) | Lock priority date | USPTO |
| Patent (Non-Provisional) | Full claims + embodiments | USPTO + attorney |
| Whitepaper section | Explain the science | Industry + investors |
| Manifesto section | Inspire the movement | Community + market |

---

*Last updated: 2026-06-27*
