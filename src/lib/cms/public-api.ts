import { createServerFn } from "@tanstack/react-start";

import {
  PUBLIC_CMS_CACHE_MS,
  readPublicCmsCache,
  writePublicCmsCache,
} from "./public-cache";
import type { CmsData } from "./types";

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function toPublicCms(data: CmsData): CmsData {
  return {
    ...data,
    categories: sortByOrder(data.categories.filter((c) => c.visible)),
    products: sortByOrder(data.products.filter((p) => p.visible && p.available !== false)),
    gallery: sortByOrder(data.gallery.filter((g) => g.visible)),
    faq: sortByOrder(data.faq.filter((f) => f.visible)),
    testimonials: sortByOrder(data.testimonials.filter((t) => t.visible)),
    steps: sortByOrder(data.steps.filter((s) => s.visible)),
    features: sortByOrder(data.features.filter((f) => f.visible)),
    coupons: [],
    menuLinks: sortByOrder((data.menuLinks ?? []).filter((link) => link.active)),
  };
}

/** Server function segura para o site publico (sem imports de Node no cliente). */
export const getPublicCms = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  const cached = readPublicCmsCache(now);
  if (cached) return cached;

  const { readCms } = await import("./store");
  const data = toPublicCms(await readCms());
  writePublicCmsCache(data, now);
  return data;
});

export { PUBLIC_CMS_CACHE_MS };
