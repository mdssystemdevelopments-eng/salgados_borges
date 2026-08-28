import { useState } from "react";

import {
  PREP_METHOD_LABELS,
  PRODUCT_FULFILLMENT_LABELS,
} from "@/lib/cms/order-defaults";
import { getEffectiveProductPrice } from "@/lib/cms/migrate";
import type { CmsProduct, PrepMethod } from "@/lib/cms/types";
import { lineSubtotal } from "@/lib/order/pricing";
import { newCartLineId, type CartLineItem } from "@/lib/order/types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type ProductAddSheetProps = {
  product: CmsProduct;
  texts: {
    prepLabel: string;
    qtyLabel: string;
    btnAddToCart: string;
    minQtyHint: string;
    maxQtyHint: string;
  };
  onClose: () => void;
  onAdd: (item: CartLineItem) => void;
};

export function ProductAddSheet({ product, texts, onClose, onAdd }: ProductAddSheetProps) {
  const prepOptions = product.prepMethods ?? [];
  const singlePrep = prepOptions.length === 1 ? prepOptions[0] : null;
  const [prep, setPrep] = useState<PrepMethod | null>(singlePrep);
  const [qty, setQty] = useState(Math.max(product.minQty ?? 1, 1));
  const [note, setNote] = useState("");

  const unitPrice = getEffectiveProductPrice(product);
  const minQ = product.minQty ?? 1;
  const maxQ = product.maxQty ?? null;
  const canAdd = prepOptions.length === 0 || prep !== null;

  const add = () => {
    if (!canAdd) return;
    let finalQty = qty;
    if (finalQty < minQ) finalQty = minQ;
    if (maxQ != null && finalQty > maxQ) finalQty = maxQ;
    onAdd({
      lineId: newCartLineId(),
      product,
      qty: finalQty,
      prep,
      note: note.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-xl">
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-display text-2xl text-foreground">{product.name}</h3>
            {product.fulfillmentTag ? (
              <span className="mt-2 inline-flex rounded-full border border-emerald-600/40 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900">
                {PRODUCT_FULFILLMENT_LABELS[product.fulfillmentTag]}
              </span>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
            {product.extraInfo ? (
              <p className="mt-2 text-sm text-foreground">{product.extraInfo}</p>
            ) : null}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-price text-2xl text-gold">{BRL.format(unitPrice)}</span>
            <span className="text-sm text-muted-foreground">/ {product.unit}</span>
            {product.promoPrice != null && product.promoPrice < product.price ? (
              <span className="text-sm line-through text-muted-foreground">
                {BRL.format(product.price)}
              </span>
            ) : null}
          </div>

          {prepOptions.length > 1 ? (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {texts.prepLabel}
              </div>
              <div className="flex flex-wrap gap-2">
                {prepOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPrep(m)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      prep === m
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-gold/50"
                    }`}
                  >
                    {PREP_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {texts.qtyLabel}
            </div>
            <div className="flex items-center gap-3">
              <QtyButton onClick={() => setQty((q) => Math.max(minQ, q - 1))}>-</QtyButton>
              <span className="w-10 text-center text-lg font-medium">{qty}</span>
              <QtyButton
                onClick={() => setQty((q) => (maxQ != null ? Math.min(maxQ, q + 1) : q + 1))}
              >
                +
              </QtyButton>
            </div>
            {minQ > 1 ? (
              <p className="text-xs text-muted-foreground">
                {texts.minQtyHint}: {minQ}
              </p>
            ) : null}
            {maxQ != null ? (
              <p className="text-xs text-muted-foreground">
                {texts.maxQtyHint}: {maxQ}
              </p>
            ) : null}
          </div>

          {product.notes ? <p className="text-xs text-muted-foreground">{product.notes}</p> : null}

          <button
            type="button"
            disabled={!canAdd}
            onClick={add}
            className="w-full rounded-full bg-gold-gradient py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-gold-sm disabled:opacity-50"
          >
            {texts.btnAddToCart}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CartLinePreview({ item, onRemove }: { item: CartLineItem; onRemove?: () => void }) {
  return (
    <div className="flex gap-3 border-b border-border pb-3">
      <img
        src={item.product.image}
        alt=""
        className="h-16 w-16 rounded-lg object-cover border border-border"
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <div className="font-medium text-foreground leading-tight">{item.product.name}</div>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-muted-foreground hover:text-destructive shrink-0"
            >
              Remover
            </button>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {item.qty}x {BRL.format(getEffectiveProductPrice(item.product))} / {item.product.unit}
        </div>
        {item.prep ? (
          <div className="text-xs text-foreground mt-0.5">
            Preparo: {PREP_METHOD_LABELS[item.prep]}
          </div>
        ) : null}
        {item.product.fulfillmentTag ? (
          <div className="text-xs text-foreground mt-0.5">
            {PRODUCT_FULFILLMENT_LABELS[item.product.fulfillmentTag]}
          </div>
        ) : null}
        {item.note ? (
          <div className="text-xs text-muted-foreground mt-0.5">Obs: {item.note}</div>
        ) : null}
        <div className="font-price text-gold mt-1">{BRL.format(lineSubtotal(item))}</div>
      </div>
    </div>
  );
}

function QtyButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 w-9 rounded-full border border-border text-gold hover:border-gold flex items-center justify-center"
    >
      {children}
    </button>
  );
}

export function formatBRL(value: number): string {
  return BRL.format(value);
}
