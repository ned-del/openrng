/**
 * OpenRNG SDK Error Types
 */

export class OpenRNGError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(message: string, code: string = 'OPENRNG_ERROR', statusCode?: number) {
    super(message);
    this.name = 'OpenRNGError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class PoolExhaustedError extends OpenRNGError {
  constructor(message: string = 'Token pool exhausted — server is generating more tokens') {
    super(message, 'POOL_EXHAUSTED', 503);
    this.name = 'PoolExhaustedError';
  }
}

export class RateLimitError extends OpenRNGError {
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number = 60000) {
    super(`Rate limit exceeded — retry after ${retryAfterMs}ms`, 'RATE_LIMITED', 429);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class AuthenticationError extends OpenRNGError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'AUTH_FAILED', 401);
    this.name = 'AuthenticationError';
  }
}

export class ConnectionError extends OpenRNGError {
  constructor(message: string = 'Cannot connect to OpenRNG server') {
    super(message, 'CONNECTION_FAILED');
    this.name = 'ConnectionError';
  }
}
