import type { CmsData } from "./types";

let publicCmsCache: { data: CmsData; at: number } | null = null;

export const PUBLIC_CMS_CACHE_MS = 30_000;

export function readPublicCmsCache(now = Date.now()): CmsData | null {
  if (publicCmsCache && now - publicCmsCache.at < PUBLIC_CMS_CACHE_MS) {
    return publicCmsCache.data;
  }
  return null;
}

export function writePublicCmsCache(data: CmsData, now = Date.now()): void {
  publicCmsCache = { data, at: now };
}

export function invalidatePublicCmsCache(): void {
  publicCmsCache = null;
}
