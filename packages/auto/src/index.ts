/**
 * @openrng/auto — Auto-instrument AI SDK calls to emit VEO-2 objects
 *
 * Usage:
 *   import { auto } from '@openrng/auto';
 *   const client = auto(new OpenAI());
 *   // Every chat.completions.create() now emits a VEO
 *
 * Or with signing:
 *   import { auto } from '@openrng/auto';
 *   import { generateSigningKeys } from '@openrng/core';
 *   const keys = generateSigningKeys();
 *   const client = auto(new OpenAI(), { privateKey: keys.privateKey });
 */

export { auto, type AutoOptions, type VEOHandler } from './auto';
export { type VEOStore, MemoryStore } from './store';
