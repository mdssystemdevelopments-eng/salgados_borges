import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { getAdminCms } from "@/lib/cms/api";

export const Route = createFileRoute("/admin/cardapio-lab")({
  loader: () => getAdminCms(),
  component: CardapioLabPage,
});

function CardapioLabPage() {
  const cms = Route.useLoaderData();
  const activeLink = useMemo(
    () => cms.menuLinks.find((link) => link.active) ?? cms.menuLinks[0] ?? null,
    [cms.menuLinks],
  );

  const previewUrl = activeLink ? `/c/${activeLink.slug}` : null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Laboratório do cardápio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize e teste o cardápio compartilhável antes de enviar o link.
          </p>
        </div>
        <Link
          to="/admin"
          className="rounded-full border border-gold px-4 py-2 text-sm text-gold hover:bg-gold/10"
        >
          Voltar ao CMS
        </Link>
      </div>

      {!activeLink ? (
        <div className="rounded-xl border border-border p-8 text-center text-muted-foreground">
          Nenhum link de cardápio criado ainda. Crie um na aba &quot;Gerar link&quot; do painel admin.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-xl border border-border p-5 space-y-4 h-fit">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Link ativo</div>
              <div className="font-display text-xl mt-1">{activeLink.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{activeLink.subtitle}</p>
            </div>
            {previewUrl ? (
              <>
                <div className="rounded-lg bg-muted px-3 py-2 text-sm break-all">
                  {typeof window !== "undefined" ? window.location.origin : "http://localhost:8080"}
                  {previewUrl}
                </div>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-full bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Abrir cardápio em nova aba
                </a>
              </>
            ) : null}
          </aside>

          {previewUrl ? (
            <div className="rounded-xl border border-border overflow-hidden min-h-[70vh] bg-muted">
              <iframe title="Prévia do cardápio" src={previewUrl} className="h-[80vh] w-full bg-background" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
