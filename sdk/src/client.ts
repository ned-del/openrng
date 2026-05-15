/**
 * OpenRNG SDK — HTTP Client with retry, keep-alive, and error handling
 */

import {
  OpenRNGError,
  PoolExhaustedError,
  RateLimitError,
  AuthenticationError,
  ConnectionError,
} from './errors';
import type { OpenRNGConfig } from './types';
import http from 'http';
import https from 'https';

// Keep-alive agents for connection pooling
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30000 });

interface RequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: any;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly timeoutMs: number;

  constructor(config: OpenRNGConfig) {
    this.baseUrl = config.endpoint.replace(/\/$/, '');
    this.apiKey = config.apiKey || '';
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? 200;
    this.timeoutMs = config.timeoutMs ?? 10000;
  }

  async request<T>(opts: RequestOptions): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.retryBaseDelayMs * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
        await new Promise(r => setTimeout(r, delay));
      }

      try {
        const url = `${this.baseUrl}${opts.path}`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };
        if (this.apiKey) {
          headers['x-api-key'] = this.apiKey;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const isHttps = url.startsWith('https');
          const response = await fetch(url, {
            method: opts.method,
            headers,
            body: opts.body ? JSON.stringify(opts.body) : undefined,
            signal: controller.signal,
            // @ts-ignore — Node fetch supports dispatcher-like agent via undici
          });

          clearTimeout(timeout);

          if (response.status === 401) {
            throw new AuthenticationError();
          }
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '60') * 1000;
            throw new RateLimitError(retryAfter);
          }
          if (response.status === 503) {
            throw new PoolExhaustedError();
          }
          if (!response.ok) {
            const body = await response.text();
            throw new OpenRNGError(
              `HTTP ${response.status}: ${body}`,
              'HTTP_ERROR',
              response.status,
            );
          }

          return await response.json() as T;
        } finally {
          clearTimeout(timeout);
        }

      } catch (err: any) {
        lastError = err;

        // Don't retry auth errors
        if (err instanceof AuthenticationError) throw err;
        // Don't retry rate limits (caller should handle)
        if (err instanceof RateLimitError) throw err;

        // Retry on connection errors, pool exhausted, timeouts
        if (attempt === this.maxRetries) break;
      }
    }

    if (lastError instanceof OpenRNGError) throw lastError;
    throw new ConnectionError(lastError?.message || 'Unknown connection error');
  }

  destroy(): void {
    httpAgent.destroy();
    httpsAgent.destroy();
  }
}
