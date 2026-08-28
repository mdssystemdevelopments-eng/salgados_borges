import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const STORAGE_KEY = "sb-cookie-consent-v1";

export function CookieConsent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    setVisible(true);
  }, [pathname]);

  if (!visible || pathname.startsWith("/admin")) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "ok");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      className="cookie-consent fixed inset-x-0 bottom-0 z-50 p-4 sm:p-5"
      role="dialog"
      aria-live="polite"
      aria-label="Aviso sobre cookies"
    >
      <div className="cookie-consent-panel mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5 sm:pr-6">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">Cookies no site</p>
          <p className="text-sm leading-relaxed text-foreground">
            Usamos cookies básicos para o site funcionar: carrinho, preferências e login da área
            interna. Não usamos cookies de propaganda nem repassamos seus dados.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full bg-gold-gradient px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-gold-sm transition-shadow hover:shadow-gold-glow"
          >
            Ok, entendi
          </button>
          <Link
            to="/politica-de-privacidade"
            onClick={dismiss}
            className="text-xs uppercase tracking-[0.14em] text-foreground underline-offset-4 hover:text-gold hover:underline"
          >
            Política de privacidade
          </Link>
        </div>
      </div>
    </div>
  );
}
