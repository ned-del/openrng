/**
 * @openrng/auto — Proxy-based auto-instrumentation for AI SDKs
 *
 * Wraps any AI client (OpenAI, Anthropic, etc.) with a Proxy that
 * intercepts API calls and emits VEO-2 objects automatically.
 *
 * DESIGN DECISION: This uses ES Proxy to intercept method calls.
 * It doesn't depend on any specific AI SDK — it pattern-matches
 * on method signatures (e.g. chat.completions.create()).
 */

import { capture, signVEO, hashContent, type VEO } from '@openrng/core';
import { MemoryStore, type VEOStore } from './store';

/** Callback for each emitted VEO */
export type VEOHandler = (veo: VEO) => void | Promise<void>;

export interface AutoOptions {
  /** Provider identifier (e.g. 'my-app') */
  provider?: string;
  /** Ed25519 private key for signing VEOs */
  privateKey?: string;
  /** Custom VEO store (default: in-memory) */
  store?: VEOStore;
  /** Callback for each emitted VEO */
  onVEO?: VEOHandler;
  /** Whether to capture prompt/output content hashes (default: true) */
  captureContent?: boolean;
}

/**
 * Auto-instrument an AI SDK client.
 *
 * @example
 * ```typescript
 * import { auto } from '@openrng/auto';
 * import OpenAI from 'openai';
 *
 * const client = auto(new OpenAI());
 * // Every call now emits a VEO
 *
 * const response = await client.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello' }],
 * });
 * ```
 */
export function auto<T extends object>(client: T, options: AutoOptions = {}): T {
  const {
    provider = 'openrng-auto',
    privateKey,
    store = new MemoryStore(),
    onVEO,
    captureContent = true,
  } = options;

  return createDeepProxy(client, {
    provider,
    privateKey,
    store,
    onVEO,
    captureContent,
    path: [],
  });
}

interface ProxyContext {
  provider: string;
  privateKey?: string;
  store: VEOStore;
  onVEO?: VEOHandler;
  captureContent: boolean;
  path: string[];
}

/** Known AI SDK method patterns that should be instrumented */
const INSTRUMENTED_METHODS = new Set([
  // OpenAI
  'chat.completions.create',
  'completions.create',
  'embeddings.create',
  'images.generate',
  // Anthropic
  'messages.create',
  // Generic
  'create',
  'generate',
  'complete',
]);

function shouldInstrument(path: string[]): boolean {
  const fullPath = path.join('.');
  return INSTRUMENTED_METHODS.has(fullPath);
}

function createDeepProxy<T extends object>(target: T, ctx: ProxyContext): T {
  return new Proxy(target, {
    get(obj: any, prop: string | symbol) {
      if (typeof prop === 'symbol') return obj[prop];

      const value = obj[prop];
      const newPath = [...ctx.path, prop as string];

      // If it's a function and matches an instrumented pattern, wrap it
      if (typeof value === 'function' && shouldInstrument(newPath)) {
        return async function instrumented(this: any, ...args: any[]) {
          const startTime = Date.now();
          let result: any;
          let error: any;

          try {
            result = await value.apply(obj, args);
          } catch (err) {
            error = err;
            throw err;
          } finally {
            const latencyMs = Date.now() - startTime;

            try {
              const veo = buildVEO(newPath, args, result, error, latencyMs, ctx);
              await ctx.store.save(veo);
              if (ctx.onVEO) await ctx.onVEO(veo);
            } catch (veoErr) {
              // Never let VEO emission break the original call
              console.warn('[openrng/auto] VEO emission failed:', (veoErr as Error).message);
            }
          }

          return result;
        };
      }

      // If it's an object, proxy deeper
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return createDeepProxy(value, { ...ctx, path: newPath });
      }

      return value;
    },
  });
}

/** Extract relevant info from AI SDK calls and build a VEO */
function buildVEO(
  path: string[],
  args: any[],
  result: any,
  error: any,
  latencyMs: number,
  ctx: ProxyContext,
): VEO {
  const methodPath = path.join('.');
  const input = args[0] || {};

  // Extract model
  const model = input.model || input.model_id || 'unknown';

  // Extract prompt content for hashing
  let promptStr = '';
  if (input.messages) {
    // OpenAI / Anthropic chat format
    promptStr = JSON.stringify(input.messages);
  } else if (input.prompt) {
    promptStr = typeof input.prompt === 'string' ? input.prompt : JSON.stringify(input.prompt);
  } else if (input.input) {
    promptStr = typeof input.input === 'string' ? input.input : JSON.stringify(input.input);
  }

  // Extract output
  let outputStr = '';
  if (result) {
    if (result.choices?.[0]?.message?.content) {
      outputStr = result.choices[0].message.content;
    } else if (result.content?.[0]?.text) {
      outputStr = result.content[0].text;
    } else if (typeof result === 'string') {
      outputStr = result;
    } else {
      outputStr = JSON.stringify(result);
    }
  }
  if (error) {
    outputStr = `ERROR: ${error.message || String(error)}`;
  }

  // Extract token usage
  const usage = result?.usage;
  const cost = usage ? {
    input_tokens: usage.prompt_tokens || usage.input_tokens,
    output_tokens: usage.completion_tokens || usage.output_tokens,
    total_tokens: usage.total_tokens,
  } : undefined;

  // Extract tool calls
  const toolCalls = result?.choices?.[0]?.message?.tool_calls?.map((tc: any) => ({
    tool_id: tc.function?.name || tc.id || 'unknown',
    status: 'success' as const,
  }));

  // Build VEO
  let veo = capture({
    provider: ctx.provider,
    prompt: ctx.captureContent ? promptStr : '[redacted]',
    output: ctx.captureContent ? outputStr : '[redacted]',
    model,
    latencyMs,
    cost,
    toolCalls,
    confidence: error ? 100 : 700,
    parameters: {
      temperature: input.temperature,
      max_tokens: input.max_tokens,
      method: methodPath,
    },
    metadata: {
      sdk: '@openrng/auto',
      method: methodPath,
      error: error ? error.message : undefined,
    },
  });

  // Sign if key provided
  if (ctx.privateKey) {
    veo = signVEO(veo, ctx.privateKey);
  }

  return veo;
}
