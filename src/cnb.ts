import { getOrSet } from "./cache";
import type { AdapterConfig, CatalogEntry, Packument } from "./types";

export async function fetchCatalogFromApi(
  config: AdapterConfig,
  apiToken: string,
): Promise<CatalogEntry[]> {
  const allEntries: CatalogEntry[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `https://api.cnb.cool/${config.cnbApiSlug}/-/packages?type=npm&page=${page}&page_size=${pageSize}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.cnb.api+json",
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`CNB API error: ${response.status} ${response.statusText}`);
    }

    const items = (await response.json()) as Array<{
      name: string;
      description: string;
      package_type: string;
    }>;

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      if (item.name.startsWith(config.registryScope)) {
        allEntries.push({
          name: item.name,
          description: item.description ?? "",
        });
      }
    }

    if (items.length < pageSize) {
      break;
    }

    page += 1;
  }

  allEntries.sort((a, b) => a.name.localeCompare(b.name));
  return allEntries;
}

export async function fetchPackument(config: AdapterConfig, packageName: string): Promise<Packument> {
  return getOrSet(`packument:${packageName}`, config.cacheTtlMs, async () => {
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
