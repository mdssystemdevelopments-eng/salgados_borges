import type { CmsProduct, CmsProductGramOption, CmsProductGramVariation } from "./types";

export function createDefaultGramOptions(basePrice = 0): CmsProductGramOption[] {
  return [
    { id: "gram-a", label: "100g", price: basePrice, promoPrice: null },
    { id: "gram-b", label: "200g", price: basePrice, promoPrice: null },
  ];
}

export function normalizeGramVariation(
  raw: Partial<CmsProductGramVariation> | undefined,
  fallbackPrice: number,
): CmsProductGramVariation {
  const enabled = Boolean(raw?.enabled);
  const defaults = createDefaultGramOptions(fallbackPrice);
  if (!Array.isArray(raw?.options) || raw.options.length === 0) {
    return { enabled, options: defaults };
  }

  const options = raw.options.slice(0, 2).map((opt, index) => {
    const base = defaults[index] ?? defaults[0];
    const price = Number(opt?.price);
    const promo = opt?.promoPrice != null ? Number(opt.promoPrice) : null;
    return {
      id: typeof opt?.id === "string" && opt.id.trim() ? opt.id.trim().slice(0, 40) : base.id,
      label: typeof opt?.label === "string" && opt.label.trim() ? opt.label.trim().slice(0, 24) : base.label,
      price: Number.isFinite(price) && price >= 0 ? price : fallbackPrice,
      promoPrice: promo != null && Number.isFinite(promo) && promo >= 0 ? promo : null,
    };
  });

  while (options.length < 2) {
    options.push(defaults[options.length]);
  }

  return { enabled, options };
}

export function isGramVariationEnabled(product: CmsProduct): boolean {
  return Boolean(product.gramVariation?.enabled && product.gramVariation.options.length >= 2);
}

export function getGramOptions(product: CmsProduct): CmsProductGramOption[] {
  if (!isGramVariationEnabled(product)) return [];
  return product.gramVariation!.options.slice(0, 2);
}

export function getGramOptionById(
  product: CmsProduct,
  gramOptionId: string | null | undefined,
): CmsProductGramOption | null {
  if (!gramOptionId || !isGramVariationEnabled(product)) return null;
  return getGramOptions(product).find((o) => o.id === gramOptionId) ?? null;
}

export function getEffectiveGramOptionPrice(option: CmsProductGramOption): number {
  if (
    option.promoPrice != null &&
    option.promoPrice > 0 &&
    option.promoPrice < option.price
  ) {
    return option.promoPrice;
  }
  return option.price;
}

export function resolveProductUnitPrice(
  product: CmsProduct,
  gramOptionId?: string | null,
): number {
  if (isGramVariationEnabled(product)) {
    const option =
      getGramOptionById(product, gramOptionId) ?? getGramOptions(product)[0] ?? null;
    if (option) return getEffectiveGramOptionPrice(option);
  }

  if (product.promoPrice != null && product.promoPrice > 0 && product.promoPrice < product.price) {
    return product.promoPrice;
  }
  return product.price;
}

export function formatGramOptionPriceLine(option: CmsProductGramOption): string {
  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const effective = getEffectiveGramOptionPrice(option);
  if (option.promoPrice != null && option.promoPrice < option.price) {
    return `${option.label}: ${BRL.format(effective)} (${BRL.format(option.price)})`;
  }
  return `${option.label}: ${BRL.format(effective)}`;
}
