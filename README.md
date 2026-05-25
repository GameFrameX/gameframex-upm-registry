# GameFrameX UPM Cloudflare Worker

这是一个独立的 Cloudflare Workers 项目，用来给 Unity Package Manager 补齐 `search`、`all` 和单包元数据接口。

它的目标很明确：
- Unity 的包发现和协议兼容由 Worker 处理。
- 真实的包文件下载仍然走 `cnb.cool`。
- Unity 项目只需要把 `scopedRegistries.url` 指向 Worker 域名。

## 适用场景

- 你已经把 Unity 包发布到了 `cnb.cool` 的 npm 仓库。
- `manifest.json` 中已声明的包可以安装。
- Unity `Package Manager > My Registries` 看不到未下载包。
- 你希望用一个很轻的前置层补齐协议，而不是迁走现有仓库。

## 工作方式

- Worker 从 `https://cnb.cool/GameFrameX/npm` 读取包目录。
- Worker 从 `https://npm.cnb.cool/GameFrameX/npm/-/packages/` 读取单包 packument。
- Worker 暴露 Unity 需要的接口：
  - `/-/v1/search`
  - `/-/all`
  - `/<package-name>`
  - `/-/package/<package-name>/dist-tags`
- Worker 返回的 `dist.tarball` 仍然是 `npm.cnb.cool` 地址，所以下载流量不会经过 Worker。

## 目录结构

```text
.
├── src/
│   ├── adapter.ts
│   ├── cache.ts
│   ├── cnb.ts
│   ├── config.ts
│   ├── index.ts
│   └── types.ts
├── .dev.vars.example
├── .gitignore
├── package.json
├── tsconfig.json
├── wrangler.toml
└── README.md
```

## 环境变量

- `CNB_ARTIFACT_PAGE_URL`
  - 例如：`https://cnb.cool/GameFrameX/npm`
- `CNB_NPM_REGISTRY_URL`
  - 例如：`https://npm.cnb.cool/GameFrameX/npm/-/packages/`
- `REGISTRY_NAME`
  - 例如：`GameFrameX UPM Registry`
- `REGISTRY_SCOPE`
  - 例如：`com.gameframex`
- `CACHE_TTL_SECONDS`
  - 默认 `300`
- `SEARCH_MAX_SIZE`
  - 默认 `50`
- `CATALOG_CONCURRENCY`
  - 默认 `6`

## 本地开发

```bash
cd gameframex-upm-cloudflare-worker
npm install
npm run typecheck
```

如果需要本地启动 Worker：

```bash
cp .dev.vars.example .dev.vars
npm run dev
```

默认会通过 `wrangler.toml` 和 `.dev.vars` 启动本地服务。

## 部署到 Cloudflare Workers

1. 安装依赖：

```bash
npm install
```

2. 登录 Cloudflare：

```bash
npx wrangler login
```

3. 如有需要，修改 `wrangler.toml` 中的变量。

4. 发布：

```bash
npm run deploy
```

5. 发布完成后，你会得到一个 Worker 域名，例如：

```text
https://gameframex-upm-cloudflare-worker.<subdomain>.workers.dev
```

## 自定义域名

如果你要长期给 Unity 使用，建议绑定一个固定域名，例如：

```text
https://upm.gameframex.xxx
```

绑定完成后，Unity 里就只需要配置这个域名，不需要关心底层 `cnb` 地址。

## Unity 接入

把 Unity 项目的 `Packages/manifest.json` 改成指向 Worker 域名：

```json
{
  "scopedRegistries": [
    {
      "name": "GameFrameX",
      "url": "https://upm.gameframex.xxx",
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

## 可用接口

- `GET /`
  - 返回当前适配器配置和示例接口
- `GET /-/ping`
  - 健康检查
- `GET /-/v1/search?text=com.gameframex&size=20&from=0`
  - 返回 Unity 可用的搜索结果
- `GET /-/all`
  - 返回全部包的 packument 映射
- `GET /com.gameframex.unity`
  - 返回单包 packument
- `GET /-/package/com.gameframex.unity/dist-tags`
  - 返回单包 dist-tags

## 验证步骤

1. 访问 Worker 根路径，确认能看到 JSON。
2. 访问 `/-/v1/search?text=com.gameframex`，确认能返回包列表。
3. 访问 `/com.gameframex.unity`，确认 `dist.tarball` 指向 `npm.cnb.cool`。
4. 把 Unity 的 `scopedRegistries.url` 改到 Worker 域名。
5. 打开 `Package Manager > My Registries`，确认未安装包可以显示。

## 当前限制

- 当前版本按公开 `cnb` 仓库设计，不带私有 token 透传。
- 搜索基于包名匹配，不做全文搜索评分。
- 真实下载仍依赖 `cnb` 的 tarball 可访问性。

## 后续扩展

- 支持私有 `cnb` 仓库 token。
- 支持通过 Worker Secret 注入鉴权头。
- 支持包目录缓存预热。
- 支持更细的搜索排序策略。
