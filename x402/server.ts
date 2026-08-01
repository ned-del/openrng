/**
 * verified-random — x402 Agent-Payable Verifiable Randomness
 *
 * Tier 1 only: GET /v1/rng/latest ($0.001 USDC on Base)
 * Tier 2 deferred until upstream supports historical epoch lookup (audit F1)
 */

import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { appendFileSync, existsSync, readFileSync } from "fs";

const app = express();

// ─── Config ───
const TREASURY = process.env.OPENRNG_TREASURY;
const FACILITATOR_URL = process.env.X402_FACILITATOR || "https://x402.org/facilitator"; // N4 fix: correct default
const UPSTREAM_API = process.env.UPSTREAM_API || "http://localhost:3000";
const ANCHOR_CONTRACT = process.env.MERKLE_ANCHOR_CONTRACT;
const ANCHOR_CHAIN = process.env.ANCHOR_CHAIN || "polygon-amoy";
const PORT = parseInt(process.env.X402_PORT || "8402");
const RATE_LIMIT_PER_WALLET = parseInt(process.env.RATE_LIMIT_PER_WALLET || "50");
const FAILED_PAYMENTS_LOG = process.env.FAILED_PAYMENTS_LOG || "/tmp/verified-random-failed-payments.jsonl";

if (!TREASURY) {
  console.error("FATAL: Set OPENRNG_TREASURY to your Base wallet address");
  process.exit(1);
}

// ─── Upstream Health Polling ───
let upstreamHealthy = false;
let poolDepth: number | null = null; // N1a fix: null = unknown, don't gate on it

async function pollUpstreamHealth() {
  try {
    const resp = await fetch(`${UPSTREAM_API}/health`, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      const data = await resp.json() as any;
      upstreamHealthy = data.status === "ok";
      try {
        const rootResp = await fetch(`${UPSTREAM_API}/`, { signal: AbortSignal.timeout(2000) });
        const rootData = await rootResp.json() as any;
        const p = rootData?.links?.pool?.poolSize;
        poolDepth = typeof p === "number" ? p : null;
      } catch {
        poolDepth = null; // unknown, don't gate
      }
    } else {
      upstreamHealthy = false;
    }
  } catch {
    upstreamHealthy = false;
  }
}

setInterval(pollUpstreamHealth, 2000);
pollUpstreamHealth();

// ─── Per-Wallet Rate Limiter (N2 fix: actually wired below) ───
const walletBuckets = new Map<string, { count: number; resetAt: number }>();

function checkWalletRate(walletAddress: string): boolean {
  if (!walletAddress) return true; // no payer info = allow (shouldn't happen post-payment)
  const now = Date.now();
  let bucket = walletBuckets.get(walletAddress);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 1000 };
    walletBuckets.set(walletAddress, bucket);
  }
  bucket.count++;
  return bucket.count <= RATE_LIMIT_PER_WALLET;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of walletBuckets) {
    if (now > bucket.resetAt + 10000) walletBuckets.delete(key);
  }
}, 30000);

// ─── Failed Payment Ledger (N3 fix: persistent, with payer/tx fields) ───
function logFailedPayment(entry: { payer?: string; txHash?: string; amount?: string; error: string }) {
  const record = { timestamp: new Date().toISOString(), ...entry };
  try {
    appendFileSync(FAILED_PAYMENTS_LOG, JSON.stringify(record) + "\n");
  } catch (err) {
    console.error("[verified-random] Failed to log payment failure:", (err as Error).message);
  }
}

// ─── Pre-flight Gate ───
app.use("/v1/rng", (req, res, next) => {
  if (req.path === "/pricing") return next();
  if (!upstreamHealthy) {
    return res.status(503).json({
      error: "service_unavailable",
      retry_after_ms: 5000,
    });
  }
  // N1a fix: only gate on pool depth if known
  if (poolDepth !== null && poolDepth < 10) {
    return res.status(503).json({
      error: "pool_replenishing",
      retry_after_ms: 3000,
    });
  }
  next();
});

// ─── x402 Payment Middleware ───
const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme());

app.use(
  paymentMiddleware(
    {
      "GET /v1/rng/latest": {
        accepts: [{  // N5 fix: array form
          scheme: "exact",
          price: "$0.001",
          network: "eip155:8453",
          payTo: TREASURY,
        }],
        description:
          "Cryptographically verifiable random number. VDF-proven entropy (Wesolowski 2048-bit), pool-served sub-2ms latency.",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// ─── Paid Endpoint: Tier 1 ───
app.get("/v1/rng/latest", async (req, res) => {
  // N2 fix: wire rate limiter to payer address
  const payer = (req as any).x402?.payer || (req as any).payment?.from;
  if (payer && !checkWalletRate(payer)) {
    return res.status(429).json({
      error: "rate_limited",
      limit: RATE_LIMIT_PER_WALLET,
      per: "1 second",
      retry_after_ms: 1000,
    });
  }

  try {
    const resp = await fetch(`${UPSTREAM_API}/api/v1/entropy`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      // N3 fix: log failed payment with payer info
      logFailedPayment({
        payer,
        txHash: (req as any).x402?.txHash || (req as any).payment?.txHash,
        amount: "$0.001",
        error: `upstream_${resp.status}`,
      });
      return res.status(502).json({ error: "upstream_unavailable" });
    }

    const data = await resp.json() as any;

    // N7 fix: validate upstream response before serving paid 200
    if (!data?.entropy || !data?.epoch) {
      logFailedPayment({
        payer,
        txHash: (req as any).x402?.txHash,
        amount: "$0.001",
        error: "upstream_invalid_response",
      });
      return res.status(502).json({ error: "upstream_unavailable" });
    }

    // Explicit field mapping (F8)
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
    logFailedPayment({
      payer,
      txHash: (req as any).x402?.txHash,
      amount: "$0.001",
      error: "upstream_timeout",
    });
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
      },
      // N5 fix: Tier 2 stub removed entirely. Will appear when shipped.
    ],
    verification: {
      vdf: "wesolowski-2048",
      vdf_bits: 2048,
      epoch_seconds: 2.4,
      anchor_chain: ANCHOR_CHAIN,
      anchor_contract: ANCHOR_CONTRACT || undefined,
    },
    rate_limit: {
      per_wallet_per_second: RATE_LIMIT_PER_WALLET,
      enforced: true, // N2 fix: now actually enforced
    },
    first_call_overhead_ms: "~2000 (x402 negotiation round-trip)",
    links: {
      verify: "https://verify.openrng.io",
      github: "https://github.com/ned-del/openrng",
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

// ─── Internal: Failed Payments (N6: bind to separate port would be better, but localhost-only for now) ───
app.get("/internal/failed-payments", (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  if (clientIp !== "127.0.0.1" && clientIp !== "::1" && clientIp !== "::ffff:127.0.0.1") {
    return res.status(403).json({ error: "forbidden" });
  }
  try {
    const log = existsSync(FAILED_PAYMENTS_LOG)
      ? readFileSync(FAILED_PAYMENTS_LOG, "utf-8").trim().split("\n").map(l => JSON.parse(l))
      : [];
    res.json({ failures: log, count: log.length });
  } catch {
    res.json({ failures: [], count: 0 });
  }
});

// ─── Boot Self-Test (N1b fix: cause-separated) ───
async function bootSelfTest(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    await new Promise(r => setTimeout(r, 2000 * attempt));
    try {
      const resp = await fetch(`http://localhost:${PORT}/v1/rng/latest`);
      if (resp.status === 402) {
        console.log("[BOOT TEST] /v1/rng/latest → 402 ✅ (payment required, middleware working)");
        return;
      }
      if (resp.status === 200) {
        // FATAL: endpoint is serving without payment
        console.error("[BOOT TEST FATAL] /v1/rng/latest → 200 WITHOUT PAYMENT. Middleware bypass!");
        process.exit(1);
      }
      if (resp.status === 503) {
        // Upstream not ready yet — retry
        console.warn(`[BOOT TEST] /v1/rng/latest → 503 (upstream not ready, attempt ${attempt}/${retries})`);
        continue;
      }
      console.warn(`[BOOT TEST] /v1/rng/latest → ${resp.status} (unexpected, attempt ${attempt}/${retries})`);
    } catch (err) {
      if (attempt === retries) {
        console.error("[BOOT TEST FATAL] Self-test failed after retries:", (err as Error).message);
        process.exit(1);
      }
      console.warn(`[BOOT TEST] Network error, attempt ${attempt}/${retries}`);
    }
  }
  console.error("[BOOT TEST FATAL] Could not verify payment middleware after all retries");
  process.exit(1);
}

// ─── Start ───
app.listen(PORT, () => {
  console.log(`[verified-random] x402 server on port ${PORT}`);
  console.log(`[verified-random] Treasury: ${TREASURY}`);
  console.log(`[verified-random] Facilitator: ${FACILITATOR_URL}`);
  console.log(`[verified-random] Upstream: ${UPSTREAM_API}`);
  console.log(`[verified-random] Anchor: ${ANCHOR_CHAIN} ${ANCHOR_CONTRACT || "(not set)"}`);
  console.log(`[verified-random] Rate limit: ${RATE_LIMIT_PER_WALLET} req/s per wallet`);
  console.log(`[verified-random] Failed payments log: ${FAILED_PAYMENTS_LOG}`);
  console.log(`[verified-random] Tier 1: /v1/rng/latest $0.001`);
  console.log(`[verified-random] Tier 2: DEFERRED (pending upstream epoch support)`);

  bootSelfTest();
});
