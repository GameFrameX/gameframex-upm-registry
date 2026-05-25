import { createConfig } from "./config";
import { fetchCatalogFromApi, fetchPackument } from "./cnb";
import { handleRequest } from "./adapter";
import type { CatalogEntry } from "./types";

const KV_CATALOG_KEY = "catalog";

export interface Env {
  [key: string]: unknown;
  CNB_NPM_TOKEN?: string;
  CNB_ARTIFACT_PAGE_URL?: string;
  CNB_NPM_REGISTRY_URL?: string;
  REGISTRY_NAME?: string;
  REGISTRY_SCOPE?: string;
  CACHE_TTL_SECONDS?: string;
  SEARCH_MAX_SIZE?: string;
  CATALOG_CONCURRENCY?: string;
  CATALOG_KV?: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const config = createConfig(env);
    const catalog = await readCatalog(env);
    return handleRequest(request, config, catalog);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(refreshCatalog(env));
  },
};

async function readCatalog(env: Env): Promise<CatalogEntry[]> {
  if (!env.CATALOG_KV) {
    return [];
  }

  const raw = await env.CATALOG_KV.get(KV_CATALOG_KEY, "text");
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as CatalogEntry[];
  } catch {
    return [];
  }
}

async function refreshCatalog(env: Env): Promise<void> {
  const config = createConfig(env);
  const apiToken = env.CNB_NPM_TOKEN;

  if (!apiToken || !env.CATALOG_KV) {
    return;
  }

  const catalog = await fetchCatalogFromApi(config, apiToken);
  await env.CATALOG_KV.put(KV_CATALOG_KEY, JSON.stringify(catalog));
}
