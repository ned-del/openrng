/**
 * VEO-2 — High-level capture helpers
 *
 * Simplifies creating VEOs from real AI execution data.
 * Handles content hashing automatically.
 */

import type { VEO, VEOClass, ToolCall, CostRecord } from './types';
import { createVEO } from './veo';
import { hashContent } from './sign';

export interface CaptureOptions {
  /** Your service/app identifier */
  provider: string;
  /** The prompt sent to the AI */
  prompt: string;
  /** The AI's response */
  output: string;
  /** Model identifier (e.g. "gpt-4o", "claude-4-sonnet") */
  model: string;
  /** Model version (optional) */
  modelVersion?: string;
  /** AI provider name (e.g. "openai", "anthropic") */
  aiProvider?: string;
  /** Response time in milliseconds */
  latencyMs?: number;
  /** Token usage and cost */
  cost?: CostRecord;
  /** Tool/function calls made */
  toolCalls?: ToolCall[];
  /** Model parameters (temperature, etc.) */
  parameters?: Record<string, unknown>;
  /** Confidence score (0-1000) */
  confidence?: number;
  /** Parent VEO IDs (for chains/pipelines) */
  parentIds?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Object class override */
  objectClass?: VEOClass;
}

/**
 * Capture an AI execution as a VEO object.
 *
 * Automatically hashes prompt and output content.
 *
 * @example
 * ```typescript
 * import { capture } from '@openrng/core';
 *
 * const veo = capture({
 *   provider: 'my-app',
 *   prompt: 'What is the capital of France?',
 *   output: 'The capital of France is Paris.',
 *   model: 'gpt-4o',
 *   latencyMs: 412,
 * });
 * ```
 */
export function capture(options: CaptureOptions): VEO {
  const promptHash = hashContent(options.prompt);
  const outputHash = hashContent(options.output);

  // Determine confidence grade from score
  const score = options.confidence ?? 500;
  const grade = score >= 900 ? 'AAA' as const
    : score >= 800 ? 'AA' as const
    : score >= 700 ? 'A' as const
    : score >= 500 ? 'B' as const
    : score >= 300 ? 'C' as const
    : 'LOW' as const;

  return createVEO({
    object_class: options.objectClass || (options.parentIds?.length ? 'VEO-2B' : 'VEO-2A'),
    provider_id: options.provider,
    execution: {
      prompt_hash: promptHash,
      output_hash: outputHash,
      model_id: options.model,
      model_version: options.modelVersion,
      provider: options.aiProvider,
      latency_ms: options.latencyMs,
      cost: options.cost,
      tool_calls: options.toolCalls,
      parameters: options.parameters,
    },
    confidence: { score, grade },
    lineage: options.parentIds ? { parent_ids: options.parentIds } : undefined,
    metadata: {
      ...options.metadata,
      prompt_length: options.prompt.length,
      output_length: options.output.length,
    },
  });
}
