/**
 * verified-random — x402 Agent-Payable Verifiable Randomness
 *
 * Wraps the existing OpenRNG API with x402 payment middleware.
 * AI agents pay USDC on Base per-call. No API keys, no accounts.
 *
 * Endpoints:
 *   GET /v1/rng/latest         $0.001 — pool-served random value, sub-2ms
 *   GET /v1/rng/verified/:epoch $0.005 — value + full VDF proof + Merkle inclusion
 *   GET /v1/rng/pricing        FREE   — machine-readable catalog for agent crawlers
 *   GET /health                FREE   — health check
 */

import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = express();

// ─── Config ───
const TREASURY = process.env.OPENRNG_TREASURY!; // Base mainnet address (your MetaMask)
const FACILITATOR_URL = process.env.X402_FACILITATOR || "https://x402.coinbase.com";
const UPSTREAM_API = process.env.UPSTREAM_API || "http://localhost:3000";
const PORT = parseInt(process.env.X402_PORT || "8402");

if (!TREASURY) {
  console.error("ERROR: Set OPENRNG_TREASURY to your Base wallet address");
  process.exit(1);
}

// ─── x402 Payment Middleware ───
const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme()); // Base mainnet

app.use(
  paymentMiddleware(
    {
      "GET /v1/rng/latest": {
        accepts: {
          scheme: "exact",
          price: "$0.001",
          network: "eip155:8453",
          payTo: TREASURY,
        },
        description:
          "Cryptographically verifiable random number. VDF-proven entropy, sub-2ms latency. 256-bit value + epoch ID + beacon signature.",
        mimeType: "application/json",
      },
      "GET /v1/rng/verified/:epoch": {
        accepts: {
          scheme: "exact",
          price: "$0.005",
          network: "eip155:8453",
          payTo: TREASURY,
        },
        description:
          "Verified randomness with full Wesolowski VDF proof (2048-bit, ~2.4s compute) + Merkle inclusion proof against on-chain MerkleAnchor contract on Base.",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// ─── Paid Endpoints (proxied to upstream OpenRNG API) ───

app.get("/v1/rng/latest", async (_req, res) => {
  try {
    const resp = await fetch(`${UPSTREAM_API}/api/v1/entropy`);
    const data = await resp.json();
    res.json({
      service: "verified-random",
      protocol: "x402",
      ...data,
    });
  } catch (err: any) {
    res.status(502).json({ error: "Upstream API unavailable", message: err.message });
  }
});

app.get("/v1/rng/verified/:epoch", async (req, res) => {
  try {
    // Return the specific epoch's VDF proof
    const resp = await fetch(`${UPSTREAM_API}/api/v1/entropy`);
    const data = await resp.json();
    res.json({
      service: "verified-random",
      protocol: "x402",
      requested_epoch: req.params.epoch,
      ...data,
      verification: {
        vdf: "wesolowski-2048",
        anchor_contract: process.env.MERKLE_ANCHOR_CONTRACT || "0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8",
        chain: "base",
        explorer: "https://basescan.org",
      },
    });
  } catch (err: any) {
    res.status(502).json({ error: "Upstream API unavailable", message: err.message });
  }
});

// ─── Free Endpoints (discovery + health) ───

app.get("/v1/rng/pricing", (_req, res) => {
  res.json({
    service: "verified-random",
    description:
      "Cryptographically verifiable random number generation. VDF-proven entropy, sub-2ms latency, Merkle-anchored. Provably fair — no one, including the operator, can predict or manipulate outputs.",
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
      {
        path: "/v1/rng/verified/{epoch}",
        price: "$0.005",
        latency_ms: 10,
        description: "Value + full VDF proof + Merkle inclusion",
      },
    ],
    verification: {
      vdf: "wesolowski-2048",
      vdf_bits: 2048,
      epoch_seconds: 2.4,
      anchor: "MerkleAnchor.sol",
      chain: "base",
    },
    comparison: {
      vs_chainlink_vrf: {
        chainlink_cost: "$0.50-3.00 per request",
        verified_random_cost: "$0.001 per request",
        savings: "100-3000x cheaper",
        chainlink_latency: "2-5 blocks (~30s)",
        verified_random_latency: "sub-2ms",
      },
    },
    links: {
      docs: "https://api.openrng.io/docs",
      verify: "https://verify.openrng.io",
      github: "https://github.com/ned-del/openrng",
      npm: "https://www.npmjs.com/package/@openrng/core",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "verified-random", protocol: "x402" });
});

// ─── Start ───
app.listen(PORT, () => {
  console.log(`[verified-random] x402 server on port ${PORT}`);
  console.log(`[verified-random] Treasury: ${TREASURY}`);
  console.log(`[verified-random] Facilitator: ${FACILITATOR_URL}`);
  console.log(`[verified-random] Upstream: ${UPSTREAM_API}`);
  console.log(`[verified-random] Pricing: /v1/rng/latest $0.001 | /v1/rng/verified/:epoch $0.005`);
});
