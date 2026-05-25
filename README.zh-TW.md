<div align="center">

![GameFrameX Logo](https://download.alianblank.com/gameframex/gameframex_logo_320.png)

# GameFrameX UPM Registry

[![Version](https://img.shields.io/github/v/release/GameFrameX/gameframex-upm-registry?label=version&color=green)](https://github.com/GameFrameX/gameframex-upm-registry/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**為 GameFrameX 套件提供 Unity Package Manager 註冊表 API 的 Cloudflare Worker。**

---

🌐 **語言**: [English](README.md) | [简体中文](README.zh-CN.md) | **繁體中文** | [日本語](README.ja.md) | [한국어](README.ko.md)

---

</div>

## 項目簡介

Cloudflare Worker，為託管在 [cnb.cool](https://cnb.cool/GameFrameX/npm) 上的 GameFrameX 套件提供 Unity Package Manager 註冊表 API。

## 為什麼需要它

Unity 的 Package Manager 需要 `/-/v1/search` 和 `/-/all` 接口才能在"My Registries"中顯示套件。cnb.cool 的 npm 註冊表不提供這些接口，因此這個 Worker 用來補齊：

- 套件發現和協議相容：由 Worker 處理
- 套件檔案下載：仍由 `npm.cnb.cool` 直接提供

## 架構概覽

| 接口 | 說明 |
|---|---|
| `GET /` | 適配器配置和範例接口 |
| `GET /-/ping` | 健康檢查 |
| `GET /-/v1/search?text=...&size=20&from=0` | 搜尋套件 |
| `GET /-/all` | 全部套件的 packument 映射 |
| `GET /<package-name>` | 單套件 packument |
| `GET /-/package/<package-name>/dist-tags` | 套件 dist-tags |

所有 `dist.tarball` URL 指向 `npm.cnb.cool`，下載流量不經過 Worker。

## 快速開始

將以下內容添加到專案的 `Packages/manifest.json`：

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

## 專案結構

```text
src/
  adapter.ts   # UPM 協議適配器
  cache.ts     # 記憶體快取層
  cnb.ts       # CNB 註冊表 API 客戶端
  config.ts    # 環境配置
  index.ts     # 請求路由
  types.ts     # 共享類型
```

## 配置

所有配置在 `wrangler.toml` 的 `[vars]` 中：

| 變數 | 預設值 | 說明 |
|---|---|---|
| `CNB_ARTIFACT_PAGE_URL` | — | CNB 製品頁面 URL，用於取得套件列表 |
| `CNB_NPM_REGISTRY_URL` | — | CNB npm 註冊表 URL，用於取得套件元資料 |
| `REGISTRY_NAME` | `GameFrameX UPM Registry` | Unity 中顯示的名稱 |
| `REGISTRY_SCOPE` | `com.gameframex` | 套件範圍過濾器 |
| `CACHE_TTL_SECONDS` | `300` | 快取過期時間（秒） |
| `SEARCH_MAX_SIZE` | `50` | 最大搜尋結果數 |
| `CATALOG_CONCURRENCY` | `6` | 平行取得並行數 |

## 部署

推送到 `main` 分支會透過 GitHub Actions 自動部署。

手動部署需要 Node.js 22+：

```bash
npm install
npx wrangler login
npx wrangler deploy
```

## 本地開發

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

## 開源協議

MIT
