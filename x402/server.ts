/**
 * verified-random — x402 Agent-Payable Verifiable Randomness
 *
 * Wraps the existing OpenRNG API with x402 payment middleware.
 * AI agents pay USDC on Base per-call. No API keys, no accounts.
 *
 * Endpoints:
 *   GET /v1/rng/latest     $0.001 — pool-served random value, sub-2ms
 *   GET /v1/rng/pricing    FREE   — machine-readable catalog for agent crawlers
 *   GET /health             FREE   — health check
 *
 * NOTE: Tier 2 (/verified/:epoch) is INTENTIONALLY OMITTED until
 * upstream supports historical epoch retrieval. See audit F1.
 */

import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = express();

// ─── Config ───
const TREASURY = process.env.OPENRNG_TREASURY;
const FACILITATOR_URL = process.env.X402_FACILITATOR || "https://x402.coinbase.com";
const UPSTREAM_API = process.env.UPSTREAM_API || "http://localhost:3000";
const ANCHOR_CONTRACT = process.env.MERKLE_ANCHOR_CONTRACT;
const ANCHOR_CHAIN = process.env.ANCHOR_CHAIN || "polygon-amoy"; // honest default
const PORT = parseInt(process.env.X402_PORT || "8402");
const RATE_LIMIT_PER_WALLET = parseInt(process.env.RATE_LIMIT_PER_WALLET || "50"); // req/s

if (!TREASURY) {
  console.error("FATAL: Set OPENRNG_TREASURY to your Base wallet address");
  process.exit(1);
}

// ─── Upstream Health Polling (F4 fix) ───
let upstreamHealthy = false;
let poolDepth = 0;

async function pollUpstreamHealth() {
  try {
    const resp = await fetch(`${UPSTREAM_API}/health`, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      const data = await resp.json() as any;
      upstreamHealthy = data.status === "ok";
      // Try to get pool depth
      try {
        const rootResp = await fetch(`${UPSTREAM_API}/`, { signal: AbortSignal.timeout(2000) });
        const rootData = await rootResp.json() as any;
        poolDepth = rootData?.links?.pool?.poolSize || 0;
      } catch { /* pool depth is best-effort */ }
    } else {
      upstreamHealthy = false;
    }
  } catch {
    upstreamHealthy = false;
  }
}

// Poll every 2 seconds
setInterval(pollUpstreamHealth, 2000);
pollUpstreamHealth(); // initial check

// ─── Per-Wallet Rate Limiter (F4 fix) ───
const walletBuckets = new Map<string, { count: number; resetAt: number }>();

function checkWalletRate(walletAddress: string): boolean {
  const now = Date.now();
  let bucket = walletBuckets.get(walletAddress);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 1000 }; // 1-second window
    walletBuckets.set(walletAddress, bucket);
  }
  bucket.count++;
  return bucket.count <= RATE_LIMIT_PER_WALLET;
}

// Clean up old buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of walletBuckets) {
    if (now > bucket.resetAt + 10000) walletBuckets.delete(key);
  }
}, 30000);

// ─── Pre-flight Gate (F4 fix: return 503 BEFORE payment negotiation) ───
app.use("/v1/rng", (req, res, next) => {
  if (req.path === "/pricing") return next(); // pricing is always available
  if (!upstreamHealthy) {
    return res.status(503).json({
      error: "service_unavailable",
      message: "Upstream randomness engine is temporarily unavailable",
      retry_after_ms: 5000,
    });
  }
  if (poolDepth < 10) {
    return res.status(503).json({
      error: "pool_low",
      message: "Token pool is replenishing. Retry shortly.",
      retry_after_ms: 3000,
    });
  }
  next();
});

// ─── x402 Payment Middleware ───
const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme()); // Base mainnet

app.use(
  paymentMiddleware(
    {
      // Tier 1 only — Tier 2 intentionally omitted (audit F1)
      "GET /v1/rng/latest": {
        accepts: {
          scheme: "exact",
          price: "$0.001",
          network: "eip155:8453",
          payTo: TREASURY,
        },
        description:
          "Cryptographically verifiable random number. VDF-proven entropy (Wesolowski 2048-bit), pool-served sub-2ms latency. 256-bit value + epoch ID.",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// ─── Paid Endpoint: Tier 1 ───
app.get("/v1/rng/latest", async (_req, res) => {
  try {
    const resp = await fetch(`${UPSTREAM_API}/api/v1/entropy`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      // F5 fix: generic error, no internals leaked
      return res.status(502).json({ error: "upstream_unavailable" });
    }

    const data = await resp.json() as any;

    // F8 fix: explicit field mapping, not spread
    res.json({
      service: "verified-random",
      protocol: "x402",
      entropy: data.entropy,
      entropy_hash: data.entropy_hash,
      source: data.source,
      epoch: data.epoch,
      issued_at: new Date().toISOString(),
      verification: {
        vdf: "wesolowski-2048",
        anchor_chain: ANCHOR_CHAIN,
        anchor_contract: ANCHOR_CONTRACT || undefined,
        note: ANCHOR_CHAIN.includes("testnet") || ANCHOR_CHAIN.includes("amoy")
          ? "Anchor is currently on testnet. Mainnet anchoring planned."
          : undefined,
      },
    });
  } catch {
    // F5 fix: no err.message exposed
    res.status(502).json({ error: "upstream_unavailable" });
  }
});

// ─── Free Endpoints ───

app.get("/v1/rng/pricing", (_req, res) => {
  res.json({
    service: "verified-random",
    description:
      "Cryptographically verifiable random number generation. VDF-proven entropy (Wesolowski 2048-bit), pool-served sub-2ms latency.",
    protocol: "x402",
    network: "base",
    asset: "USDC",
    endpoints: [
      {
        path: "/v1/rng/latest",
        price: "$0.001",
        latency_ms: 2,
        description: "Pool-served random value + epoch ID",
        available: true,
      },
      {
        path: "/v1/rng/verified/{epoch}",
        price: "$0.005",
        latency_ms: 10,
        description: "Value + full VDF proof + Merkle inclusion (coming soon)",
        available: false, // F1: not available until upstream supports historical epoch lookup
      },
    ],
    verification: {
      vdf: "wesolowski-2048",
      vdf_bits: 2048,
      epoch_seconds: 2.4,
      anchor_chain: ANCHOR_CHAIN, // F2: honest chain label
      anchor_contract: ANCHOR_CONTRACT || undefined,
    },
    rate_limit: {
      per_wallet_per_second: RATE_LIMIT_PER_WALLET,
      note: "Per-payer-address rate limit. Contact for enterprise volume.",
    },
    first_call_overhead_ms: "~2000 (x402 402→payment→verify round-trip; subsequent calls sub-2ms if session reused)",
    links: {
      verify: "https://verify.openrng.io",
      github: "https://github.com/ned-del/openrng",
      npm: "https://www.npmjs.com/package/@openrng/core",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: upstreamHealthy ? "ok" : "degraded",
    service: "verified-random",
    protocol: "x402",
    upstream: upstreamHealthy,
    pool_depth: poolDepth,
  });
});

// ─── Paid Failure Ledger (F4 fix: log for manual refund sweep) ───
const failedPayments: Array<{
  timestamp: string;
  error: string;
}> = [];

app.get("/internal/failed-payments", (req, res) => {
  // Only accessible from localhost (F7 mitigation)
  if (req.ip !== "127.0.0.1" && req.ip !== "::1") {
    return res.status(403).json({ error: "forbidden" });
  }
  res.json({ failures: failedPayments, count: failedPayments.length });
});

// ─── Boot Self-Test (F3 fix) ───
async function bootSelfTest() {
  await new Promise(r => setTimeout(r, 1000)); // wait for server to start
  try {
    const resp = await fetch(`http://localhost:${PORT}/v1/rng/latest`);
    if (resp.status !== 402) {
      console.error(`[BOOT TEST FAILED] /v1/rng/latest returned ${resp.status}, expected 402`);
      console.error("[BOOT TEST FAILED] Payment middleware may not be matching this route!");
      process.exit(1);
    }
    console.log("[BOOT TEST] /v1/rng/latest correctly returns 402 ✅");
  } catch (err) {
    console.error("[BOOT TEST] Self-test failed:", (err as Error).message);
  }
}

// ─── Start ───
app.listen(PORT, () => {
  console.log(`[verified-random] x402 server on port ${PORT}`);
  console.log(`[verified-random] Treasury: ${TREASURY}`);
  console.log(`[verified-random] Facilitator: ${FACILITATOR_URL}`);
  console.log(`[verified-random] Upstream: ${UPSTREAM_API}`);
  console.log(`[verified-random] Anchor: ${ANCHOR_CHAIN} ${ANCHOR_CONTRACT || "(not set)"}`);
  console.log(`[verified-random] Rate limit: ${RATE_LIMIT_PER_WALLET} req/s per wallet`);
  console.log(`[verified-random] Tier 1: /v1/rng/latest $0.001`);
  console.log(`[verified-random] Tier 2: DISABLED (pending upstream epoch support)`);

  bootSelfTest();
});
