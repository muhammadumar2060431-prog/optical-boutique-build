import type { InitialSupabaseData } from "../supabaseSync.ts";
import { publicStorefrontData } from "../public-storefront.ts";
import { json } from "./http.server.ts";
import { getJsonCache, setJsonCache } from "./redis-json-cache.server.ts";

const STOREFRONT_CACHE_KEY = "optique:storefront:v1";
export const STOREFRONT_REVISION_KEY = "optique:storefront:revision";
const STOREFRONT_CACHE_TTL_SECONDS = 120;

type StorefrontData = InitialSupabaseData;

interface CacheDependencies {
  getRevision?: () => Promise<number | null>;
  getCache: (key: string) => Promise<StorefrontData | null>;
  setCache: (key: string, data: StorefrontData, ttl: number) => Promise<boolean>;
  loadData: () => Promise<StorefrontData | null>;
}

const defaultDependencies: CacheDependencies = {
  getRevision: () => getJsonCache<number>(STOREFRONT_REVISION_KEY),
  getCache: getJsonCache<StorefrontData>,
  setCache: setJsonCache<StorefrontData>,
  loadData: async () => {
    const { fetchInitialSupabaseData } = await import("../supabaseSync.ts");
    return fetchInitialSupabaseData({ bypassStorefrontApi: true });
  },
};

export function createStorefrontCacheHandler(dependencies = defaultDependencies) {
  const pending = new Map<
    number,
    Promise<{
      data: StorefrontData | null;
      cache: "hit" | "miss" | "bypass";
      timing: string;
    }>
  >();

  async function load(revision: number) {
    const cacheKey = `${STOREFRONT_CACHE_KEY}:${revision}`;
    const started = performance.now();
    const cached = await dependencies.getCache(cacheKey);
    const redisReadMs = performance.now() - started;
    if (cached) {
      return {
        data: publicStorefrontData(cached),
        cache: "hit" as const,
        timing: `redis_read;dur=${redisReadMs.toFixed(1)}`,
      };
    }

    const databaseStart = performance.now();
    const rawData = await dependencies.loadData();
    const data = rawData ? publicStorefrontData(rawData) : null;
    const databaseMs = performance.now() - databaseStart;
    const timing = `redis_read;dur=${redisReadMs.toFixed(1)}, database;dur=${databaseMs.toFixed(1)}`;
    if (!data) return { data: null, cache: "bypass" as const, timing };

    const writeStart = performance.now();
    const stored = await dependencies.setCache(cacheKey, data, STOREFRONT_CACHE_TTL_SECONDS);
    return {
      data,
      cache: stored ? ("miss" as const) : ("bypass" as const),
      timing: `${timing}, redis_write;dur=${(performance.now() - writeStart).toFixed(1)}`,
    };
  }

  return async () => {
    const revision = (await dependencies.getRevision?.()) ?? 0;
    // Share a cold fill within this server instance, but return a new Response per request.
    if (!pending.has(revision)) {
      pending.set(
        revision,
        load(revision).finally(() => pending.delete(revision)),
      );
    }
    const { data, cache, timing } = await pending.get(revision)!;
    const headers: Record<string, string> = {
      "X-Redis-Cache": cache.toUpperCase(),
      "Server-Timing": timing,
    };
    if (cache !== "bypass") headers["X-Redis-Cache-TTL"] = String(STOREFRONT_CACHE_TTL_SECONDS);
    return json({ data, cache }, { headers });
  };
}

export const storefrontCacheHandler = createStorefrontCacheHandler();
