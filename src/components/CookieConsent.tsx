import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const STORAGE_KEY = "sb-cookie-consent-v2";

type CookiePreferences = {
  essential: true;
  functional: boolean;
};

function readStoredConsent(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookiePreferences;
    if (parsed && parsed.essential === true && typeof parsed.functional === "boolean") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function storeConsent(preferences: CookiePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // ignore
  }
}

export function CookieConsent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [visible, setVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [functional, setFunctional] = useState(true);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (readStoredConsent()) return;
    setVisible(true);
  }, [pathname]);

  if (!visible || pathname.startsWith("/admin")) return null;

  const close = (preferences: CookiePreferences) => {
    storeConsent(preferences);
    setVisible(false);
    setManaging(false);
  };

  const acceptAll = () => close({ essential: true, functional: true });

  const savePreferences = () => close({ essential: true, functional });

  return (
    <div
      className="cookie-consent fixed inset-x-0 bottom-0 z-50 p-4 sm:p-5"
      role="dialog"
      aria-live="polite"
      aria-label="Aviso sobre cookies"
    >
      <div className="cookie-consent-panel mx-auto max-w-4xl space-y-4">
        {!managing ? (
          <>
            <p className="text-sm leading-relaxed text-foreground">
              Para melhorar a sua experiência na plataforma e prover serviços personalizados,
              utilizamos cookies. Ao clicar em &quot;Aceitar Cookies&quot;, você terá acesso a todas
              as funcionalidades do site. Para escolher quais opções você quer autorizar, clique em
              &quot;Gerenciar Cookies&quot;. Ao continuar navegando, você concorda com a nossa{" "}
              <Link
                to="/politica-de-privacidade"
                className="font-medium text-gold underline-offset-4 hover:underline"
              >
                Política de Privacidade
              </Link>
              .
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full bg-gold-gradient px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-gold-sm transition-shadow hover:shadow-gold-glow"
              >
                Aceitar Cookies
              </button>
              <button
                type="button"
                onClick={() => setManaging(true)}
                className="rounded-full border border-gold/45 bg-background px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-gold hover:bg-gold/5"
              >
                Gerenciar Cookies
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">Gerenciar cookies</p>
              <p className="text-sm text-muted-foreground">
                Escolha quais categorias você autoriza. Os cookies essenciais são necessários para
                o site funcionar.
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
              <label className="flex items-start justify-between gap-4 opacity-80">
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">Essenciais</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    Necessários para navegação, segurança e funcionamento básico do site.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked
                  disabled
                  readOnly
                  className="mt-1 h-4 w-4 accent-[var(--gold)]"
                  aria-label="Cookies essenciais sempre ativos"
                />
              </label>

              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">Funcionalidade</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    Permitem lembrar preferências e melhorar sua experiência ao montar pedidos.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={functional}
                  onChange={(e) => setFunctional(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--gold)]"
                  aria-label="Autorizar cookies de funcionalidade"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={savePreferences}
                className="rounded-full bg-gold-gradient px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-gold-sm transition-shadow hover:shadow-gold-glow"
              >
                Salvar preferências
              </button>
              <button
                type="button"
                onClick={() => setManaging(false)}
                className="text-xs uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:text-gold hover:underline"
              >
                Voltar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
