import { getOrSet } from "./cache";
import type { AdapterConfig, CatalogEntry, Packument } from "./types";

const PACKAGE_LINK_PATTERN = /\/\-\/registries\/([A-Za-z0-9._-]+)/g;

export async function fetchCatalog(config: AdapterConfig): Promise<CatalogEntry[]> {
  return getOrSet(`catalog:${config.cnbArtifactPageUrl}`, config.cacheTtlMs, async () => {
    const response = await fetch(config.cnbArtifactPageUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CNB catalog page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const seen = new Set<string>();
    const entries: CatalogEntry[] = [];

    for (const match of html.matchAll(PACKAGE_LINK_PATTERN)) {
      const name = decodeURIComponent(match[1]);
      if (seen.has(name)) {
        continue;
      }
      seen.add(name);
      entries.push({
        name,
        packagePageUrl: new URL(`-/registries/${encodeURIComponent(name)}`, config.cnbArtifactPageUrl).toString(),
      });
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    return entries.filter((entry) => entry.name.startsWith(config.registryScope));
  });
}

export async function fetchPackument(config: AdapterConfig, packageName: string): Promise<Packument> {
  return getOrSet(`packument:${config.cnbRegistryUrl}:${packageName}`, config.cacheTtlMs, async () => {
    const packageUrl = new URL(encodeURIComponent(packageName), config.cnbRegistryUrl).toString();
    const response = await fetch(packageUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      throw new Response(JSON.stringify({ error: `Package not found: ${packageName}` }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch packument for ${packageName}: ${response.status} ${response.statusText}`);
    }

    const packument = (await response.json()) as Packument;
    return normalizePackument(packument, config);
  });
}

export async function fetchAllPackuments(config: AdapterConfig): Promise<Record<string, Packument>> {
  const catalog = await fetchCatalog(config);
  const results = await mapWithConcurrency(catalog, config.catalogConcurrency, async (entry) => {
    const packument = await fetchPackument(config, entry.name);
    return [entry.name, packument] as const;
  });

  return Object.fromEntries(results);
}

function normalizePackument(packument: Packument, config: AdapterConfig): Packument {
  for (const version of Object.values(packument.versions)) {
    const tarball = version.dist?.tarball;
    if (tarball) {
      version.dist = {
        ...version.dist,
        tarball: new URL(tarball, config.cnbRegistryUrl).toString(),
      };
    }
  }

  return packument;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
