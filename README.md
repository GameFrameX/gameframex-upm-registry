# GameFrameX UPM Registry

Cloudflare Worker that provides Unity Package Manager registry APIs for GameFrameX packages hosted on [cnb.cool](https://cnb.cool/GameFrameX/npm).

## Why

Unity's Package Manager requires `/-/v1/search` and `/-/all` endpoints to display packages in "My Registries". The cnb.cool npm registry doesn't provide these, so this Worker fills the gap:

- Package discovery and protocol compatibility: handled by the Worker
- Package file download: still served directly by `npm.cnb.cool`

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | Adapter config and example endpoints |
| `GET /-/ping` | Health check |
| `GET /-/v1/search?text=...&size=20&from=0` | Search packages |
| `GET /-/all` | All packages packument map |
| `GET /<package-name>` | Single package packument |
| `GET /-/package/<package-name>/dist-tags` | Package dist-tags |

All `dist.tarball` URLs point to `npm.cnb.cool`, so download traffic never goes through the Worker.

## Unity Setup

Add to your project's `Packages/manifest.json`:

```json
{
  "scopedRegistries": [
    {
      "name": "GameFrameX",
      "url": "https://gameframex-upm-registry.wangfj11.workers.dev",
      "scopes": [
        "com.gameframex"
      ]
    }
  ],
  "dependencies": {
    "com.gameframex.unity": "1.10.1"
  }
}
```

## Project Structure

```text
src/
  adapter.ts   # UPM protocol adapter
  cache.ts     # In-memory cache layer
  cnb.ts       # CNB registry API client
  config.ts    # Environment config
  index.ts     # Request router
  types.ts     # Shared types
```

## Configuration

All config is in `wrangler.toml` `[vars]`:

| Variable | Default | Description |
|---|---|---|
| `CNB_ARTIFACT_PAGE_URL` | — | CNB artifact page URL for package listing |
| `CNB_NPM_REGISTRY_URL` | — | CNB npm registry URL for packument data |
| `REGISTRY_NAME` | `GameFrameX UPM Registry` | Display name in Unity |
| `REGISTRY_SCOPE` | `com.gameframex` | Package scope filter |
| `CACHE_TTL_SECONDS` | `300` | Cache TTL in seconds |
| `SEARCH_MAX_SIZE` | `50` | Max search results |
| `CATALOG_CONCURRENCY` | `6` | Parallel fetch concurrency |

## Deployment

Push to `main` triggers automatic deployment via GitHub Actions.

Manual deployment requires Node.js 22+:

```bash
npm install
npx wrangler login
npx wrangler deploy
```

## Local Development

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

## Limitations

- Designed for public cnb.cool repos, no private token passthrough.
- Search is name-based matching, no full-text scoring.
- Download availability depends on cnb.cool tarball accessibility.

## License

MIT
