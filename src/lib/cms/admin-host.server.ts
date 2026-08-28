import { getRequestHostname } from "./request-context";
import { isAdminHost } from "./admin-host";

/** Apenas servidor — exige host admin valido antes de operacoes do CMS. */
export function assertAdminHost(): void {
  const hostname = getRequestHostname();
  if (!hostname) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FORBIDDEN");
    }
    return;
  }
  if (!isAdminHost(hostname)) {
    throw new Error("FORBIDDEN");
  }
}
