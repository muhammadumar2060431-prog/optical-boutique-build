import { Redis } from "@upstash/redis";

import { logger } from "./logger.server.ts";

let redisClient: Redis | null | undefined;

function getRedis() {
  if (redisClient !== undefined) return redisClient;

  const url = process.env["UPSTASH_REDIS_REST_URL"]?.trim();
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"]?.trim();
  redisClient =
    url && token
      ? new Redis({
          url,
          token,
          retry: { retries: 0 },
          signal: () => AbortSignal.timeout(15_000),
        })
      : null;
  return redisClient;
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    return await redis.get<T>(key);
  } catch (error) {
    logger.warn("redis.cache.get.failed", { key, error });
    return null;
  }
}

export async function setJsonCache<T>(key: string, value: T, ttlSeconds: number) {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    logger.warn("redis.cache.set.failed", { key, error });
    return false;
  }
}

export function resetRedisJsonCacheForTests() {
  redisClient = undefined;
}

export async function incrementCacheRevision(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  try {
    await redis.incr(key);
    return true;
  } catch (error) {
    logger.warn("redis.cache.invalidate.failed", { key, error });
    return false;
  }
}
