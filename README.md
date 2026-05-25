<div align="center">

![GameFrameX Logo](https://download.alianblank.com/gameframex/gameframex_logo_320.png)

# GameFrameX UPM Registry

[![Version](https://img.shields.io/github/v/release/GameFrameX/gameframex-upm-registry?label=version&color=green)](https://github.com/GameFrameX/gameframex-upm-registry/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Cloudflare Worker that provides Unity Package Manager registry APIs for GameFrameX packages.**

---

🌐 **Language**: **English** | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

</div>

## Project Overview

Cloudflare Worker that provides Unity Package Manager registry APIs for GameFrameX packages hosted on [cnb.cool](https://cnb.cool/GameFrameX/npm).

## Why

Unity's Package Manager requires `/-/v1/search` and `/-/all` endpoints to display packages in "My Registries". The cnb.cool npm registry doesn't provide these, so this Worker fills the gap:

- Package discovery and protocol compatibility: handled by the Worker
- Package file download: still served directly by `npm.cnb.cool`

## Architecture

| Endpoint | Description |
|---|---|
| `GET /` | Adapter config and example endpoints |
| `GET /-/ping` | Health check |
| `GET /-/v1/search?text=...&size=20&from=0` | Search packages |
| `GET /-/all` | All packages packument map |
| `GET /<package-name>` | Single package packument |
| `GET /-/package/<package-name>/dist-tags` | Package dist-tags |

All `dist.tarball` URLs point to `npm.cnb.cool`, so download traffic never goes through the Worker.

## Quick Start

Edit your Unity project's `Packages/manifest.json` and add the `scopedRegistries` section:

```json
{
  "scopedRegistries": [
    {
      "name": "GameFrameX",
      "url": "https://gameframex.upm.alianblank.uk",
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

> `scopes` controls which packages are resolved through this registry. Only packages whose names start with `com.gameframex` will be fetched from it. Add more scopes if you use additional GameFrameX packages.

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

## License

MIT
