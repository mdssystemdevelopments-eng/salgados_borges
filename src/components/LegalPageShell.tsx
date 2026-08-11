import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-gold/20 bg-background/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="font-display text-xl text-gold-gradient tracking-wide">
            Salgados Borges
          </Link>
          <Link
            to="/"
            className="text-sm uppercase tracking-[0.16em] text-muted-foreground hover:text-gold transition-colors"
          >
            Voltar ao site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 lg:py-14">
        <h1 className="font-display text-4xl md:text-5xl text-foreground mb-8">{title}</h1>
        <div className="space-y-5 text-base leading-relaxed text-muted-foreground">{children}</div>
      </main>
    </div>
  );
}
