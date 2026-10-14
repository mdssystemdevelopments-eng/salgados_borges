import { useState, type ReactNode } from "react";

import {
  formatFlavorSelectionHint,
  getFlavorNamesByIds,
  getFlavorOptions,
  isFlavorVariationEnabled,
  isValidFlavorSelection,
} from "@/lib/cms/flavor-variation";
import {
  getEffectiveGramOptionPrice,
  getGramOptions,
  isGramVariationEnabled,
  resolveProductUnitPrice,
} from "@/lib/cms/gram-variation";
import {
  PREP_METHOD_LABELS,
  PRODUCT_FULFILLMENT_LABELS,
} from "@/lib/cms/order-defaults";
import { lineSubtotal } from "@/lib/order/pricing";
import type { CmsProduct, PrepMethod } from "@/lib/cms/types";
import { newCartLineId, type CartLineItem } from "@/lib/order/types";

import { cartLineGramLabel, formatCartLineUnitPrice } from "./ProductPriceDisplay";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const optionChipClass = (active: boolean, extra = "") =>
  [
    "rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors shadow-sm",
    active
      ? "border-gold bg-gold/20 text-foreground ring-2 ring-gold/30"
      : "border-foreground/30 bg-card text-foreground hover:border-gold/70 hover:bg-gold/5",
    extra,
  ].join(" ");

function OptionSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5 rounded-xl border-2 border-border bg-surface p-3.5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">{label}</div>
      {children}
    </div>
  );
}

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
  const gramEnabled = isGramVariationEnabled(product);
  const gramOptions = getGramOptions(product);
  const flavorEnabled = isFlavorVariationEnabled(product);
  const flavorOptions = getFlavorOptions(product);
  const [prep, setPrep] = useState<PrepMethod | null>(singlePrep);
  const [gramOptionId, setGramOptionId] = useState<string | null>(
    gramEnabled ? (gramOptions[0]?.id ?? null) : null,
  );
  const [selectedFlavorIds, setSelectedFlavorIds] = useState<string[]>([]);
  const [qty, setQty] = useState(Math.max(product.minQty ?? 1, 1));
  const [note, setNote] = useState("");

  const unitPrice = resolveProductUnitPrice(product, gramOptionId);
  const minQ = product.minQty ?? 1;
  const maxQ = product.maxQty ?? null;
  const flavorRules = product.flavorVariation;
  const maxFlavors = flavorRules?.maxSelect ?? 1;

  const toggleFlavor = (id: string) => {
    setSelectedFlavorIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxFlavors) return prev;
      return [...prev, id];
    });
  };

  const canAdd =
    (prepOptions.length === 0 || prep !== null) &&
    (!gramEnabled || gramOptionId !== null) &&
    isValidFlavorSelection(product, selectedFlavorIds);

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
      gramOptionId: gramEnabled ? gramOptionId : null,
      selectedFlavorIds: flavorEnabled ? selectedFlavorIds : [],
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
            <h3 className="font-display text-2xl text-product-title">{product.name}</h3>
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
          {!gramEnabled ? (
            <div className="flex items-baseline gap-2">
              <span className="font-price text-2xl text-gold">{BRL.format(unitPrice)}</span>
              <span className="text-sm text-muted-foreground">/ {product.unit}</span>
              {product.promoPrice != null && product.promoPrice < product.price ? (
                <span className="text-sm line-through text-muted-foreground">
                  {BRL.format(product.price)}
                </span>
              ) : null}
            </div>
          ) : null}

          {gramEnabled ? (
            <OptionSection label="Escolha a gramatura">
              <div className="flex flex-wrap gap-2">
                {gramOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setGramOptionId(option.id)}
                    className={optionChipClass(gramOptionId === option.id)}
                  >
                    {option.label} · {BRL.format(getEffectiveGramOptionPrice(option))}
                  </button>
                ))}
              </div>
            </OptionSection>
          ) : null}

          {flavorEnabled ? (
            <OptionSection label={formatFlavorSelectionHint(product)}>
              <div className="flex flex-wrap gap-2">
                {flavorOptions.map((option) => {
                  const active = selectedFlavorIds.includes(option.id);
                  const atMax = selectedFlavorIds.length >= maxFlavors && !active;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={atMax}
                      onClick={() => toggleFlavor(option.id)}
                      className={optionChipClass(active, "disabled:opacity-40 disabled:hover:border-foreground/30")}
                    >
                      {option.name}
                    </button>
                  );
                })}
              </div>
            </OptionSection>
          ) : null}

          {prepOptions.length > 1 ? (
            <OptionSection label={texts.prepLabel}>
              <div className="flex flex-wrap gap-2">
                {prepOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPrep(m)}
                    className={optionChipClass(prep === m)}
                  >
                    {PREP_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </OptionSection>
          ) : null}

          <OptionSection label={texts.qtyLabel}>
            <div className="flex items-center justify-center gap-4 rounded-xl border-2 border-foreground/20 bg-card px-4 py-3">
              <QtyButton onClick={() => setQty((q) => Math.max(minQ, q - 1))}>-</QtyButton>
              <span className="min-w-[2.5rem] text-center text-xl font-semibold text-foreground">
                {qty}
              </span>
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
          </OptionSection>

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
  const gramLabel = cartLineGramLabel(item.product, item.gramOptionId);

  return (
    <div className="flex gap-3 border-b border-border pb-3">
      <img
        src={item.product.image}
        alt=""
        className="h-16 w-16 rounded-lg object-cover border border-border"
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <div className="font-medium text-product-title leading-tight">{item.product.name}</div>
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
          {item.qty}x {formatCartLineUnitPrice(item.product, item.gramOptionId)} /{" "}
          {item.product.unit}
        </div>
        {gramLabel ? <div className="text-xs text-foreground mt-0.5">Gramatura: {gramLabel}</div> : null}
        {item.selectedFlavorIds.length > 0 ? (
          <div className="text-xs text-foreground mt-0.5">
            Sabores: {getFlavorNamesByIds(item.product, item.selectedFlavorIds).join(", ")}
          </div>
        ) : null}
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
      className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-foreground/35 bg-background text-lg font-semibold text-gold shadow-sm hover:border-gold hover:bg-gold/5"
    >
      {children}
    </button>
  );
}

export function formatBRL(value: number): string {
  return BRL.format(value);
}
