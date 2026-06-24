/**
 * VEO-1 — Express Router (v2 API)
 *
 * GET  /v2/entropy         — Generate and return a VEO-1 object
 * POST /v2/entropy/verify  — Verify a VEO-1 object
 * GET  /v2/entropy/status  — System status
 */

import express from 'express';
import { generateVEOObject, AnchorNotAvailableError, isAnchoringConfigured } from './generator.js';
import { verifyEntropyObject } from './verify.js';
import { getSourceStatus, getGlobalSourceStatus } from './sources.js';
import { isSigningConfigured, getProviderAddress, getProviderPublicKey } from './signing.js';
import { getContractAddress, getChain, getLastAnchorInfo } from './anchor.js';
import { EntropyPolicy } from './types.js';

export const veoRouter = express.Router();

// ── Policy Presets ──────────────────────────────────────────

const policyPresets: Record<string, EntropyPolicy> = {
  'simulation-grade': {
    policy_name: 'simulation-grade',
    min_ecs: 700,
    min_sources: 1,
    anchor_required: false,
  },
  'ai-grade': {
    policy_name: 'ai-grade',
    min_ecs: 800,
    min_sources: 2,
    anchor_required: false,
  },
  'gaming-grade': {
    policy_name: 'gaming-grade',
    min_ecs: 850,
    min_sources: 2,
    anchor_required: true,
  },
  'casino-grade': {
    policy_name: 'casino-grade',
    min_ecs: 900,
    min_sources: 3,
    anchor_required: true,
  },
  'enterprise-grade': {
    policy_name: 'enterprise-grade',
    min_ecs: 950,
    min_sources: 3,
    anchor_required: true,
    audit_required: true,
  },
};

function policyFromQuery(query: Record<string, unknown>): EntropyPolicy | undefined {
  const preset = query.policy ? policyPresets[String(query.policy)] : undefined;

  if (!query.policy && !query.min_ecs && !query.min_sources && !query.anchor_required) {
    return undefined;
  }

  return {
    ...(preset ?? {}),
    min_ecs: query.min_ecs ? Number(query.min_ecs) : preset?.min_ecs,
    min_sources: query.min_sources ? Number(query.min_sources) : preset?.min_sources,
    anchor_required: query.anchor_required
      ? String(query.anchor_required) === 'true'
      : preset?.anchor_required,
    max_latency_ms: query.max_latency_ms ? Number(query.max_latency_ms) : preset?.max_latency_ms,
  };
}

// ── Routes ──────────────────────────────────────────────────

veoRouter.get('/entropy', async (req, res, next) => {
  try {
    const policy = policyFromQuery(req.query as Record<string, unknown>);
    const obj = await generateVEOObject(policy);
    res.json(obj);
  } catch (err) {
    if (err instanceof AnchorNotAvailableError) {
      return res.status(422).json({
        valid: false,
        error: 'ANCHOR_REQUIRED_BUT_NOT_AVAILABLE',
        details: {
          anchoring_status: 'disabled_missing_key',
        },
      });
    }
    next(err);
  }
});

veoRouter.post('/entropy/verify', express.json(), async (req, res, next) => {
  try {
    const entropyObject = req.body.entropy_object ?? req.body;
    const policy = req.body.policy;
    const result = await verifyEntropyObject(entropyObject, policy);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Status Endpoint ─────────────────────────────────────────

veoRouter.get('/entropy/status', async (_req, res) => {
  const signingActive = isSigningConfigured();
  const providerAddress = getProviderAddress();
  const publicKeyConfigured = Boolean(getProviderPublicKey());

  const anchoringActive = isAnchoringConfigured();
  const contractAddress = getContractAddress();
  const chain = getChain();
  const lastAnchor = getLastAnchorInfo();

  const sources = getSourceStatus();
  const globalSourceStatus = getGlobalSourceStatus();

  let globalStatus: string;
  if (globalSourceStatus === 'live' && signingActive && anchoringActive) {
    globalStatus = 'live';
  } else if (globalSourceStatus === 'failed') {
    globalStatus = 'failed';
  } else {
    globalStatus = 'degraded';
  }

  const signingResponse: Record<string, unknown> = {
    status: signingActive ? 'enabled' : 'disabled_missing_key',
    public_key_configured: publicKeyConfigured,
  };
  if (signingActive && providerAddress) {
    signingResponse.provider_address = providerAddress;
  }

  const anchoringResponse: Record<string, unknown> = {
    status: anchoringActive ? 'enabled' : 'disabled_missing_key',
    chain,
    contract: contractAddress,
  };
  if (lastAnchor.tx) {
    anchoringResponse.last_anchor_tx = lastAnchor.tx;
    anchoringResponse.last_anchor_at = lastAnchor.at;
  }

  res.json({
    service: 'OpenRNG VEO-1',
    version: '1.0',
    status: globalStatus,
    sources,
    signing: signingResponse,
    anchoring: anchoringResponse,
  });
});
