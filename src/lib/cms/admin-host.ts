const DEFAULT_ADMIN_HOST = "admincms.salgadosborges.com.br";

export function getConfiguredAdminHost(): string {
  return (process.env.CMS_ADMIN_HOST || DEFAULT_ADMIN_HOST).trim().toLowerCase();
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
  return normalized === getConfiguredAdminHost();
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
