import type { CmsPageSection, CmsSectionsVisibility, CmsSettings } from "./types";

export const DEFAULT_SECTION_ORDER: CmsPageSection[] = [
  "hero",
  "products",
  "about",
  "howItWorks",
  "features",
  "gallery",
  "testimonials",
  "faq",
  "contact",
];

export const SECTION_LABELS: Record<CmsPageSection, string> = {
  hero: "Hero",
  products: "Cardápio / Produtos",
  about: "Sobre",
  howItWorks: "Como funciona",
  features: "Diferenciais",
  gallery: "Galeria",
  testimonials: "Depoimentos",
  faq: "FAQ",
  contact: "Contato",
};

export const NAV_SECTION_META: Partial<
  Record<CmsPageSection, { href: string; label: string }>
> = {
  about: { href: "sobre", label: "Sobre" },
  products: { href: "produtos", label: "Cardápio" },
  howItWorks: { href: "como-funciona", label: "Como funciona" },
  gallery: { href: "galeria", label: "Galeria" },
  contact: { href: "contato", label: "Contato" },
};

export function normalizeSectionOrder(order?: string[] | null): CmsPageSection[] {
  const known = new Set<CmsPageSection>(DEFAULT_SECTION_ORDER);
  const next: CmsPageSection[] = [];
  const seen = new Set<CmsPageSection>();

  for (const key of order || []) {
    if (known.has(key as CmsPageSection) && !seen.has(key as CmsPageSection)) {
      const typed = key as CmsPageSection;
      next.push(typed);
      seen.add(typed);
    }
  }

  for (const key of DEFAULT_SECTION_ORDER) {
    if (!seen.has(key)) next.push(key);
  }

  return next;
}

export function withNormalizedSettings(settings: CmsSettings): CmsSettings {
  return {
    ...settings,
    sectionOrder: normalizeSectionOrder(settings.sectionOrder),
  };
}

export function isSectionVisible(
  sections: CmsSectionsVisibility,
  key: CmsPageSection,
): boolean {
  return Boolean(sections[key]);
}
