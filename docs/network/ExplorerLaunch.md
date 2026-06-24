# Explorer Launch Plan — verify.openrng.io

## Current State

verify.openrng.io is live as a static VEO-1 verification page. It performs client-side hash and signature verification. It is functional but not yet a full explorer.

## Vision

The explorer should become the **visual embodiment of the whitepaper**. Every concept introduced in the whitepaper should be visible, interactive, and verifiable in the explorer.

---

## Launch Phases

### Phase 1: Verifier (Current) ✅

What exists now:
- Paste VEO JSON → verify
- Hash verification (SHA-256, Web Crypto API)
- Signature verification (secp256k1, ethers.js)
- ECS visualization with dimension bars
- Source listing
- Anchor display with PolygonScan links
- Verification level banner
- Example signed VEO preloaded

### Phase 2: Live Feed

Add a real-time feed of VEO objects being generated:

- **Live VEO stream** — latest objects with auto-refresh
- **ECS distribution** — histogram of recent scores
- **Source health** — live status of drand, Bitcoin, Polygon sources
- **Network stats** — total VEOs generated, avg ECS, uptime
- **Click to verify** — any object in the feed opens in the verifier

Implementation: Poll `GET /v2/entropy/status` + periodic `GET /v2/entropy` generation. WebSocket upgrade later.

### Phase 3: Object Explorer

Individual VEO permalink pages:

- **`verify.openrng.io/veo/{object_id}`** — deep link to any VEO
- **Provenance view** — visual graph of source → aggregation → VEO
- **Timeline** — issued_at, signed_at, anchored_at
- **On-chain proof** — embedded PolygonScan transaction view
- **Shareable** — each VEO has a unique URL for sharing/embedding

Requires: server-side VEO storage or API endpoint for VEO lookup by ID.

### Phase 4: Network Dashboard

Global network health and statistics:

- **Source uptime** — historical availability per source
- **ECS trends** — rolling average over 24h/7d/30d
- **Anchor activity** — Polygon transaction volume
- **Consumer count** — API key registrations (anonymized)
- **Geographic distribution** — if multi-region is deployed

### Phase 5: Developer Console

For registered developers:

- **API key management** — register, rotate, revoke
- **Usage metrics** — requests per day, ECS distribution, policy breakdown
- **VEO history** — searchable log of objects generated for your key
- **Webhook configuration** — register delivery endpoints
- **Playground** — interactive API explorer with live requests

---

## Design Principles

1. **Verification-first** — the primary action is always "verify this object"
2. **Zero trust** — all verification happens client-side in the browser
3. **Educational** — every UI element teaches a VEO-1 concept
4. **Linkable** — every state has a URL
5. **Fast** — static site, CDN-served, no server-side rendering for core verification

---

## Technical Stack

| Component | Technology |
|-----------|-----------|
| Static site | HTML/CSS/JS (current) |
| Crypto | ethers.js (CDN) for signature verification |
| Hashing | Web Crypto API (native browser) |
| Hosting | GitHub Pages → Cloudflare Pages (when traffic grows) |
| API | OpenRNG API on Railway |
| Domain | verify.openrng.io (CNAME → GitHub Pages) |

---

## Launch Checklist

### Phase 1 (Now)
- [x] Verification page live
- [x] Hash verification
- [x] Signature verification
- [x] ECS visualization
- [x] Example VEO preloaded
- [x] DNS configured
- [ ] HTTPS enforcement (pending GitHub cert)
- [ ] Open Graph meta tags for social sharing
- [ ] Favicon

### Phase 2 (Week 2)
- [ ] Live feed endpoint on API
- [ ] Auto-refresh VEO stream
- [ ] Source health indicators
- [ ] Network stats counter

### Phase 3 (Week 4)
- [ ] VEO permalink pages
- [ ] Provenance visualization
- [ ] Shareable links

### Phase 4 (Week 8)
- [ ] Network dashboard
- [ ] Historical charts
- [ ] Anchor activity log
