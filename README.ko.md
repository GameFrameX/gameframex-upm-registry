<div align="center">

![GameFrameX Logo](https://download.alianblank.com/gameframex/gameframex_logo_320.png)

# GameFrameX UPM Registry

[![Version](https://img.shields.io/github/v/release/GameFrameX/gameframex-upm-registry?label=version&color=green)](https://github.com/GameFrameX/gameframex-upm-registry/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**GameFrameX 패키지를 위한 Unity Package Manager 레지스트리 API를 제공하는 Cloudflare Worker.**

---

🌐 **언어**: [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | **한국어**

---

</div>

## 프로젝트 개요

[cnb.cool](https://cnb.cool/GameFrameX/npm)에 호스팅된 GameFrameX 패키지를 위한 Unity Package Manager 레지스트리 API를 제공하는 Cloudflare Worker입니다.

## 왜 필요한가

Unity의 Package Manager는 "My Registries"에 패키지를 표시하려면 `/-/v1/search`와 `/-/all` 엔드포인트가 필요합니다. cnb.cool의 npm 레지스트리는 이를 제공하지 않으므로, 이 Worker가 그 간극을 메웁니다:

- 패키지 검색 및 프로토콜 호환성: Worker가 처리
- 패키지 파일 다운로드: 여전히 `npm.cnb.cool`에서 직접 제공

## 아키텍처

| 엔드포인트 | 설명 |
|---|---|
| `GET /` | 어댑터 설정 및 예제 엔드포인트 |
| `GET /-/ping` | 상태 확인 |
| `GET /-/v1/search?text=...&size=20&from=0` | 패키지 검색 |
| `GET /-/all` | 전체 패키지 packument 맵 |
| `GET /<package-name>` | 단일 패키지 packument |
| `GET /-/package/<package-name>/dist-tags` | 패키지 dist-tags |

모든 `dist.tarball` URL은 `npm.cnb.cool`을 가리키므로, 다운로드 트래픽은 Worker를 거치지 않습니다.

## 빠른 시작

Unity 프로젝트의 `Packages/manifest.json`을 편집하여 `scopedRegistries` 섹션을 추가하세요:

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

> `scopes`는 이 레지스트리를 통해 어떤 패키지를 해석할지 제어합니다. `com.gameframex`로 시작하는 패키지만 이 레지스트리에서 가져옵니다. 추가 GameFrameX 패키지를 사용하는 경우 scope를 추가하세요.

## 프로젝트 구조

```text
src/
  adapter.ts   # UPM 프로토콜 어댑터
  cache.ts     # 인메모리 캐시 레이어
  cnb.ts       # CNB 레지스트리 API 클라이언트
  config.ts    # 환경 설정
  index.ts     # 요청 라우터
  types.ts     # 공유 타입
```

## 설정

모든 설정은 `wrangler.toml`의 `[vars]`에 있습니다:

| 변수 | 기본값 | 설명 |
|---|---|---|
| `CNB_ARTIFACT_PAGE_URL` | — | 패키지 목록 조회용 CNB 아티팩트 페이지 URL |
| `CNB_NPM_REGISTRY_URL` | — | packument 데이터 조회용 CNB npm 레지스트리 URL |
| `REGISTRY_NAME` | `GameFrameX UPM Registry` | Unity에 표시되는 이름 |
| `REGISTRY_SCOPE` | `com.gameframex` | 패키지 스코프 필터 |
| `CACHE_TTL_SECONDS` | `300` | 캐시 TTL (초) |
| `SEARCH_MAX_SIZE` | `50` | 최대 검색 결과 수 |
| `CATALOG_CONCURRENCY` | `6` | 병렬 가져오기 동시성 |

## 배포

`main` 브랜치에 push하면 GitHub Actions를 통해 자동 배포됩니다.

수동 배포에는 Node.js 22+이 필요합니다:

```bash
npm install
npx wrangler login
npx wrangler deploy
```

## 로컬 개발

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

## 라이선스

MIT
