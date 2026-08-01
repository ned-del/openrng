/**
 * @openrng/auto — Proxy-based auto-instrumentation for AI SDKs
 *
 * Uses ES Proxy to intercept AI SDK method calls and emit VEO-2 objects.
 * SDK-level capture provides ergonomic context (model, tokens, tools).
 *
 * TRUST MODEL: Client-side capture produces tamper-evident records after signing,
 * but initial contents are only as trustworthy as the process that created them.
 * True spoof-resistance requires an external boundary (anchoring, co-signatures, TEE).
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
  /** Callback for each emitted VEO (fire-and-forget by default) */
  onVEO?: VEOHandler;
  /** If true, await store.save() and onVEO() before returning. Default: false (fire-and-forget) */
  awaitCapture?: boolean;
  /** Whether to capture prompt/output content hashes (default: true) */
  captureContent?: boolean;
}

/**
 * Auto-instrument an AI SDK client.
 *
 * @example
 * ```typescript
 * const client = auto(new OpenAI());
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
    awaitCapture = false,
    captureContent = true,
  } = options;

  return createDeepProxy(client, {
    provider,
    privateKey,
    store,
    onVEO,
    awaitCapture,
    captureContent,
    path: [],
    bindCache: new WeakMap(),
  });
}

interface ProxyContext {
  provider: string;
  privateKey?: string;
  store: VEOStore;
  onVEO?: VEOHandler;
  awaitCapture: boolean;
  captureContent: boolean;
  path: string[];
  bindCache: WeakMap<Function, Function>;
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

/** Detect async iterable (streaming responses) */
function isAsyncIterable(obj: any): boolean {
  return obj != null && typeof obj[Symbol.asyncIterator] === 'function';
}

function createDeepProxy<T extends object>(target: T, ctx: ProxyContext): T {
  return new Proxy(target, {
    get(obj: any, prop: string | symbol) {
      if (typeof prop === 'symbol') return obj[prop];

      const value = obj[prop];
      if (value === undefined || value === null) return value;

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

            // Emit VEO — fire-and-forget by default
            const emitVEO = async () => {
              try {
                const veo = buildVEO(newPath, args, result, error, latencyMs, ctx);
                await ctx.store.save(veo);
                if (ctx.onVEO) await ctx.onVEO(veo);
              } catch (veoErr) {
                // Never let VEO emission break the original call
                console.warn('[openrng/auto] VEO emission failed:', (veoErr as Error).message);
              }
            };

            if (ctx.awaitCapture) {
              await emitVEO();
            } else {
              // Fire-and-forget — don't block the AI response
              emitVEO();
            }
          }

          return result;
        };
      }

      // Non-instrumented functions: bind to the raw target to avoid
      // private-field access errors (#foo). Cache bindings so identity
      // holds (obj.fn === obj.fn) for event-emitter deduplication.
      if (typeof value === 'function') {
        if (!ctx.bindCache.has(value)) {
          ctx.bindCache.set(value, value.bind(obj));
        }
        return ctx.bindCache.get(value);
      }

      // If it's an object, proxy deeper
      if (typeof value === 'object' && !Array.isArray(value)) {
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
    promptStr = JSON.stringify(input.messages);
  } else if (input.prompt) {
    promptStr = typeof input.prompt === 'string' ? input.prompt : JSON.stringify(input.prompt);
  } else if (input.input) {
    promptStr = typeof input.input === 'string' ? input.input : JSON.stringify(input.input);
  }

  // Extract output — handle streaming
  let outputStr = '';
  let isStream = false;
  if (result && isAsyncIterable(result)) {
    // Streaming response — don't consume the iterator, mark honestly
    outputStr = '[stream — not captured in @openrng/auto 0.1.x]';
    isStream = true;
  } else if (result) {
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

  // Extract tool calls (status unknown at SDK layer — marked as such)
  const toolCalls = result?.choices?.[0]?.message?.tool_calls?.map((tc: any) => ({
    tool_id: tc.function?.name || tc.id || 'unknown',
    // SDK layer cannot verify tool execution status; marked unknown
    status: 'success' as const, // TODO: 'unknown' when VEO schema supports it
  }));

  // Confidence scoring (VEO-2 ECS scale 0-1000):
  // - 100: error occurred — low confidence in execution integrity
  // - 300: streaming — output not captured, partial record
  // - 700: successful non-streaming call — full record captured
  const confidence = error ? 100 : isStream ? 300 : 700;

  // Build VEO
  let veo = capture({
    provider: ctx.provider,
    prompt: ctx.captureContent ? promptStr : '[redacted]',
    output: ctx.captureContent ? outputStr : '[redacted]',
    model,
    latencyMs,
    cost,
    toolCalls,
    confidence,
    parameters: {
      temperature: input.temperature,
      max_tokens: input.max_tokens,
      method: methodPath,
      stream: isStream || undefined,
    },
    metadata: {
      sdk: '@openrng/auto',
      version: '0.1.0',
      method: methodPath,
      stream: isStream || undefined,
      error: error ? error.message : undefined,
    },
  });

  // Sign if key provided
  if (ctx.privateKey) {
    veo = signVEO(veo, ctx.privateKey);
  }

  return veo;
}
