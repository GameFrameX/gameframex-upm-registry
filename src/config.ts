import type { AdapterConfig } from "./types";

export interface EnvSource {
  [key: string]: unknown;
}

const DEFAULTS = {
  apiSlug: "GameFrameX/npm",
  registryUrl: "https://npm.cnb.cool/GameFrameX/npm/-/packages/",
  registryName: "GameFrameX UPM Adapter",
  registryScope: "com.gameframex",
  cacheTtlMs: 5 * 60 * 1000,
  searchMaxSize: 50,
  catalogConcurrency: 6,
} as const;

function str(env: EnvSource, key: string): string | undefined {
  const v = env[key];
  return typeof v === "string" ? v : undefined;
}

export function createConfig(env: EnvSource): AdapterConfig {
  return {
    cnbApiSlug: (str(env, "CNB_API_SLUG") ?? DEFAULTS.apiSlug).trim(),
    cnbRegistryUrl: normalizeUrl(str(env, "CNB_NPM_REGISTRY_URL") ?? DEFAULTS.registryUrl),
    registryName: (str(env, "REGISTRY_NAME") ?? DEFAULTS.registryName).trim(),
    registryScope: (str(env, "REGISTRY_SCOPE") ?? DEFAULTS.registryScope).trim(),
    cacheTtlMs: readInt(str(env, "CACHE_TTL_SECONDS"), DEFAULTS.cacheTtlMs / 1000) * 1000,
    searchMaxSize: readInt(str(env, "SEARCH_MAX_SIZE"), DEFAULTS.searchMaxSize),
    catalogConcurrency: readInt(str(env, "CATALOG_CONCURRENCY"), DEFAULTS.catalogConcurrency),
  };
}

function normalizeUrl(input: string): string {
  const url = new URL(input);
  return url.toString().endsWith("/") ? url.toString() : `${url.toString()}/`;
}

function readInt(input: string | undefined, fallback: number): number {
  if (!input) {
    return fallback;
  }

  const value = Number.parseInt(input, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
