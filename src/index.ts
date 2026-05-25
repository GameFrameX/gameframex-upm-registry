import { handleRequest } from "./adapter";

export interface Env {
  [key: string]: string | undefined;
  CNB_ARTIFACT_PAGE_URL?: string;
  CNB_NPM_REGISTRY_URL?: string;
  REGISTRY_NAME?: string;
  REGISTRY_SCOPE?: string;
  CACHE_TTL_SECONDS?: string;
  SEARCH_MAX_SIZE?: string;
  CATALOG_CONCURRENCY?: string;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
