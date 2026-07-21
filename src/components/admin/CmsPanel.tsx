import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  deleteCollectionItem,
  getAdminCms,
  logoutAdmin,
  resetCmsToSeed,
  saveContent,
  saveSettings,
  toggleCollectionItem,
  upsertCollectionItem,
} from "@/lib/cms/api";
import type {
  CmsCollection,
  CmsContent,
  CmsData,
  CmsFeature,
  CmsFaqItem,
  CmsGalleryItem,
  CmsProduct,
  CmsCategory,
  CmsSettings,
  CmsStep,
  CmsTestimonial,
} from "@/lib/cms/types";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  ImageUploadField,
  VisibilityBadge,
} from "./ui";

type SectionId =
  | "dashboard"
  | "products"
  | "categories"
  | "gallery"
  | "faq"
  | "testimonials"
  | "steps"
  | "features"
  | "content"
  | "settings"
  | "visibility";

const NAV: { id: SectionId; label: string }[] = [
  { id: "dashboard", label: "Visão geral" },
  { id: "products", label: "Produtos" },
  { id: "categories", label: "Categorias" },
  { id: "gallery", label: "Galeria" },
  { id: "faq", label: "FAQ" },
  { id: "testimonials", label: "Depoimentos" },
  { id: "steps", label: "Como funciona" },
  { id: "features", label: "Diferenciais" },
  { id: "content", label: "Textos & Hero" },
  { id: "settings", label: "Contato & SEO" },
  { id: "visibility", label: "Mostrar / Ocultar" },
];

export function CmsPanel({ initial }: { initial: CmsData }) {
  const navigate = useNavigate();
  const [cms, setCms] = useState(initial);
  const [section, setSection] = useState<SectionId>("dashboard");
  const [busy, setBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const reload = async () => {
    const next = await getAdminCms();
    setCms(next);
  };

  const run = async (fn: () => Promise<CmsData | void>, okMsg: string) => {
    setBusy(true);
    try {
      const result = await fn();
      if (result) setCms(result);
      else await reload();
      toast.success(okMsg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      if (msg === "UNAUTHORIZED" || msg.includes("UNAUTHORIZED")) {
        toast.error("Sessão expirada. Faça login novamente.");
        void navigate({ to: "/admin/login" });
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    await logoutAdmin();
    void navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-surface transition-transform lg:static lg:translate-x-0 ${
            mobileNav ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center border-b border-border px-5">
            <div>
              <div className="font-display text-lg text-gold-gradient">CMS Admin</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Salgados Borges</div>
            </div>
          </div>
          <nav className="space-y-1 p-3">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  setMobileNav(false);
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  section === item.id
                    ? "bg-gold/15 text-gold"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="absolute bottom-0 inset-x-0 border-t border-border p-3 space-y-2">
            <Link
              to="/"
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              Ver site
            </Link>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              Sair
            </button>
          </div>
        </aside>

        {mobileNav ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileNav(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md border border-gold/35 px-3 py-1.5 text-sm lg:hidden"
                onClick={() => setMobileNav(true)}
              >
                Menu
              </button>
              <h1 className="font-display text-xl">{NAV.find((n) => n.id === section)?.label}</h1>
            </div>
            <div className="text-xs text-muted-foreground">
              Atualizado: {new Date(cms.updatedAt).toLocaleString("pt-BR")}
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8">
            {section === "dashboard" ? (
              <Dashboard cms={cms} busy={busy} onReset={() => run(() => resetCmsToSeed(), "CMS restaurado")} />
            ) : null}
            {section === "products" ? (
              <ProductsSection cms={cms} busy={busy} run={run} />
            ) : null}
            {section === "categories" ? (
              <CategoriesSection cms={cms} busy={busy} run={run} />
            ) : null}
            {section === "gallery" ? <GallerySection cms={cms} busy={busy} run={run} /> : null}
            {section === "faq" ? <FaqSection cms={cms} busy={busy} run={run} /> : null}
            {section === "testimonials" ? <TestimonialsSection cms={cms} busy={busy} run={run} /> : null}
            {section === "steps" ? <StepsSection cms={cms} busy={busy} run={run} /> : null}
            {section === "features" ? <FeaturesSection cms={cms} busy={busy} run={run} /> : null}
            {section === "content" ? (
              <ContentSection
                content={cms.content}
                busy={busy}
                onSave={(content) => run(() => saveContent({ data: { content } }), "Textos salvos")}
              />
            ) : null}
            {section === "settings" ? (
              <SettingsSection
                settings={cms.settings}
                busy={busy}
                onSave={(settings) => run(() => saveSettings({ data: { settings } }), "Configurações salvas")}
              />
            ) : null}
            {section === "visibility" ? (
              <VisibilitySection
                settings={cms.settings}
                busy={busy}
                onSave={(settings) => run(() => saveSettings({ data: { settings } }), "Visibilidade atualizada")}
              />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

type RunFn = (fn: () => Promise<CmsData | void>, okMsg: string) => Promise<void>;

function Dashboard({
  cms,
  busy,
  onReset,
}: {
  cms: CmsData;
  busy: boolean;
  onReset: () => void;
}) {
  const cards = [
    { label: "Produtos", value: cms.products.length },
    { label: "Categorias", value: cms.categories.length },
    { label: "Galeria", value: cms.gallery.length },
    { label: "FAQ", value: cms.faq.length },
    { label: "Depoimentos", value: cms.testimonials.length },
    { label: "Ocultos (produtos)", value: cms.products.filter((p) => !p.visible).length },
  ];

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Gerencie todo o conteúdo do site: produtos, textos, imagens, contato e seções visíveis. As alterações
        aparecem na página pública após salvar.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-gold/35 bg-surface p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="mt-2 font-display text-4xl text-gold-gradient">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-gold/35 bg-surface p-5 space-y-3">
        <h2 className="font-display text-2xl">Ações</h2>
        <p className="text-sm text-muted-foreground">
          Restaurar o conteúdo original do site (seed). Isso sobrescreve o arquivo <code>data/cms.json</code>.
        </p>
        <AdminButton type="button" variant="danger" disabled={busy} onClick={onReset}>
          Restaurar conteúdo inicial
        </AdminButton>
      </div>
    </div>
  );
}

function CollectionToolbar({
  onNew,
  busy,
}: {
  onNew: () => void;
  busy: boolean;
}) {
  return (
    <div className="mb-4 flex justify-end">
      <AdminButton type="button" disabled={busy} onClick={onNew}>
        Adicionar
      </AdminButton>
    </div>
  );
}

function ProductsSection({ cms, busy, run }: { cms: CmsData; busy: boolean; run: RunFn }) {
  const empty: CmsProduct = {
    id: "",
    name: "",
    description: "",
    price: 0,
    unit: "cento",
    categoryId: cms.categories[0]?.id || "",
    image: "",
    visible: true,
    order: cms.products.length,
  };
  const [editing, setEditing] = useState<CmsProduct | null>(null);

  return (
    <div>
      <CollectionToolbar busy={busy} onNew={() => setEditing(empty)} />
      <div className="overflow-x-auto rounded-lg border border-gold/35">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {cms.products.map((p) => {
              const cat = cms.categories.find((c) => c.id === p.categoryId)?.name || p.categoryId;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="h-12 w-12 rounded object-cover bg-surface-2" />
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{cat}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / {p.unit}
                  </td>
                  <td className="px-4 py-3">
                    <VisibilityBadge visible={p.visible} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <AdminButton type="button" variant="ghost" onClick={() => setEditing(p)}>
                        Editar
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => toggleCollectionItem({ data: { collection: "products", id: p.id } }),
                            p.visible ? "Produto ocultado" : "Produto visível",
                          )
                        }
                      >
                        {p.visible ? "Ocultar" : "Mostrar"}
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          if (confirm("Excluir este produto?")) {
                            void run(
                              () => deleteCollectionItem({ data: { collection: "products", id: p.id } }),
                              "Produto excluído",
                            );
                          }
                        }}
                      >
                        Excluir
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ? (
        <ProductEditor
          product={editing}
          categories={cms.categories}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(item) =>
            run(async () => {
              const next = await upsertCollectionItem({
                data: { collection: "products", item: item as unknown as Record<string, unknown> },
              });
              setEditing(null);
              return next;
            }, "Produto salvo")
          }
        />
      ) : null}
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  busy,
  onClose,
  onSave,
}: {
  product: CmsProduct;
  categories: CmsCategory[];
  busy: boolean;
  onClose: () => void;
  onSave: (p: CmsProduct) => void;
}) {
  const [form, setForm] = useState(product);
  useEffect(() => setForm(product), [product]);

  return (
    <Modal title={form.id ? "Editar produto" : "Novo produto"} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Nome">
          <AdminInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </AdminField>
        <AdminField label="Categoria">
          <AdminSelect
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField label="Preço">
          <AdminInput
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
        </AdminField>
        <AdminField label="Unidade">
          <AdminInput value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </AdminField>
        <div className="sm:col-span-2">
          <AdminField label="Descrição">
            <AdminTextarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </AdminField>
        </div>
        <div className="sm:col-span-2">
          <ImageUploadField label="Imagem" value={form.image} onChange={(image) => setForm({ ...form, image })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.visible}
            onChange={(e) => setForm({ ...form, visible: e.target.checked })}
          />
          Visível no site
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <AdminButton type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </AdminButton>
        <AdminButton type="button" disabled={busy || !form.name} onClick={() => onSave(form)}>
          Salvar
        </AdminButton>
      </div>
    </Modal>
  );
}

function CategoriesSection({ cms, busy, run }: { cms: CmsData; busy: boolean; run: RunFn }) {
  const [editing, setEditing] = useState<CmsCategory | null>(null);

  return (
    <div>
      <p className="mb-4 text-sm text-foreground/90">
        Adicione, edite, oculte ou exclua as categorias do cardápio. Os produtos usam essas categorias no site.
      </p>
      <CollectionToolbar
        busy={busy}
        onNew={() => setEditing({ id: "", name: "", visible: true, order: cms.categories.length })}
      />
      {cms.categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-foreground/80">
          Nenhuma categoria ainda. Clique em <strong>Adicionar</strong> para criar a primeira.
        </div>
      ) : (
      <ListCard>
        {cms.categories.map((c) => (
          <ListRow
            key={c.id}
            title={c.name}
            badge={<VisibilityBadge visible={c.visible} />}
            actions={
              <>
                <AdminButton type="button" variant="ghost" onClick={() => setEditing(c)}>
                  Editar
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => toggleCollectionItem({ data: { collection: "categories", id: c.id } }),
                      "Categoria atualizada",
                    )
                  }
                >
                  {c.visible ? "Ocultar" : "Mostrar"}
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Excluir categoria?")) {
                      void run(
                        () => deleteCollectionItem({ data: { collection: "categories", id: c.id } }),
                        "Categoria excluída",
                      );
                    }
                  }}
                >
                  Excluir
                </AdminButton>
              </>
            }
          />
        ))}
      </ListCard>
      )}
      {editing ? (
        <Modal title={editing.id ? "Editar categoria" : "Nova categoria"} onClose={() => setEditing(null)}>
          <AdminField label="Nome">
            <AdminInput
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </AdminField>
          <div className="mt-6 flex justify-end gap-2">
            <AdminButton type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </AdminButton>
            <AdminButton
              type="button"
              disabled={busy || !editing.name}
              onClick={() =>
                run(async () => {
                  const next = await upsertCollectionItem({
                    data: { collection: "categories", item: editing as unknown as Record<string, unknown> },
                  });
                  setEditing(null);
                  return next;
                }, "Categoria salva")
              }
            >
              Salvar
            </AdminButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function GallerySection({ cms, busy, run }: { cms: CmsData; busy: boolean; run: RunFn }) {
  const [editing, setEditing] = useState<CmsGalleryItem | null>(null);

  return (
    <div>
      <CollectionToolbar
        busy={busy}
        onNew={() =>
          setEditing({ id: "", image: "", alt: "", visible: true, order: cms.gallery.length })
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cms.gallery.map((g) => (
          <div key={g.id} className="overflow-hidden rounded-lg border border-gold/35 bg-surface">
            <img src={g.image} alt={g.alt} className="aspect-square w-full object-cover" />
            <div className="flex items-center justify-between gap-2 p-3">
              <VisibilityBadge visible={g.visible} />
              <div className="flex gap-1">
                <AdminButton type="button" variant="ghost" onClick={() => setEditing(g)}>
                  Editar
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => toggleCollectionItem({ data: { collection: "gallery", id: g.id } }),
                      "Item atualizado",
                    )
                  }
                >
                  {g.visible ? "Ocultar" : "Mostrar"}
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Excluir imagem?")) {
                      void run(
                        () => deleteCollectionItem({ data: { collection: "gallery", id: g.id } }),
                        "Imagem excluída",
                      );
                    }
                  }}
                >
                  Excluir
                </AdminButton>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing ? (
        <Modal title={editing.id ? "Editar imagem" : "Nova imagem"} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <ImageUploadField
              label="Imagem"
              value={editing.image}
              onChange={(image) => setEditing({ ...editing, image })}
            />
            <AdminField label="Texto alternativo">
              <AdminInput
                value={editing.alt}
                onChange={(e) => setEditing({ ...editing, alt: e.target.value })}
              />
            </AdminField>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <AdminButton type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </AdminButton>
            <AdminButton
              type="button"
              disabled={busy || !editing.image}
              onClick={() =>
                run(async () => {
                  const next = await upsertCollectionItem({
                    data: { collection: "gallery", item: editing as unknown as Record<string, unknown> },
                  });
                  setEditing(null);
                  return next;
                }, "Imagem salva")
              }
            >
              Salvar
            </AdminButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function SimpleTextCollection<T extends { id: string; visible: boolean }>({
  items,
  collection,
  busy,
  run,
  createEmpty,
  renderFields,
  getTitle,
}: {
  items: T[];
  collection: CmsCollection;
  busy: boolean;
  run: RunFn;
  createEmpty: () => T;
  renderFields: (item: T, setItem: (next: T) => void) => React.ReactNode;
  getTitle: (item: T) => string;
}) {
  const [editing, setEditing] = useState<T | null>(null);

  return (
    <div>
      <CollectionToolbar busy={busy} onNew={() => setEditing(createEmpty())} />
      <ListCard>
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={getTitle(item)}
            badge={<VisibilityBadge visible={item.visible} />}
            actions={
              <>
                <AdminButton type="button" variant="ghost" onClick={() => setEditing(item)}>
                  Editar
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => toggleCollectionItem({ data: { collection, id: item.id } }),
                      "Item atualizado",
                    )
                  }
                >
                  {item.visible ? "Ocultar" : "Mostrar"}
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Excluir item?")) {
                      void run(
                        () => deleteCollectionItem({ data: { collection, id: item.id } }),
                        "Item excluído",
                      );
                    }
                  }}
                >
                  Excluir
                </AdminButton>
              </>
            }
          />
        ))}
      </ListCard>
      {editing ? (
        <Modal title={editing.id ? "Editar" : "Novo"} onClose={() => setEditing(null)}>
          <div className="space-y-4">{renderFields(editing, setEditing)}</div>
          <div className="mt-6 flex justify-end gap-2">
            <AdminButton type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </AdminButton>
            <AdminButton
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const next = await upsertCollectionItem({
                    data: { collection, item: editing as unknown as Record<string, unknown> },
                  });
                  setEditing(null);
                  return next;
                }, "Salvo")
              }
            >
              Salvar
            </AdminButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function FaqSection({ cms, busy, run }: { cms: CmsData; busy: boolean; run: RunFn }) {
  return (
    <SimpleTextCollection<CmsFaqItem>
      items={cms.faq}
      collection="faq"
      busy={busy}
      run={run}
      createEmpty={() => ({
        id: "",
        question: "",
        answer: "",
        visible: true,
        order: cms.faq.length,
      })}
      getTitle={(i) => i.question || "Sem pergunta"}
      renderFields={(item, setItem) => (
        <>
          <AdminField label="Pergunta">
            <AdminInput value={item.question} onChange={(e) => setItem({ ...item, question: e.target.value })} />
          </AdminField>
          <AdminField label="Resposta">
            <AdminTextarea value={item.answer} onChange={(e) => setItem({ ...item, answer: e.target.value })} />
          </AdminField>
        </>
      )}
    />
  );
}

function TestimonialsSection({ cms, busy, run }: { cms: CmsData; busy: boolean; run: RunFn }) {
  return (
    <SimpleTextCollection<CmsTestimonial>
      items={cms.testimonials}
      collection="testimonials"
      busy={busy}
      run={run}
      createEmpty={() => ({
        id: "",
        name: "",
        role: "",
        stars: 5,
        text: "",
        visible: true,
        order: cms.testimonials.length,
      })}
      getTitle={(i) => i.name || "Sem nome"}
      renderFields={(item, setItem) => (
        <>
          <AdminField label="Nome">
            <AdminInput value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
          </AdminField>
          <AdminField label="Papel / evento">
            <AdminInput value={item.role} onChange={(e) => setItem({ ...item, role: e.target.value })} />
          </AdminField>
          <AdminField label="Estrelas (1-5)">
            <AdminInput
              type="number"
              min={1}
              max={5}
              value={item.stars}
              onChange={(e) => setItem({ ...item, stars: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="Depoimento">
            <AdminTextarea value={item.text} onChange={(e) => setItem({ ...item, text: e.target.value })} />
          </AdminField>
        </>
      )}
    />
  );
}

function StepsSection({ cms, busy, run }: { cms: CmsData; busy: boolean; run: RunFn }) {
  return (
    <SimpleTextCollection<CmsStep>
      items={cms.steps}
      collection="steps"
      busy={busy}
      run={run}
      createEmpty={() => ({
        id: "",
        number: String(cms.steps.length + 1).padStart(2, "0"),
        title: "",
        text: "",
        visible: true,
        order: cms.steps.length,
      })}
      getTitle={(i) => `${i.number} ${i.title || "Sem título"}`}
      renderFields={(item, setItem) => (
        <>
          <AdminField label="Número">
            <AdminInput value={item.number} onChange={(e) => setItem({ ...item, number: e.target.value })} />
          </AdminField>
          <AdminField label="Título">
            <AdminInput value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
          </AdminField>
          <AdminField label="Texto">
            <AdminTextarea value={item.text} onChange={(e) => setItem({ ...item, text: e.target.value })} />
          </AdminField>
        </>
      )}
    />
  );
}

function FeaturesSection({ cms, busy, run }: { cms: CmsData; busy: boolean; run: RunFn }) {
  return (
    <SimpleTextCollection<CmsFeature>
      items={cms.features}
      collection="features"
      busy={busy}
      run={run}
      createEmpty={() => ({
        id: "",
        title: "",
        text: "",
        visible: true,
        order: cms.features.length,
      })}
      getTitle={(i) => i.title || "Sem título"}
      renderFields={(item, setItem) => (
        <>
          <AdminField label="Título">
            <AdminInput value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
          </AdminField>
          <AdminField label="Texto">
            <AdminTextarea value={item.text} onChange={(e) => setItem({ ...item, text: e.target.value })} />
          </AdminField>
        </>
      )}
    />
  );
}

function ContentSection({
  content,
  busy,
  onSave,
}: {
  content: CmsContent;
  busy: boolean;
  onSave: (c: CmsContent) => void;
}) {
  const [form, setForm] = useState(content);
  useEffect(() => setForm(content), [content]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-4 rounded-lg border border-gold/35 bg-surface p-5">
        <h2 className="font-display text-2xl">Marca</h2>
        <AdminField label="Nome">
          <AdminInput
            value={form.brandName}
            onChange={(e) => setForm({ ...form, brandName: e.target.value })}
          />
        </AdminField>
        <AdminField label="Tagline">
          <AdminInput
            value={form.brandTagline}
            onChange={(e) => setForm({ ...form, brandTagline: e.target.value })}
          />
        </AdminField>
        <ImageUploadField
          label="Logo"
          value={form.logoUrl}
          onChange={(logoUrl) => setForm({ ...form, logoUrl })}
        />
      </section>

      <section className="space-y-4 rounded-lg border border-gold/35 bg-surface p-5">
        <h2 className="font-display text-2xl">Hero</h2>
        <ImageUploadField
          label="Imagem de fundo"
          value={form.hero.image}
          onChange={(image) => setForm({ ...form, hero: { ...form.hero, image } })}
        />
        <AdminField label="Título linha 1">
          <AdminInput
            value={form.hero.titleLine1}
            onChange={(e) => setForm({ ...form, hero: { ...form.hero, titleLine1: e.target.value } })}
          />
        </AdminField>
        <AdminField label="Título linha 2">
          <AdminInput
            value={form.hero.titleLine2}
            onChange={(e) => setForm({ ...form, hero: { ...form.hero, titleLine2: e.target.value } })}
          />
        </AdminField>
        <AdminField label="Título linha 3">
          <AdminInput
            value={form.hero.titleLine3}
            onChange={(e) => setForm({ ...form, hero: { ...form.hero, titleLine3: e.target.value } })}
          />
        </AdminField>
        <AdminField label="Subtítulo">
          <AdminTextarea
            value={form.hero.subtitle}
            onChange={(e) => setForm({ ...form, hero: { ...form.hero, subtitle: e.target.value } })}
          />
        </AdminField>
        <AdminField label="CTA principal">
          <AdminInput
            value={form.hero.ctaPrimary}
            onChange={(e) => setForm({ ...form, hero: { ...form.hero, ctaPrimary: e.target.value } })}
          />
        </AdminField>
        <AdminField label="CTA secundário">
          <AdminInput
            value={form.hero.ctaSecondary}
            onChange={(e) => setForm({ ...form, hero: { ...form.hero, ctaSecondary: e.target.value } })}
          />
        </AdminField>
        <AdminField label="Badges (separados por |)">
          <AdminInput
            value={form.hero.badges.join(" | ")}
            onChange={(e) =>
              setForm({
                ...form,
                hero: {
                  ...form.hero,
                  badges: e.target.value.split("|").map((s) => s.trim()).filter(Boolean),
                },
              })
            }
          />
        </AdminField>
      </section>

      <section className="space-y-4 rounded-lg border border-gold/35 bg-surface p-5">
        <h2 className="font-display text-2xl">Sobre</h2>
        <AdminField label="Eyebrow">
          <AdminInput
            value={form.about.eyebrow}
            onChange={(e) => setForm({ ...form, about: { ...form.about, eyebrow: e.target.value } })}
          />
        </AdminField>
        <AdminField label="Título">
          <AdminInput
            value={form.about.title}
            onChange={(e) => setForm({ ...form, about: { ...form.about, title: e.target.value } })}
          />
        </AdminField>
        <AdminField label="Título destaque">
          <AdminInput
            value={form.about.titleAccent}
            onChange={(e) => setForm({ ...form, about: { ...form.about, titleAccent: e.target.value } })}
          />
        </AdminField>
        <ImageUploadField
          label="Imagem"
          value={form.about.image}
          onChange={(image) => setForm({ ...form, about: { ...form.about, image } })}
        />
        <AdminField label="Parágrafo 1">
          <AdminTextarea
            value={form.about.paragraphs[0] || ""}
            onChange={(e) =>
              setForm({
                ...form,
                about: {
                  ...form.about,
                  paragraphs: [e.target.value, form.about.paragraphs[1] || ""],
                },
              })
            }
          />
        </AdminField>
        <AdminField label="Parágrafo 2">
          <AdminTextarea
            value={form.about.paragraphs[1] || ""}
            onChange={(e) =>
              setForm({
                ...form,
                about: {
                  ...form.about,
                  paragraphs: [form.about.paragraphs[0] || "", e.target.value],
                },
              })
            }
          />
        </AdminField>
      </section>

      {(
        [
          ["productsSection", "Seção Cardápio"],
          ["howItWorks", "Seção Como funciona"],
          ["features", "Seção Diferenciais"],
          ["gallery", "Seção Galeria"],
          ["testimonials", "Seção Depoimentos"],
          ["faq", "Seção FAQ"],
          ["contact", "Seção Contato"],
        ] as const
      ).map(([key, title]) => {
        const block = form[key] as {
          eyebrow: string;
          title: string;
          titleAccent: string;
          subtitle?: string;
        };
        return (
          <section key={key} className="space-y-4 rounded-lg border border-gold/35 bg-surface p-5">
            <h2 className="font-display text-2xl">{title}</h2>
            <AdminField label="Eyebrow">
              <AdminInput
                value={block.eyebrow}
                onChange={(e) =>
                  setForm({ ...form, [key]: { ...block, eyebrow: e.target.value } })
                }
              />
            </AdminField>
            <AdminField label="Título">
              <AdminInput
                value={block.title}
                onChange={(e) => setForm({ ...form, [key]: { ...block, title: e.target.value } })}
              />
            </AdminField>
            <AdminField label="Título destaque">
              <AdminInput
                value={block.titleAccent}
                onChange={(e) =>
                  setForm({ ...form, [key]: { ...block, titleAccent: e.target.value } })
                }
              />
            </AdminField>
            {"subtitle" in block ? (
              <AdminField label="Subtítulo">
                <AdminTextarea
                  value={block.subtitle || ""}
                  onChange={(e) =>
                    setForm({ ...form, [key]: { ...block, subtitle: e.target.value } })
                  }
                />
              </AdminField>
            ) : null}
          </section>
        );
      })}

      <section className="space-y-4 rounded-lg border border-gold/35 bg-surface p-5">
        <h2 className="font-display text-2xl">Rodapé</h2>
        <AdminField label="Descrição">
          <AdminTextarea
            value={form.footer.description}
            onChange={(e) =>
              setForm({ ...form, footer: { ...form.footer, description: e.target.value } })
            }
          />
        </AdminField>
        <AdminField label="CNPJ">
          <AdminInput
            value={form.footer.cnpj}
            onChange={(e) => setForm({ ...form, footer: { ...form.footer, cnpj: e.target.value } })}
          />
        </AdminField>
      </section>

      <AdminButton type="button" disabled={busy} onClick={() => onSave(form)}>
        Salvar textos
      </AdminButton>
    </div>
  );
}

function SettingsSection({
  settings,
  busy,
  onSave,
}: {
  settings: CmsSettings;
  busy: boolean;
  onSave: (s: CmsSettings) => void;
}) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-gold/35 bg-surface p-5">
      <AdminField label="WhatsApp (somente dígitos com DDI)" hint="Ex: 5517996604289">
        <AdminInput value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
      </AdminField>
      <AdminField label="Telefone exibido">
        <AdminInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </AdminField>
      <AdminField label="E-mail">
        <AdminInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </AdminField>
      <AdminField label="Endereço">
        <AdminInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </AdminField>
      <AdminField label="Horário">
        <AdminInput value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
      </AdminField>
      <AdminField label="URL do mapa (iframe)">
        <AdminInput
          value={form.mapEmbedUrl}
          onChange={(e) => setForm({ ...form, mapEmbedUrl: e.target.value })}
        />
      </AdminField>
      <AdminField label="Instagram">
        <AdminInput
          value={form.instagramUrl}
          onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
        />
      </AdminField>
      <AdminField label="Facebook">
        <AdminInput
          value={form.facebookUrl}
          onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
        />
      </AdminField>
      <hr className="border-border" />
      <AdminField label="SEO Title">
        <AdminInput value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
      </AdminField>
      <AdminField label="SEO Description">
        <AdminTextarea
          value={form.seoDescription}
          onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
        />
      </AdminField>
      <AdminField label="OG Title">
        <AdminInput value={form.ogTitle} onChange={(e) => setForm({ ...form, ogTitle: e.target.value })} />
      </AdminField>
      <AdminField label="OG Description">
        <AdminTextarea
          value={form.ogDescription}
          onChange={(e) => setForm({ ...form, ogDescription: e.target.value })}
        />
      </AdminField>
      <AdminButton type="button" disabled={busy} onClick={() => onSave(form)}>
        Salvar configurações
      </AdminButton>
    </div>
  );
}

function VisibilitySection({
  settings,
  busy,
  onSave,
}: {
  settings: CmsSettings;
  busy: boolean;
  onSave: (s: CmsSettings) => void;
}) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);

  const labels: Record<keyof CmsSettings["sections"], string> = {
    hero: "Hero",
    about: "Sobre",
    products: "Cardápio / Produtos",
    howItWorks: "Como funciona",
    features: "Diferenciais",
    gallery: "Galeria",
    testimonials: "Depoimentos",
    faq: "FAQ",
    contact: "Contato",
    floatingWhatsapp: "Botão flutuante WhatsApp",
  };

  return (
    <div className="mx-auto max-w-xl space-y-3 rounded-lg border border-gold/35 bg-surface p-5">
      <p className="mb-4 text-sm text-muted-foreground">
        Ligue ou desligue seções inteiras do site sem apagar o conteúdo.
      </p>
      {(Object.keys(labels) as (keyof CmsSettings["sections"])[]).map((key) => (
        <label
          key={key}
          className="flex items-center justify-between gap-4 rounded-md border border-gold/35 px-4 py-3"
        >
          <span className="text-sm">{labels[key]}</span>
          <input
            type="checkbox"
            checked={form.sections[key]}
            onChange={(e) =>
              setForm({
                ...form,
                sections: { ...form.sections, [key]: e.target.checked },
              })
            }
          />
        </label>
      ))}
      <AdminButton type="button" disabled={busy} onClick={() => onSave(form)} className="mt-4">
        Salvar visibilidade
      </AdminButton>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-gold/35 bg-background p-5 sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">{title}</h2>
          <AdminButton type="button" variant="ghost" onClick={onClose}>
            Fechar
          </AdminButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function ListCard({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border overflow-hidden rounded-lg border border-gold/35 bg-surface">{children}</div>;
}

function ListRow({
  title,
  badge,
  actions,
}: {
  title: string;
  badge?: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="truncate font-medium">{title}</div>
        {badge}
      </div>
      <div className="flex flex-wrap gap-1">{actions}</div>
    </div>
  );
}
