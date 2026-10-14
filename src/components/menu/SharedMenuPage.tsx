import { useEffect, useMemo, useState } from "react";

import { CheckoutFlow } from "@/components/order/CheckoutFlow";
import { ProductAddSheet } from "@/components/order/ProductAddSheet";
import { ProductPriceDisplay } from "@/components/order/ProductPriceDisplay";
import { PRODUCT_FULFILLMENT_LABELS } from "@/lib/cms/order-defaults";
import type { CmsData, CmsMenuLink, CmsProduct } from "@/lib/cms/types";
import { cartSubtotal } from "@/lib/order/pricing";
import { type CartLineItem } from "@/lib/order/types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type SharedMenuPageProps = {
  cms: CmsData;
  menuLink: CmsMenuLink;
};

export function SharedMenuPage({ cms, menuLink }: SharedMenuPageProps) {
  const { content, settings } = cms;
  const orderTexts = settings.orderSettings.checkoutTexts;
  const heroImage = content.hero.image;
  const imageOpacity = Math.max(0, Math.min(100, content.hero.imageOpacity ?? 100)) / 100;

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cms.categories) map.set(c.id, c.name);
    return map;
  }, [cms.categories]);

  const products = useMemo(() => {
    let list = cms.products.filter((p) => p.visible && p.available !== false);
    if (menuLink.productIds.length > 0) {
      list = list.filter((p) => menuLink.productIds.includes(p.id));
    } else if (menuLink.categoryIds.length > 0) {
      list = list.filter((p) => menuLink.categoryIds.includes(p.categoryId));
    }
    return list;
  }, [cms.products, menuLink.categoryIds, menuLink.productIds]);

  const categories = useMemo(
    () => ["Todos", ...new Set(products.map((p) => categoryNameById.get(p.categoryId) ?? ""))],
    [products, categoryNameById],
  );

  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [pickProduct, setPickProduct] = useState<CmsProduct | null>(null);

  const filtered = useMemo(() => {
    let list =
      category === "Todos"
        ? products
        : products.filter((p) => categoryNameById.get(p.categoryId) === category);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (categoryNameById.get(p.categoryId) ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, category, search, categoryNameById]);

  const total = useMemo(() => cartSubtotal(cart), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  const handleOrderComplete = () => {
    setCart([]);
    setCartOpen(false);
  };

  return (
    <div className="shared-menu-page text-foreground overflow-x-hidden">
      <div className="shared-menu-wallpaper" aria-hidden="true">
        <img
          src={heroImage}
          alt=""
          className="shared-menu-wallpaper__image"
          style={{ opacity: imageOpacity * 0.55 }}
        />
        <div className="shared-menu-wallpaper__overlay" />
      </div>

      <main className="relative z-10 pt-12 pb-10 lg:pt-16 lg:pb-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 space-y-8">
          <div className="shared-menu-hero max-w-3xl mx-auto space-y-4">
            <span className="divider-gold">Cardápio</span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
              <span className="block text-foreground">{menuLink.title}</span>
            </h1>
            {menuLink.subtitle ? (
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {menuLink.subtitle}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl panel-outline p-6 md:p-10 shadow-deep">
            <div className="mb-6 max-w-md mx-auto">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={orderTexts.searchPlaceholder}
                className="w-full rounded-full border border-border bg-card px-5 py-3.5 text-base focus:border-gold outline-none shadow-sm"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 mb-8">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm uppercase tracking-[0.08em] transition-all border ${
                    category === c
                      ? "bg-gold-gradient text-primary-foreground border-transparent shadow-gold-sm"
                      : "border-gold/40 text-foreground hover:text-gold hover:border-gold"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.length === 0 ? (
                <p className="col-span-full text-center text-muted-foreground py-16">
                  Nenhum produto disponível neste cardápio.
                </p>
              ) : (
                filtered.map((p) => (
                  <MenuProductCard
                    key={p.id}
                    product={p}
                    categoryLabel={categoryNameById.get(p.categoryId) ?? ""}
                    showPrices={menuLink.showPrices}
                    allowOrders={menuLink.allowOrders}
                    onSelect={setPickProduct}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-gold/25 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 text-center space-y-2">
          <div className="font-display text-xl text-gold-gradient">{content.brandName}</div>
          <p className="text-sm text-muted-foreground">
            {settings.phone ? settings.phone : null}
            {settings.phone && settings.hours ? " · " : null}
            {settings.hours ? settings.hours : null}
          </p>
        </div>
      </footer>

      {menuLink.allowOrders ? (
        <>
          {itemCount > 0 && !cartOpen ? (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="shared-menu-fab fixed bottom-5 left-1/2 z-30 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 inline-flex items-center gap-3 rounded-full bg-gold-gradient px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.1em] text-primary-foreground"
            >
              <span>Ver carrinho</span>
              <span className="font-price text-base">{BRL.format(total)}</span>
            </button>
          ) : null}

          <CheckoutFlow
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            onOrderComplete={handleOrderComplete}
            cms={cms}
            items={cart}
            onRemoveLine={(lineId) => setCart((prev) => prev.filter((i) => i.lineId !== lineId))}
            onUpdateQty={(lineId, delta) =>
              setCart((prev) =>
                prev
                  .map((i) => {
                    if (i.lineId !== lineId) return i;
                    const minQ = i.product.minQty ?? 1;
                    const maxQ = i.product.maxQty ?? null;
                    let next = i.qty + delta;
                    if (next < minQ) next = minQ;
                    if (maxQ != null && next > maxQ) next = maxQ;
                    return { ...i, qty: next };
                  })
                  .filter((i) => i.qty > 0),
              )
            }
            onClearCart={() => setCart([])}
          />
        </>
      ) : null}

      {pickProduct ? (
        <ProductAddSheet
          product={pickProduct}
          texts={{
            prepLabel: orderTexts.prepLabel,
            qtyLabel: orderTexts.qtyLabel,
            btnAddToCart: orderTexts.btnAddToCart,
            minQtyHint: orderTexts.minQtyHint,
            maxQtyHint: orderTexts.maxQtyHint,
          }}
          onClose={() => setPickProduct(null)}
          onAdd={(item) => {
            setCart((prev) => [...prev, item]);
            setPickProduct(null);
          }}
        />
      ) : null}
    </div>
  );
}

function MenuProductCard({
  product,
  categoryLabel,
  showPrices,
  allowOrders,
  onSelect,
}: {
  product: CmsProduct;
  categoryLabel: string;
  showPrices: boolean;
  allowOrders: boolean;
  onSelect: (p: CmsProduct) => void;
}) {
  const unavailable = product.available === false;

  return (
    <article className="group relative overflow-hidden rounded-xl panel-outline hover:border-gold transition-[border-color,box-shadow] duration-200">
      <div className="aspect-square overflow-hidden bg-muted relative border-b border-border">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
          width={900}
          height={900}
        />
        {product.featured ? (
          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.14em] text-primary-foreground bg-gold-gradient rounded-full px-2.5 py-0.5">
            Destaque
          </span>
        ) : null}
        {product.fulfillmentTag ? (
          <span className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.12em] font-semibold text-emerald-900 border border-emerald-600/40 rounded-full px-2.5 py-0.5 bg-emerald-50/95">
            {PRODUCT_FULFILLMENT_LABELS[product.fulfillmentTag]}
          </span>
        ) : null}
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.14em] text-gold border border-gold rounded-full px-2.5 py-0.5 bg-card">
          {categoryLabel}
        </span>
      </div>
      <div className="p-4 space-y-2.5">
        <h3 className="font-display text-lg leading-tight text-product-title">{product.name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border">
          {showPrices ? (
            <div className="min-w-0">
              <ProductPriceDisplay product={product} />
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                por {product.unit}
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Consulte valores</span>
          )}
          {allowOrders ? (
            <button
              type="button"
              disabled={unavailable}
              onClick={() => onSelect(product)}
              className="shrink-0 inline-flex h-10 items-center rounded-full bg-gold-gradient px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {unavailable ? "Indisponível" : "Escolher"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
