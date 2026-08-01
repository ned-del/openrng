/**
 * @openrng/auto — LangChain Callback Handler
 *
 * Automatically captures VEO-2 objects from LangChain chain/agent executions.
 *
 * Usage:
 *   import { VEOCallbackHandler } from '@openrng/auto/langchain';
 *   const handler = new VEOCallbackHandler({ provider: 'my-app' });
 *   const chain = new LLMChain({ llm, prompt, callbacks: [handler] });
 *
 * Or globally:
 *   import { VEOCallbackHandler } from '@openrng/auto/langchain';
 *   // Add to any LangChain invocation
 *   await chain.invoke({ input: "..." }, { callbacks: [new VEOCallbackHandler()] });
 */

import { capture, signVEO, hashContent, type VEO } from '@openrng/core';
import { MemoryStore, type VEOStore } from './store';

export interface VEOCallbackOptions {
  /** Provider identifier */
  provider?: string;
  /** Ed25519 private key for signing */
  privateKey?: string;
  /** VEO store */
  store?: VEOStore;
  /** Callback on each VEO */
  onVEO?: (veo: VEO) => void | Promise<void>;
}

/**
 * LangChain-compatible callback handler that emits VEO-2 objects.
 *
 * Implements the LangChain CallbackHandler interface methods:
 * - handleLLMStart / handleLLMEnd
 * - handleChainStart / handleChainEnd
 * - handleToolStart / handleToolEnd
 * - handleLLMError / handleChainError / handleToolError
 */
export class VEOCallbackHandler {
  private provider: string;
  private privateKey?: string;
  private store: VEOStore;
  private onVEO?: (veo: VEO) => void | Promise<void>;

  // Track in-flight executions
  private llmStarts: Map<string, { prompt: string; model: string; startTime: number }> = new Map();
  private chainStarts: Map<string, { input: string; startTime: number; veoIds: string[] }> = new Map();
  private toolStarts: Map<string, { name: string; input: string; startTime: number }> = new Map();

  // LangChain requires this
  name = 'VEOCallbackHandler';

  constructor(options: VEOCallbackOptions = {}) {
    this.provider = options.provider || 'openrng-langchain';
    this.privateKey = options.privateKey;
    this.store = options.store || new MemoryStore();
    this.onVEO = options.onVEO;
  }

  // ─── LLM Callbacks ───

  async handleLLMStart(llm: any, prompts: string[], runId: string) {
    this.llmStarts.set(runId, {
      prompt: prompts.join('\n'),
      model: llm?.modelName || llm?.model || llm?.model_name || 'unknown',
      startTime: Date.now(),
    });
  }

  async handleLLMEnd(output: any, runId: string) {
    const start = this.llmStarts.get(runId);
    if (!start) return;
    this.llmStarts.delete(runId);

    const outputText = output?.generations?.[0]?.[0]?.text
      || output?.generations?.[0]?.[0]?.message?.content
      || JSON.stringify(output);

    const latencyMs = Date.now() - start.startTime;

    const veo = this.emitVEO({
      prompt: start.prompt,
      output: outputText,
      model: start.model,
      latencyMs,
      confidence: 700,
    });

    // Track for chain-level VEO
    // (parent chain will collect child VEO IDs)
  }

  async handleLLMError(error: Error, runId: string) {
    const start = this.llmStarts.get(runId);
    if (!start) return;
    this.llmStarts.delete(runId);

    this.emitVEO({
      prompt: start.prompt,
      output: `ERROR: ${error.message}`,
      model: start.model,
      latencyMs: Date.now() - start.startTime,
      confidence: 100,
    });
  }

  // ─── Chain Callbacks ───

  async handleChainStart(chain: any, inputs: any, runId: string) {
    this.chainStarts.set(runId, {
      input: typeof inputs === 'string' ? inputs : JSON.stringify(inputs),
      startTime: Date.now(),
      veoIds: [],
    });
  }

  async handleChainEnd(outputs: any, runId: string) {
    const start = this.chainStarts.get(runId);
    if (!start) return;
    this.chainStarts.delete(runId);

    const outputText = typeof outputs === 'string' ? outputs : JSON.stringify(outputs);

    this.emitVEO({
      prompt: start.input,
      output: outputText,
      model: 'chain',
      latencyMs: Date.now() - start.startTime,
      confidence: 750,
      parentIds: start.veoIds.length > 0 ? start.veoIds : undefined,
      objectClass: start.veoIds.length > 0 ? 'VEO-2B' : 'VEO-2A',
    });
  }

  async handleChainError(error: Error, runId: string) {
    const start = this.chainStarts.get(runId);
    if (!start) return;
    this.chainStarts.delete(runId);

    this.emitVEO({
      prompt: start.input,
      output: `ERROR: ${error.message}`,
      model: 'chain',
      latencyMs: Date.now() - start.startTime,
      confidence: 100,
    });
  }

  // ─── Tool Callbacks ───

  async handleToolStart(tool: any, input: string, runId: string) {
    this.toolStarts.set(runId, {
      name: tool?.name || 'unknown-tool',
      input: input,
      startTime: Date.now(),
    });
  }

  async handleToolEnd(output: string, runId: string) {
    const start = this.toolStarts.get(runId);
    if (!start) return;
    this.toolStarts.delete(runId);
    // Tool calls are captured as part of the LLM VEO, not separately
  }

  async handleToolError(error: Error, runId: string) {
    this.toolStarts.delete(runId);
  }

  // ─── VEO Emission ───

  private emitVEO(opts: {
    prompt: string;
    output: string;
    model: string;
    latencyMs: number;
    confidence: number;
    parentIds?: string[];
    objectClass?: 'VEO-2A' | 'VEO-2B';
  }): VEO {
    let veo = capture({
      provider: this.provider,
      prompt: opts.prompt,
      output: opts.output,
      model: opts.model,
      latencyMs: opts.latencyMs,
      confidence: opts.confidence,
      parentIds: opts.parentIds,
      objectClass: opts.objectClass,
    });

    if (this.privateKey) {
      veo = signVEO(veo, this.privateKey);
    }

    // Fire-and-forget
    Promise.resolve(this.store.save(veo)).catch(() => {});
    if (this.onVEO) {
      Promise.resolve(this.onVEO(veo)).catch(() => {});
    }

    return veo;
  }

  /** Get all captured VEOs */
  getVEOs(): VEO[] | Promise<VEO[]> {
    return this.store.list();
  }
}
