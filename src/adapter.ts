import { createConfig } from "./config";
import { fetchAllPackuments, fetchCatalog, fetchPackument } from "./cnb";
import type { AdapterConfig, Packument, PersonLike, SearchResultObject } from "./types";

interface EnvSource {
  [key: string]: string | undefined;
}

export async function handleRequest(request: Request, envSource: EnvSource): Promise<Response> {
  const config = createConfig(envSource);
  const url = new URL(request.url);
  const pathname = trimTrailingSlash(url.pathname) || "/";

  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Only GET and HEAD are supported." }, 405, {
        Allow: "GET, HEAD",
      });
    }

    if (pathname === "/") {
      return json(buildHomePayload(config));
    }

    if (pathname === "/-/ping") {
      return json({ ok: true });
    }

    if (pathname === "/-/all") {
      return json(await fetchAllPackuments(config), 200, cacheHeaders(config));
    }

    if (pathname === "/-/v1/search") {
      return json(await buildSearchPayload(url, config), 200, cacheHeaders(config));
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

function buildHomePayload(config: AdapterConfig) {
  return {
    name: config.registryName,
    scope: config.registryScope,
    upstream: {
      artifactPage: config.cnbArtifactPageUrl,
      npmRegistry: config.cnbRegistryUrl,
    },
    endpoints: {
      search: "/-/v1/search?text=com.gameframex&size=20&from=0",
      all: "/-/all",
      ping: "/-/ping",
      package: `/${config.registryScope}.unity`,
      distTags: `/-/package/${config.registryScope}.unity/dist-tags`,
    },
    note: "This adapter only adds package discovery and packument endpoints. Tarball downloads still go directly to CNB.",
  };
}

async function buildSearchPayload(url: URL, config: AdapterConfig) {
  const text = (url.searchParams.get("text") ?? "").trim().toLowerCase();
  const from = Math.max(0, Number.parseInt(url.searchParams.get("from") ?? "0", 10) || 0);
  const size = Math.min(
    config.searchMaxSize,
    Math.max(1, Number.parseInt(url.searchParams.get("size") ?? "20", 10) || 20),
  );

  const catalog = await fetchCatalog(config);
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
        npm: `${config.cnbArtifactPageUrl}-/registries/${encodeURIComponent(packument.name)}`,
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
