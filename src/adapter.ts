import { fetchPackument } from "./cnb";
import type { AdapterConfig, CatalogEntry, Packument, PersonLike, SearchResultObject } from "./types";

export async function handleRequest(
  request: Request,
  config: AdapterConfig,
  catalog: CatalogEntry[],
  refreshCatalogFn?: () => Promise<void>,
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = trimTrailingSlash(url.pathname) || "/";

  try {
    if (request.method === "POST") {
      if (pathname === "/-/refresh") {
        if (!refreshCatalogFn) {
          return json({ error: "Refresh not available" }, 403);
        }
        await refreshCatalogFn();
        return json({ ok: true, message: "Catalog refreshed" });
      }
      return json({ error: "POST not supported." }, 405);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Only GET, HEAD and POST are supported." }, 405, {
        Allow: "GET, HEAD, POST",
      });
    }

    if (pathname === "/") {
      return json(buildHomePayload(config, catalog));
    }

    if (pathname === "/-/ping") {
      return json({ ok: true });
    }

    if (pathname === "/-/all") {
      return json(await fetchAllPackuments(config, catalog), 200, cacheHeaders(config));
    }

    if (pathname === "/-/v1/search") {
      return json(await buildSearchPayload(url, config, catalog), 200, cacheHeaders(config));
    }

    const distTagMatch = pathname.match(/^\/-\/package\/([^/]+)\/dist-tags$/);
    if (distTagMatch) {
      const packageName = decodeURIComponent(distTagMatch[1]);
      const packument = await fetchPackument(config, packageName);
      return json(packument["dist-tags"] ?? {}, 200, cacheHeaders(config));
    }

    const packumentMatch = pathname.match(/^\/([^/]+)$/);
    if (packumentMatch) {
      const packageName = decodeURIComponent(packumentMatch[1]);
      const packument = await fetchPackument(config, packageName);
      return json(packument, 200, cacheHeaders(config));
    }

    return json({ error: `Unsupported path: ${pathname}` }, 404);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
}

function buildHomePayload(config: AdapterConfig, catalog: CatalogEntry[]) {
  return {
    name: config.registryName,
    scope: config.registryScope,
    packageCount: catalog.length,
    endpoints: {
      search: "/-/v1/search?text=com.gameframex&size=20&from=0",
      all: "/-/all",
      ping: "/-/ping",
      package: `/${config.registryScope}.unity`,
      distTags: `/-/package/${config.registryScope}.unity/dist-tags`,
    },
    note: "Package catalog refreshed every 6 hours via CNB API. Tarball downloads go directly to CNB.",
  };
}

async function fetchAllPackuments(config: AdapterConfig, catalog: CatalogEntry[]): Promise<Record<string, Packument>> {
  const results = await mapWithConcurrency(catalog, config.catalogConcurrency, async (entry) => {
    const packument = await fetchPackument(config, entry.name);
    return [entry.name, packument] as const;
  });

  return Object.fromEntries(results);
}

async function buildSearchPayload(url: URL, config: AdapterConfig, catalog: CatalogEntry[]) {
  const text = (url.searchParams.get("text") ?? "").trim().toLowerCase();
  const from = Math.max(0, Number.parseInt(url.searchParams.get("from") ?? "0", 10) || 0);
  const size = Math.min(
    config.searchMaxSize,
    Math.max(1, Number.parseInt(url.searchParams.get("size") ?? "20", 10) || 20),
  );

  const filtered = catalog.filter((entry) => matchesSearch(entry.name, text));
  const page = filtered.slice(from, from + size);

  const objects = await Promise.all(
    page.map(async (entry, index) => {
      const packument = await fetchPackument(config, entry.name);
      return buildSearchObject(packument, config, from + index);
    }),
  );

  return {
    objects,
    total: filtered.length,
    time: new Date().toISOString(),
  };
}

function buildSearchObject(packument: Packument, config: AdapterConfig, position: number): SearchResultObject {
  const latestVersion = packument["dist-tags"]?.latest ?? Object.keys(packument.versions).sort().at(-1) ?? "0.0.0";
  const manifest = packument.versions[latestVersion] ?? {};
  const date = packument.time?.modified ?? packument.time?.[latestVersion];

  return {
    package: {
      name: packument.name,
      version: latestVersion,
      description: manifest.description ?? packument.description ?? "",
      keywords: manifest.keywords ?? [],
      date,
      publisher: normalizePerson(manifest.author),
      links: compactStringRecord({
        npm: `https://cnb.cool/${config.cnbApiSlug}/-/registries/${encodeURIComponent(packument.name)}`,
        repository: normalizeRepositoryUrl(manifest.repository?.url),
        homepage: manifest.homepage,
        bugs: manifest.bugs?.url,
      }),
    },
    score: {
      final: 1,
      detail: {
        quality: 1,
        popularity: 1,
        maintenance: 1,
      },
    },
    searchScore: Math.max(1, 100000 - position),
  };
}

function normalizePerson(person: PersonLike | string | undefined): PersonLike | undefined {
  if (!person) {
    return undefined;
  }

  if (typeof person === "string") {
    return { name: person };
  }

  return compactPerson(person);
}

function normalizeRepositoryUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  return url.startsWith("git+") ? url.slice(4) : url;
}

function compactStringRecord(input: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => typeof value === "string")) as Record<string, string>;
}

function compactPerson(person: PersonLike): PersonLike {
  return {
    name: person.name,
    email: person.email,
    url: person.url,
  };
}

function matchesSearch(name: string, text: string): boolean {
  if (!text) {
    return true;
  }
  return name.toLowerCase().includes(text);
}

function trimTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function cacheHeaders(config: AdapterConfig): HeadersInit {
  return {
    "cache-control": `public, max-age=${Math.floor(config.cacheTtlMs / 1000)}`,
  };
}

function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
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
