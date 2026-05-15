/**
 * OpenRNG LangChain Tool
 *
 * Wraps the OpenRNG API as a LangChain Tool so any LLM agent can
 * generate provably fair random numbers with on-chain Merkle proofs.
 *
 * Usage:
 *   const tool = new OpenRNGTool({ apiUrl: 'https://...', apiKey: '...' });
 *   const agent = createReactAgent({ llm, tools: [tool] });
 */

import { Tool } from '@langchain/core/tools';
import { z } from 'zod';

// ============================================================
// Types
// ============================================================

interface OpenRNGToolConfig {
  /** Base URL of the OpenRNG API (e.g. http://localhost:3000) */
  apiUrl: string;
  /** API key (x-api-key header) */
  apiKey: string;
  /** Client ID for token requests (default: 'langchain-agent') */
  clientId?: string;
}

interface TokenResult {
  value: number;
  leaf_hash: string;
  batch_id: string;
  merkle_proof: {
    root: string;
    proof_path: any[];
    anchor_tx: string | null;
    polygon_scan: string | null;
  } | null;
}

interface VerifyResult {
  verified: boolean;
  leaf_hash: string;
  batch_id: string;
  batch?: {
    merkle_root: string;
    anchor_tx_hash: string | null;
    polygon_scan: string | null;
  };
}

// ============================================================
// Tool Input Schemas
// ============================================================

const RandomNumberInputSchema = z.object({
  min: z.number().int().min(0).describe('Minimum value (inclusive)'),
  max: z.number().int().max(10_000_000).describe('Maximum value (inclusive)'),
  quantity: z.number().int().min(1).max(100).default(1).describe('How many random numbers to generate'),
});

const RandomChoiceInputSchema = z.object({
  options: z.array(z.string()).min(2).max(100).describe('List of options to choose from'),
});

const VerifyProofInputSchema = z.object({
  leaf_hash: z.string().length(64).describe('The leaf hash of the token to verify'),
  batch_id: z.string().min(1).describe('The batch ID the token belongs to'),
});

// ============================================================
// HTTP Helper
// ============================================================

async function apiFetch(
  url: string,
  apiKey: string,
  method: string,
  body?: any,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`OpenRNG API error (${res.status}): ${data.error || data.message || JSON.stringify(data)}`);
  }

  return data;
}

// ============================================================
// OpenRNG Random Number Tool
// ============================================================

export class OpenRNGRandomNumberTool extends Tool {
  name = 'openrng_random_number';
  description =
    'Generate one or more cryptographically secure, provably fair random numbers ' +
    'with on-chain Merkle proofs on Polygon. Input is a JSON object with ' +
    '"min" (integer ≥ 0), "max" (integer ≤ 10000000), and optional "quantity" (1-100). ' +
    'Returns random numbers with verification proofs that can be checked on-chain.';

  private config: Required<OpenRNGToolConfig>;

  constructor(config: OpenRNGToolConfig) {
    super();
    this.config = {
      ...config,
      clientId: config.clientId || 'langchain-agent',
    };
  }

  async _call(input: string): Promise<string> {
    try {
      const parsed = RandomNumberInputSchema.parse(JSON.parse(input));

      const data = await apiFetch(
        `${this.config.apiUrl}/v1/tokens/request`,
        this.config.apiKey,
        'POST',
        {
          client_id: this.config.clientId,
          quantity: parsed.quantity,
          range: { min: parsed.min, max: parsed.max },
          vertical: 'agent',
        },
      );

      const tokens: TokenResult[] = data.tokens;
      const values = tokens.map((t) => t.value);

      return JSON.stringify({
        values,
        count: values.length,
        range: { min: parsed.min, max: parsed.max },
        proofs: tokens.map((t) => ({
          value: t.value,
          leaf_hash: t.leaf_hash,
          batch_id: t.batch_id,
          polygon_scan: t.merkle_proof?.polygon_scan || null,
        })),
        verification_note:
          'Each number has an on-chain Merkle proof. Use openrng_verify_proof to independently verify any result.',
      });
    } catch (err: any) {
      return JSON.stringify({ error: err.message });
    }
  }
}

// ============================================================
// OpenRNG Random Choice Tool
// ============================================================

export class OpenRNGRandomChoiceTool extends Tool {
  name = 'openrng_random_choice';
  description =
    'Randomly select one item from a list using provably fair randomness. ' +
    'Input is a JSON object with "options" (array of strings, 2-100 items). ' +
    'Returns the selected option with a verifiable proof.';

  private config: Required<OpenRNGToolConfig>;

  constructor(config: OpenRNGToolConfig) {
    super();
    this.config = {
      ...config,
      clientId: config.clientId || 'langchain-agent',
    };
  }

  async _call(input: string): Promise<string> {
    try {
      const parsed = RandomChoiceInputSchema.parse(JSON.parse(input));
      const { options } = parsed;

      const data = await apiFetch(
        `${this.config.apiUrl}/v1/tokens/request`,
        this.config.apiKey,
        'POST',
        {
          client_id: this.config.clientId,
          quantity: 1,
          range: { min: 0, max: options.length - 1 },
          vertical: 'agent',
        },
      );

      const token: TokenResult = data.tokens[0];
      const selectedIndex = Math.floor(token.value);
      const selected = options[selectedIndex];

      return JSON.stringify({
        selected,
        selected_index: selectedIndex,
        total_options: options.length,
        proof: {
          leaf_hash: token.leaf_hash,
          batch_id: token.batch_id,
          polygon_scan: token.merkle_proof?.polygon_scan || null,
        },
        verification_note:
          'This choice is provably fair. The random index was generated with on-chain proof.',
      });
    } catch (err: any) {
      return JSON.stringify({ error: err.message });
    }
  }
}

// ============================================================
// OpenRNG Verify Proof Tool
// ============================================================

export class OpenRNGVerifyProofTool extends Tool {
  name = 'openrng_verify_proof';
  description =
    'Verify the on-chain Merkle proof for a previously generated random number. ' +
    'Input is a JSON object with "leaf_hash" (64-char hex string) and "batch_id" (string). ' +
    'Returns verification result including on-chain anchor details.';

  private config: Required<OpenRNGToolConfig>;

  constructor(config: OpenRNGToolConfig) {
    super();
    this.config = {
      ...config,
      clientId: config.clientId || 'langchain-agent',
    };
  }

  async _call(input: string): Promise<string> {
    try {
      const parsed = VerifyProofInputSchema.parse(JSON.parse(input));

      // Verify endpoint is public (no auth required)
      const data = await apiFetch(
        `${this.config.apiUrl}/v1/tokens/verify`,
        this.config.apiKey,
        'POST',
        {
          leaf_hash: parsed.leaf_hash,
          batch_id: parsed.batch_id,
        },
      );

      return JSON.stringify({
        verified: data.verified ?? false,
        leaf_hash: data.leaf_hash,
        batch_id: data.batch_id,
        token: data.token || null,
        batch: data.batch || null,
        proof: data.proof || null,
        polygon_contract: data.polygon_contract || null,
      });
    } catch (err: any) {
      return JSON.stringify({ error: err.message });
    }
  }
}

// ============================================================
// Convenience: get all tools at once
// ============================================================

export function createOpenRNGTools(config: OpenRNGToolConfig) {
  return [
    new OpenRNGRandomNumberTool(config),
    new OpenRNGRandomChoiceTool(config),
    new OpenRNGVerifyProofTool(config),
  ];
}
