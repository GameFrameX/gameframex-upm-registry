export interface AdapterConfig {
  cnbArtifactPageUrl: string;
  cnbRegistryUrl: string;
  registryName: string;
  registryScope: string;
  cacheTtlMs: number;
  searchMaxSize: number;
  catalogConcurrency: number;
}

export interface CatalogEntry {
  name: string;
  packagePageUrl: string;
}

export interface PersonLike {
  name?: string;
  email?: string;
  url?: string;
}

export interface PackageVersion {
  name?: string;
  version?: string;
  description?: string;
  keywords?: string[];
  author?: PersonLike | string;
  repository?: {
    type?: string;
    url?: string;
  };
  homepage?: string;
  bugs?: {
    url?: string;
  };
  dist?: {
    tarball?: string;
    integrity?: string;
    shasum?: string;
  };
  [key: string]: unknown;
}

export interface Packument {
  name: string;
  description?: string;
  readme?: string;
  access?: string;
  time?: Record<string, string>;
  versions: Record<string, PackageVersion>;
  'dist-tags'?: Record<string, string>;
  [key: string]: unknown;
}

export interface SearchResultObject {
  package: {
    name: string;
    version: string;
    description: string;
    keywords: string[];
    date?: string;
    links: Record<string, string>;
    publisher?: PersonLike;
  };
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
  searchScore: number;
}
