# OpenRNG Launch Checklist

> **Rule:** Do NOT publish any marketing content until the items in "Before Any Content Goes Live" are complete.
> **Last updated:** 2026-07-02

---

## Before Any Content Goes Live

These are non-negotiable. Publishing marketing without these is how projects earn "vaporware" labels.

### Code & Infrastructure
- [ ] Push bot code to GitHub (`github.com/openrng/telegram-bot` or `github.com/openrng`)
- [ ] All GitHub links in marketing content verified working
- [ ] Deploy bot to production server (not localhost)
- [ ] Production server has monitoring/alerting (PM2, healthcheck, or equivalent)
- [ ] Bot handles errors gracefully (rate limits, API failures, edge cases)

### SDK
- [ ] Decide: publish `@openrng/sdk` to npm OR remove all SDK references from marketing
- [ ] If publishing: finalize API surface (consistent across all docs)
- [ ] If not publishing yet: all marketing says "SDK available on request" or "self-host from source"

### On-Chain
- [ ] Decide: stay on Amoy testnet (with honest labeling) OR migrate to Polygon mainnet
- [ ] If testnet: every file says "Polygon Amoy (testnet)" — no ambiguity ✅ (done in this pass)
- [ ] If mainnet: update contract address and all references
- [ ] Contract address included in technical marketing materials ✅ (done in this pass)

### Evidence
- [ ] 100+ test rolls logged with real Merkle proofs
- [ ] Screenshots of real bot usage (at least 3: dice roll, raffle, verify flow)
- [ ] Screen recording / GIF of verification flow (for Product Hunt, Twitter)
- [ ] Architecture diagram (clean, not ASCII — for Twitter thread visuals)

### Web Presence
- [ ] Landing page deployed to a real URL (openrng.org or equivalent)
- [ ] Landing page demo calls real API (not Math.random())
- [ ] Landing page "Verified on Polygon" badge updated to reflect testnet status
- [ ] Open Graph / Twitter Card meta tags on landing page
- [ ] Favicon set

---

## Before Specific Channels

### Reddit (any subreddit)
- [ ] GitHub repo is public (r/cryptocurrency and r/ethdev will check)
- [ ] All links in the post verified working
- [ ] Ready to respond to comments for 24-48h after posting

### Hacker News
- [ ] **GitHub repo MUST be public** — HN flags "coming soon" code
- [ ] URL points to GitHub repo, not Telegram bot link
- [ ] VDF construction specified (Wesolowski/Pietrzak) — HN will ask
- [ ] Ready for deep technical questions

### Twitter/X Thread
- [ ] Visual assets for tweets (pipeline diagram, bot screenshot, code image via carbon.now.sh)
- [ ] Thread condensed to 7 tweets max ✅ (done in this pass)
- [ ] Contract address included ✅

### Product Hunt
- [ ] 3+ screenshots / GIFs ready
- [ ] Demo GIF of bot in action
- [ ] Pricing stated explicitly ("Free forever") ✅ (done in this pass)
- [ ] Hunter lined up (ideally someone with PH reputation)

### Bot Directories
- [ ] Bot description and screenshots ready
- [ ] Submitted to: BotListBot, BotoStore, TelegramChannels.me
- [ ] Tags finalized (5-6 per platform, not 10+)

### Group Admin DMs
- [ ] Personalized first line for each group
- [ ] Privacy claims audited (what does the bot actually log?)
- [ ] Maximum 3-5 DMs per day (don't get flagged as spam)

---

## Nice to Have (Pre-Launch Polish)

- [ ] Add `prefers-reduced-motion` CSS to landing page
- [ ] Add accessibility improvements (aria-labels, skip nav)
- [ ] Mobile hamburger menu on landing page
- [ ] Discord bot (unlocks D&D/TTRPG communities)
- [ ] `CONTRIBUTING.md` mentions test suite and linting tools
- [ ] Issue templates created (`.github/ISSUE_TEMPLATE/`)

---

## Launch Sequence (Suggested Order)

1. **Week 0:** Push code to GitHub. Deploy landing page. Verify all links.
2. **Day 1:** Submit to bot directories (BotoStore, TelegramChannels.me, BotListBot)
3. **Day 1:** Post to r/TelegramBots
4. **Day 2:** Post to r/DnD
5. **Day 3:** Post to r/cryptocurrency, share in Polygon TG
6. **Day 4:** Twitter thread (with visuals)
7. **Day 5:** Product Hunt launch
8. **Day 7:** Hacker News Show HN
9. **Ongoing:** Group admin outreach (2-3 DMs/day, personalized)

---

*The content is ready. Ship the code first, then ship the marketing.*
