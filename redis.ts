// src/lib/redis.ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL not set — distributed locking is disabled.");
    return null;
  }
  const client = new Redis(url, { maxRetriesPerRequest: 3 });
  client.on("error", (err) => console.error("Redis error:", err));
  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

/**
 * Acquire a distributed lock using SET NX PX.
 * Returns the lock token if acquired, null otherwise.
 */
export async function acquireLock(
  key: string,
  ttlMs = 5000
): Promise<string | null> {
  if (!redis) return "no-redis"; // fallback: no locking (single-instance dev)
  const token = `${Date.now()}-${Math.random()}`;
  const result = await redis.set(key, token, "PX", ttlMs, "NX");
  return result === "OK" ? token : null;
}

/**
 * Release a distributed lock only if we own it (Lua script for atomicity).
 */
export async function releaseLock(key: string, token: string): Promise<void> {
  if (!redis || token === "no-redis") return;
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, 1, key, token);
}
