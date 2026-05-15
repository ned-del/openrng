# OpenRNG — Scaling Playbook

## Current Architecture (v0.1 — up to ~50 users)

```
Single Railway Instance
├── Express API (serves tokens)
├── Pool Manager (in-memory token pool)
├── VDF Workers (batch generation, in-process)
├── Polygon Anchor (serialized tx queue)
└── PostgreSQL (Railway-managed, 500MB)
```

**Limits:** ~1K req/s sustained, 524K pre-warmed tokens, single region (SFO)

---

## Phase 1: Redis Integration (~50 users trigger)

### What Changes

```
Railway Instance                    Redis (Railway or Upstash)
├── Express API ───────────────────→ Token Pool (shared)
├── Pool Manager ──────────────────→ Rate Limiting (shared)  
├── VDF Workers                     └ Session/Key Cache
├── Polygon Anchor
└── PostgreSQL
```

### Why
- **Shared rate limiting** — In-memory rate limits don't work across multiple instances
- **Token pool durability** — Instance restart doesn't lose pre-warmed tokens
- **Cache API keys** — Avoid Postgres query on every request
- **Foundation for Phase 2** — Redis becomes the message bus for worker separation

### Implementation

Add `ioredis` to the project. Three integration points:

#### 1. Rate Limiter (replace in-memory Map)

```typescript
// src/redis/rate-limiter.ts
import Redis from 'ioredis';

export class RedisRateLimiter {
  constructor(private redis: Redis, private windowMs = 60_000) {}

  async check(clientId: string, limit: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetMs: number;
  }> {
    const key = `rl:${clientId}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Sliding window using sorted set
    const pipe = this.redis.pipeline();
    pipe.zremrangebyscore(key, 0, windowStart);  // Remove old entries
    pipe.zadd(key, now, `${now}:${Math.random()}`);  // Add current
    pipe.zcard(key);  // Count in window
    pipe.pexpire(key, this.windowMs);  // Auto-cleanup

    const results = await pipe.exec();
    const count = (results?.[2]?.[1] as number) || 0;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetMs: this.windowMs - (now - windowStart),
    };
  }
}
```

#### 2. API Key Cache (avoid Postgres on every request)

```typescript
// src/redis/key-cache.ts
import Redis from 'ioredis';

export class ApiKeyCache {
  constructor(private redis: Redis, private ttlSeconds = 300) {}

  async get(keyHash: string): Promise<any | null> {
    const cached = await this.redis.get(`key:${keyHash}`);
    return cached ? JSON.parse(cached) : null;
  }

  async set(keyHash: string, keyData: any): Promise<void> {
    await this.redis.setex(`key:${keyHash}`, this.ttlSeconds, JSON.stringify(keyData));
  }

  async invalidate(keyHash: string): Promise<void> {
    await this.redis.del(`key:${keyHash}`);
  }
}
```

#### 3. Token Pool (Redis-backed for durability)

```typescript
// src/redis/token-pool.ts
import Redis from 'ioredis';

// Store pre-warmed tokens in Redis lists
// LPUSH to add, RPOP to consume (FIFO)
// Each token is a JSON blob with leafHash, batchId, value, etc.

export class RedisTokenPool {
  constructor(private redis: Redis) {}

  async inject(tokens: Array<{
    leafHash: string; nodeId: string; nodeIndex: number;
    batchId: string; value: number;
  }>): Promise<number> {
    if (tokens.length === 0) return 0;
    const key = 'pool:shared';
    const serialized = tokens.map(t => JSON.stringify(t));
    // LPUSH in chunks to avoid huge argument lists
    const chunkSize = 1000;
    for (let i = 0; i < serialized.length; i += chunkSize) {
      const chunk = serialized.slice(i, i + chunkSize);
      await this.redis.lpush(key, ...chunk);
    }
    return tokens.length;
  }

  async consume(count: number): Promise<any[]> {
    const key = 'pool:shared';
    const tokens: any[] = [];
    // Use pipeline for efficiency
    const pipe = this.redis.pipeline();
    for (let i = 0; i < count; i++) {
      pipe.rpop(key);
    }
    const results = await pipe.exec();
    for (const [err, val] of results || []) {
      if (!err && val) tokens.push(JSON.parse(val as string));
    }
    return tokens;
  }

  async depth(): Promise<number> {
    return await this.redis.llen('pool:shared');
  }
}
```

### Migration Steps

1. `npm install ioredis`
2. Add `REDIS_URL` to env (optional — falls back to in-memory if not set)
3. Wrap existing Pool/RateLimiter with Redis-backed versions
4. Feature flag: `USE_REDIS=true` enables Redis, otherwise in-memory (backward compat)
5. Deploy Redis on Railway ($5/mo) or use Upstash (free tier: 10K commands/day)

### Cost
- Railway Redis: $5/mo (256MB)
- Upstash: Free tier up to 10K cmd/day, $10/mo for 100K cmd/day

---

## Phase 2: Worker Separation (~200 users trigger)

### What Changes

```
┌─── API Instance 1 ──┐
│    (stateless)       │──→ Redis ──→ ┌─── VDF Worker 1 ──┐
├─── API Instance 2 ──┤    Pool       │    (batch gen)     │──→ Polygon
│    (stateless)       │    Queue      ├─── VDF Worker 2 ──┤
└─── API Instance 3 ──┘    Keys       │    (batch gen)     │
         │                  Limits     └─── VDF Worker 3 ──┘
         │                                       │
         └──── PostgreSQL (managed) ─────────────┘
```

### Why
- API instances become **stateless** — scale horizontally with zero coordination
- VDF generation is CPU-heavy — isolate it so API latency isn't affected
- Workers can auto-scale based on pool depth (generate more when low)

### Implementation

#### Job Queue (BullMQ on Redis)

```typescript
// src/worker/queue.ts
import { Queue, Worker } from 'bullmq';

// API side: enqueue batch generation requests
export const batchQueue = new Queue('batch-generation', {
  connection: { url: process.env.REDIS_URL }
});

// When pool gets low:
await batchQueue.add('generate', {
  reason: 'pool-refill',
  clientId: '__shared_pool__',
  batchSize: 65536,
});

// Worker side: process generation jobs
const worker = new Worker('batch-generation', async (job) => {
  const batch = await generator.generateBatch(job.data.clientId);
  // Inject tokens into Redis pool
  await redisPool.inject(batch.tokens);
  // Anchor to Polygon
  await anchor.anchorBatch({ ... });
  return { batchId: batch.batchId, tokens: batch.tokens.length };
}, {
  connection: { url: process.env.REDIS_URL },
  concurrency: 3,
});
```

#### API Instance (stateless)

```typescript
// src/index.ts changes
// BEFORE: Pool manager generates batches in-process
// AFTER:  Pool manager reads from Redis, requests refills via queue

const pool = new RedisTokenPool(redis);
const rateLimiter = new RedisRateLimiter(redis);

// Check pool depth every 10s, request refill if low
setInterval(async () => {
  const depth = await pool.depth();
  if (depth < REFILL_THRESHOLD) {
    await batchQueue.add('generate', { reason: 'low-pool' });
  }
}, 10_000);
```

#### Worker Process (separate deployment)

```typescript
// src/worker/index.ts — deploys as a separate Railway service
import { Worker } from 'bullmq';
import { MerkleBatchGenerator } from '../rng/engine';
import { PolygonAnchor } from '../blockchain/anchor';
import { RedisTokenPool } from '../redis/token-pool';

// This process ONLY generates batches and anchors them
// It never serves HTTP requests
```

### Migration Steps

1. `npm install bullmq`
2. Split `src/index.ts` into `src/api-server.ts` and `src/worker/index.ts`
3. Add `Procfile` or separate Railway services: `api` + `worker`
4. API reads tokens from Redis, worker writes tokens to Redis
5. Deploy worker as separate Railway service ($7/mo)

### Cost
- Additional Railway service: $7/mo
- Total at Phase 2: ~$50/mo (2 API + 1 worker + Redis + Postgres)

---

## Phase 3: Multi-Region (~500+ users trigger)

### What Changes

```
Cloudflare (DNS + DDoS + caching)
    │
    ├── SFO: 2× API + 1× Worker + Redis Primary
    │
    └── IAD: 2× API + 1× Worker + Redis Replica
                    │
                    └── Managed Postgres (Neon/Supabase, multi-region read replicas)
                    │
                    └── Polygon (same wallet, same contract)
```

### Key Decisions

- **Postgres**: Move to Neon (serverless, auto-scaling, branching) or Supabase (managed, read replicas)
- **Redis**: Upstash Global (multi-region replication built-in) or Redis Cluster
- **CDN**: Cloudflare in front for DDoS, caching health endpoint, SSL termination
- **Monitoring**: Grafana Cloud (free tier) or Datadog

### Cost
- $300-500/mo total
- Should be generating $5K+ MRR to justify this

---

## Escape Hatches — Build Now, Use Later

These take minimal effort now but prevent emergency scrambles:

### 1. Feature Flags (30 min)

```typescript
// src/config.ts
export const features = {
  useRedis: process.env.USE_REDIS === 'true',
  useWorkerQueue: process.env.USE_WORKER_QUEUE === 'true',
  maxPoolDepth: parseInt(process.env.MAX_POOL_DEPTH || '524288'),
  refillAggression: parseFloat(process.env.REFILL_AGGRESSION || '0.35'),
};
```

### 2. Graceful Pool Exhaustion (30 min)

Currently pool exhaustion returns an error. Better: fall back to synchronous generation (slower but doesn't fail).

```typescript
// If pool is empty, generate on-demand (10-50ms instead of <2ms)
if (poolEmpty) {
  const token = await generator.generateSingle(clientId);
  return token; // Slower but doesn't break
}
```

### 3. Health Check Detail (15 min)

Add pool depth percentage and token generation rate to /v1/health for monitoring:

```json
{
  "pool": { "depth": 524000, "depthPercent": 99.9, "generationRate": "3 batches/hr" },
  "alerts": []
}
```

### 4. Postgres Connection Pooling (15 min)

Use PgBouncer or Neon's connection pooler when you hit 50+ concurrent connections:

```
DATABASE_URL=postgres://...?pgbouncer=true
```

---

## Scaling Decision Matrix

| Users | Monthly Cost | Action |
|-------|-------------|--------|
| 1-10 | $7 | Do nothing. Current setup is fine. |
| 10-50 | $15-30 | Upgrade Railway plan. Increase pool pre-warm. Add monitoring. |
| 50-200 | $50-100 | Add Redis. Separate worker. Managed Postgres. |
| 200-1K | $150-300 | Multi-instance API. Auto-scaling workers. |
| 1K+ | $300-500 | Multi-region. CDN. Redis cluster. SLA. |

## Timeline to Implement Each Phase

| Phase | Effort | When |
|-------|--------|------|
| Escape hatches | 2 hours | Now ✅ |
| Phase 1 (Redis) | 1 day | At 50 users |
| Phase 2 (Workers) | 2-3 days | At 200 users |
| Phase 3 (Multi-region) | 1 week | At 500+ users |
