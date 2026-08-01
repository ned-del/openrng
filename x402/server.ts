/**
 * verified-random — x402 Agent-Payable Verifiable Randomness (v4)
 *
 * Tier 1 only: GET /v1/rng/latest ($0.001 USDC)
 *
 * Key v2.20 behavior (verified against source):
 *   - Middleware buffers handler response
 *   - Handler failure (≥400 or throw) → payment CANCELED, buyer not charged
 *   - Handler success → settlement executes → response released
 *   - Failed settlement → response discarded
 */

import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { appendFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";

const app = express();

// ─── Config ───
const TREASURY = process.env.OPENRNG_TREASURY;
const FACILITATOR_URL = process.env.X402_FACILITATOR || "https://x402.org/facilitator";
const UPSTREAM_API = process.env.UPSTREAM_API || "http://localhost:3000";
const ANCHOR_CONTRACT = process.env.MERKLE_ANCHOR_CONTRACT;
const ANCHOR_CHAIN = process.env.ANCHOR_CHAIN || "polygon-amoy";
const NETWORK = process.env.X402_NETWORK || "eip155:84532"; // V1 fix: default Sepolia, matches default facilitator
const PORT = parseInt(process.env.X402_PORT || "8402");
const RATE_LIMIT_PER_WALLET = parseInt(process.env.RATE_LIMIT_PER_WALLET || "50");
const FAILED_LOG = process.env.FAILED_PAYMENTS_LOG || "/var/log/verified-random-canceled-payments.jsonl";

if (!TREASURY) {
  console.error("FATAL: Set OPENRNG_TREASURY to your Base wallet address");
  process.exit(1);
}

// ─── Upstream Health Polling ───
let upstreamHealthy = false;
let poolDepth: number | null = null;

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
        poolDepth = null;
      }
    } else {
      upstreamHealthy = false;
      poolDepth = null; // N1a: reset on health failure
    }
  } catch {
    upstreamHealthy = false;
    poolDepth = null;
  }
}

setInterval(pollUpstreamHealth, 2000);
pollUpstreamHealth();

// ─── Per-Wallet Rate Limiter ───
const walletBuckets = new Map<string, { count: number; resetAt: number }>();

function checkWalletRate(walletAddress: string): boolean {
  const addr = walletAddress.toLowerCase(); // normalize checksum
  const now = Date.now();
  let bucket = walletBuckets.get(addr);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 1000 };
    walletBuckets.set(addr, bucket);
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

// ─── Canceled Payment Log (async, durable) ───
// NOTE: These are CANCELED payments — buyer was NOT charged.
// The v2.20 middleware cancels payment when handler returns ≥400.
function logCanceledPayment(entry: { payer?: string; error: string }) {
  const record = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
  appendFile(FAILED_LOG, record + "\n").catch(err =>
    console.error("[verified-random] Log write failed:", err.message)
  );
}

// ─── Pre-flight Gate (503 before 402 negotiation) ───
app.use("/v1/rng", (req, res, next) => {
  if (req.path === "/pricing") return next();
  if (!upstreamHealthy) {
    return res.status(503).json({ error: "service_unavailable", retry_after_ms: 5000 });
  }
  if (poolDepth !== null && poolDepth < 10) {
    return res.status(503).json({ error: "pool_replenishing", retry_after_ms: 3000 });
  }
  next();
});

// ─── x402 Payment Middleware + Rate Limiter ───
const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitator)
  .register(NETWORK, new ExactEvmScheme())
  // N2 fix: rate limiter via onAfterVerify hook (verified against @x402/express@2.20.0 types)
  // Runs after payment is verified but BEFORE handler + settlement
  // Returning { abort: true } denies without charging the buyer
  .onAfterVerify(async (ctx: any) => {
    const payer: string | undefined =
      ctx.result?.payer ??
      (ctx.paymentPayload as any)?.payload?.authorization?.from;
    if (payer && !checkWalletRate(payer)) {
      return {
        abort: true,
        reason: "rate_limited",
        message: `Per-wallet limit: ${RATE_LIMIT_PER_WALLET} req/s. Retry in 1s.`,
      };
    }
  });

app.use(
  paymentMiddleware(
    {
      "GET /v1/rng/latest": {
        accepts: [{
          scheme: "exact",
          price: "$0.001",
          network: NETWORK,
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
// If this handler fails (throw or ≥400), the middleware CANCELS payment — buyer is not charged.
app.get("/v1/rng/latest", async (req, res) => {
  try {
    const resp = await fetch(`${UPSTREAM_API}/api/v1/entropy`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      logCanceledPayment({ error: `upstream_${resp.status}` });
      return res.status(502).json({ error: "upstream_unavailable" });
    }

    const data = await resp.json() as any;

    // N7: validate before serving paid 200
    if (!data?.entropy || typeof data.entropy !== "string" || !/^(0x)?[0-9a-f]{64}$/i.test(data.entropy)) {
      logCanceledPayment({ error: "upstream_invalid_entropy" });
      return res.status(502).json({ error: "upstream_unavailable" });
    }
    if (!data?.epoch) {
      logCanceledPayment({ error: "upstream_missing_epoch" });
      return res.status(502).json({ error: "upstream_unavailable" });
    }

    // Explicit field mapping
    res.json({
      service: "verified-random",
      protocol: "x402",
      entropy: data.entropy,
      entropy_hash: data.entropy_hash || undefined,
      source: data.source || undefined,
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
    logCanceledPayment({ error: "upstream_timeout" });
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
    network: NETWORK.replace("eip155:", "base-"),
    asset: "USDC",
    endpoints: [
      {
        path: "/v1/rng/latest",
        price: "$0.001",
        latency_ms: 2,
        description: "Pool-served random value + epoch ID",
      },
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
      mechanism: "onAfterVerify hook — denies before handler, buyer not charged",
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
    network: NETWORK,
    upstream: upstreamHealthy,
    pool_depth: poolDepth,
  });
});

// ─── Internal (localhost-only) ───
app.get("/internal/canceled-payments", (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (ip !== "127.0.0.1" && ip !== "::1" && ip !== "::ffff:127.0.0.1") {
    return res.status(403).json({ error: "forbidden" });
  }
  try {
    const log = existsSync(FAILED_LOG)
      ? readFileSync(FAILED_LOG, "utf-8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l))
      : [];
    res.json({ canceled_payments: log, count: log.length });
  } catch {
    res.json({ canceled_payments: [], count: 0 });
  }
});

// ─── Boot Self-Test (N1b: cause-separated, 503 = warn not exit) ───
async function bootSelfTest(retries = 3) {
  let sawPaywall = false;
  for (let attempt = 1; attempt <= retries; attempt++) {
    await new Promise(r => setTimeout(r, 2000 * attempt));
    try {
      const resp = await fetch(`http://localhost:${PORT}/v1/rng/latest`);
      if (resp.status === 402) {
        console.log("[BOOT TEST] ✅ /v1/rng/latest → 402 (payment required)");
        sawPaywall = true;
        return;
      }
      if (resp.status === 200) {
        console.error("[BOOT TEST] ❌ FATAL: /v1/rng/latest → 200 WITHOUT PAYMENT!");
        process.exit(1);
      }
      if (resp.status === 503) {
        console.warn(`[BOOT TEST] ⚠️  /v1/rng/latest → 503 (upstream not ready, attempt ${attempt}/${retries})`);
        // N1b fix: 503 = warn, don't exit — gate protects against unpaid access
        continue;
      }
      console.warn(`[BOOT TEST] ⚠️  /v1/rng/latest → ${resp.status} (attempt ${attempt}/${retries})`);
    } catch (err) {
      console.warn(`[BOOT TEST] ⚠️  Network error (attempt ${attempt}/${retries}): ${(err as Error).message}`);
    }
  }
  if (!sawPaywall) {
    console.warn("[BOOT TEST] ⚠️  Could not confirm 402 after retries — upstream may be down. Server continues.");
    console.warn("[BOOT TEST]     Will re-test when upstream becomes healthy.");
    // Schedule re-test when upstream comes up
    const retest = setInterval(async () => {
      if (!upstreamHealthy) return;
      try {
        const resp = await fetch(`http://localhost:${PORT}/v1/rng/latest`);
        if (resp.status === 402) {
          console.log("[BOOT TEST] ✅ Deferred test passed: 402 confirmed");
          clearInterval(retest);
        } else if (resp.status === 200) {
          console.error("[BOOT TEST] ❌ FATAL: Deferred test found 200 WITHOUT PAYMENT!");
          process.exit(1);
        }
      } catch { /* retry next interval */ }
    }, 10000);
  }
}

// ─── Start ───
app.listen(PORT, () => {
  console.log(`[verified-random] x402 server v4 on port ${PORT}`);
  console.log(`[verified-random] Treasury: ${TREASURY}`);
  console.log(`[verified-random] Network: ${NETWORK}`);
  console.log(`[verified-random] Facilitator: ${FACILITATOR_URL}`);
  console.log(`[verified-random] Upstream: ${UPSTREAM_API}`);
  console.log(`[verified-random] Anchor: ${ANCHOR_CHAIN} ${ANCHOR_CONTRACT || "(not set)"}`);
  console.log(`[verified-random] Rate limit: ${RATE_LIMIT_PER_WALLET} req/s per wallet (onAfterVerify)`);
  console.log(`[verified-random] Canceled payments log: ${FAILED_LOG}`);
  console.log(`[verified-random] Tier 1: /v1/rng/latest $0.001`);

  bootSelfTest();
});
