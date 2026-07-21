import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { getPublicCms } from "@/lib/cms/api";
import { NAV_SECTION_META, normalizeSectionOrder } from "@/lib/cms/sections";
import type { CmsData, CmsPageSection } from "@/lib/cms/types";

export const Route = createFileRoute("/")({
  loader: () => getPublicCms(),
  component: SalgadosBorgesPage,
});

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type CartProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  image: string;
};

type CartItem = { product: CartProduct; qty: number };

function SalgadosBorgesPage() {
  const cms = Route.useLoaderData() as CmsData;
  const { content, settings } = cms;
  const sections = settings.sections;
  const sectionOrder = normalizeSectionOrder(settings.sectionOrder);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cms.categories) map.set(c.id, c.name);
    return map;
  }, [cms.categories]);

  const products: CartProduct[] = useMemo(
    () =>
      cms.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        unit: p.unit,
        category: categoryNameById.get(p.categoryId) ?? "",
        image: p.image,
      })),
    [cms.products, categoryNameById],
  );

  const categories = useMemo(
    () => ["Todos", ...cms.categories.map((c) => c.name)],
    [cms.categories],
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const addToCart = (product: CartProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0),
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.product.id !== id));

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.product.price * i.qty, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);

  const filtered =
    category === "Todos" ? products : products.filter((p) => p.category === category);

  useEffect(() => {
    if (lightbox || cartOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightbox, cartOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
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
              onOrder={() => scrollTo("produtos")}
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
              onCategory={setCategory}
              onAdd={addToCart}
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
            <Avaliacoes
              key={key}
              section={content.testimonials}
              testimonials={cms.testimonials}
            />
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

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        total={total}
        brandName={content.brandName}
        whatsapp={settings.whatsapp}
        onQty={updateQty}
        onRemove={removeItem}
      />

      {lightbox ? <Lightbox src={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
    const onScroll = () => setScrolled(window.scrollY > 40);
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
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-gold/20 shadow-deep"
          : "bg-gradient-to-b from-background/70 to-transparent backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-10 flex items-center justify-between gap-3 h-24 md:h-28">
        <a href="#top" className="flex items-center gap-3 md:gap-4 group min-w-0 flex-1">
          <img
            src={logoUrl}
            alt={brandName}
            className="h-14 w-14 md:h-[4.5rem] md:w-[4.5rem] shrink-0 rounded-full object-cover"
          />
          <div className="leading-tight">
            <div className="font-display text-xl sm:text-2xl md:text-3xl lg:text-[2rem] text-gold-gradient tracking-wide whitespace-nowrap">
              {brandName}
            </div>
          </div>
        </a>

        <div className="flex items-center gap-2 md:gap-5 shrink-0">
          <nav className="hidden lg:flex items-center gap-5">
            {links.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="relative text-base text-foreground hover:text-gold transition-colors tracking-wide after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 rounded-full bg-gold-gradient text-primary-foreground px-4 md:px-5 py-2.5 md:py-3 text-sm uppercase tracking-[0.18em] font-semibold shadow-gold-sm hover:shadow-gold-glow transition-all"
          >
            <CartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Pedido</span>
            {cartCount > 0 ? (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border border-gold text-gold text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            ) : null}
          </button>

          <button
            className="lg:hidden text-gold p-2 -mr-2"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="lg:hidden bg-background/95 backdrop-blur border-t border-gold/20">
          <div className="px-6 py-6 flex flex-col gap-4">
            {links.map((l) => (
              <button
                key={l.href}
                onClick={() => {
                  scrollTo(l.href);
                  setMobileOpen(false);
                }}
                className="text-left text-base uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
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
  onOrder: () => void;
  onMenu: () => void;
}) {
  const { hero, brandName, logoUrl } = content;
  const imageOpacity = Math.max(0, Math.min(100, hero.imageOpacity ?? 100)) / 100;
  const overlayOpacity = Math.max(0, Math.min(100, hero.overlayOpacity ?? 60)) / 100;

  return (
    <section
      id="top"
      className="relative flex items-center justify-center pt-28 md:pt-32 pb-12 md:pb-16 overflow-hidden min-h-[72vh] md:min-h-[78vh]"
    >
      <div className="absolute inset-0">
        <img
          key={hero.image}
          src={hero.image}
          alt=""
          className="h-full w-full object-cover"
          style={{ opacity: imageOpacity }}
          width={1920}
          height={1080}
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background"
          style={{ opacity: overlayOpacity }}
        />
        <div className="absolute inset-0 bg-noise opacity-40" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center flex flex-col items-center gap-5 md:gap-6">
        <div className="relative">
          <img
            src={logoUrl}
            alt={brandName}
            className="relative h-52 w-52 sm:h-64 sm:w-64 md:h-80 md:w-80 lg:h-[22rem] lg:w-[22rem] rounded-full object-cover"
          />
        </div>

        <h1 className="sr-only">{brandName}</h1>
        <p className="font-display leading-[1.08] text-3xl sm:text-4xl md:text-5xl lg:text-6xl animate-fade-up">
          <span className="block text-foreground">{hero.titleLine1}</span>
          {hero.titleLine2 ? (
            <span className="block shimmer-text italic">{hero.titleLine2}</span>
          ) : null}
          {hero.titleLine3 ? (
            <span className="block text-gold-gradient">{hero.titleLine3}</span>
          ) : null}
        </p>

        <p
          className="max-w-xl text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          {hero.subtitle}
        </p>

        <div
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <a
            href={waLink(whatsapp, "Olá! Gostaria de fazer um pedido pelo site.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-gradient text-primary-foreground px-7 py-3.5 text-sm sm:text-base font-semibold uppercase tracking-[0.18em] shadow-gold-glow hover:shadow-gold transition-all"
          >
            <WhatsIcon className="h-4 w-4" />
            {hero.ctaPrimary}
          </a>
          <button
            onClick={onMenu}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gold text-gold px-7 py-3.5 text-sm sm:text-base font-semibold uppercase tracking-[0.18em] hover:bg-gold hover:text-primary-foreground transition-all"
          >
            {hero.ctaSecondary}
          </button>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center text-sm sm:text-base uppercase tracking-[0.2em] text-foreground pt-2">
          {hero.badges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Sobre ------------------------------ */
function Sobre({
  about,
  brandName,
}: {
  about: CmsData["content"]["about"];
  brandName: string;
}) {
  return (
    <section id="sobre" className="relative py-14 lg:py-20 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-noise opacity-60" />

      <div className="mx-auto max-w-7xl px-6 lg:px-10 space-y-8 lg:space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <span className="divider-gold">{about.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            {about.title}
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
            <p key={p.slice(0, 40)} className="text-base md:text-lg text-foreground leading-relaxed">
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
  onCategory,
  onAdd,
}: {
  section: CmsData["content"]["productsSection"];
  products: CartProduct[];
  categories: string[];
  category: string;
  onCategory: (c: string) => void;
  onAdd: (p: CartProduct) => void;
}) {
  return (
    <section id="produtos" className="relative py-14 lg:py-20 bg-surface">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-40" />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="rounded-xl panel-outline p-6 md:p-10">
        <div className="text-center max-w-3xl mx-auto space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            {section.title}
            <span className="text-gold-gradient italic"> {section.titleAccent}</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">{section.subtitle}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 mb-8">
          {categories.map((c) => (
            <button
              key={c}
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
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={onAdd} />
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product, onAdd }: { product: CartProduct; onAdd: (p: CartProduct) => void }) {
  return (
    <article className="group relative overflow-hidden rounded-lg bg-background panel-outline hover:border-gold transition-all duration-500">
      <div className="aspect-square overflow-hidden bg-surface-2 relative border-b border-border">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          width={900}
          height={900}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent opacity-70" />
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.14em] text-gold border border-gold rounded-full px-2.5 py-0.5 bg-background/60 backdrop-blur">
          {product.category}
        </span>
      </div>
      <div className="p-4 space-y-2.5">
        <h3 className="font-display text-lg leading-tight text-foreground">{product.name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed min-h-[40px]">{product.description}</p>
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border">
          <div className="min-w-0">
            <div className="font-price text-xl text-gold">{BRL.format(product.price)}</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">por {product.unit}</div>
          </div>
          <button
            onClick={() => onAdd(product)}
            className="shrink-0 inline-flex h-9 items-center gap-1 rounded-full bg-gold-gradient px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            <PlusIcon className="h-3 w-3" />
            Adicionar
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
    <section id="como-funciona" className="py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            {section.title}
            <span className="text-gold-gradient italic"> {section.titleAccent}</span>
          </h2>
        </div>

        <div className="relative grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className="relative rounded-lg panel-outline p-6 hover:border-gold transition-all"
            >
              <div className="font-display text-5xl text-gold-gradient opacity-90">{step.number}</div>
              <h3 className="mt-4 font-display text-xl text-foreground">{step.title}</h3>
              <p className="mt-2 text-base text-muted-foreground leading-relaxed">{step.text}</p>
              {idx < steps.length - 1 ? (
                <div className="hidden lg:block absolute top-10 -right-3 text-gold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </div>
              ) : null}
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
    <section className="py-14 lg:py-20 bg-surface relative">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            {section.title}
            <span className="text-gold-gradient italic"> {section.titleAccent}</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((d) => (
            <div
              key={d.id}
              className="group relative overflow-hidden rounded-lg panel-outline p-8 hover:border-gold transition-all"
            >
              <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gold-gradient opacity-0 group-hover:opacity-20 transition-opacity blur-3xl" />
              <div className="h-10 w-10 rounded-full bg-gold-gradient text-primary-foreground flex items-center justify-center mb-5">
                <SealIcon className="h-5 w-5" />
              </div>
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
    <section id="galeria" className="py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-3xl mx-auto space-y-5 mb-8">
            <span className="divider-gold">{section.eyebrow}</span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
              {section.title}
              <span className="text-gold-gradient italic"> {section.titleAccent}</span>
            </h2>
          <p className="text-base md:text-lg text-foreground max-w-md mx-auto">{section.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => onOpen(item.image)}
              className={`group relative overflow-hidden rounded-lg panel-outline hover:border-gold transition-all ${
                i === 0 ? "md:row-span-2 md:col-span-1 aspect-square md:aspect-auto" : "aspect-square"
              }`}
            >
              <img
                src={item.image}
                alt={item.alt}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="rounded-full border border-gold text-gold h-10 w-10 flex items-center justify-center">
                  <ZoomIcon className="h-4 w-4" />
                </span>
              </div>
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
    <section className="py-14 lg:py-20 bg-surface">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            {section.title}
            <span className="text-gold-gradient italic"> {section.titleAccent}</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((d) => (
            <blockquote
              key={d.id}
              className="relative rounded-lg panel-outline p-8 flex flex-col gap-5"
            >
              <div className="absolute -top-4 left-6 font-display text-6xl text-gold-gradient leading-none">“</div>
              <div className="flex gap-1 pt-2">
                {Array.from({ length: d.stars }).map((_, i) => (
                  <StarIcon key={i} className="h-4 w-4 text-gold" />
                ))}
              </div>
              <p className="text-foreground/90 leading-relaxed italic">{d.text}</p>
              <footer className="pt-4 border-t border-border">
                <div className="font-display text-lg text-foreground">{d.name}</div>
                <div className="text-sm uppercase tracking-[0.16em] text-muted-foreground">{d.role}</div>
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
    <section className="py-14 lg:py-20">
      <div className="mx-auto max-w-4xl px-6 lg:px-10">
        <div className="text-center space-y-5 mb-8">
          <span className="divider-gold">{section.eyebrow}</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            {section.title}
            <span className="text-gold-gradient italic"> {section.titleAccent}</span>
          </h2>
        </div>

        <div className="space-y-3">
          {items.map((f, i) => {
            const open = openIndex === i;
            return (
              <div key={f.id} className="rounded-lg panel-outline overflow-hidden">
                <button
                  onClick={() => onToggle(i)}
                  className="w-full flex items-center justify-between gap-5 px-6 py-5 text-left hover:bg-surface-2 transition-colors"
                >
                  <span className="font-display text-lg md:text-xl text-foreground">{f.question}</span>
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
                    <p className="px-6 pb-6 text-base text-muted-foreground leading-relaxed">{f.answer}</p>
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

  const contacts = [
    { icon: <PhoneIcon className="h-4 w-4" />, label: "Telefone", value: settings.phone },
    { icon: <WhatsIcon className="h-4 w-4" />, label: "WhatsApp", value: settings.phone },
    { icon: <MailIcon className="h-4 w-4" />, label: "E-mail", value: settings.email },
    { icon: <PinIcon className="h-4 w-4" />, label: "Endereço", value: settings.address },
    { icon: <ClockIcon className="h-4 w-4" />, label: "Atendimento", value: settings.hours },
  ];

  return (
    <section id="contato" className="py-14 lg:py-20 bg-surface">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-2 gap-8">
        <div className="space-y-8 rounded-lg panel-outline p-6 md:p-8">
          <div className="space-y-5 text-center lg:text-left">
            <span className="divider-gold">{section.eyebrow}</span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
              {section.title}
              <span className="text-gold-gradient italic"> {section.titleAccent}</span>
            </h2>
            <p className="text-base md:text-lg text-foreground max-w-md mx-auto lg:mx-0">{section.subtitle}</p>
          </div>

          <div className="space-y-5">
            {contacts.map((c) => (
              <div key={c.label} className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full border border-gold text-gold flex items-center justify-center">
                  {c.icon}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{c.label}</div>
                  <div className="text-base text-foreground">{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            {[
              { label: "Instagram", href: settings.instagramUrl },
              { label: "Facebook", href: settings.facebookUrl },
            ].map((s) => (
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
        </div>

        <div className="space-y-6">
          <form onSubmit={submit} className="rounded-lg panel-outline p-8 space-y-4">
            <Field label="Nome completo">
              <input
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full field-outline bg-background/50 px-3 py-2.5 focus:border-gold outline-none transition-colors"
              />
            </Field>
            <Field label="Telefone">
              <input
                required
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full field-outline bg-background/50 px-3 py-2.5 focus:border-gold outline-none transition-colors"
              />
            </Field>
            <Field label="Mensagem">
              <textarea
                required
                rows={5}
                value={form.mensagem}
                onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                className="w-full field-outline bg-background/50 px-3 py-2.5 focus:border-gold outline-none transition-colors resize-none"
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-full bg-gold-gradient text-primary-foreground py-3.5 text-base uppercase tracking-[0.18em] font-semibold shadow-gold-glow hover:shadow-gold transition-all"
            >
              Enviar mensagem
            </button>
          </form>

          <div className="rounded-lg overflow-hidden panel-outline h-64 bg-surface-2">
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
function Footer({ content }: { content: CmsData["content"] }) {
  return (
    <footer className="border-t border-gold/30 bg-background">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10 grid md:grid-cols-4 gap-6">
        <div className="md:col-span-2 space-y-4 rounded-lg panel-outline p-5">
          <div className="flex items-center gap-4">
            <img
              src={content.logoUrl}
              alt={content.brandName}
              className="h-20 w-20 md:h-24 md:w-24 shrink-0 rounded-full object-cover"
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
            {["Sobre", "Cardápio", "Como funciona", "Galeria"].map((l) => (
              <li key={l}>
                <a href="#top" className="hover:text-gold transition-colors">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 rounded-lg panel-outline p-5">
          <div className="text-sm uppercase tracking-[0.2em] text-gold">Políticas</div>
          <ul className="space-y-2 text-base text-muted-foreground">
            <li>
              <a href="#" className="hover:text-gold transition-colors">
                Política de Privacidade
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-gold transition-colors">
                Termos de Uso
              </a>
            </li>
            <li>
              <a href="#contato" className="hover:text-gold transition-colors">
                Contato
              </a>
            </li>
          </ul>
        </div>
      </div>
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
      className="fixed bottom-6 left-6 z-30 flex items-center gap-3 rounded-full border border-gold/50 bg-background/95 px-4 py-3 text-foreground shadow-gold-glow backdrop-blur-md transition-transform hover:scale-[1.03]"
      aria-label="Abrir carrinho"
    >
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gold-gradient text-primary-foreground">
        <CartIcon className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-gold bg-background px-1 text-[11px] font-bold text-gold">
          {count}
        </span>
      </span>
      <span className="pr-1 text-left leading-tight">
        <span className="block text-xs uppercase tracking-[0.18em] text-foreground">Carrinho</span>
        <span className="font-price text-base text-gold">{BRL.format(total)}</span>
      </span>
    </button>
  );
}

function FloatingWhatsapp({ brandName, whatsapp }: { brandName: string; whatsapp: string }) {
  return (
    <a
      href={waLink(whatsapp, `Olá! Vim pelo site da ${brandName} e gostaria de mais informações.`)}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-gold-gradient text-primary-foreground flex items-center justify-center shadow-gold-glow hover:scale-110 transition-transform"
      aria-label="Falar no WhatsApp"
    >
      <WhatsIcon className="h-6 w-6" />
    </a>
  );
}

/* ---------------------------- Cart Drawer ---------------------------- */
function CartDrawer({
  open,
  onClose,
  items,
  total,
  brandName,
  whatsapp,
  onQty,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  brandName: string;
  whatsapp: string;
  onQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", obs: "" });

  const buildMessage = () => {
    const nome = form.nome.trim() || "não informado";
    const telefone = form.telefone.trim() || "não informado";
    const lines = [
      `Novo pedido ${brandName}`,
      "",
      `Cliente: ${nome}`,
      `Telefone: ${telefone}`,
      "",
      "Itens do pedido:",
      ...items.map((i) => `${i.qty}x ${i.product.name} (${BRL.format(i.product.price * i.qty)})`),
      "",
      `Total: ${BRL.format(total)}`,
    ];
    if (form.obs.trim()) {
      lines.push("", `Observações: ${form.obs.trim()}`);
    }
    return lines.join("\n");
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!form.nome.trim() || !form.telefone.trim()) return;
    window.open(waLink(whatsapp, buildMessage()), "_blank");
    setCheckoutOpen(false);
  };

  useEffect(() => {
    if (!open) setCheckoutOpen(false);
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] bg-surface border-l border-gold/40 shadow-deep transform transition-transform duration-500 ${
          open ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Seu pedido</div>
            <div className="font-display text-2xl text-gold-gradient">Carrinho</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-gold" aria-label="Fechar carrinho">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="h-16 w-16 mx-auto rounded-full border border-gold text-gold flex items-center justify-center">
                <CartIcon className="h-6 w-6" />
              </div>
              <p className="text-muted-foreground text-base">Seu carrinho está vazio.</p>
              <button
                onClick={onClose}
                className="text-sm uppercase tracking-[0.2em] text-gold hover:underline"
              >
                Ver cardápio
              </button>
            </div>
          ) : (
            items.map((i) => (
              <div key={i.product.id} className="flex gap-4 border-b border-border pb-4">
                <img
                  src={i.product.image}
                  alt=""
                  className="h-20 w-20 rounded-md object-cover border border-border"
                  loading="lazy"
                />
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <div className="font-display text-base text-foreground leading-tight">{i.product.name}</div>
                    <button
                      onClick={() => onRemove(i.product.id)}
                      className="text-muted-foreground hover:text-destructive text-xs"
                      aria-label="Remover"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {BRL.format(i.product.price)} / {i.product.unit}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <QtyBtn onClick={() => onQty(i.product.id, -1)}>-</QtyBtn>
                      <span className="w-8 text-center text-sm">{i.qty}</span>
                      <QtyBtn onClick={() => onQty(i.product.id, 1)}>+</QtyBtn>
                    </div>
                    <div className="font-price text-lg text-gold">
                      {BRL.format(i.product.price * i.qty)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 ? (
          <div className="border-t border-border p-6 space-y-4 bg-background/50">
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Total estimado</span>
              <span className="font-price text-3xl text-gold">{BRL.format(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-gold-gradient text-primary-foreground py-3.5 text-base uppercase tracking-[0.18em] font-semibold shadow-gold-glow hover:shadow-gold transition-all"
            >
              <WhatsIcon className="h-4 w-4" />
              Finalizar no WhatsApp
            </button>
          </div>
        ) : null}
      </aside>

      {checkoutOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fechar"
            onClick={() => setCheckoutOpen(false)}
          />
          <form
            onSubmit={send}
            className="relative z-10 w-full max-w-md rounded-t-xl border border-gold/40 bg-background p-6 sm:rounded-xl space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl text-gold-gradient">Finalizar pedido</h3>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="text-sm text-muted-foreground hover:text-gold"
                aria-label="Fechar"
              >
                Fechar
              </button>
            </div>
            <p className="text-sm text-foreground">
              Preencha seus dados para enviar o pedido pelo WhatsApp.
            </p>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Nome</span>
              <input
                required
                autoFocus
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full field-outline bg-background/50 px-3 py-2.5 text-sm focus:border-gold outline-none"
                placeholder="Seu nome completo"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Telefone</span>
              <input
                required
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full field-outline bg-background/50 px-3 py-2.5 text-sm focus:border-gold outline-none"
                placeholder="Telefone com DDD"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Observações</span>
              <textarea
                rows={3}
                value={form.obs}
                onChange={(e) => setForm({ ...form, obs: e.target.value })}
                className="w-full field-outline bg-background/50 px-3 py-2.5 text-sm focus:border-gold outline-none resize-none"
                placeholder="Opcional"
              />
            </label>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-full bg-gold-gradient text-primary-foreground py-3.5 text-base uppercase tracking-[0.18em] font-semibold shadow-gold-glow hover:shadow-gold transition-all"
            >
              <WhatsIcon className="h-4 w-4" />
              Enviar no WhatsApp
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

function QtyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 w-7 rounded-full border border-border text-gold hover:border-gold transition-colors flex items-center justify-center text-sm"
    >
      {children}
    </button>
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
      className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 h-11 w-11 rounded-full border border-gold text-gold flex items-center justify-center"
        aria-label="Fechar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
      <img src={src} alt="" className="max-w-full max-h-full rounded-lg shadow-deep border border-gold" />
    </div>
  );
}

/* ------------------------------ Utils ------------------------------ */
function waLink(whatsapp: string, msg: string) {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
}

/* ------------------------------ Icons ------------------------------ */
function CartIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 4h2l2.5 12h11L21 8H6" />
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </svg>
  );
}
function WhatsIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.5 3.5A11 11 0 0 0 3.9 18l-1.4 5.1 5.3-1.4a11 11 0 0 0 5.2 1.3h.1c6 0 10.9-4.9 10.9-10.9 0-2.9-1.1-5.7-3.5-7.6zm-8.5 17c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A9 9 0 1 1 21 12.1 9 9 0 0 1 12 20.5zm5-6.6c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.2.3-.4.1-.2 0-.3 0-.5s-.6-1.5-.9-2c-.2-.5-.5-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.2.1-1.3 0-.1-.2-.2-.5-.3z" />
    </svg>
  );
}
function PlusIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function SealIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2l2.5 2.5L18 4l1 3.5L21.5 9 20 12l1.5 3-2.5 1.5L18 20l-3.5-.5L12 22l-2.5-2.5L6 20l-1-3.5L2.5 15 4 12l-1.5-3L5 7.5 6 4l3.5.5z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function ZoomIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6M11 8v6" />
    </svg>
  );
}
function StarIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8l-6.6 3.9 1.8-7.3L1.5 9.5 9 8.9z" />
    </svg>
  );
}
function PhoneIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 20 20 0 0 1-8.7-3.1 20 20 0 0 1-6-6A20 20 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2L8 9.6a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
function MailIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
function PinIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function ClockIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
