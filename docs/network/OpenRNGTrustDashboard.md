# OpenRNG Trust Dashboard

## Purpose

The Trust Dashboard is how OpenRNG proves its own trustworthiness to consumers. It answers the question every potential adopter has:

> "Can I depend on this in production?"

---

## Components

### 1. Source Health Monitor

Real-time status of each entropy source:

```
┌──────────────────────────────────────────┐
│  Source Health                            │
│                                          │
│  ● drand-mainnet     LIVE   <2s ago      │
│    Last: drand-round-29833400            │
│    Uptime: 99.8% (30d)                   │
│                                          │
│  ● bitcoin           LIVE   <10s ago     │
│    Last: block-955200                    │
│    Uptime: 99.2% (30d)                   │
│                                          │
│  ● polygon           LIVE   <3s ago      │
│    Last: block-40715000                  │
│    Uptime: 99.5% (30d)                   │
└──────────────────────────────────────────┘
```

Data source: `GET /v2/entropy/status` + historical logging.

### 2. ECS Distribution

Rolling histogram of ECS scores:

```
Last 24h ECS Distribution:

AAA (900+)  ████████████ 12%
AA  (800+)  ████████████████████████████████████████████ 78%
A   (700+)  ████████ 8%
B   (600+)  ██ 2%
C/LOW       ░ 0%

Avg: 862 | Median: 871 | Min: 723 | Max: 941
```

Shows consumers that most objects meet ai-grade or higher.

### 3. Signing Status

```
┌──────────────────────────────────────────┐
│  Provider Signing                        │
│                                          │
│  Status:    ENABLED                      │
│  Algorithm: secp256k1_eip191             │
│  Address:   0xD4F78bB8d4693b47FACe...    │
│  Key Age:   Created 2026-06-24           │
│                                          │
│  Objects Signed: 12,847                  │
│  Verification Rate: 100%                 │
└──────────────────────────────────────────┘
```

### 4. Anchor Activity

```
┌──────────────────────────────────────────┐
│  Blockchain Anchoring                    │
│                                          │
│  Chain:      Polygon Amoy (testnet)      │
│  Contract:   0xA79E149C35Ad47Ed270B...   │
│  Status:     ACTIVE                      │
│                                          │
│  Total Anchors:  1,247                   │
│  Last Anchor:    2 min ago               │
│  Last TX:        0xe358... → PolygonScan │
│  Avg Confirm:    4.2s                    │
│  Wallet Balance: 998.4 MATIC             │
└──────────────────────────────────────────┘
```

### 5. API Health

```
┌──────────────────────────────────────────┐
│  API Status                              │
│                                          │
│  Endpoint:   api.openrng.io              │
│  Status:     OPERATIONAL                 │
│  Uptime:     99.9% (30d)                 │
│                                          │
│  Latency (p50/p95/p99):                  │
│    /v2/entropy:        280ms / 450ms / 800ms │
│    /v2/entropy/verify: 12ms / 25ms / 50ms    │
│    /v2/entropy/status: 5ms / 10ms / 15ms     │
│                                          │
│  Requests (24h): 4,521                   │
│  Error Rate:     0.1%                    │
└──────────────────────────────────────────┘
```

### 6. Protocol Integrity

```
┌──────────────────────────────────────────┐
│  Protocol                                │
│                                          │
│  Standard:       VEO-1 v1.0 (Frozen)     │
│  Protocol Hash:  0xcb21de7f...           │
│  Tests:          74/74 passing           │
│  Last Verified:  2 hours ago             │
│                                          │
│  RFC:            RFC-0001-VEO1           │
│  Schema:         veo-1.schema.json       │
│  Golden Fixture: ✓ Valid                 │
└──────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: API-Backed Status (Week 1)

Extend `GET /v2/entropy/status` to include:
- Historical uptime per source (last 24h, 7d, 30d)
- Total objects generated
- Total anchors submitted
- Average ECS score
- API request count

Store metrics in PostgreSQL. Compute on read.

### Phase 2: Public Dashboard Page (Week 2)

Static page at `status.openrng.io` or `openrng.io/status`:
- Source health cards
- ECS distribution chart
- Anchor activity log
- Auto-refresh every 30s

### Phase 3: Historical Analytics (Week 4)

- ECS trend charts (daily/weekly)
- Source uptime history
- Anchor cost tracking (MATIC spent)
- Consumer growth (API keys registered)

---

---

## Primary Metric: Verified Decisions

The launch metric is not "API requests" or "entropy generated."

The launch metric is **Verified Decisions**:

1. A VEO was consumed
2. It influenced a decision
3. The decision can be audited

Agent Arbiter's `--audit` mode demonstrates a Verified Decision: the entropy was consumed, the agent was assigned, and the assignment is re-derivable + cryptographically verifiable.

All dashboard language should reflect this metric.

---

## Why This Matters

Every potential consumer asks: "Is this reliable?" 

The Trust Dashboard doesn't answer with marketing. It answers with live data, historical metrics, and verifiable on-chain records. The dashboard itself is a demonstration of the OpenRNG philosophy:

> Don't claim trust. Prove it.
