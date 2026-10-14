import { ProductPriceDisplay } from "@/components/order/ProductPriceDisplay";
import { isGramVariationEnabled } from "@/lib/cms/gram-variation";
import type { CmsProduct } from "@/lib/cms/types";

const chooseButtonClass =
  "w-full inline-flex h-10 items-center justify-center rounded-full bg-gold-gradient px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40";

type ProductCardFooterProps = {
  product: CmsProduct;
  unavailable: boolean;
  onSelect: () => void;
  showPrices?: boolean;
  allowOrders?: boolean;
};

export function ProductCardFooter({
  product,
  unavailable,
  onSelect,
  showPrices = true,
  allowOrders = true,
}: ProductCardFooterProps) {
  const gramPrices = isGramVariationEnabled(product);

  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3">
      {showPrices ? (
        <div className="flex flex-col items-center text-center gap-0.5">
          <ProductPriceDisplay product={product} align="center" />
          {!gramPrices ? (
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              por {product.unit}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Consulte valores</p>
      )}

      {allowOrders ? (
        <button type="button" disabled={unavailable} onClick={onSelect} className={chooseButtonClass}>
          {unavailable ? "Indisponível" : "Escolher"}
        </button>
      ) : null}
    </div>
  );
}
