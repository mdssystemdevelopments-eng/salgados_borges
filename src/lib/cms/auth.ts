import { createHash, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "sb_cms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAdminPassword(): string {
  return process.env.CMS_ADMIN_PASSWORD || "admin123";
}

function getSessionSecret(): string {
  return process.env.CMS_SESSION_SECRET || "salgados-borges-cms-local-secret";
}

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildSessionToken(): string {
  const issuedAt = Date.now().toString();
  const payload = `${issuedAt}.${getAdminPassword()}.${getSessionSecret()}`;
  return `${issuedAt}.${hashToken(payload)}`;
}

function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > SESSION_TTL_SECONDS * 1000) {
    return false;
  }

  const expected = hashToken(`${issuedAt}.${getAdminPassword()}.${getSessionSecret()}`);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
    sameSite: "lax",
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
