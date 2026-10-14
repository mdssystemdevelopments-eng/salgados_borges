import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { CheckoutFlow } from "@/components/order/CheckoutFlow";
import { ProductAddSheet } from "@/components/order/ProductAddSheet";
import { getPublicCms } from "@/lib/cms/public-api";
import { ProductPriceDisplay } from "@/components/order/ProductPriceDisplay";
import { isGramVariationEnabled } from "@/lib/cms/gram-variation";
import { PRODUCT_FULFILLMENT_LABELS } from "@/lib/cms/order-defaults";
import { FOOTER_SECTION_LINKS, NAV_SECTION_META, normalizeSectionOrder } from "@/lib/cms/sections";
import type { CmsData, CmsPageSection, CmsProduct } from "@/lib/cms/types";
import { cartSubtotal } from "@/lib/order/pricing";
import { type CartLineItem } from "@/lib/order/types";

export const Route = createFileRoute("/")({
  loader: () => getPublicCms(),
  head: ({ loaderData }) => {
    const cms = loaderData as CmsData | undefined;
    const settings = cms?.settings;
    const content = cms?.content;
    const title = settings?.seoTitle || "Salgados Borges | Salgados artesanais em Votuporanga";
    const description =
      settings?.seoDescription ||
      "Salgados artesanais para festas e encomendas. Peça pelo WhatsApp.";
    const ogTitle = settings?.ogTitle || title;
    const ogDescription = settings?.ogDescription || description;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: ogDescription },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(content?.logoUrl ? [{ property: "og:image", content: content.logoUrl }] : []),
      ],
    };
  },
  component: SalgadosBorgesPage,
});

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function SalgadosBorgesPage() {
  const cms = Route.useLoaderData() as CmsData;
  const { content, settings } = cms;
  const sections = settings.sections;
  const sectionOrder = normalizeSectionOrder(settings.sectionOrder);
  const orderTexts = settings.orderSettings.checkoutTexts;

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cms.categories) map.set(c.id, c.name);
    return map;
  }, [cms.categories]);

  const products: CmsProduct[] = useMemo(() => cms.products, [cms.products]);

  const categories = useMemo(
    () => ["Todos", ...cms.categories.map((c) => c.name)],
    [cms.categories],
  );

  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [pickProduct, setPickProduct] = useState<CmsProduct | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const addLine = (item: CartLineItem) => {
    setCart((prev) => [...prev, item]);
  };

  const updateQty = (lineId: string, delta: number) => {
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
    );
  };

  const removeLine = (lineId: string) => setCart((prev) => prev.filter((i) => i.lineId !== lineId));

  const total = useMemo(() => cartSubtotal(cart), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);

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

  useEffect(() => {
    if (lightbox || cartOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightbox, cartOpen]);

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden">
      <Header
        brandName={content.brandName}
        logoUrl={content.logoUrl}
        sections={sections}
        sectionOrder={sectionOrder}
        cartCount={itemCount}
        onOpenCart={() => setCartOpen(true)}
      />

      {sectionOrder.map((key) => {
        if (!sections[key]) return null;

        if (key === "hero") {
          return (
            <Hero
              key={key}
              content={content}
              whatsapp={settings.whatsapp}
              onMenu={() => scrollTo("produtos")}
            />
          );
        }

        if (key === "about") {
          return <Sobre key={key} about={content.about} brandName={content.brandName} />;
        }

        if (key === "products") {
          return (
            <Produtos
              key={key}
              section={content.productsSection}
              products={filtered}
              categories={categories}
              category={category}
              search={search}
              searchPlaceholder={orderTexts.searchPlaceholder}
              categoryNameById={categoryNameById}
              onCategory={setCategory}
              onSearch={setSearch}
              onSelect={setPickProduct}
            />
          );
        }

        if (key === "howItWorks") {
          return <ComoFunciona key={key} section={content.howItWorks} steps={cms.steps} />;
        }

        if (key === "features") {
          return <Diferenciais key={key} section={content.features} features={cms.features} />;
        }

        if (key === "gallery") {
          return (
            <Galeria key={key} section={content.gallery} items={cms.gallery} onOpen={setLightbox} />
          );
        }

        if (key === "testimonials") {
          return (
            <Avaliacoes key={key} section={content.testimonials} testimonials={cms.testimonials} />
          );
        }

        if (key === "faq") {
          return (
            <Faq
              key={key}
              section={content.faq}
              items={cms.faq}
              openIndex={openFaq}
              onToggle={(i) => setOpenFaq(openFaq === i ? null : i)}
            />
          );
        }

        if (key === "contact") {
          return (
            <Contato
              key={key}
              section={content.contact}
              settings={settings}
              brandName={content.brandName}
            />
          );
        }

        return null;
      })}

      <Footer content={content} />

      {sections.floatingWhatsapp ? (
        <FloatingWhatsapp brandName={content.brandName} whatsapp={settings.whatsapp} />
      ) : null}

      {itemCount > 0 && !cartOpen ? (
        <FloatingCart count={itemCount} total={total} onOpen={() => setCartOpen(true)} />
      ) : null}

      <CheckoutFlow
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onOrderComplete={() => {
          setCart([]);
          setCartOpen(false);
        }}
        cms={cms}
        items={cart}
        onRemoveLine={removeLine}
        onUpdateQty={updateQty}
        onClearCart={() => setCart([])}
      />

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
          onAdd={addLine}
        />
      ) : null}

      {lightbox ? <Lightbox src={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SiteLogo({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`site-logo ${className}`}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

/* ----------------------------- Header ------------------------------ */
function Header({
  brandName,
  logoUrl,
  sections,
  sectionOrder,
  cartCount,
  onOpenCart,
}: {
  brandName: string;
  logoUrl: string;
  sections: CmsData["settings"]["sections"];
  sectionOrder: CmsPageSection[];
  cartCount: number;
  onOpenCart: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = sectionOrder
    .map((key) => {
      if (!sections[key]) return null;
      const meta = NAV_SECTION_META[key];
      return meta || null;
    })
    .filter(Boolean) as { href: string; label: string }[];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-[background-color,box-shadow,border-color] duration-200 ${
        scrolled
          ? "bg-background/95 border-b border-gold/20 shadow-deep"
          : "bg-background/85 border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-10 flex items-center justify-between gap-3 h-24 md:h-28">
        <a href="#top" className="flex items-center gap-3 md:gap-4 group min-w-0 flex-1">
          <SiteLogo
            src={logoUrl}
            alt={brandName}
            className="h-14 md:h-[4.5rem] w-auto shrink-0"
            priority
          />
          <div className="leading-tight hidden sm:block">
            <div className="font-display text-xl sm:text-2xl md:text-3xl lg:text-[2rem] text-gold-gradient tracking-wide whitespace-nowrap">
              {brandName}
            </div>
          </div>
        </a>

        <div className="flex items-center gap-2 md:gap-5 shrink-0">
          <nav className="hidden xl:flex items-center gap-4">
            {links.map((l) => (
              <button
                key={l.href}
                type="button"
                onClick={() => scrollTo(l.href)}
                className="relative text-sm text-foreground hover:text-gold transition-colors tracking-wide whitespace-nowrap after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={onOpenCart}
            className="relative flex items-center gap-2 rounded-full bg-gold-gradient text-primary-foreground px-4 md:px-5 py-2.5 md:py-3 text-sm uppercase tracking-[0.18em] font-semibold shadow-gold-sm hover:shadow-gold-glow transition-shadow"
          >
            <span className="hidden sm:inline">Pedido</span>
            <span className="sm:hidden">Carrinho</span>
            {cartCount > 0 ? (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border border-gold text-gold text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className="xl:hidden text-sm uppercase tracking-[0.14em] text-gold px-2 py-2"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? "Fechar" : "Menu"}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="xl:hidden bg-background/95 border-t border-gold/20">
          <div className="px-6 py-6 flex flex-col gap-3">
            {links.map((l) => (
              <button
                key={l.href}
                type="button"
                onClick={() => {
                  scrollTo(l.href);
                  setMobileOpen(false);
                }}
                className="text-left text-base text-foreground hover:text-gold transition-colors"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

/* ------------------------------ Hero ------------------------------ */
function Hero({
  content,
  whatsapp,
  onMenu,
}: {
  content: CmsData["content"];
  whatsapp: string;
  onMenu: () => void;
}) {
  const { hero, brandName, logoUrl } = content;
  const imageOpacity = Math.max(0, Math.min(100, hero.imageOpacity ?? 100)) / 100;
  const overlayOpacity = Math.max(0, Math.min(100, hero.overlayOpacity ?? 60)) / 100;

  return (
    <>
      <div className="hero-wallpaper" aria-hidden="true">
        <img
          key={hero.image}
          src={hero.image}
          alt=""
          className="hero-wallpaper__image"
          style={{ opacity: imageOpacity }}
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
        />
        <div className="hero-wallpaper__overlay" style={{ opacity: overlayOpacity }} />
      </div>

      <section
        id="top"
        className="relative z-10 flex items-center justify-center pt-28 md:pt-32 pb-12 md:pb-16 min-h-[72vh] md:min-h-[78vh]"
      >
      <div className="mx-auto max-w-4xl px-6 text-center flex flex-col items-center gap-5 md:gap-6">
        <SiteLogo
          src={logoUrl}
          alt={brandName}
          className="h-52 sm:h-64 md:h-80 lg:h-[22rem] w-auto"
          priority
        />

        <h1 className="sr-only">{brandName}</h1>
        <div className="w-full max-w-2xl animate-fade-up">
          <p className="font-display leading-[1.08] text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
            <span className="block text-foreground">{hero.titleLine1}</span>
            {hero.titleLine2 ? (
              <span className="block shimmer-text italic">{hero.titleLine2}</span>
            ) : null}
            {hero.titleLine3 ? (
              <span className="block text-gold-gradient">{hero.titleLine3}</span>
            ) : null}
          </p>
          <p
            className="mt-4 max-w-xl mx-auto text-base sm:text-lg md:text-xl text-foreground leading-relaxed"
            style={{ animationDelay: "0.15s" }}
          >
            {hero.subtitle}
          </p>
        </div>

        <div
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <a
            href={waLink(whatsapp, "Olá! Gostaria de fazer um pedido pelo site.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-gold-gradient text-primary-foreground px-7 py-3.5 text-sm sm:text-base font-semibold uppercase tracking-[0.18em] shadow-gold-glow hover:shadow-gold transition-all"
          >
            {hero.ctaPrimary}
          </a>
          <button
            onClick={onMenu}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gold text-gold px-7 py-3.5 text-sm sm:text-base font-semibold uppercase tracking-[0.18em] hover:bg-gold hover:text-primary-foreground transition-all"
          >
            {hero.ctaSecondary}
          </button>
        </div>

        <div
          className="flex flex-wrap gap-x-5 gap-y-2 justify-center text-sm sm:text-base uppercase tracking-[0.2em] text-foreground animate-fade-up pt-1"
          style={{ animationDelay: "0.4s" }}
        >
          {hero.badges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}

/* ------------------------------ Sobre ------------------------------ */
function Sobre({ about, brandName }: { about: CmsData["content"]["about"]; brandName: string }) {
  return (
    <section id="sobre" className="relative z-10 py-14 lg:py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 space-y-8 lg:space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <span className="divider-gold">{about.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            <span className="block text-foreground">{about.title}</span>
            <span className="block text-gold-gradient italic">{about.titleAccent}</span>
          </h2>
        </div>

        <div className="relative">
          <div className="absolute -inset-3 md:-inset-5 border border-gold/40 pointer-events-none" />
          <div className="relative overflow-hidden panel-outline">
            <img
              src={about.image}
              alt={`Cozinha artesanal ${brandName}`}
              className="w-full aspect-[16/9] md:aspect-[21/9] object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-70" />
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-5 text-center">
          {about.paragraphs.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="text-base md:text-lg text-foreground leading-relaxed"
            >
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Produtos ---------------------------- */
function Produtos({
  section,
  products,
  categories,
  category,
  search,
  searchPlaceholder,
  categoryNameById,
  onCategory,
  onSearch,
  onSelect,
}: {
  section: CmsData["content"]["productsSection"];
  products: CmsProduct[];
  categories: string[];
  category: string;
  search: string;
  searchPlaceholder: string;
  categoryNameById: Map<string, string>;
  onCategory: (c: string) => void;
  onSearch: (q: string) => void;
  onSelect: (p: CmsProduct) => void;
}) {
  return (
    <section id="produtos" className="relative z-10 py-14 lg:py-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-40" />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="rounded-xl panel-outline p-6 md:p-10">
          <div className="text-center max-w-3xl mx-auto space-y-5 mb-8">
            <span className="divider-gold">{section.eyebrow}</span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
              <span className="block text-foreground">{section.title}</span>
              <span className="block text-gold-gradient italic">{section.titleAccent}</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">{section.subtitle}</p>
          </div>

          <div className="mb-6 max-w-md mx-auto">
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-full border border-border bg-card px-5 py-3 text-base focus:border-gold outline-none shadow-sm"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mb-8">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onCategory(c)}
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
            {products.length === 0 ? (
              <p className="col-span-full py-12 text-center text-base text-muted-foreground">
                Nenhum produto encontrado. Tente outra busca ou categoria.
              </p>
            ) : (
              products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  categoryLabel={categoryNameById.get(p.categoryId) ?? ""}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  categoryLabel,
  onSelect,
}: {
  product: CmsProduct;
  categoryLabel: string;
  onSelect: (p: CmsProduct) => void;
}) {
  const unavailable = product.available === false;
  const gramPrices = isGramVariationEnabled(product);

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
        <div
          className={
            gramPrices
              ? "flex flex-col gap-3 pt-2.5 border-t border-border"
              : "flex items-center justify-between gap-3 pt-2.5 border-t border-border"
          }
        >
          <div className={gramPrices ? "" : "min-w-0 flex-1"}>
            <ProductPriceDisplay product={product} />
            {!gramPrices ? (
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                por {product.unit}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={unavailable}
            onClick={() => onSelect(product)}
            className={`shrink-0 inline-flex h-10 items-center rounded-full bg-gold-gradient px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 ${gramPrices ? "self-end" : ""}`}
          >
            {unavailable ? "Indisponível" : "Escolher"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* --------------------------- Como Funciona --------------------------- */
function ComoFunciona({
  section,
  steps,
}: {
  section: CmsData["content"]["howItWorks"];
  steps: CmsData["steps"];
}) {
  return (
    <section id="como-funciona" className="relative z-10 py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            <span className="block text-foreground">{section.title}</span>
            <span className="block text-gold-gradient italic">{section.titleAccent}</span>
          </h2>
        </div>

        <div className="relative grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className="relative rounded-lg panel-outline p-6 hover:border-gold transition-all"
            >
              <div className="font-display text-5xl text-gold-gradient opacity-90">
                {step.number}
              </div>
              <h3 className="mt-4 font-display text-xl text-foreground">{step.title}</h3>
              <p className="mt-2 text-base text-muted-foreground leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Diferenciais --------------------------- */
function Diferenciais({
  section,
  features,
}: {
  section: CmsData["content"]["features"];
  features: CmsData["features"];
}) {
  return (
    <section id="diferenciais" className="relative z-10 py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            <span className="block text-foreground">{section.title}</span>
            <span className="block text-gold-gradient italic">{section.titleAccent}</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((d) => (
            <div
              key={d.id}
              className="group relative overflow-hidden rounded-lg panel-outline p-8 hover:border-gold transition-all"
            >
              <h3 className="font-display text-2xl text-foreground">{d.title}</h3>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">{d.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Galeria ----------------------------- */
function Galeria({
  section,
  items,
  onOpen,
}: {
  section: CmsData["content"]["gallery"];
  items: CmsData["gallery"];
  onOpen: (src: string) => void;
}) {
  return (
    <section id="galeria" className="relative z-10 py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-3xl mx-auto space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            <span className="block text-foreground">{section.title}</span>
            <span className="block text-gold-gradient italic">{section.titleAccent}</span>
          </h2>
          <p className="text-base md:text-lg text-foreground max-w-md mx-auto">
            {section.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => onOpen(item.image)}
              className={`group relative overflow-hidden rounded-lg panel-outline hover:border-gold transition-all ${
                i === 0
                  ? "md:row-span-2 md:col-span-1 aspect-square md:aspect-auto"
                  : "aspect-square"
              }`}
            >
              <img
                src={item.image}
                alt={item.alt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-background/25 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Avaliações ---------------------------- */
function Avaliacoes({
  section,
  testimonials,
}: {
  section: CmsData["content"]["testimonials"];
  testimonials: CmsData["testimonials"];
}) {
  return (
    <section id="depoimentos" className="relative z-10 py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            <span className="block text-foreground">{section.title}</span>
            <span className="block text-gold-gradient italic">{section.titleAccent}</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((d) => (
            <blockquote
              key={d.id}
              className="relative rounded-lg panel-outline p-8 flex flex-col gap-5"
            >
              <p className="text-foreground leading-relaxed">{d.text}</p>
              <footer className="pt-4 border-t border-border">
                <div className="font-display text-lg text-foreground">{d.name}</div>
                <div className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
                  {d.role}
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- FAQ ------------------------------- */
function Faq({
  section,
  items,
  openIndex,
  onToggle,
}: {
  section: CmsData["content"]["faq"];
  items: CmsData["faq"];
  openIndex: number | null;
  onToggle: (i: number) => void;
}) {
  return (
    <section id="faq" className="relative z-10 py-14 lg:py-20">
      <div className="mx-auto max-w-4xl px-6 lg:px-10">
        <div className="text-center space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            <span className="block text-foreground">{section.title}</span>
            <span className="block text-gold-gradient italic">{section.titleAccent}</span>
          </h2>
        </div>

        <div className="space-y-3">
          {items.map((f, i) => {
            const open = openIndex === i;
            return (
              <div key={f.id} className="rounded-lg panel-outline overflow-hidden">
                <button
                  onClick={() => onToggle(i)}
                  className="w-full flex items-center justify-between gap-5 px-6 py-5 text-left hover:bg-muted transition-colors"
                >
                  <span className="font-display text-lg md:text-xl text-foreground">
                    {f.question}
                  </span>
                  <span
                    className={`text-gold text-2xl transition-transform ${open ? "rotate-45" : ""}`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-base text-muted-foreground leading-relaxed">
                      {f.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Contato ----------------------------- */
function Contato({
  section,
  settings,
  brandName,
}: {
  section: CmsData["content"]["contact"];
  settings: CmsData["settings"];
  brandName: string;
}) {
  const [form, setForm] = useState({ nome: "", telefone: "", mensagem: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Olá! Meu nome é ${form.nome}. Telefone: ${form.telefone}. ${form.mensagem}`;
    window.open(waLink(settings.whatsapp, text), "_blank");
  };

  const whatsappDisplay = formatWhatsappDisplay(settings.whatsapp);

  const contacts: {
    label: string;
    value: string;
    href?: string;
  }[] = [
    {
      label: "Telefone",
      value: settings.phone,
      href: `tel:+${settings.whatsapp}`,
    },
    {
      label: "WhatsApp",
      value: whatsappDisplay,
      href: waLink(settings.whatsapp, "Olá! Gostaria de mais informações."),
    },
    {
      label: "E-mail",
      value: settings.email,
      href: `mailto:${settings.email}`,
    },
    { label: "Endereço", value: settings.address },
    { label: "Atendimento", value: settings.hours },
  ];

  const socialLinks = [
    { label: "Instagram", href: settings.instagramUrl },
    { label: "Facebook", href: settings.facebookUrl },
  ].filter((s) => s.href.trim() && !isGenericSocialUrl(s.href));

  return (
    <section id="contato" className="relative z-10 py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-2 gap-8">
        <div className="space-y-8 rounded-lg panel-outline p-6 md:p-8">
          <div className="space-y-5 text-center lg:text-left">
            <span className="divider-gold">{section.eyebrow}</span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
              <span className="block text-foreground">{section.title}</span>
              <span className="block text-gold-gradient italic">{section.titleAccent}</span>
            </h2>
            <p className="text-base md:text-lg text-foreground max-w-md mx-auto lg:mx-0">
              {section.subtitle}
            </p>
          </div>

          <div className="space-y-5">
            {contacts.map((c) => (
              <div
                key={c.label}
                className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {c.label}
                </div>
                {c.href ? (
                  <a
                    href={c.href}
                    target={c.label === "WhatsApp" ? "_blank" : undefined}
                    rel={c.label === "WhatsApp" ? "noreferrer" : undefined}
                    className="mt-1 block text-base text-foreground hover:text-gold transition-colors"
                  >
                    {c.value}
                  </a>
                ) : (
                  <div className="mt-1 text-base text-foreground">{c.value}</div>
                )}
              </div>
            ))}
          </div>

          {socialLinks.length > 0 ? (
            <div className="flex gap-3 pt-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-gold/40 px-4 py-2 text-sm uppercase tracking-[0.16em] text-foreground hover:text-gold hover:border-gold transition-all"
                >
                  {s.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <form onSubmit={submit} className="rounded-lg panel-outline p-8 space-y-4">
            <Field label="Nome completo">
              <input
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full field-outline card-solid px-3 py-2.5 focus:border-gold outline-none transition-colors"
              />
            </Field>
            <Field label="Telefone">
              <input
                required
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full field-outline card-solid px-3 py-2.5 focus:border-gold outline-none transition-colors"
              />
            </Field>
            <Field label="Mensagem">
              <textarea
                required
                rows={5}
                value={form.mensagem}
                onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                className="w-full field-outline card-solid px-3 py-2.5 focus:border-gold outline-none transition-colors resize-none"
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-full bg-gold-gradient text-primary-foreground py-3.5 text-base uppercase tracking-[0.18em] font-semibold shadow-gold-glow hover:shadow-gold transition-all"
            >
              Enviar mensagem
            </button>
          </form>

          <div className="rounded-lg overflow-hidden panel-outline h-64">
            <iframe
              title={`Mapa ${brandName}`}
              src={settings.mapEmbedUrl}
              className="h-full w-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ----------------------------- Rodapé ----------------------------- */
const FOOTER_TRUST_SEALS = [
  {
    label: "Conexão protegida",
    text: "Certificado SSL ativo no endereço oficial do site.",
  },
  {
    label: "Privacidade",
    text: "Coleta e uso de dados conforme a Lei Geral de Proteção de Dados.",
    href: "/politica-de-privacidade" as const,
  },
  {
    label: "Pedido direto",
    text: "Orçamento, combinação de entrega e pagamento feitos pelo WhatsApp da loja.",
  },
  {
    label: "Produção artesanal",
    text: "Salgados preparados na cozinha da Salgados Borges, em Votuporanga, SP.",
  },
  {
    label: "Termos publicados",
    text: "Condições de uso e políticas disponíveis para consulta a qualquer momento.",
    href: "/termos-de-uso" as const,
  },
] as const;

function FooterTrustSeals() {
  return (
    <div className="border-t border-gold/20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {FOOTER_TRUST_SEALS.map((seal) =>
            seal.href ? (
              <Link key={seal.label} to={seal.href} className="footer-seal footer-seal-link group">
                <span className="footer-seal-label">{seal.label}</span>
                <span className="footer-seal-text group-hover:text-foreground transition-colors">
                  {seal.text}
                </span>
              </Link>
            ) : (
              <div key={seal.label} className="footer-seal">
                <span className="footer-seal-label">{seal.label}</span>
                <span className="footer-seal-text">{seal.text}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function Footer({ content }: { content: CmsData["content"] }) {
  return (
    <footer className="relative z-10 border-t border-gold/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10 grid md:grid-cols-4 gap-6">
        <div className="md:col-span-2 space-y-4 rounded-lg panel-outline p-5">
          <div className="flex items-center gap-4">
            <SiteLogo
              src={content.logoUrl}
              alt={content.brandName}
              className="h-20 md:h-24 w-auto shrink-0"
            />
            <div>
              <div className="font-display text-2xl text-gold-gradient">{content.brandName}</div>
            </div>
          </div>
          <p className="text-base text-muted-foreground max-w-md leading-relaxed">
            {content.footer.description}
          </p>
        </div>

        <div className="space-y-3 rounded-lg panel-outline p-5">
          <div className="text-sm uppercase tracking-[0.2em] text-gold">Institucional</div>
          <ul className="space-y-2 text-base text-muted-foreground">
            {FOOTER_SECTION_LINKS.map((l) => (
              <li key={l.href}>
                <a href={`#${l.href}`} className="hover:text-gold transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 rounded-lg panel-outline p-5">
          <div className="text-sm uppercase tracking-[0.2em] text-gold">Políticas</div>
          <ul className="space-y-2 text-base text-muted-foreground">
            <li>
              <Link to="/politica-de-privacidade" className="hover:text-gold transition-colors">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link to="/termos-de-uso" className="hover:text-gold transition-colors">
                Termos de Uso
              </Link>
            </li>
            <li>
              <a href="#contato" className="hover:text-gold transition-colors">
                Contato
              </a>
            </li>
          </ul>
        </div>
      </div>
      <FooterTrustSeals />
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {content.brandName}. Todos os direitos reservados.
          </span>
          <span className="tracking-[0.16em] uppercase">{content.footer.cnpj}</span>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------- Floating WA --------------------------- */
function FloatingCart({
  count,
  total,
  onOpen,
}: {
  count: number;
  total: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-6 left-6 z-30 flex items-center gap-3 rounded-full border border-gold/50 bg-background/95 px-4 py-3 text-foreground shadow-gold-glow transition-transform hover:scale-[1.02]"
      aria-label="Abrir carrinho"
    >
      <span className="relative text-left leading-tight">
        <span className="block text-xs uppercase tracking-[0.18em] text-foreground">Carrinho</span>
        <span className="font-price text-base text-gold">{BRL.format(total)}</span>
      </span>
      {count > 0 ? (
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full border border-gold bg-background px-1.5 text-[11px] font-bold text-gold">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function FloatingWhatsapp({ brandName, whatsapp }: { brandName: string; whatsapp: string }) {
  return (
    <a
      href={waLink(whatsapp, `Olá! Vim pelo site da ${brandName} e gostaria de mais informações.`)}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-30 rounded-full bg-gold-gradient px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-gold-glow hover:scale-[1.03] transition-transform"
      aria-label="Falar no WhatsApp"
    >
      WhatsApp
    </a>
  );
}

/* ----------------------------- Lightbox ----------------------------- */
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/95 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold hover:bg-gold hover:text-primary-foreground transition-colors"
        aria-label="Fechar"
      >
        Fechar
      </button>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full rounded-lg shadow-deep border border-gold"
      />
    </div>
  );
}

/* ------------------------------ Utils ------------------------------ */
function waLink(whatsapp: string, msg: string) {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
}

function formatWhatsappDisplay(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `(${ddd}) ${part1}-${part2}`;
  }
  return whatsapp;
}

function isGenericSocialUrl(url: string): boolean {
  const normalized = url.trim().replace(/\/$/, "").toLowerCase();
  return (
    normalized === "https://instagram.com" ||
    normalized === "https://www.instagram.com" ||
    normalized === "https://facebook.com" ||
    normalized === "https://www.facebook.com"
  );
}
