import { Fragment } from "react";

import {
  getEffectiveGramOptionPrice,
  getGramOptions,
  isGramVariationEnabled,
  resolveProductUnitPrice,
} from "@/lib/cms/gram-variation";
import type { CmsProduct } from "@/lib/cms/types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type ProductPriceDisplayProps = {
  product: CmsProduct;
  size?: "card" | "sheet";
  align?: "start" | "center";
};

function GramVariationPrices({
  product,
  size,
  align = "start",
}: {
  product: CmsProduct;
  size: "card" | "sheet";
  align?: "start" | "center";
}) {
  const options = getGramOptions(product);
  const priceSize = size === "sheet" ? "text-xl" : "text-lg";

  return (
    <div
      className={`inline-flex items-stretch gap-0 ${align === "center" ? "mx-auto justify-center" : ""}`}
    >
      {options.map((option, index) => {
        const effective = getEffectiveGramOptionPrice(option);
        const hasPromo =
          option.promoPrice != null && option.promoPrice > 0 && option.promoPrice < option.price;

        return (
          <Fragment key={option.id}>
            {index > 0 ? (
              <div
                className="mx-2.5 w-px shrink-0 self-stretch bg-border/80"
                aria-hidden
              />
            ) : null}
            <div className="min-w-0 text-left">
              <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground leading-none mb-1">
                {option.label}
              </span>
              <span className={`font-price ${priceSize} text-gold leading-none tabular-nums`}>
                {BRL.format(effective)}
              </span>
              {hasPromo ? (
                <span className="block text-[11px] line-through text-muted-foreground mt-0.5 tabular-nums">
                  {BRL.format(option.price)}
                </span>
              ) : null}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export function ProductPriceDisplay({
  product,
  size = "card",
  align = "start",
}: ProductPriceDisplayProps) {
  const priceClass = size === "sheet" ? "font-price text-2xl text-gold" : "font-price text-xl text-gold";

  if (isGramVariationEnabled(product)) {
    return <GramVariationPrices product={product} size={size} align={align} />;
  }

  const unitPrice = resolveProductUnitPrice(product);
  return (
    <div
      className={`flex flex-wrap items-baseline gap-2 ${align === "center" ? "justify-center" : ""}`}
    >
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
