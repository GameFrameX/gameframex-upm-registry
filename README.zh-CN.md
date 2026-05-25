<div align="center">

![GameFrameX Logo](https://download.alianblank.com/gameframex/gameframex_logo_320.png)

# GameFrameX UPM Registry

[![Version](https://img.shields.io/github/v/release/GameFrameX/gameframex-upm-registry?label=version&color=green)](https://github.com/GameFrameX/gameframex-upm-registry/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**为 GameFrameX 包提供 Unity Package Manager 注册表 API 的 Cloudflare Worker。**

---

🌐 **语言**: [English](README.md) | **简体中文** | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

</div>

## 项目简介

Cloudflare Worker，为托管在 [cnb.cool](https://cnb.cool/GameFrameX/npm) 上的 GameFrameX 包提供 Unity Package Manager 注册表 API。

## 为什么需要它

Unity 的 Package Manager 需要 `/-/v1/search` 和 `/-/all` 接口才能在"My Registries"中显示包。cnb.cool 的 npm 注册表不提供这些接口，因此这个 Worker 用来补齐：

- 包发现和协议兼容：由 Worker 处理
- 包文件下载：仍由 `npm.cnb.cool` 直接提供

## 架构概览

| 接口 | 说明 |
|---|---|
| `GET /` | 适配器配置和示例接口 |
| `GET /-/ping` | 健康检查 |
| `GET /-/v1/search?text=...&size=20&from=0` | 搜索包 |
| `GET /-/all` | 全部包的 packument 映射 |
| `GET /<package-name>` | 单包 packument |
| `GET /-/package/<package-name>/dist-tags` | 包 dist-tags |

所有 `dist.tarball` URL 指向 `npm.cnb.cool`，下载流量不经过 Worker。

## 快速开始

编辑 Unity 项目的 `Packages/manifest.json`，添加 `scopedRegistries` 部分：

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

> `scopes` 控制哪些包通过此注册表解析。只有以 `com.gameframex` 开头的包才会从这个注册表获取。如果使用了更多 GameFrameX 包，可以添加更多 scope。

## 项目结构

```text
src/
  adapter.ts   # UPM 协议适配器
  cache.ts     # 内存缓存层
  cnb.ts       # CNB 注册表 API 客户端
  config.ts    # 环境配置
  index.ts     # 请求路由
  types.ts     # 共享类型
```

## 配置

所有配置在 `wrangler.toml` 的 `[vars]` 中：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `CNB_ARTIFACT_PAGE_URL` | — | CNB 制品页面 URL，用于获取包列表 |
| `CNB_NPM_REGISTRY_URL` | — | CNB npm 注册表 URL，用于获取包元数据 |
| `REGISTRY_NAME` | `GameFrameX UPM Registry` | Unity 中显示的名称 |
| `REGISTRY_SCOPE` | `com.gameframex` | 包范围过滤器 |
| `CACHE_TTL_SECONDS` | `300` | 缓存过期时间（秒） |
| `SEARCH_MAX_SIZE` | `50` | 最大搜索结果数 |
| `CATALOG_CONCURRENCY` | `6` | 并行获取并发数 |

## 部署

推送到 `main` 分支会通过 GitHub Actions 自动部署。

手动部署需要 Node.js 22+：

```bash
npm install
npx wrangler login
npx wrangler deploy
```

## 本地开发

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

## 开源协议

MIT
