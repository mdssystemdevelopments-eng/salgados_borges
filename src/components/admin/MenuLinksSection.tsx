import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import {
  deleteCollectionItem,
  upsertCollectionItem,
} from "@/lib/cms/api";
import type { CmsData, CmsMenuLink } from "@/lib/cms/types";
import { AdminButton, AdminField, AdminInput, VisibilityBadge } from "./ui";

type RunFn = (task: () => Promise<CmsData>, okMessage: string) => Promise<void>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function MenuLinksSection({ cms, busy, run }: { cms: CmsData; busy: boolean; run: RunFn }) {
  const empty: CmsMenuLink = {
    id: "",
    slug: "",
    title: "Meu cardápio",
    subtitle: "Peça pelo WhatsApp",
    active: true,
    categoryIds: [],
    productIds: [],
    showPrices: true,
    allowOrders: true,
    order: cms.menuLinks.length,
    createdAt: new Date().toISOString(),
  };
  const [editing, setEditing] = useState<CmsMenuLink | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Crie links de cardápio para compartilhar no WhatsApp, Instagram ou impressos. Cada link abre
            uma página só com produtos e pedido — não é o site completo.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/cardapio-lab"
            className="inline-flex items-center rounded-full border border-gold px-4 py-2 text-sm text-gold hover:bg-gold/10"
          >
            Laboratório
          </Link>
          <AdminButton type="button" disabled={busy} onClick={() => setEditing(empty)}>
            Novo link
          </AdminButton>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gold/35">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Link</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {cms.menuLinks.map((link) => (
              <tr key={link.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{link.title}</div>
                  <div className="text-xs text-muted-foreground">{link.subtitle}</div>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs">{origin}/c/{link.slug}</code>
                </td>
                <td className="px-4 py-3">
                  <VisibilityBadge visible={link.active} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <AdminButton type="button" variant="ghost" onClick={() => setEditing(link)}>
                      Editar
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        void navigator.clipboard.writeText(`${origin}/c/${link.slug}`);
                      }}
                    >
                      Copiar
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            upsertCollectionItem({
                              data: {
                                collection: "menuLinks",
                                item: { ...link, active: !link.active } as unknown as Record<
                                  string,
                                  unknown
                                >,
                              },
                            }),
                          link.active ? "Link desativado" : "Link ativado",
                        )
                      }
                    >
                      {link.active ? "Desativar" : "Ativar"}
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (confirm("Excluir este link?")) {
                          void run(
                            () =>
                              deleteCollectionItem({ data: { collection: "menuLinks", id: link.id } }),
                            "Link excluído",
                          );
                        }
                      }}
                    >
                      Excluir
                    </AdminButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <MenuLinkEditor
          link={editing}
          cms={cms}
          busy={busy}
          origin={origin}
          onClose={() => setEditing(null)}
          onSave={(item) =>
            run(async () => {
              const next = await upsertCollectionItem({
                data: { collection: "menuLinks", item: item as unknown as Record<string, unknown> },
              });
              setEditing(null);
              return next;
            }, "Link salvo")
          }
        />
      ) : null}
    </div>
  );
}

function MenuLinkEditor({
  link,
  cms,
  busy,
  origin,
  onClose,
  onSave,
}: {
  link: CmsMenuLink;
  cms: CmsData;
  busy: boolean;
  origin: string;
  onClose: () => void;
  onSave: (link: CmsMenuLink) => void;
}) {
  const [form, setForm] = useState(link);
  useEffect(() => setForm(link), [link]);

  const previewSlug = slugify(form.slug || form.title) || "cardapio";
  const previewUrl = `${origin}/c/${previewSlug}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 lg:items-stretch lg:justify-stretch lg:p-0">
      <button type="button" className="absolute inset-0 lg:hidden" aria-label="Fechar" onClick={onClose} />
      <div className="relative z-10 grid w-full max-h-[95vh] overflow-hidden rounded-t-xl border border-gold/35 bg-background lg:max-h-none lg:h-full lg:grid-cols-2 lg:rounded-none">
        <div className="overflow-y-auto p-5 lg:p-6 border-b lg:border-b-0 lg:border-r border-border">
          <h2 className="font-display text-2xl mb-4">{form.id ? "Editar link" : "Novo link de cardápio"}</h2>
          <div className="grid gap-4">
            <AdminField label="Título do cardápio">
              <AdminInput
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </AdminField>
            <AdminField label="Subtítulo">
              <AdminInput
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </AdminField>
            <AdminField label="Endereço do link (slug)">
              <AdminInput
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                placeholder="cardapio-festa"
              />
              <p className="mt-1 text-xs text-muted-foreground">{previewUrl}</p>
            </AdminField>
            <AdminField label="Categorias (vazio = todas)">
              <div className="flex flex-wrap gap-2">
                {cms.categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={form.categoryIds.includes(cat.id)}
                      onChange={(e) => {
                        const categoryIds = e.target.checked
                          ? [...form.categoryIds, cat.id]
                          : form.categoryIds.filter((id) => id !== cat.id);
                        setForm({ ...form, categoryIds, productIds: [] });
                      }}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </AdminField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.showPrices}
                onChange={(e) => setForm({ ...form, showPrices: e.target.checked })}
              />
              Mostrar preços
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowOrders}
                onChange={(e) => setForm({ ...form, allowOrders: e.target.checked })}
              />
              Permitir pedidos pelo cardápio
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Link ativo
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <AdminButton type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </AdminButton>
            <AdminButton
              type="button"
              disabled={busy || !form.title.trim() || !previewSlug}
              onClick={() => onSave({ ...form, slug: previewSlug })}
            >
              Salvar
            </AdminButton>
          </div>
        </div>
        <div className="hidden lg:flex flex-col bg-muted/40">
          <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
            Prévia ao vivo — laboratório
          </div>
          <iframe title="Prévia do cardápio" src={`/c/${previewSlug}`} className="flex-1 w-full bg-background" />
        </div>
      </div>
    </div>
  );
}
