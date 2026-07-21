import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  setResponseHeader("X-Content-Type-Options", "nosniff");
  setResponseHeader("X-Frame-Options", "DENY");
  setResponseHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  setResponseHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  setResponseHeader("Cross-Origin-Opener-Policy", "same-origin");
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self'",
    "frame-src https://www.google.com https://maps.google.com https://www.google.com.br",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ];
  if (process.env.NODE_ENV === "production") {
    csp.push("upgrade-insecure-requests");
    setResponseHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  setResponseHeader("Content-Security-Policy", csp.join("; "));
  return result;
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware, csrfMiddleware, errorMiddleware],
}));
