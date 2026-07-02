/**
 * OpenRNG SDK singleton wrapper
 */

import { OpenRNG } from '@openrng/sdk';

let instance: OpenRNG | null = null;

export function getRNG(): OpenRNG {
  if (!instance) {
    instance = new OpenRNG({
      agentId: 'openrng-telegram-bot',
      endpoint: process.env.OPENRNG_ENDPOINT || 'http://localhost:3000',
      apiKey: process.env.OPENRNG_API_KEY || undefined,
      vertical: 'game',
      agentName: 'OpenRNG Dice Bot',
      framework: 'custom',
    });
  }
  return instance;
}

export function destroyRNG(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
