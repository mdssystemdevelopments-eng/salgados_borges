const DEFAULT_ADMIN_HOST = "admincms.salgadosborges.com.br";
const DEFAULT_PUBLIC_SITE_HOST = "salgadosborges.com.br";

function normalizeHostValue(value: string, fallback: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return fallback;

  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).hostname.toLowerCase();
    } catch {
      /* fall through */
    }
  }

  return trimmed.split("/")[0]?.split(":")[0] || fallback;
}

export function getConfiguredAdminHost(): string {
  return normalizeHostValue(process.env.CMS_ADMIN_HOST || DEFAULT_ADMIN_HOST, DEFAULT_ADMIN_HOST);
}

/** Host publico do site (sem admincms). */
export function getConfiguredPublicSiteHost(): string {
  const fromUrl = process.env.PUBLIC_SITE_URL?.trim();
  if (fromUrl) {
    try {
      return new URL(fromUrl).hostname.toLowerCase();
    } catch {
      return fromUrl
        .replace(/^https?:\/\//i, "")
        .split("/")[0]
        .toLowerCase();
    }
  }

  const adminHost = getConfiguredAdminHost();
  if (adminHost.startsWith("admincms.")) {
    return adminHost.slice("admincms.".length);
  }

  return DEFAULT_PUBLIC_SITE_HOST;
}

/** Origem publica para links de cardapio compartilhavel (https://salgadosborges.com.br). */
export function getPublicSiteOrigin(options?: { protocol?: string }): string {
  const fromUrl = process.env.PUBLIC_SITE_URL?.trim();
  if (fromUrl) {
    return fromUrl.replace(/\/$/, "");
  }

  const protocol = options?.protocol?.replace(/:$/, "") || "https";
  return `${protocol}://${getConfiguredPublicSiteHost()}`;
}

export function buildPublicMenuLink(slug: string, origin?: string): string {
  const base = (origin ?? getMenuShareOrigin()).replace(/\/$/, "");
  const clean = slug.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  return `${base}/c/${clean}`;
}

/** Origem para exibir/copiar links /c/slug — sempre dominio publico. */
export function getMenuShareOrigin(): string {
  const protocol =
    typeof window !== "undefined" ? window.location.protocol.replace(/:$/, "") : undefined;
  return getPublicSiteOrigin(protocol ? { protocol } : undefined);
}

/** @deprecated Use getMenuShareOrigin() para links de cardapio. */
export function resolvePublicMenuLinkOrigin(): string {
  return getMenuShareOrigin();
}

export function isPublicMenuPath(pathname: string): boolean {
  return pathname === "/c" || pathname.startsWith("/c/");
}

export function getDevAdminHosts(): string[] {
  const raw = process.env.CMS_ADMIN_DEV_HOSTS || "localhost,127.0.0.1,::1";
  return raw
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function isDevHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return getDevAdminHosts().includes(normalized);
}

/** Localhost no admin: true em dev por padrao; use CMS_ADMIN_ALLOW_LOCALHOST=true para forcar. */
export function isLocalhostAdminEnabled(): boolean {
  const flag = process.env.CMS_ADMIN_ALLOW_LOCALHOST?.trim().toLowerCase();
  if (flag === "false") return false;
  if (flag === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export function normalizeHostname(hostHeader: string): string {
  const first = hostHeader.split(",")[0]?.trim() || "";
  return first.split(":")[0]?.toLowerCase() || "";
}

export function parseRequestHostname(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host");
  const host = forwarded || request.headers.get("host") || "";
  return normalizeHostname(host);
}

export function isDedicatedAdminSubdomain(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (normalized === getConfiguredAdminHost()) return true;
  return normalized.startsWith("admincms.");
}

/** Host pode acessar rotas /admin (subdominio CMS ou localhost em dev). */
export function isAdminHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return false;

  if (isDedicatedAdminSubdomain(normalized)) return true;

  if (isDevHostname(normalized) && isLocalhostAdminEnabled()) return true;

  return false;
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_build/") ||
    pathname.startsWith("/_server/") ||
    pathname.startsWith("/__") ||
    /\.(css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|txt|xml|json)$/i.test(pathname)
  );
}

export function isAllowedOnAdminHost(pathname: string): boolean {
  if (isAdminPath(pathname)) return true;
  if (pathname.startsWith("/cms-media/")) return true;
  if (isStaticAssetPath(pathname)) return true;
  return false;
}

export function isAdminHostClient(): boolean {
  if (typeof window === "undefined") return true;

  const hostname = window.location.hostname.toLowerCase();
  if (hostname === getConfiguredAdminHost()) return true;

  // Vite dev: sempre libera localhost para acompanhar mudancas localmente
  if (import.meta.env.DEV && isDevHostname(hostname)) return true;

  return isAdminHost(hostname);
}
