import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie, getRequestIP } from "@tanstack/react-start/server";

const COOKIE_NAME = "sb_cms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

const loginAttempts = new Map<string, { count: number; firstAt: number }>();

function getAdminPassword(): string {
  const fromEnv = process.env.CMS_ADMIN_PASSWORD?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!fromEnv || fromEnv.length < 10) {
      throw new Error("CMS_ADMIN_PASSWORD deve ter pelo menos 10 caracteres em producao");
    }
    return fromEnv;
  }
  return fromEnv || "admin123";
}

function getSessionSecret(): string {
  const fromEnv = process.env.CMS_SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!fromEnv || fromEnv.length < 24) {
      throw new Error("CMS_SESSION_SECRET invalido em producao");
    }
    return fromEnv;
  }
  return fromEnv || "salgados-borges-cms-local-secret-dev-only";
}

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildSessionToken(): string {
  const issuedAt = Date.now().toString();
  const nonce = randomBytes(16).toString("hex");
  const payload = `${issuedAt}.${nonce}.${getAdminPassword()}.${getSessionSecret()}`;
  return `${issuedAt}.${nonce}.${hashToken(payload)}`;
}

function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issuedAt, nonce, signature] = parts;
  if (!issuedAt || !nonce || !signature) return false;

  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > SESSION_TTL_SECONDS * 1000) {
    return false;
  }

  const expected = hashToken(`${issuedAt}.${nonce}.${getAdminPassword()}.${getSessionSecret()}`);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function clientKey(): string {
  return getRequestIP({ xForwardedFor: true }) || "unknown";
}

export function assertLoginAllowed(): void {
  const key = clientKey();
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return;
  if (now - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return;
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    throw new Error("Muitas tentativas. Aguarde alguns minutos.");
  }
}

export function registerLoginFailure(): void {
  const key = clientKey();
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now });
    return;
  }
  entry.count += 1;
}

export function clearLoginFailures(): void {
  loginAttempts.delete(clientKey());
}

export function verifyPassword(password: string): boolean {
  const expected = getAdminPassword();
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createSession(): void {
  setCookie(COOKIE_NAME, buildSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSession(): void {
  deleteCookie(COOKIE_NAME, { path: "/" });
}

export function isAuthenticated(): boolean {
  return isValidSessionToken(getCookie(COOKIE_NAME));
}

export function requireAuth(): void {
  if (!isAuthenticated()) {
    throw new Error("UNAUTHORIZED");
  }
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
