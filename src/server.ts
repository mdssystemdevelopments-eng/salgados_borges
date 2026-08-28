import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderAdminAccessDeniedPage } from "./lib/admin-access-page";
import {
  isAdminHost,
  isAdminPath,
  isAllowedOnAdminHost,
  isDedicatedAdminSubdomain,
  parseRequestHostname,
} from "./lib/cms/admin-host";
import { runWithRequestContext } from "./lib/cms/request-context";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function adminAccessDeniedResponse(): Response {
  return new Response(renderAdminAccessDeniedPage(), {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function isServerFnRequest(request: Request): boolean {
  if (request.headers.get("x-tsr-serverFn") === "true") return true;
  const base = process.env.TSS_SERVER_FN_BASE;
  if (!base) return false;
  const pathname = new URL(request.url).pathname;
  return pathname === base || pathname.startsWith(`${base}/`);
}

function enforceAdminHostRouting(request: Request, hostname: string): Response | null {
  const { pathname } = new URL(request.url);

  if (isAdminPath(pathname) && !isAdminHost(hostname)) {
    return adminAccessDeniedResponse();
  }

  // Subdominio exclusivo (admincms.*): so CMS — localhost serve site + admin
  if (isDedicatedAdminSubdomain(hostname)) {
    if (pathname === "/") {
      return Response.redirect(new URL("/admin/login", request.url), 302);
    }
    if (!isAllowedOnAdminHost(pathname) && !isServerFnRequest(request)) {
      return adminAccessDeniedResponse();
    }
  }

  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const hostname = parseRequestHostname(request);
    const blocked = enforceAdminHostRouting(request, hostname);
    if (blocked) return blocked;

    return runWithRequestContext(hostname, async () => {
      try {
        const handler = await getServerEntry();
        const response = await handler.fetch(request, env, ctx);
        return await normalizeCatastrophicSsrResponse(response);
      } catch (error) {
        console.error(error);
        return new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
    });
  },
};
