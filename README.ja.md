<div align="center">

![GameFrameX Logo](https://download.alianblank.com/gameframex/gameframex_logo_320.png)

# GameFrameX UPM Registry

[![Version](https://img.shields.io/github/v/release/GameFrameX/gameframex-upm-registry?label=version&color=green)](https://github.com/GameFrameX/gameframex-upm-registry/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**GameFrameX パッケージ向け Unity Package Manager レジストリ API を提供する Cloudflare Worker。**

---

🌐 **言語**: [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | **日本語** | [한국어](README.ko.md)

---

</div>

## プロジェクト概要

[cnb.cool](https://cnb.cool/GameFrameX/npm) にホストされている GameFrameX パッケージ向けに、Unity Package Manager レジストリ API を提供する Cloudflare Worker です。

## なぜ必要か

Unity の Package Manager は「My Registries」にパッケージを表示するために `/-/v1/search` と `/-/all` エンドポイントを必要とします。cnb.cool の npm レジストリはこれらを提供していないため、この Worker がその隙間を埋めます：

- パッケージの発見とプロトコル互換性：Worker が処理
- パッケージファイルのダウンロード：引き続き `npm.cnb.cool` が直接提供

## アーキテクチャ

| エンドポイント | 説明 |
|---|---|
| `GET /` | アダプタ設定とサンプルエンドポイント |
| `GET /-/ping` | ヘルスチェック |
| `GET /-/v1/search?text=...&size=20&from=0` | パッケージ検索 |
| `GET /-/all` | 全パッケージの packument マップ |
| `GET /<package-name>` | 単一パッケージの packument |
| `GET /-/package/<package-name>/dist-tags` | パッケージの dist-tags |

すべての `dist.tarball` URL は `npm.cnb.cool` を指すため、ダウンロードトラフィックは Worker を経由しません。

## クイックスタート

プロジェクトの `Packages/manifest.json` に以下を追加してください：

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

## プロジェクト構成

```text
src/
  adapter.ts   # UPM プロトコルアダプタ
  cache.ts     # インメモリキャッシュ層
  cnb.ts       # CNB レジストリ API クライアント
  config.ts    # 環境設定
  index.ts     # リクエストルーター
  types.ts     # 共有型
```

## 設定

すべての設定は `wrangler.toml` の `[vars]` にあります：

| 変数 | デフォルト | 説明 |
|---|---|---|
| `CNB_ARTIFACT_PAGE_URL` | — | パッケージ一覧取得用 CNB アーティファクトページ URL |
| `CNB_NPM_REGISTRY_URL` | — | packument データ取得用 CNB npm レジストリ URL |
| `REGISTRY_NAME` | `GameFrameX UPM Registry` | Unity での表示名 |
| `REGISTRY_SCOPE` | `com.gameframex` | パッケージスコープフィルタ |
| `CACHE_TTL_SECONDS` | `300` | キャッシュ TTL（秒） |
| `SEARCH_MAX_SIZE` | `50` | 検索結果の最大数 |
| `CATALOG_CONCURRENCY` | `6` | 並行取得の同時実行数 |

## デプロイ

`main` ブランチへの push で GitHub Actions による自動デプロイが実行されます。

手動デプロイには Node.js 22+ が必要です：

```bash
npm install
npx wrangler login
npx wrangler deploy
```

## ローカル開発

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

## ライセンス

MIT
