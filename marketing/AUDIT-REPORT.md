# OpenRNG Marketing & Documentation Audit Report

**Auditor:** OMI (Subagent)
**Date:** 2026-07-02
**Verdict:** Solid foundation, but several credibility-killing issues need fixing before launch.

---

## Executive Summary

The materials are well-written and technically coherent — clearly above average for a crypto-adjacent project. The "no token, no fees" positioning is strong and refreshing. However, there are **critical credibility gaps** that would make a skeptical reader close the tab: the GitHub repo doesn't exist yet, the SDK isn't published, the project is on testnet, and many files reference things as "live" when they're not. This creates exactly the "vaporware" impression the content is trying to avoid.

**Overall Score: 6.5/10** — Good bones, needs honesty surgery before going live.

---

## File-by-File Audit

---

### 1. Landing Page — `bot/landing/index.html`
**Score: 7/10**

**What works:**
- Clean, modern dark theme. Looks professional, not scammy.
- "How It Works" 4-step layout is clear and digestible.
- Interactive demo is a nice touch for engagement.
- Code is well-structured, responsive breakpoints are sensible.
- Nav-link collapse on mobile is handled.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **Demo is fake** | 🔴 Critical | The "Live Demo" generates `Math.random()` client-side and displays random hex as "proof." This is literally the thing you're telling people NOT to trust. A skeptical user will inspect the page source, see `Math.floor(Math.random() * 20) + 1`, and immediately distrust the project. |
| **"Verified on Polygon" badge** | 🔴 Critical | The hero badge says "Verified on Polygon" with a green pulse dot. If you're on Amoy testnet (per the reddit-crypto post), this is misleading. Testnet ≠ verified on Polygon. |
| **Proof ticker is noise** | 🟡 Medium | The proof hash ticker at the bottom of the hero updates every 200ms with random hex. It looks like it's doing something but it's purely decorative noise. Crypto-savvy users will see through this instantly — it's theater. |
| **SDK doesn't exist yet** | 🔴 Critical | The developer section shows `npm i @openrng/sdk` and links to npmjs.com/package/@openrng/sdk. If this package doesn't exist, clicking that link gives a 404. Instant credibility death. |
| **"Results in <200ms" claim** | 🟡 Medium | The dev section claims low latency. Is this benchmarked? VDF computation is deliberately slow. This needs evidence or qualification (e.g., "pre-computed results served in <200ms"). |
| **No link to GitHub from nav** | 🟡 Medium | GitHub is only in the footer. Developers want to see the code — put it in the nav. |
| **Missing `<meta>` tags** | 🟢 Low | No Open Graph / Twitter Card meta tags. When shared on social media, it'll look generic. |
| **No favicon** | 🟢 Low | No `<link rel="icon">`. Tab will show a blank icon. |
| **Accessibility** | 🟡 Medium | No `aria-label` on the demo button, no skip-to-content link, no focus-visible styles beyond browser defaults. The orbit animations have no `prefers-reduced-motion` respect. |
| **Mobile nav** | 🟡 Medium | Nav links are just `display:none` on mobile. No hamburger menu, so mobile users can't navigate to sections except by scrolling. |
| **Footer says "Built with OpenRNG"** | 🟢 Low | A bit circular. The project is OpenRNG. "Built by OpenRNG" or "OpenRNG © 2026" would be less odd. |
| **No cookie/privacy notice** | 🟢 Low | Not a legal requirement for a static page with no tracking, but worth noting if analytics get added later. |

**Line-level fixes needed:**
- Line with `simulateRoll()`: Replace `Math.random()` with either (a) a real API call to your RNG endpoint, or (b) an honest disclaimer: "This is a simulation — try the real bot on Telegram for verifiable results."
- Hero badge: Change to "Anchored on Polygon (Testnet)" if that's the current state.
- Proof ticker `setInterval` at 200ms: Either slow it down dramatically and connect to real data, or remove it.

---

### 2. README — `bot/README.md`
**Score: 7.5/10**

**What works:**
- Comprehensive command reference table.
- Architecture diagram is excellent — ASCII art that actually communicates.
- Self-hosting guide is thorough (PM2, Docker included).
- Project structure section helps contributors navigate.
- Badge lineup is clean.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **"Screenshots coming soon"** | 🔴 Critical | This screams unfinished product. Either add screenshots or remove the placeholder entirely. "Coming soon" is worse than nothing. |
| **GitHub links go nowhere** | 🔴 Critical | `github.com/openrng/telegram-bot`, `github.com/openrng/openrng`, `github.com/openrng/sdk` — if these repos don't exist yet, the README is full of dead links. A dev evaluating integration will click these and bounce. |
| **`openrng.org` logo URL** | 🟡 Medium | The header references `https://openrng.org/logo.svg`. If the site isn't set up or logo isn't at that path, the README will show a broken image on GitHub. |
| **Environment variables table is thin** | 🟡 Medium | Only 3 env vars. What about `LOG_LEVEL`, database config, VDF parameters, drand endpoint, Polygon RPC URL? A self-hoster would need more configuration than this. |
| **Inline mode examples** | 🟢 Low | `@OpenRNG_Dice_Bot d20` — is bare `d20` actually supported in inline mode, or does it need `roll d20`? Inconsistency with the commands section. |
| **SDK section vs README scope** | 🟢 Low | The SDK integration section is quite long for a bot README. Consider linking to the SDK repo instead of embedding full examples. |
| **"GitHub coming soon"** | 🔴 Critical | Mentioned nowhere in the README itself but visible in other marketing files. If someone reads the README on an actual GitHub repo, this is fine. But if the repo doesn't exist yet and the README is just a local file... the whole self-hosting guide is aspirational. |
| **`/lottery 6/49` syntax** | 🟢 Low | The command table shows `/lottery 5 90` but the landing page shows `/lottery 6 from 49`. Different syntax in different places. Pick one. |

**Specific fixes:**
- Remove the "Screenshots coming soon" block. Add real screenshots or remove the section.
- Validate all external URLs before publishing.
- Add more environment variables for a realistic self-hosting experience.

---

### 3. CONTRIBUTING.md — `bot/CONTRIBUTING.md`
**Score: 8/10**

**What works:**
- Clear, practical guide. Not bloated.
- New command walkthrough is useful.
- PR guidelines are sensible.
- References issue templates (good practice).

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **No tests mentioned** | 🟡 Medium | There's no mention of running tests, writing tests, or a test suite. For a cryptography-adjacent project, this is a red flag. A senior dev would wonder: "Is there zero test coverage?" |
| **No linting/formatting tool specified** | 🟡 Medium | "Keep it clean and consistent" is vague. What's the formatter? Prettier? Biome? ESLint config? |
| **Issue templates referenced but may not exist** | 🟢 Low | References `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`. Do these exist? |
| **No CLA or DCO** | 🟢 Low | For an open-source project that touches cryptographic proofs, some projects want a Developer Certificate of Origin. Not required, but worth considering. |

**Overall:** This is the most solid file in the batch. Clean, focused, helpful.

---

### 4. Reddit r/Telegram Post — `marketing/reddit-telegram.md`
**Score: 7.5/10**

**What works:**
- Good hook: "committed before you ask" is the right message.
- Personal story (game nights) adds authenticity.
- Not overselling. Conversational tone fits r/Telegram.
- Explains the pipeline clearly for non-technical readers.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **"GitHub coming soon"** | 🔴 Critical | "The SDK (`@openrng/sdk`) lets you plug the same verifiable RNG into your own apps" + "GitHub coming soon" = vaporware. Don't mention things that don't exist yet as if they're available. |
| **"Happy to answer questions"** | 🟢 Low | Generic Reddit outro. Fine, but could be stronger: "Ask me anything about the cryptographic pipeline" is more specific and inviting. |
| **No mention of testnet** | 🟡 Medium | Says "anchored on Polygon" without clarifying mainnet vs testnet. If it's testnet, say so. Reddit will find out and call you out. |

---

### 5. Reddit r/cryptocurrency Post — `marketing/reddit-crypto.md`
**Score: 8/10**

**What works:**
- This is the strongest piece. Technical depth is appropriate for the audience.
- "Amoy testnet, mainnet coming" — **HONEST.** Thank god. This is the only file that admits testnet status.
- "This isn't a token project" — powerful positioning for r/cryptocurrency.
- Code example is minimal and effective.
- "AMA" at the end is good for engagement.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **"GitHub coming soon"** | 🔴 Critical | Again. "Fully open source" + "audit it, fork it, contribute" + repo doesn't exist = credibility gap. r/cryptocurrency will destroy you for this. Say "code will be published at github.com/openrng before launch" or similar. |
| **VDF description could be challenged** | 🟡 Medium | "You can't parallelize it, you can't shortcut it" — this is mostly true for good VDF constructions (Wesolowski, Pietrzak), but a knowledgeable commenter might push back on implementation details. Be ready to cite which VDF construction you use. |
| **"No oracle fees, no VRF subscriptions" in title** | 🟡 Medium | This positions against Chainlink directly. Crypto Reddit may ask: "What's the trust model difference? With VRF, the proof is on-chain. With you, only the Merkle root is." Have an answer ready. |
| **`const rng = new OpenRNG();`** | 🟢 Low | The simplified code example omits config that's shown in other files. Minor inconsistency. |

---

### 6. Reddit r/gamedev Post — `marketing/reddit-gamedev.md`
**Score: 7/10**

**What works:**
- Good angle: "players accuse you of rigging the RNG" — every gamedev has experienced this.
- Practical use cases listed (game jams, idle games, playtesting).
- SDK example is clear.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **SDK features that may not exist** | 🔴 Critical | `rng.pick(lootTable, { weighted: true })` — does this API actually exist? If a dev tries this and gets `TypeError`, you've lost them forever. |
| **"No API keys needed for the bot"** | 🟡 Medium | True for the bot, but what about the SDK? The README shows `OPENRNG_API_KEY` as optional. Clarify. |
| **"GitHub: github.com/openrng (coming soon)"** | 🔴 Critical | Third file with this. It's becoming a pattern. |
| **Loot table / gacha mention** | 🟡 Medium | "Loot box / gacha prototyping with auditable drop rates" — this is a loaded term. Some jurisdictions regulate gacha/loot boxes. Be careful positioning your tool for this use case. |
| **Title claims "Free"** | 🟢 Low | Is the API actually free forever? Or free during beta? If there's a monetization plan, be upfront. |

---

### 7. Reddit r/DnD Post — `marketing/reddit-dnd.md`
**Score: 8.5/10**

**What works:**
- **Best tone in the batch.** Funny, relatable, self-aware. "Your barbarian is dead."
- Perfect length — doesn't overstay its welcome.
- "Will it fix your luck? No." — this line is gold.
- Commands focused on TTRPG-relevant ones only.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **"Merkle proofs, on-chain timestamps, the whole thing"** | 🟡 Medium | For r/DnD, this is jargon. The audience doesn't know what a Merkle proof is. "It's like notarizing every dice roll with a blockchain witness" is better — keep it at that level. |
| **No mention of Discord bot** | 🟡 Medium | D&D players use Discord, not Telegram. This post is promoting a Telegram bot to a community that lives on Discord. That's a problem. You should at least acknowledge "Discord bot coming" or frame why Telegram (e.g., "works inline in any chat — use it alongside your Discord server"). |
| **`/roll 4d6` for ability scores** | 🟢 Low | Standard ability score rolling is 4d6 drop lowest. Does the bot support `/roll 4d6kh3` or similar keep/drop syntax? If not, don't suggest it for that use case. |
| **No link to how verification works** | 🟢 Low | For the curious, a link to a simple explainer would help. Most D&D players won't care, but some will. |

---

### 8. Twitter/X Thread — `marketing/twitter-thread.md`
**Score: 7/10**

**What works:**
- Good thread structure — each tweet builds on the last.
- Technical explanation broken into digestible pieces.
- "The bot just opened the envelope" — nice metaphor.
- Ends with a clear CTA.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **Too long** | 🟡 Medium | 10 tweets is a lot. Crypto Twitter attention span is ~3-4 tweets. Consider condensing to 6-7. Tweets 3-6 (the pipeline explanation) could be 2 tweets max. |
| **No visuals** | 🔴 Critical | A 10-tweet thread with zero images/diagrams will get buried. Twitter threads need at least one visual per 2-3 tweets. Create a pipeline diagram, a screenshot of the bot in action, an animation of the verification flow. |
| **Tweet 9 code block** | 🟡 Medium | Code in tweets renders poorly. Use a code screenshot (carbon.now.sh or similar) instead of backtick formatting. |
| **"DMs are open"** | 🟢 Low | Fine, but "Reply with your use case" drives more visible engagement. |
| **No hashtags** | 🟢 Low | Not a single hashtag. At minimum: #Polygon #OpenSource #Crypto. Don't overdo it, but zero is leaving discovery on the table. |
| **"GitHub coming soon"** | 🔴 Critical | Tweet 10. Same issue. |

---

### 9. Product Hunt Listing — `marketing/producthunt.md`
**Score: 7/10**

**What works:**
- Tagline is clear and concise.
- Maker comment is authentic and well-structured.
- "This isn't a crypto project in the 'buy our token' sense" — strong line.
- Feature list with emojis is PH-friendly formatting.
- Categories and topics are well-chosen.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **No screenshots / GIFs** | 🔴 Critical | Product Hunt is visual. A listing without screenshots or a demo GIF will get zero upvotes. You need: (1) Bot in action in a Telegram chat, (2) Verification flow, (3) Architecture diagram. |
| **"No API keys needed"** | 🟡 Medium | The SDK section of the README shows `OPENRNG_API_KEY`. Mixed signals. |
| **Missing "Pricing"** | 🟡 Medium | PH users always ask about pricing. Proactively state: "Free. Self-hostable. No paid tier." |
| **"Open source" without repo link** | 🔴 Critical | PH voters will click. If the repo doesn't exist, you'll get called out in comments. |
| **Maker comment asks for feedback** | 🟢 Low | Good practice, but the question "What features would matter most to you?" is too broad. Ask something specific: "Would you use this for community giveaways, game nights, or something else entirely?" |

---

### 10. Bot Directory Submissions — `marketing/bot-directories.md`
**Score: 7.5/10**

**What works:**
- Three directories covered with tailored descriptions.
- Tags are comprehensive and relevant.
- Descriptions vary appropriately by platform.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **No screenshots/media** | 🟡 Medium | BotoStore and TelegramChannels.me accept images. Include them. |
| **Tag spam potential** | 🟢 Low | "dice, random, fair, crypto, rng, games, raffle, giveaway, lottery, verified" — 10 tags might be too many for some platforms. Prioritize 5-6. |
| **"Cryptographically verified on-chain" in every description** | 🟡 Medium | Gets repetitive if a user sees multiple listings. Vary the angle: one emphasizes gaming, one emphasizes giveaways, one emphasizes developer utility. |
| **Missing: top.gg, Botfather directory** | 🟢 Low | If there's a plan for a Discord bot, top.gg is the primary directory. |

---

### 11. Pitch to Group Admins — `marketing/pitch-to-group-admins.md`
**Score: 8/10**

**What works:**
- Three versions for different audience segments — smart.
- Guidelines section at the bottom is ethical and practical.
- Tone is respectful, not pushy.
- "One message only. No follow-ups unless they respond." — good discipline.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **Version 1 opens with a question** | 🟡 Medium | "Can your members verify the draws are actually fair?" — Some admins might read this as accusatory ("are you saying my giveaways are unfair?"). Soften: "I built a tool that adds verification to giveaway draws." |
| **"No data collection"** | 🟡 Medium | Is this actually true? The bot logs commands, right? Usernames? Chat IDs? If there's any logging, "no data collection" is a lie. Say "no tracking, no ads" if that's accurate, or be specific about what IS collected. |
| **Version 3 is too long** | 🟢 Low | For a DM to a group admin, V3 is borderline. Trim the bullet list to 3 items max. |
| **Missing: Discord admin version** | 🟡 Medium | All three versions are Telegram-focused. If you're pitching to Discord server admins (per the target list), you need a Discord-specific template. |

---

### 12. Hacker News — `marketing/hacker-news.md`
**Score: 8.5/10**

**What works:**
- Excellent technical depth for HN audience.
- Leads with architecture, not marketing.
- The trade-off paragraph (off-chain computation + on-chain anchoring) is the kind of thing HN loves to discuss.
- "Open source, no token, no fees" — perfect HN positioning.
- Concise. Doesn't waste words.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **URL is the Telegram bot, not GitHub** | 🔴 Critical | HN's "Show HN" requires a URL. Linking to a Telegram bot will feel spammy. HN strongly prefers GitHub repos or project websites. Wait until the repo is public. |
| **"GitHub: github.com/openrng (coming soon)"** | 🔴 Critical | DO NOT post this on HN with "coming soon" GitHub. You will get flagged. HN has zero tolerance for vaporware. Post when the code is public. |
| **No mention of VDF construction** | 🟡 Medium | HN commenters will ask: "Which VDF construction? Wesolowski? Pietrzak? What's the security parameter?" Be ready, or better, include it. |
| **"Feedback on the architecture welcome"** | 🟢 Low | Good, but HN prefers specific questions: "Curious whether anyone sees issues with the pre-commitment model for high-frequency use cases." |

---

### 13. Target Communities — `marketing/target-communities.md`
**Score: 8/10**

**What works:**
- Thorough research. 45+ communities across 6 categories.
- Priority tiering is practical.
- Messaging templates are tailored per audience.
- Links are included (verifiable).
- Realistic size estimates.

**Problems:**

| Issue | Severity | Details |
|-------|----------|---------|
| **D&D communities but no Discord bot** | 🟡 Medium | Sections 2.1-2.8 list D&D Discord servers, but OpenRNG is a Telegram bot. This is a fundamental mismatch. "Discord bot coming soon" is mentioned once in 2.1 but it's parenthetical. Either build the Discord bot first or deprioritize these communities. |
| **Chainlink community approach is risky** | 🟡 Medium | Sections 1.3-1.4 suggest posting in Chainlink communities with a "complementary/alternative" framing. Chainlink communities are loyal. Posting a VRF alternative there will likely be received as competition, not collaboration. Tread carefully or skip. |
| **Airdrop/giveaway groups are spam magnets** | 🟡 Medium | Sections 5.1-5.5 target airdrop and giveaway groups. These communities are flooded with scams. Association with them might hurt credibility more than help. |
| **Messaging template for crypto groups** | 🟢 Low | The raffle command syntax is `/raffle @user1 @user2 @user3` but the README shows `/raffle "Friday Giveaway"`. Inconsistency. |
| **TON gaming communities** | 🟢 Low | Mentioning Hamster Kombat, Notcoin, etc. — these are 2024-2025 era games. By July 2026, the landscape will be different. Update before using. |
| **"Stop using 'trust me bro' giveaways"** | 🟡 Medium | Giveaway template is a bit aggressive. Don't insult the admin's current setup — offer an upgrade. |

---

## Cross-Cutting Issues

### 🔴 Issue #1: The "Coming Soon" Problem (CRITICAL)

**8 out of 13 files** reference GitHub repos or SDKs that don't exist yet. This is the single biggest problem across all materials.

Files affected:
- Landing page (npm link, GitHub footer)
- README (GitHub links throughout)
- reddit-telegram ("GitHub coming soon")
- reddit-crypto ("GitHub coming soon")
- reddit-gamedev ("GitHub coming soon")
- twitter-thread ("Code (soon)")
- producthunt ("Open source" without link)
- hacker-news ("GitHub coming soon")

**Fix:** Do NOT publish any of these until the GitHub repo and npm package are live. Publishing "coming soon" open-source claims is worse than saying nothing. It's the #1 vaporware signal.

### 🔴 Issue #2: Testnet vs Mainnet Ambiguity (CRITICAL)

Only `reddit-crypto.md` honestly says "Amoy testnet, mainnet coming." Every other file says "verified on Polygon" or "anchored on Polygon" without qualification. This is misleading.

**Fix:** Every file should either say "Polygon (testnet)" or wait until mainnet to claim "verified on Polygon." The landing page hero badge is the worst offender.

### 🟡 Issue #3: SDK API Inconsistency

The SDK is shown with different APIs in different files:

| File | API |
|------|-----|
| Landing page | `new OpenRNG({ network, verify })` → `rng.generate({ type, sides, count })` |
| README | `new OpenRNG({ agentId, endpoint, apiKey, vertical, agentName, framework })` → `rng.roll(2, 6)` |
| reddit-crypto | `new OpenRNG()` → `rng.random()` |
| reddit-gamedev | `new OpenRNG()` → `rng.random()`, `rng.roll(2, 20)`, `rng.pick(table, { weighted: true })` |
| producthunt | Same as landing page |

**Fix:** Finalize the SDK API and use it consistently everywhere. Current state suggests the SDK doesn't exist and each file is speculative.

### 🟡 Issue #4: Discord Gap

The target community list is 40% Discord communities, but OpenRNG is Telegram-only. The D&D post targets r/DnD (a community that plays on Discord). This mismatch undermines the outreach strategy.

**Fix:** Either (a) build a Discord bot before targeting Discord communities, or (b) restructure the target list to focus on Telegram-native communities first.

### 🟡 Issue #5: "No data collection" Claim

The admin pitch claims "no data collection." Unless the bot genuinely stores zero user data (no logs, no chat IDs, no rate-limiting state), this is false. Rate limiting alone requires tracking user IDs.

**Fix:** Audit what the bot actually stores and make accurate privacy claims.

---

## Prioritized Fix List

### Must Fix Before ANY Publication

| Priority | Fix | Effort |
|----------|-----|--------|
| P0 | **Publish GitHub repos** (openrng, telegram-bot, sdk) before sharing any marketing material | High |
| P0 | **Publish `@openrng/sdk` to npm** or remove all references to it | High |
| P0 | **Fix testnet/mainnet claims** — add "(testnet)" qualifier everywhere or wait for mainnet | Low |
| P0 | **Fix landing page demo** — either call real API or add "simulation" disclaimer | Low |
| P0 | **Remove "Screenshots coming soon"** from README | 5 min |
| P0 | **Add screenshots** — bot in action, verification flow, at minimum | Medium |

### Fix Before Specific Channel Publication

| Priority | Fix | Channel |
|----------|-----|---------|
| P1 | Add OG/Twitter Card meta tags to landing page | All social |
| P1 | Add favicon to landing page | Website |
| P1 | Standardize SDK API examples across all files | All |
| P1 | Add visuals to Twitter thread (diagrams, screenshots, code images) | Twitter |
| P1 | Create Product Hunt screenshots and demo GIF | Product Hunt |
| P1 | Add mobile hamburger menu to landing page | Website |
| P1 | Validate all external URLs (openrng.org, npm, GitHub) | All |
| P1 | Specify VDF construction (Wesolowski/Pietrzak) for HN | Hacker News |
| P1 | Clarify data collection / privacy position for admin pitches | DMs |

### Nice to Have

| Priority | Fix |
|----------|-----|
| P2 | Add `prefers-reduced-motion` CSS for landing page animations |
| P2 | Add accessibility improvements (aria-labels, skip nav, focus styles) |
| P2 | Add test suite mention to CONTRIBUTING.md |
| P2 | Specify linting/formatting tools in CONTRIBUTING.md |
| P2 | Create Discord-specific admin pitch template |
| P2 | Slow down or remove proof ticker animation |
| P2 | Build Discord bot before targeting D&D/gaming communities |

---

## Score Summary

| File | Score | Key Issue |
|------|-------|-----------|
| `landing/index.html` | 7/10 | Fake demo, misleading "Verified on Polygon" badge |
| `bot/README.md` | 7.5/10 | Dead links, "screenshots coming soon" |
| `bot/CONTRIBUTING.md` | 8/10 | No test mentions |
| `reddit-telegram.md` | 7.5/10 | "GitHub coming soon" |
| `reddit-crypto.md` | 8/10 | Best honesty (testnet admission), but GitHub still "coming soon" |
| `reddit-gamedev.md` | 7/10 | SDK API may not exist, GitHub "coming soon" |
| `reddit-dnd.md` | 8.5/10 | Best tone, Discord gap is the weakness |
| `twitter-thread.md` | 7/10 | Too long, no visuals, code in tweets |
| `producthunt.md` | 7/10 | No screenshots = DOA on Product Hunt |
| `bot-directories.md` | 7.5/10 | Repetitive descriptions, no media |
| `pitch-to-group-admins.md` | 8/10 | "No data collection" claim needs verification |
| `hacker-news.md` | 8.5/10 | Best technical writing, but CANNOT post without GitHub |
| `target-communities.md` | 8/10 | Solid research, Discord/Telegram mismatch |

---

## Bottom Line

**Don't publish anything until the GitHub repo and npm package are live.** That's not optional — it's the difference between "interesting open-source project" and "another crypto vaporware pitch." Everything else is fixable in a day or two.

The writing quality is genuinely good. The r/DnD and HN posts are especially well-tuned for their audiences. The technical explanations are accurate and appropriately detailed. The "no token, no fees, just infrastructure" positioning is your strongest differentiator — protect it by being equally honest about what's live vs. what's coming.

Ship the code first. Then ship the marketing.
