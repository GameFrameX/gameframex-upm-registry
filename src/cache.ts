type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const CACHE_KEY = "__upmRegistryAdapterCache";

type CacheStore = Map<string, CacheEntry<unknown>>;

function getCacheStore(): CacheStore {
  const scope = globalThis as typeof globalThis & { [CACHE_KEY]?: CacheStore };
  scope[CACHE_KEY] ??= new Map<string, CacheEntry<unknown>>();
  return scope[CACHE_KEY];
}

export async function getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const cache = getCacheStore();
  const now = Date.now();
  const cached = cache.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await loader();
  cache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
  return value;
}
