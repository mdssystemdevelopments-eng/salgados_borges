import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  hostname: string;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(hostname: string, fn: () => T): T {
  return requestContext.run({ hostname }, fn);
}

export function getRequestHostname(): string | undefined {
  return requestContext.getStore()?.hostname;
}
