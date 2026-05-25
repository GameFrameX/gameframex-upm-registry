import type { AdapterConfig } from "./types";

interface EnvSource {
  [key: string]: string | undefined;
}

const DEFAULTS = {
  artifactPageUrl: "https://cnb.cool/GameFrameX/npm",
  registryUrl: "https://npm.cnb.cool/GameFrameX/npm/-/packages/",
  registryName: "GameFrameX UPM Adapter",
  registryScope: "com.gameframex",
  cacheTtlMs: 5 * 60 * 1000,
  searchMaxSize: 50,
  catalogConcurrency: 6,
} as const;

export function createConfig(env: EnvSource): AdapterConfig {
  return {
    cnbArtifactPageUrl: normalizeUrl(env.CNB_ARTIFACT_PAGE_URL ?? DEFAULTS.artifactPageUrl),
    cnbRegistryUrl: normalizeUrl(env.CNB_NPM_REGISTRY_URL ?? DEFAULTS.registryUrl),
    registryName: (env.REGISTRY_NAME ?? DEFAULTS.registryName).trim(),
    registryScope: (env.REGISTRY_SCOPE ?? DEFAULTS.registryScope).trim(),
    cacheTtlMs: readInt(env.CACHE_TTL_SECONDS, DEFAULTS.cacheTtlMs / 1000) * 1000,
    searchMaxSize: readInt(env.SEARCH_MAX_SIZE, DEFAULTS.searchMaxSize),
    catalogConcurrency: readInt(env.CATALOG_CONCURRENCY, DEFAULTS.catalogConcurrency),
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
