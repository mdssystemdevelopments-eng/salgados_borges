import {
  formatGramOptionPriceLine,
  getGramOptions,
  isGramVariationEnabled,
  resolveProductUnitPrice,
} from "@/lib/cms/gram-variation";
import type { CmsProduct } from "@/lib/cms/types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type ProductPriceDisplayProps = {
  product: CmsProduct;
  size?: "card" | "sheet";
};

export function ProductPriceDisplay({ product, size = "card" }: ProductPriceDisplayProps) {
  const priceClass = size === "sheet" ? "font-price text-2xl text-gold" : "font-price text-xl text-gold";

  if (isGramVariationEnabled(product)) {
    const options = getGramOptions(product);
    return (
      <div className="space-y-1">
        {options.map((option) => (
          <div key={option.id} className={`${priceClass} leading-tight`}>
            {formatGramOptionPriceLine(option)}
          </div>
        ))}
      </div>
    );
  }

  const unitPrice = resolveProductUnitPrice(product);
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={priceClass}>{BRL.format(unitPrice)}</span>
      {product.promoPrice != null && product.promoPrice < product.price ? (
        <span className="text-sm line-through text-muted-foreground">
          {BRL.format(product.price)}
        </span>
      ) : null}
    </div>
  );
}

export function formatCartLineUnitPrice(product: CmsProduct, gramOptionId?: string | null): string {
  return BRL.format(resolveProductUnitPrice(product, gramOptionId));
}

export function cartLineGramLabel(product: CmsProduct, gramOptionId?: string | null): string | null {
  if (!isGramVariationEnabled(product) || !gramOptionId) return null;
  const option = getGramOptions(product).find((o) => o.id === gramOptionId);
  return option?.label ?? null;
}
